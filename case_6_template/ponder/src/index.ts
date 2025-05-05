import { ponder } from "ponder:registry";
import { Pair, Swap } from "../ponder.schema";

ponder.on("UniswapV2Factory:PairCreated", async ({ event, context }) => {
  await context.db.insert(Pair).values({
    id: event.args[2].toLowerCase(),
    token0: event.args[0].toLowerCase(),
    token1: event.args[1].toLowerCase(),
    factory: event.log.address.toLowerCase(),
    createdAt: BigInt(event.block.number),
  });
});

ponder.on("UniswapV2Pair:Swap", async ({ event, context }) => {
  const pair = await context.db.find(Pair, { id: event.log.address.toLowerCase() });
  
  if (!pair) {
    // console.log(`Swap event for non-existent pair: ${event.log.address.toLowerCase()}`);
    return;
  }
  console.log(`Swap event for pair: ${pair.id}`, event.transaction.hash);
  await context.db.insert(Swap).values({
    id: event.transaction.hash+'-'+event.log.logIndex,
    pairId: pair.id,
    sender: event.args.sender.toLowerCase(),
    to: event.args.to.toLowerCase(),
    amount0In: event.args.amount0In,
    amount1In: event.args.amount1In,
    amount0Out: event.args.amount0Out,
    amount1Out: event.args.amount1Out,
    timestamp: BigInt(event.block.timestamp),
    blockNumber: BigInt(event.block.number),
  });
});
