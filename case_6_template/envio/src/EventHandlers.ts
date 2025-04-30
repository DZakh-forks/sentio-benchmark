/*
 * Please refer to https://docs.envio.dev for a thorough guide on all Envio indexer features
 */
import { UniswapV2Factory, UniswapV2Pair } from "generated";
import type { Pair, Swap } from "generated";

// Register UniswapV2Pair contracts whenever they're created by the factory
UniswapV2Factory.PairCreated.contractRegister(
  ({ event, context }) => {
    console.log(`Registering new pair contract at ${event.params.pair}`);
    context.addUniswapV2Pair(event.params.pair);
  },
  {
    preRegisterDynamicContracts: true // Enable pre-registration for better performance
  }
);

// Handle PairCreated events to store pair information
UniswapV2Factory.PairCreated.handler(async ({ event, context }) => {
  console.log(`Processing PairCreated event at block ${event.block.number}`);
  console.log(`Factory address: ${event.srcAddress}`);
  console.log(`Pair address: ${event.params.pair}`);
  console.log(`Token0: ${event.params.token0}`);
  console.log(`Token1: ${event.params.token1}`);

  // Create and save Pair entity
  const pair: Pair = {
    id: event.params.pair,
    token0: event.params.token0,
    token1: event.params.token1,
    createdAt: BigInt(event.block.number)
  };
  context.Pair.set(pair);

  console.log(`Saved pair entity for ${event.params.pair}`);
});

// Handle Swap events from all UniswapV2Pair contracts
UniswapV2Pair.Swap.handler(async ({ event, context }) => {
  console.log(`Processing Swap event at block ${event.block.number}`);
  console.log(`Pair address: ${event.srcAddress}`);
  console.log(`Sender: ${event.params.sender}`);
  console.log(`To: ${event.params.to}`);

  const pair = await context.Pair.get(event.srcAddress);
  if (!pair) {
    context.log.error(`Pair not found for address ${event.srcAddress}`);
    return;
  }

  // Create and save Swap event
  const swap: Swap = {
    id: `${event.block.hash}-${event.logIndex}`,
    pair: event.srcAddress,
    sender: event.params.sender,
    to: event.params.to,
    amount0In: event.params.amount0In,
    amount1In: event.params.amount1In,
    amount0Out: event.params.amount0Out,
    amount1Out: event.params.amount1Out,
    reserve0: BigInt(0), // These would need to be calculated from reserves
    reserve1: BigInt(0), // These would need to be calculated from reserves
    blockNumber: BigInt(event.block.number),
    timestamp: BigInt(event.block.timestamp)
  };
  context.Swap.set(swap);

  console.log(`Saved swap entity with ID ${swap.id}`);
});
