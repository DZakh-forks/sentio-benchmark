import { ethereum, store, log, Address, BigInt, Bytes } from "@graphprotocol/graph-ts";
import { Swap } from "../generated/schema";
import { SwapExactTokensForTokensCall } from "../generated/TraceProcessor/UniswapV2Router02";

export function handleSwapExactTokensForTokens(
  call: SwapExactTokensForTokensCall
): void {
  // Create unique ID for this swap
  let swapId = call.transaction.hash.toHexString();

  // Create new entity
  let swap = new Swap(swapId);
  swap.distinctId = swapId;
  swap.transaction = call.transaction.hash.toHexString();
  swap.blockNumber = call.block.number;
  
  // Extract parameters directly from the call
  swap.amountIn = call.inputs.amountIn;
  swap.amountOutMin = call.inputs.amountOutMin;
  
  // Extract path addresses
  let pathAddresses: string[] = [];
  for (let i = 0; i < call.inputs.path.length; i++) {
    pathAddresses.push(call.inputs.path[i].toHexString().toLowerCase());
  }
  swap.path = pathAddresses;
  
  // Extract to address
  swap.to = call.inputs.to.toHexString().toLowerCase();
  
  // Extract deadline
  swap.deadline = call.inputs.deadline;

  // Save the entity
  swap.save();
  
  log.info("Processed swap transaction: {}", [swapId]);
} 