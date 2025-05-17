// Write a processor and create dashboards to track various info for LBTC:
// • Emit transfer event logs for transfer events, require: sender, recipient and amount. (composing basic processors, use event logs)
// • Emit mint event logs, require: minter and amount. (use event filters)
// • Track all coin holders and their holding balances in a table. (write subgraph schema, use entities, create dashboards)
// • Be able to choose an account, and visualize his historical balance in a line chart.
// • Assuming users gain 1000 points for holding 1 LBTC/day, track their points in a table. Points need to be updated hourly.


// Sentio processor for coinbase's staking token LBTC
import { LBTCContext, LBTCProcessor, TransferEvent } from './types/eth/lbtc.js'
import { getPriceByType, token } from "@sentio/sdk/utils"
import { BigDecimal, Counter, Gauge } from "@sentio/sdk"
import { EthChainId, isNullAddress } from "@sentio/sdk/eth";
import { LBTC_PROXY, } from "./constant.js"
import { AccountSnapshot, Transfer } from './schema/schema.js'

const MILLISECOND_PER_DAY = 60 * 60 * 1000 * 24;
const DAILY_POINTS = 1000;

// commonly used option for Gauge
// set sparse to true
// and aggregation interval to 60 min
export const volOptions = {
    sparse: true,
    aggregationConfig: {
        intervalInMinutes: [60],
    }
}

// Add timer variables
let rpcBalanceTime = 0;
let pointCalcTime = 0;
let storageTime = 0;
let operationCount = 0;

// event handler for Transfer event
// record the amount of each mint event, along with token symbol as label
// recording both instantaneous amount as gauge and cumulative amount as counter
// Also recording a Eventlog for each transfer and mint event
// Keep track of the balance of each account in a table
// points are updated as funds are transferred and minted for related account
const transferEventHandler = async function (event: TransferEvent, ctx: LBTCContext) {
    const tokenInfo = await token.getERC20TokenInfo(ctx, ctx.contract.address)
    const symbol = tokenInfo.symbol
    const { from, to, value } = event.args
    const amount = value.scaleDown(tokenInfo.decimal)

    const transfer = new Transfer({
        id: `${ctx.chainId}_${event.blockNumber}_${event.index}`,
        from: event.args.from,
        to: event.args.to,
        value: event.args.value,
        blockNumber: BigInt(event.blockNumber),
    });

    // Measure storage time for transfer upsert
    const storageStartTime = performance.now();
    await ctx.store.upsert(transfer);
    storageTime += performance.now() - storageStartTime;

    const newSnapshots = await Promise.all(
        [event.args.from, event.args.to]
            .filter((account) => !isNullAddress(account))
            .map((account) => process(ctx, account, undefined, event.name))
    );

    // Measure storage time for snapshots upsert
    const snapshotStorageStartTime = performance.now();
    await ctx.store.upsert(newSnapshots);
    storageTime += performance.now() - snapshotStorageStartTime;
}

async function updateAll(ctx: LBTCContext, triggerEvent: string) {
    const snapshots = await ctx.store.list(AccountSnapshot, []);
    const newSnapshots = await Promise.all(
        snapshots.map((snapshot) =>
            process(ctx, snapshot.id.toString(), snapshot, triggerEvent)
        )
    );

    // Measure storage time for bulk snapshot updates
    const storageStartTime = performance.now();
    await ctx.store.upsert(newSnapshots);
    storageTime += performance.now() - storageStartTime;
}

// process function to update the balance and points of each account
async function process(
    ctx: LBTCContext,
    account: string,
    snapshot: AccountSnapshot | undefined,
    triggerEvent: string
) {
    const startTime = performance.now();
    
    if (!snapshot) {
        // Measure storage time for account snapshot fetch
        const fetchStartTime = performance.now();
        snapshot = await ctx.store.get(AccountSnapshot, account);
        storageTime += performance.now() - fetchStartTime;
    }
    const snapshotTimestampMilli = snapshot?.timestampMilli ?? 0n;
    const snapshotLbtcBalance: BigDecimal = snapshot?.lbtcBalance ?? new BigDecimal(0);
    
    // Measure point calculation time
    const pointStartTime = performance.now();
    const points = calcPoints(ctx, snapshotTimestampMilli, snapshotLbtcBalance);
    pointCalcTime += performance.now() - pointStartTime;

    const newTimestampMilli = BigInt(ctx.timestamp.getTime());
    const tokenInfo = await token.getERC20TokenInfo(ctx, ctx.contract.address)
    
    let newLbtcBalance: BigDecimal;
    // Only make RPC call if this is from transferEventHandler
    if (triggerEvent === "Transfer") {
        // Measure balanceOf RPC call time
        const rpcStartTime = performance.now();
        newLbtcBalance = await (await ctx.contract.balanceOf(account)).scaleDown(tokenInfo.decimal);
        rpcBalanceTime += performance.now() - rpcStartTime;
    } else {
        // For hourly updates, use the existing balance
        newLbtcBalance = snapshotLbtcBalance;
    }
    
    const newSnapshot = new AccountSnapshot({
        id: account,
        timestampMilli: newTimestampMilli,
        lbtcBalance: newLbtcBalance,
    });

    // Measure storage operation time for event emission
    const storageStartTime = performance.now();
    ctx.eventLogger.emit("point_update", {
        account,
        points,
        snapshotTimestampMilli,
        snapshotLbtcBalance,
        newTimestampMilli,
        newLbtcBalance,
        triggerEvent,
    });
    storageTime += performance.now() - storageStartTime;

    operationCount++;
    if (operationCount % 1000 === 0) {
        console.log(`block number: ${ctx.blockNumber}`);
        console.log(`Performance metrics after ${operationCount} operations:`);
        console.log(`RPC balanceOf time: ${(rpcBalanceTime / 1000).toFixed(2)}s`);
        console.log(`Point calculation time: ${(pointCalcTime / 1000).toFixed(2)}s`);
        console.log(`Storage operation time: ${(storageTime / 1000).toFixed(2)}s`);
    }

    return newSnapshot;
}

// calculate the points for each account based on the balance and time
function calcPoints(
    ctx: LBTCContext,
    snapshotTimestampMilli: bigint,
    snapshotLbtcBalance: BigDecimal
): BigDecimal {
    const nowMilli = ctx.timestamp.getTime();
    const snapshotMilli = Number(snapshotTimestampMilli);
    if (nowMilli < snapshotMilli) {
        console.error(
            "unexpected account snapshot from the future",
            nowMilli,
            snapshotTimestampMilli,
            snapshotLbtcBalance
        );
        return new BigDecimal(0);
    } else if (nowMilli == snapshotMilli) {
        // account affected for multiple times in the block
        return new BigDecimal(0);
    }
    const deltaDay = (nowMilli - snapshotMilli) / MILLISECOND_PER_DAY;

    const lPoints = snapshotLbtcBalance
      .multipliedBy(deltaDay)
      .multipliedBy(DAILY_POINTS);

    return lPoints;
}

// processor binding logic to bind the right contract address and attach right event and block handlers
// onTimeInterval is used to update the balance and points of each account every hour
LBTCProcessor.bind({ address: LBTC_PROXY, startBlock: 22000000, endBlock: 23000000 })
    .onEventTransfer(transferEventHandler) // if filter by mint LBTC Processor.filters.Transfer(0x0, null)
    .onTimeInterval(
        async (_, ctx) => {
            await updateAll(ctx, "TimeInterval");
        },
        60,
        60 * 24
    )
