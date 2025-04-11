import { ponder } from "ponder:registry";
import schema from "ponder:schema";

// Constants
const HOUR_IN_MS = 60n * 60n * 1000n;

// Event handler for Transfers
ponder.on("LBTC:Transfer", async ({ event, context }) => {
  const { from, to, value } = event.args;
  const timestamp = BigInt(event.block.timestamp) * 1000n;
  
  // Collections for batch operations
  const snapshots = new Map();
  const accountsToUpdate = new Map();
  
  // Process "to" account
  const lbtc = context.contracts.LBTC;
  const toBalance = await context.client.readContract({
    abi: lbtc.abi,
    address: lbtc.address,
    functionName: "balanceOf",
    args: [to]
  });
  
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
    const fromBalance = await context.client.readContract({
      abi: lbtc.abi,
      address: lbtc.address,
      functionName: "balanceOf",
      args: [from]
    });
    
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
  await context.db.insert(schema.lbtcTransfer).values({
    id: event.id,
    from,
    to,
    value,
    blockNumber: BigInt(event.block.number),
    transactionHash: event.transaction.hash
  });
  
  // Validate snapshot objects before insertion
  const validSnapshots = [...snapshots.values()].filter(snapshot => 
    snapshot && snapshot.id && typeof snapshot.id === 'string'
  );
  
  // Batch insert snapshots - with conflict handling to update existing snapshots
  if (validSnapshots.length > 0) {
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
          timestampMilli: snapshot.timestampMilli
        };
      });
  }
  
  // Batch insert/update accounts with conflict handling
  if (accountsToUpdate.size > 0) {
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
  }
});

// Handle hourly updates with a trigger for block events
ponder.on("HourlyUpdate:block", async ({ event, context }) => {
  const timestamp = BigInt(event.block.timestamp) * 1000n;
  
  const registry = await context.db.find(schema.accountRegistry, { id: "main" });
  
  if (!registry) return;
  
  // Collections for batch operations
  const snapshots = new Map();
  const accountsToUpdate = new Map();
  
  // Update lastSnapshotTimestamp in registry
  await context.db.update(schema.accountRegistry, { id: "main" }).set({
    lastSnapshotTimestamp: timestamp
  });
  
  const lbtc = context.contracts.LBTC;
  
  // Process all accounts
  for (const accountId of registry.accounts) {
    const account = await context.db.find(schema.accounts, { id: accountId });
    
    if (!account) continue;
    
    // Only update accounts with existing snapshots
    if (account.lastSnapshotTimestamp !== 0n) {
      // Get current balance
      const balance = await context.client.readContract({
        abi: lbtc.abi,
        address: lbtc.address,
        functionName: "balanceOf",
        args: [accountId]
      });
      
      // Create new snapshot with a unique ID that includes the block number
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
          timestampMilli: snapshot.timestampMilli
        };
      });
  }
  
  // Batch insert/update accounts
  if (accountsToUpdate.size > 0) {
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
  }
});

// Helper function to add account to registry
async function addAccountToRegistry(db: any, accountId: string) {
  const registry = await db.find(schema.accountRegistry, { id: "main" });
  
  if (!registry) {
    await db.insert(schema.accountRegistry).values({
      id: "main",
      accounts: [accountId],
      lastSnapshotTimestamp: 0n
    });
  } else if (!registry.accounts.includes(accountId)) {
    await db.update(schema.accountRegistry, { id: "main" }).set({
      accounts: [...registry.accounts, accountId]
    });
  }
}

// Helper to get or create an account
async function getOrCreateAccount(db: any, address: string) {
  const accountId = address.toLowerCase();
  const account = await db.find(schema.accounts, { id: accountId });
  
  if (!account) {
    await db.insert(schema.accounts).values({
      id: accountId,
      lastSnapshotTimestamp: 0n
    });
    await addAccountToRegistry(db, accountId);
    return { id: accountId, lastSnapshotTimestamp: 0n };
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
  
  const account = await db.find(schema.accounts, { id: accountId });
  
  if (!account || !account.lastSnapshotTimestamp) return defaultData;
  
  // Direct lookup by ID using our simplified format: accountId-timestamp
  const snapshotId = `${accountId}-${account.lastSnapshotTimestamp.toString()}`;
  const snapshot = await db.find(schema.snapshot, { id: snapshotId });
  
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
  
  // Only create account if specified
  if (createIfNotExists) {
    // Make sure account exists
    await getOrCreateAccount(db, normalizedAccountId);
  }
  
  // Get last snapshot data
  const lastData = await getLastSnapshotData(db, normalizedAccountId);
  
  // Simplified ID without transaction hash - allows natural overwriting
  const snapshotId = `${normalizedAccountId}-${timestamp.toString()}`;
  
  // Calculate new mint amount
  let newMintAmount = lastData.mintAmount;
  if (isMint) {
    newMintAmount = lastData.mintAmount + mintAmount;
  }
  
  // Calculate points
  let point = 0n;
  if (lastData.timestamp !== 0n) {
    // Calculate time diff in seconds
    const timeDiffSeconds = Number((timestamp - lastData.timestamp) / 1000n);
    // Points formula: balance * 1000 per day = balance * 1000/86400 per second
    const pointsToAdd = lastData.balance * BigInt(timeDiffSeconds) * 1000n / 86400n;
    point = lastData.point + pointsToAdd;
  }
  
  // Get the full account object for proper relationship
  const account = await db.find(schema.accounts, { id: normalizedAccountId });
  
  // Only proceed if we have a valid account
  if (account) {
    // Add snapshot to collection instead of inserting immediately
    snapshots.set(snapshotId, {
      id: snapshotId,
      accountId: normalizedAccountId,  // Changed from account: account to match schema
      timestampMilli: timestamp,
      balance,
      point,
      mintAmount: newMintAmount
    });
    
    // Add account update to collection instead of updating immediately
    accountsToUpdate.set(normalizedAccountId, {
      id: normalizedAccountId,
      lastSnapshotTimestamp: timestamp
    });
  }
}
