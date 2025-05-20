"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_store_1 = require("@subsquid/typeorm-store");
const model_1 = require("./model");
const constant_js_1 = require("./constant.js");
const processor_1 = require("./processor");
const big_decimal_1 = require("@subsquid/big-decimal");
const LBTC_js_1 = require("./abi/LBTC.js");
// Add timer variables
let rpcTime = 0;
let pointCalcTime = 0;
let storageTime = 0;
let operationCount = 0;
const SECOND_PER_HOUR = 60n * 60n;
const DAILY_POINTS = 1000;
// Helper function to add account to registry
async function addAccountToRegistry(store, accountId) {
    const startTime = performance.now();
    let registry = await store.get(model_1.AccountRegistry, "main");
    if (!registry) {
        registry = new model_1.AccountRegistry({
            id: "main",
            accounts: [],
            lastSnapshotTimestamp: 0n
        });
    }
    let accountExists = registry.accounts.includes(accountId);
    // Add account if it doesn't exist
    if (!accountExists) {
        registry.accounts.push(accountId);
        await store.save(registry);
    }
    storageTime += performance.now() - startTime;
}
// Helper to get the last snapshot data
async function getLastSnapshotData(store, accountId) {
    let lastPoint = (0, big_decimal_1.BigDecimal)(0);
    let lastBalance = (0, big_decimal_1.BigDecimal)(0);
    let lastTimestamp = 0n;
    let lastMintAmount = (0, big_decimal_1.BigDecimal)(0);
    const accountStartTime = performance.now();
    let account = await store.get(model_1.Accounts, accountId);
    storageTime += performance.now() - accountStartTime;
    if (account && account.lastSnapshotTimestamp) {
        lastTimestamp = account.lastSnapshotTimestamp;
        // If we have a previous snapshot, load it
        if (lastTimestamp != 0n) {
            const snapshotStartTime = performance.now();
            let lastSnapshot = await store.get(model_1.Snapshot, `${accountId}-${lastTimestamp}`);
            storageTime += performance.now() - snapshotStartTime;
            if (lastSnapshot) {
                lastPoint = lastSnapshot.point || (0, big_decimal_1.BigDecimal)(0);
                lastBalance = lastSnapshot.balance;
                lastMintAmount = lastSnapshot.mintAmount || (0, big_decimal_1.BigDecimal)(0);
            }
        }
    }
    return {
        point: lastPoint,
        balance: lastBalance,
        timestamp: lastTimestamp,
        mintAmount: lastMintAmount
    };
}
// Helper to check if it's time for an hourly update
async function shouldUpdateHourly(store, accountId, currentTimestamp) {
    const accountStartTime = performance.now();
    let account = await store.get(model_1.Accounts, accountId);
    storageTime += performance.now() - accountStartTime;
    if (!account)
        return false;
    // Check if the account has a lastSnapshotTimestamp and if an hour has passed
    return account.lastSnapshotTimestamp > 0n &&
        (currentTimestamp - account.lastSnapshotTimestamp) >= SECOND_PER_HOUR;
}
// Helper to create and save a snapshot
async function createAndSaveSnapshot(store, accountId, timestamp, balance, lastPoint, lastBalance, lastTimestamp, lastMintAmount, snapshotsMap, accountsToUpdate, isMint = false, mintAmount = 0n) {
    // Skip processing for zero address
    if (accountId === "0x0000000000000000000000000000000000000000") {
        return;
    }
    const snapshotKey = `${accountId}-${timestamp}`;
    // Get account from map if exists, otherwise from store
    let account;
    const accountStartTime = performance.now();
    if (accountsToUpdate.has(accountId)) {
        account = accountsToUpdate.get(accountId);
    }
    else {
        account = await store.get(model_1.Accounts, accountId);
        if (!account) {
            account = new model_1.Accounts({
                id: accountId,
                lastSnapshotTimestamp: 0n
            });
            // Add to registry and save the account immediately
            await addAccountToRegistry(store, accountId);
            const saveStartTime = performance.now();
            await store.save(account);
            storageTime += performance.now() - saveStartTime;
        }
    }
    storageTime += performance.now() - accountStartTime;
    // Get existing snapshot or create new one
    let snapshot;
    if (snapshotsMap.has(snapshotKey)) {
        const snapshotStartTime = performance.now();
        snapshot = snapshotsMap.get(snapshotKey);
        storageTime += performance.now() - snapshotStartTime;
        // Update the balance instead of skipping
        snapshot.balance = balance;
    }
    else {
        snapshot = new model_1.Snapshot({
            id: snapshotKey,
            account,
            timestamp: timestamp,
            balance: balance
        });
    }
    // Handle mint amount if it's a mint transaction
    if (isMint) {
        // If we already have a mintAmount, add to it
        snapshot.mintAmount = snapshot.mintAmount ?
            snapshot.mintAmount.plus((0, big_decimal_1.BigDecimal)(mintAmount.toString())) :
            lastMintAmount.plus((0, big_decimal_1.BigDecimal)(mintAmount.toString()));
    }
    else if (!snapshot.mintAmount) {
        // Only set mintAmount if not already set
        snapshot.mintAmount = lastMintAmount;
    }
    // Calculate point based on previous values
    if (lastTimestamp != 0n) {
        const pointCalcStartTime = performance.now();
        const secondsSinceLastUpdate = Number(timestamp - lastTimestamp);
        snapshot.point = lastPoint.plus(lastBalance
            .times((0, big_decimal_1.BigDecimal)(DAILY_POINTS / 24))
            .times((0, big_decimal_1.BigDecimal)(secondsSinceLastUpdate / Number(SECOND_PER_HOUR))));
        pointCalcTime += performance.now() - pointCalcStartTime;
    }
    else if (!snapshot.point) {
        snapshot.point = (0, big_decimal_1.BigDecimal)(0);
    }
    // Update account's last snapshot timestamp
    account.lastSnapshotTimestamp = timestamp;
    // Add to maps
    snapshotsMap.set(snapshotKey, snapshot);
    accountsToUpdate.set(accountId, account);
}
processor_1.processor.run(new typeorm_store_1.TypeormDatabase({ supportHotBlocks: true }), async (ctx) => {
    const transfers = [];
    // Use Maps for both snapshots and accounts to prevent duplicates
    const snapshotsMap = new Map(); // key: accountId-timestamp
    const accountsToUpdate = new Map();
    for (let block of ctx.blocks) {
        let lbtc = new LBTC_js_1.Contract({ _chain: ctx._chain, block: block.header }, constant_js_1.LBTC_PROXY);
        const blockTimestamp = BigInt(block.header.timestamp / 1000);
        for (let log of block.logs) {
            if (log.topics[0] === LBTC_js_1.events.Transfer.topic) {
                // Handle transfer events
                let { from, to, value } = LBTC_js_1.events.Transfer.decode(log);
                transfers.push(new model_1.Transfer({
                    id: `${block.header.id}_${block.header.height}_${log.logIndex}`,
                    from: from,
                    to: to,
                    value: value,
                    blockNumber: BigInt(block.header.height),
                    transactionHash: log.transaction?.hash ? Buffer.from(log.transaction.hash, 'hex') : null
                }));
                // Process sender account
                if (from !== '0x0000000000000000000000000000000000000000') {
                    const fromLastData = await getLastSnapshotData(ctx.store, from);
                    const rpcStartTime = performance.now();
                    const fromBalance = (0, big_decimal_1.BigDecimal)(await lbtc.balanceOf(from));
                    rpcTime += performance.now() - rpcStartTime;
                    await createAndSaveSnapshot(ctx.store, from, blockTimestamp, fromBalance, fromLastData.point, fromLastData.balance, fromLastData.timestamp, fromLastData.mintAmount, snapshotsMap, accountsToUpdate);
                }
                // Process receiver account
                const toLastData = await getLastSnapshotData(ctx.store, to);
                const rpcStartTime2 = performance.now();
                const toBalance = (0, big_decimal_1.BigDecimal)(await lbtc.balanceOf(to));
                rpcTime += performance.now() - rpcStartTime2;
                const isMint = from === '0x0000000000000000000000000000000000000000';
                await createAndSaveSnapshot(ctx.store, to, blockTimestamp, toBalance, toLastData.point, toLastData.balance, toLastData.timestamp, toLastData.mintAmount, snapshotsMap, accountsToUpdate, isMint, value);
            }
        }
        // For the last block in the batch, process hourly updates for all accounts
        if (block === ctx.blocks[ctx.blocks.length - 1]) {
            const registryStartTime = performance.now();
            const registry = await ctx.store.get(model_1.AccountRegistry, "main");
            storageTime += performance.now() - registryStartTime;
            if (registry) {
                // Only run the global update if an hour has passed since the last global update
                if (!registry.lastSnapshotTimestamp || (blockTimestamp - registry.lastSnapshotTimestamp) >= SECOND_PER_HOUR) {
                    // Update the global timestamp
                    registry.lastSnapshotTimestamp = blockTimestamp;
                    const registrySaveStartTime = performance.now();
                    await ctx.store.save(registry);
                    storageTime += performance.now() - registrySaveStartTime;
                    // Get all accounts that need updating
                    for (const accountId of registry.accounts) {
                        const accountStartTime = performance.now();
                        const account = await ctx.store.get(model_1.Accounts, accountId);
                        storageTime += performance.now() - accountStartTime;
                        if (!account)
                            continue;
                        // Check if it's time for an hourly update for this specific account
                        if (await shouldUpdateHourly(ctx.store, accountId, blockTimestamp)) {
                            const lastData = await getLastSnapshotData(ctx.store, accountId);
                            const rpcStartTime = performance.now();
                            const balance = (0, big_decimal_1.BigDecimal)(await lbtc.balanceOf(accountId));
                            rpcTime += performance.now() - rpcStartTime;
                            await createAndSaveSnapshot(ctx.store, accountId, blockTimestamp, balance, lastData.point, lastData.balance, lastData.timestamp, lastData.mintAmount, snapshotsMap, accountsToUpdate);
                        }
                    }
                }
            }
        }
    }
    // Batch save all entities at the end
    const storageStartTime = performance.now();
    await ctx.store.insert(transfers);
    if (snapshotsMap.size > 0)
        await ctx.store.save([...snapshotsMap.values()]);
    if (accountsToUpdate.size > 0)
        await ctx.store.save([...accountsToUpdate.values()]);
    storageTime += performance.now() - storageStartTime;
    // Log performance metrics
    operationCount += transfers.length;
    if (operationCount % 1000 === 0) {
        ctx.log.info(`Performance metrics after ${operationCount} operations:`);
        ctx.log.info(`RPC balanceOf time: ${(rpcTime / 1000).toFixed(2)}s`);
        ctx.log.info(`Point calculation time: ${(pointCalcTime / 1000).toFixed(2)}s`);
        ctx.log.info(`Storage operation time: ${(storageTime / 1000).toFixed(2)}s`);
    }
});
//# sourceMappingURL=main.js.map