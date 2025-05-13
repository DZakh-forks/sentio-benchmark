/*
 * Please refer to https://docs.envio.dev for a thorough guide on all Envio indexer features
 */
import {
  LBTC,
  Transfer,
  Accounts,
  BigDecimal
} from "generated";

import {getBalance} from "./util"

LBTC.Transfer.handlerWithLoader({
  loader: ({ event, context }) => {
    const blockNumber = BigInt(event.block.number)
    return Promise.all([
      event.params.from !== '0x0000000000000000000000000000000000000000' ? context.effect(getBalance, {address: event.params.from, blockNumber: blockNumber}) : Promise.resolve(BigDecimal(0)),
      context.effect(getBalance, {address: event.params.to, blockNumber: blockNumber})
    ])
  },
  handler: async ({ event, context, loaderReturn }) => {
    const HOUR_IN_MS = 60n * 60n * 1000n
    const blockTimestamp = BigInt(event.block.timestamp)
    const blockNumber = BigInt(event.block.number)
    const [fromBalance, toBalance] = loaderReturn

    let {from, to, value} = event.params

    const entity: Transfer = {
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      from: from,
      to: to,
      value: value,
      blockNumber: BigInt(event.block.number),
      transactionHash: event.transaction.hash 
    };

    context.Transfer.set(entity);

    const isMint = from === '0x0000000000000000000000000000000000000000'

    // Process sender account
    if (!isMint) {
        const fromAccount = await getOrCreateAccount(context,from)
        const fromLastData = await getLastSnapshotData(context, from)
        
        await createAndSaveSnapshot(
            context,
            from, 
            blockTimestamp,
            fromBalance,
            fromLastData.point,
            fromLastData.balance,
            fromLastData.timestamp,
            fromLastData.mintAmount
        )
    }

    // Process receiver account
    const toAccount = await getOrCreateAccount(context, to)
    const toLastData = await getLastSnapshotData(context, to)
    
    await createAndSaveSnapshot(
        context,
        to,
        blockTimestamp,
        toBalance,
        toLastData.point,
        toLastData.balance,
        toLastData.timestamp,
        toLastData.mintAmount,
        isMint,
        value
    )

    const registry = await context.AccountRegistry.get("main")
    if (registry) {
        // Only run the global update if an hour has passed since the last global update
        if (!registry.lastSnapshotTimestamp || (blockTimestamp - registry.lastSnapshotTimestamp) >= HOUR_IN_MS) {
            // Update the global timestamp
            context.AccountRegistry.set({
              ...registry,
              lastSnapshotTimestamp: blockTimestamp
            });
            
            // Get all accounts that need updating
            await Promise.all(
              registry.accounts.map(async (accountId) => {
                const account = await context.Accounts.get(accountId)
                if (!account) return
                
                // Check if it's time for an hourly update for this specific account
                if (await shouldUpdateHourly(context, accountId, blockTimestamp)) {
                    const lastData = await getLastSnapshotData(context, accountId)
                    const balance = await context.effect(getBalance, {address: accountId, blockNumber: blockNumber})
                    
                    await createAndSaveSnapshot(
                        context,
                        accountId,
                        blockTimestamp,
                        balance,
                        lastData.point,
                        lastData.balance,
                        lastData.timestamp,
                        lastData.mintAmount
                    )
                }
              })
            )
        }
    }
  }
});

// Helper function to add account to registry
async function addAccountToRegistry(context: any, accountId: string): Promise<void> {
  let registry = await context.AccountRegistry.get({id: "main"})
  if (!registry) {
    registry = {
      id: "main",
      accounts: [],
      lastSnapshotTimestamp: 0n
    }
  }
  
  let accountExists = registry.accounts.includes(accountId)
  
  // Add account if it doesn't exist
  if (!accountExists) {
    registry.accounts.push(accountId)
    context.AccountRegistry.set(registry)
  }
}

// Helper to get or create an account
async function getOrCreateAccount(context: any, address: string): Promise<Accounts> {
  let account = await context.Accounts.get({id: address})
  
  if (!account) {
    account = {
      id: address,
      lastSnapshotTimestamp: 0n
    }
    context.Accounts.set(account)
    // Add to registry
    addAccountToRegistry(context, account.id)
  }
  
  return account
}

// Helper to get the last snapshot data
async function getLastSnapshotData(context: any, accountId: string): Promise<{
  point: BigDecimal,
  balance: BigDecimal,
  timestamp: bigint,
  mintAmount: BigDecimal
  }> {
  let lastPoint = BigDecimal(0)
  let lastBalance = BigDecimal(0)
  let lastTimestamp = 0n
  let lastMintAmount = BigDecimal(0)
  
  let account = await context.Accounts.get({id: accountId})
  if (account && account.lastSnapshotTimestamp) {
    lastTimestamp = account.lastSnapshotTimestamp
    
    // If we have a previous snapshot, load it
    if (lastTimestamp != 0n) {
      let lastSnapshot = await context.Snapshot.get(`${accountId}-${lastTimestamp}`)
      if (lastSnapshot) {
        lastPoint = lastSnapshot.point || BigDecimal(0)
        lastBalance = lastSnapshot.balance
        lastMintAmount = lastSnapshot.mintAmount || BigDecimal(0)
      }
    }
  }
  
  return {
    point: lastPoint,
    balance: lastBalance,
    timestamp: lastTimestamp,
    mintAmount: lastMintAmount
  }
}

// Helper to check if it's time for an hourly update
async function shouldUpdateHourly(context: any, accountId: string, currentTimestamp: bigint): Promise<boolean> {
  const HOUR_IN_MS = 60n * 60n * 1000n
  
  let account = await context.Accounts.get({id: accountId})
  if (!account) return false
  
  // Check if the account has a lastSnapshotTimestamp and if an hour has passed
  return account.lastSnapshotTimestamp > 0n && 
         (currentTimestamp - account.lastSnapshotTimestamp) >= HOUR_IN_MS
}

// Helper to create and save a snapshot
async function createAndSaveSnapshot(
  context: any,
  accountId: string, 
  timestamp: bigint, 
  balance: BigDecimal, 
  lastPoint: BigDecimal, 
  lastBalance: BigDecimal, 
  lastTimestamp: bigint,
  lastMintAmount: BigDecimal,
  isMint: boolean = false,
  mintAmount: bigint = 0n
): Promise<void> {
  // Skip processing for zero address
  if (accountId === "0x0000000000000000000000000000000000000000") {
    return;
  }
  let account = await context.Accounts.get({id: accountId})
  if (!account) {
    account = {
      id: accountId,
      lastSnapshotTimestamp: 0n
    }
    context.Accounts.set(account)
  }
  
  let snapshot = {
    id: `${accountId}-${timestamp}`,
    account,
    timestampMilli: timestamp,
    balance: balance,
    mintAmount: lastMintAmount,
    point: lastPoint
  }
  
  // Handle mint amount if it's a mint transaction
  if (isMint) {
    snapshot.mintAmount = lastMintAmount.plus(BigDecimal(mintAmount.toString()))
  }
  
  // Calculate point based on previous values
  if (lastTimestamp != 0n) {
    // Calculate time delta in seconds
    const secondsSinceLastUpdate = Number(timestamp - lastTimestamp) / 1000
    
    // Updated points calculation: 1000 points per day
    snapshot.point = lastPoint.plus(
      lastBalance
        .times(BigDecimal(1000)) // 1000 points per day
        .times(BigDecimal(secondsSinceLastUpdate / 86400)) // Convert to days
    )
  } else {
    snapshot.point = BigDecimal(0)
  }
  
  context.Snapshot.set(snapshot)
  
  // Update account's last snapshot timestamp
  account.lastSnapshotTimestamp = timestamp
  context.Accounts.set(account)
}