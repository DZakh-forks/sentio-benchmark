import {TypeormDatabase} from '@subsquid/typeorm-store'
import {Accounts, Snapshot, AccountRegistry, Transfer} from './model'
import {LBTC_PROXY} from "./constant.js"
import {processor} from './processor'
import {BigDecimal} from '@subsquid/big-decimal'
import {Contract, events} from "./abi/LBTC.js"

// Helper function to add account to registry
async function addAccountToRegistry(store: any, accountId: string): Promise<void> {
  let registry = await store.get(AccountRegistry, "main")
  if (!registry) {
    registry = new AccountRegistry({
      id: "main",
      accounts: [],
      lastSnapshotTimestamp: 0n
    })
  }
  
  let accountExists = registry.accounts.includes(accountId)
  
  // Add account if it doesn't exist
  if (!accountExists) {
    registry.accounts.push(accountId)
    await store.save(registry)
  }
}

// Helper to get or create an account
async function getOrCreateAccount(store: any, address: string): Promise<Accounts> {
  let account = await store.get(Accounts, address)
  
  if (!account) {
    account = new Accounts({
      id: address,
      lastSnapshotTimestamp: 0n
    })
    await store.save(account)
    // Add to registry
    await addAccountToRegistry(store, account.id)
  }
  
  return account
}

// Helper to get the last snapshot data
async function getLastSnapshotData(store: any, accountId: string): Promise<{
  point: BigDecimal,
  balance: BigDecimal,
  timestamp: bigint,
  mintAmount: BigDecimal
}> {
  let lastPoint = BigDecimal(0)
  let lastBalance = BigDecimal(0)
  let lastTimestamp = 0n
  let lastMintAmount = BigDecimal(0)
  
  let account = await store.get(Accounts, accountId)
  if (account && account.lastSnapshotTimestamp) {
    lastTimestamp = account.lastSnapshotTimestamp
    
    // If we have a previous snapshot, load it
    if (lastTimestamp != 0n) {
      let lastSnapshot = await store.get(Snapshot, `${accountId}-${lastTimestamp}`)
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
async function shouldUpdateHourly(store: any, accountId: string, currentTimestamp: bigint): Promise<boolean> {
  const HOUR_IN_MS = 60n * 60n * 1000n
  
  let account = await store.get(Accounts, accountId)
  if (!account) return false
  
  // Check if the account has a lastSnapshotTimestamp and if an hour has passed
  return account.lastSnapshotTimestamp > 0n && 
         (currentTimestamp - account.lastSnapshotTimestamp) >= HOUR_IN_MS
}

// Helper to create and save a snapshot
async function createAndSaveSnapshot(
  store: any,
  accountId: string, 
  timestamp: bigint,
  balance: BigDecimal,
  lastPoint: BigDecimal,
  lastBalance: BigDecimal,
  lastTimestamp: bigint,
  lastMintAmount: BigDecimal,
  snapshotsMap: Map<string, Snapshot>,
  accountsToUpdate: Map<string, Accounts>,
  isMint: boolean = false,
  mintAmount: bigint = 0n
): Promise<void> {
    // Skip processing for zero address
    if (accountId === "0x0000000000000000000000000000000000000000") {
      return;
    }
  const snapshotKey = `${accountId}-${timestamp}`;
  
  // Get account from map if exists, otherwise from store
  let account: Accounts;
  if (accountsToUpdate.has(accountId)) {
    account = accountsToUpdate.get(accountId)!;
  } else {
    account = await store.get(Accounts, accountId);
    if (!account) {
      account = new Accounts({
        id: accountId,
        lastSnapshotTimestamp: 0n
      });
      // Add to registry (this could also be optimized)
      await addAccountToRegistry(store, accountId);
    }
  }
  
  // Get existing snapshot or create new one
  let snapshot: Snapshot;
  if (snapshotsMap.has(snapshotKey)) {
    snapshot = snapshotsMap.get(snapshotKey)!;
    // Update the balance instead of skipping
    snapshot.balance = balance;
  } else {
    snapshot = new Snapshot({
      id: snapshotKey,
      account,
      timestampMilli: timestamp,
      balance: balance
    });
  }
  
  // Handle mint amount if it's a mint transaction
  if (isMint) {
    // If we already have a mintAmount, add to it
    snapshot.mintAmount = snapshot.mintAmount ? 
      snapshot.mintAmount.plus(BigDecimal(mintAmount.toString())) : 
      lastMintAmount.plus(BigDecimal(mintAmount.toString()));
  } else if (!snapshot.mintAmount) {
    // Only set mintAmount if not already set
    snapshot.mintAmount = lastMintAmount;
  }
  
  // Calculate point based on previous values
  if (lastTimestamp != 0n) {
    const secondsSinceLastUpdate = Number(timestamp - lastTimestamp) / 1000;
    snapshot.point = lastPoint.plus(
      lastBalance
        .times(BigDecimal(1000))
        .times(BigDecimal(secondsSinceLastUpdate / 86400))
    );
  } else if (!snapshot.point) {
    snapshot.point = BigDecimal(0);
  }
  
  // Update account's last snapshot timestamp
  account.lastSnapshotTimestamp = timestamp;
  
  // Add to maps
  snapshotsMap.set(snapshotKey, snapshot);
  accountsToUpdate.set(accountId, account);
}

processor.run(new TypeormDatabase({supportHotBlocks: true}), async (ctx) => {
    const HOUR_IN_MS = 60n * 60n * 1000n
    const transfers: Transfer[] = []
    // Use Maps for both snapshots and accounts to prevent duplicates
    const snapshotsMap = new Map<string, Snapshot>() // key: accountId-timestamp
    const accountsToUpdate = new Map<string, Accounts>()
    
    for (let block of ctx.blocks) {
        let lbtc = new Contract({_chain: ctx._chain, block: block.header}, LBTC_PROXY)
        const blockTimestamp = BigInt(block.header.timestamp)
        
        for (let log of block.logs) {
            if (log.topics[0] === events.Transfer.topic) {
                // Handle transfer events
                let {from, to, value} = events.Transfer.decode(log)
                
                transfers.push(
                    new Transfer({
                        id: `${block.header.id}_${block.header.height}_${log.logIndex}`,
                        from: from,
                        to: to,
                        value: value,
                        blockNumber: BigInt(block.header.height),
                        transactionHash: log.transaction?.hash ? Buffer.from(log.transaction.hash, 'hex') : null
                    })
                )

                // Process sender account
                if (from !== '0x0000000000000000000000000000000000000000') {
                    const fromAccount = await getOrCreateAccount(ctx.store, from)
                    const fromLastData = await getLastSnapshotData(ctx.store, from)
                    const fromBalance = BigDecimal(await lbtc.balanceOf(from))
                    
                    await createAndSaveSnapshot(
                        ctx.store,
                        from,
                        blockTimestamp,
                        fromBalance,
                        fromLastData.point,
                        fromLastData.balance,
                        fromLastData.timestamp,
                        fromLastData.mintAmount,
                        snapshotsMap,
                        accountsToUpdate
                    )
                }

                // Process receiver account
                const toAccount = await getOrCreateAccount(ctx.store, to) 
                const toLastData = await getLastSnapshotData(ctx.store, to)
                const toBalance = BigDecimal(await lbtc.balanceOf(to))
                
                const isMint = from === '0x0000000000000000000000000000000000000000'
                
                await createAndSaveSnapshot(
                    ctx.store,
                    to,
                    blockTimestamp,
                    toBalance,
                    toLastData.point,
                    toLastData.balance,
                    toLastData.timestamp,
                    toLastData.mintAmount,
                    snapshotsMap,
                    accountsToUpdate,
                    isMint,
                    value
                )
            }
        }
        
        // For the last block in the batch, process hourly updates for all accounts
        if (block === ctx.blocks[ctx.blocks.length - 1]) {
            const registry = await ctx.store.get(AccountRegistry, "main")
            if (registry) {
                // Only run the global update if an hour has passed since the last global update
                if (!registry.lastSnapshotTimestamp || (blockTimestamp - registry.lastSnapshotTimestamp) >= HOUR_IN_MS) {
                    // Update the global timestamp
                    registry.lastSnapshotTimestamp = blockTimestamp
                    await ctx.store.save(registry)
                    
                    // Get all accounts that need updating
                    for (const accountId of registry.accounts) {
                        const account = await ctx.store.get(Accounts, accountId)
                        if (!account) continue
                        
                        // Check if it's time for an hourly update for this specific account
                        if (await shouldUpdateHourly(ctx.store, accountId, blockTimestamp)) {
                            const lastData = await getLastSnapshotData(ctx.store, accountId)
                            const balance = BigDecimal(await lbtc.balanceOf(accountId))
                            
                            await createAndSaveSnapshot(
                                ctx.store,
                                accountId,
                                blockTimestamp,
                                balance,
                                lastData.point,
                                lastData.balance,
                                lastData.timestamp,
                                lastData.mintAmount,
                                snapshotsMap,
                                accountsToUpdate
                            )
                        }
                    }
                }
            }
        }
    }
    
    // Batch save all entities at the end
    await ctx.store.insert(transfers)
    if (snapshotsMap.size > 0) await ctx.store.save([...snapshotsMap.values()])
    if (accountsToUpdate.size > 0) await ctx.store.save([...accountsToUpdate.values()])
    
    // Log processing summary
    const startBlock = ctx.blocks.at(0)?.header.height
    const endBlock = ctx.blocks.at(-1)?.header.height
    ctx.log.info(`Processed blocks from ${startBlock} to ${endBlock}, saved ${transfers.length} transfers, ${snapshotsMap.size} snapshots, and ${accountsToUpdate.size} accounts`)
})
