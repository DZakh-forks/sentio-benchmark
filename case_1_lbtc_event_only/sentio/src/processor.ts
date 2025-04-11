import { LBTCContext, LBTCProcessor, TransferEvent } from './types/eth/lbtc.js'

import { LBTC_PROXY, } from "./constant.js"
import { Transfer } from './schema/schema.js'

const transferEventHandler = async function (event: TransferEvent, ctx: LBTCContext) {
  const transfer = new Transfer({
    id: `${ctx.chainId}_${event.blockNumber}_${event.index}`,
    from: event.args.from,
    to: event.args.to,
    value: event.args.value,
  });
  await ctx.store.upsert(transfer);
}

LBTCProcessor.bind({ address: LBTC_PROXY, 
    startBlock: 0, endBlock: 22200000 })
    .onEventTransfer(transferEventHandler) // if filter by mint LBTC Processor.filters.Transfer(0x0, null)
