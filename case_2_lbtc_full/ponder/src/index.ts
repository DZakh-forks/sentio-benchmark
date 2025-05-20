import { ponder } from "ponder:registry";
import schema from "ponder:schema";

// Add timer variables at the top
let rpcTime = 0;
let computeTime = 0;
let storageTime = 0;
let operationCount = 0;

// Event handler for Transfers
ponder.on("LBTC:Transfer", async ({ event, context }) => {
  const { from, to, value } = event.args;
  const timestamp = BigInt(event.block.timestamp);
  
  // Collections for batch operations
  const snapshots = new Map();
  const accountsToUpdate = new Map();
  
  // Process "to" account
  const lbtc = context.contracts.LBTC;
  
  // Measure RPC time for balanceOf
  const rpcStartTime = performance.now();
  const toBalance = await context.client.readContract({
    abi: lbtc.abi,
    address: lbtc.address,
    functionName: "balanceOf",
    args: [to]
  });
  rpcTime += performance.now() - rpcStartTime;
  
  // Check if this is a mint
  const isMint = from === "0x0000000000000000000000000000000000000000";
  
  await createAndSaveSnapshot( 
    context.db,
    to,
    timestamp,
    toBalance,
    snapshots,
    accountsToUpdate,
    true,
    isMint,
    value,
    event.transaction.hash
  );
  
  // Process "from" account (skip if mint)
  if (!isMint) {
    // Measure RPC time for balanceOf
    const fromRpcStartTime = performance.now();
    const fromBalance = await context.client.readContract({
      abi: lbtc.abi,
      address: lbtc.address,
      functionName: "balanceOf",
      args: [from]
    });
    rpcTime += performance.now() - fromRpcStartTime;
    
    await createAndSaveSnapshot(
      context.db,
      from,
      timestamp,
      fromBalance,
      snapshots,
      accountsToUpdate,
      true,
      false,
      0n,
      event.transaction.hash
    );
  }
  
  // Create transfer record
  const transferStartTime = performance.now();
  await context.db.insert(schema.lbtcTransfer).values({
    id: event.id,
    from,
    to,
    value,
    blockNumber: BigInt(event.block.number),
    transactionHash: event.transaction.hash
  });
  storageTime += performance.now() - transferStartTime;
  
  // Batch insert snapshots
  if (snapshots.size > 0) {
    const snapshotStartTime = performance.now();
    await context.db.insert(schema.snapshot)
      .values([...snapshots.values()])
      .onConflictDoUpdate((existing) => {
        const snapshot = snapshots.get(existing.id);
        if (!snapshot) return {};
        return {
          accountId: snapshot.accountId,
          balance: snapshot.balance,
          point: snapshot.point,
          mintAmount: snapshot.mintAmount,
          timestamp: snapshot.timestamp
        };
      });
    storageTime += performance.now() - snapshotStartTime;
  }
  
  // Batch insert/update accounts
  if (accountsToUpdate.size > 0) {
    const accountStartTime = performance.now();
    await context.db.insert(schema.accounts)
      .values([...accountsToUpdate.values()])
      .onConflictDoUpdate((existing) => {
        const account = accountsToUpdate.get(existing.id);
        if (!account) return {
          lastSnapshotTimestamp: existing.lastSnapshotTimestamp,
          balance: existing.balance,
          point: existing.point
        };
        return {
          lastSnapshotTimestamp: account.lastSnapshotTimestamp,
          balance: account.balance,
          point: account.point
        };
      });
    storageTime += performance.now() - accountStartTime;
  }

  operationCount++;
  if (operationCount % 1000 === 0) {
    console.log(`block number: ${event.block.number}`);
    console.log(`Performance metrics after ${operationCount} operations:`);
    console.log(`RPC time: ${(rpcTime / 1000).toFixed(2)}s`);
    console.log(`Compute time: ${(computeTime / 1000).toFixed(2)}s`);
    console.log(`Storage time: ${(storageTime / 1000).toFixed(2)}s`);
  }
});

// Handle hourly updates with a trigger for block events
ponder.on("HourlyUpdate:block", async ({ event, context }) => {
  const timestamp = BigInt(event.block.timestamp);
  
  const storageStartTime = performance.now();
  const registry = await context.db.find(schema.accountRegistry, { id: "main" });
  storageTime += performance.now() - storageStartTime;
  
  if (!registry) return;
  
  // Collections for batch operations
  const snapshots = new Map();
  const accountsToUpdate = new Map();
  
  // Update lastSnapshotTimestamp in registry
  const updateStartTime = performance.now();
  await context.db.update(schema.accountRegistry, { id: "main" }).set({
    lastSnapshotTimestamp: timestamp
  });
  storageTime += performance.now() - updateStartTime;
  
  const lbtc = context.contracts.LBTC;
  
  // Process all accounts
  for (const accountId of registry.accounts) {
    const accountStartTime = performance.now();
    const account = await context.db.find(schema.accounts, { id: accountId });
    storageTime += performance.now() - accountStartTime;
    if (!account) continue;
    
    // Only update accounts with existing snapshots
    if (account.lastSnapshotTimestamp !== 0n) {
      // Get current balance

      const balance = account.balance;
      await createAndSaveSnapshot(
        context.db,
        accountId,
        timestamp,
        balance,
        snapshots,
        accountsToUpdate,
        false,
        false,
        0n,
        `hourly-${event.block.number}`
      );
    }
  }
  
  // Validate snapshot objects before insertion
  const validSnapshots = [...snapshots.values()].filter(snapshot => 
    snapshot && snapshot.id && typeof snapshot.id === 'string'
  );
  
  // Batch insert snapshots - with conflict handling
  if (validSnapshots.length > 0) {
    const insertStartTime = performance.now();
    await context.db.insert(schema.snapshot)
      .values(validSnapshots)
      .onConflictDoUpdate((existing) => {
        const snapshot = snapshots.get(existing.id);
        if (!snapshot) {
          return {}; // No changes if snapshot not found
        }
        return {
          accountId: snapshot.accountId,  // match schema
          balance: snapshot.balance,
          point: snapshot.point,
          mintAmount: snapshot.mintAmount,
          timestamp: snapshot.timestamp
        };
      });
    storageTime += performance.now() - insertStartTime;
  }
  
  // Batch insert/update accounts
  if (accountsToUpdate.size > 0) {
    const insertStartTime = performance.now();
    await context.db.insert(schema.accounts)
      .values([...accountsToUpdate.values()])
      .onConflictDoUpdate((existing) => {
        const account = accountsToUpdate.get(existing.id);
        if (!account) {
          // If account not found in Map, return existing values
          return {
            lastSnapshotTimestamp: existing.lastSnapshotTimestamp
          };
        }
        return {
          lastSnapshotTimestamp: account.lastSnapshotTimestamp
        };
      });
    storageTime += performance.now() - insertStartTime;
  }
});

// Helper function to add account to registry
async function addAccountToRegistry(db: any, accountId: string) {
  const storageStartTime = performance.now();
  const registry = await db.find(schema.accountRegistry, { id: "main" });
  storageTime += performance.now() - storageStartTime;
  
  if (!registry) {
    const insertStartTime = performance.now();
    await db.insert(schema.accountRegistry).values({
      id: "main",
      accounts: [accountId],
      lastSnapshotTimestamp: 0n
    });
    storageTime += performance.now() - insertStartTime;
  } else if (!registry.accounts.includes(accountId)) {
    const insertStartTime = performance.now();
    await db.update(schema.accountRegistry, { id: "main" }).set({
      accounts: [...registry.accounts, accountId]
    });
    storageTime += performance.now() - insertStartTime;
  }
}

// Helper to get or create an account
async function getOrCreateAccount(db: any, address: string) {
  const accountId = address.toLowerCase();
  const storageStartTime = performance.now();
  const account = await db.find(schema.accounts, { id: accountId });
  storageTime += performance.now() - storageStartTime;
  if (!account) {
    // Create new account in both memory and database
    const insertStartTime = performance.now();
    await db.insert(schema.accounts).values({
      id: accountId,
      lastSnapshotTimestamp: 0n,
      balance: 0n,
      point: 0n
    });
    storageTime += performance.now() - insertStartTime;
    await addAccountToRegistry(db, accountId);
    return { id: accountId, lastSnapshotTimestamp: 0n, balance: 0n, point: 0n };
  }
  
  return account;
}

// Helper to get the last snapshot data
async function getLastSnapshotData(db: any, accountId: string) {
  const defaultData = {
    point: 0n,
    balance: 0n,
    timestamp: 0n,
    mintAmount: 0n
  };
  
  // Measure storage time for account lookup
  const storageStartTime = performance.now();
  const account = await db.find(schema.accounts, { id: accountId });
  storageTime += performance.now() - storageStartTime;
  
  if (!account || !account.lastSnapshotTimestamp) return defaultData;
  
  // Measure storage time for snapshot lookup
  const snapshotStartTime = performance.now();
  const snapshotId = `${accountId}-${account.lastSnapshotTimestamp.toString()}`;
  const snapshot = await db.find(schema.snapshot, { id: snapshotId });
  storageTime += performance.now() - snapshotStartTime;
  
  if (snapshot) {
    return {
      point: snapshot.point || 0n,
      balance: snapshot.balance,
      timestamp: account.lastSnapshotTimestamp,
      mintAmount: snapshot.mintAmount || 0n
    };
  }
  
  return defaultData;
}

// Helper to create a new snapshot (modified to collect instead of save)
async function createAndSaveSnapshot(
  db: any,
  accountId: string,
  timestamp: bigint,
  balance: bigint,
  snapshots: Map<string, any>,
  accountsToUpdate: Map<string, any>,
  createIfNotExists = true,
  isMint = false,
  mintAmount = 0n,
  transactionHash = "0x0"
) {
  // Skip processing for zero address
  if (accountId === "0x0000000000000000000000000000000000000000") {
    return;
  }

  // Normalize account ID to lowercase
  const normalizedAccountId = accountId.toLowerCase();
  
  // Measure storage time for account operations
  if (createIfNotExists) {
    await getOrCreateAccount(db, normalizedAccountId);
  }
  const lastData = await getLastSnapshotData(db, normalizedAccountId);
  
  // Measure compute time for point calculations
  const computeStartTime = performance.now();
  const snapshotId = `${normalizedAccountId}-${timestamp.toString()}`;
  let newMintAmount = lastData.mintAmount;
  if (isMint) {
    newMintAmount = lastData.mintAmount + mintAmount;
  }
  
  let point = 0n;
  if (lastData.timestamp !== 0n) {
    const timeDiffSeconds = Number((timestamp - lastData.timestamp));
    const pointsToAdd = lastData.balance * BigInt(timeDiffSeconds) * 1000n / 60n / 60n / 24n;
    point = lastData.point + pointsToAdd;
  }
  computeTime += performance.now() - computeStartTime;
  
  // Get the full account object for proper relationship
  const accountStartTime = performance.now();
  const account = await db.find(schema.accounts, { id: normalizedAccountId });
  storageTime += performance.now() - accountStartTime;
  
  // Only proceed if we have a valid account
  if (account) {
    // Add snapshot to collection
    snapshots.set(snapshotId, {
      id: snapshotId,
      accountId: normalizedAccountId,
      timestamp: timestamp,
      balance: balance,  // Make sure we're using the RPC balance
      point: point,
      mintAmount: newMintAmount
    });
    // Add account update to collection
    accountsToUpdate.set(normalizedAccountId, {
      id: normalizedAccountId,
      lastSnapshotTimestamp: timestamp,
      balance: balance,  // Make sure we're using the RPC balance
      point: point
    });
    storageTime += performance.now() - accountStartTime;
  }
}
