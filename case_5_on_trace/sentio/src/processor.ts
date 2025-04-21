import { EthChainId, TraceContext, TraceEvent, TraceProcessor } from "@sentio/sdk/eth";
import { Swap } from "./schema/schema.js";
import { Interface } from "ethers/lib/utils";

// Constants for Uniswap V2 Router
const UNISWAP_V2_ROUTER = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D".toLowerCase();
const SWAP_EXACT_TOKENS_FOR_TOKENS_SIG = "0x38ed1739"; // Function selector for swapExactTokensForTokens

// Create the ABI interface for decoding
const swapInterface = new Interface([
  "function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] path, address to, uint256 deadline) external returns (uint[] memory amounts)"
]);

/**
 * Processes traces to identify and extract Uniswap V2 swaps
 */
const processor = new TraceProcessor({
  address: UNISWAP_V2_ROUTER,
  network: EthChainId.ETHEREUM,
  startBlock: 22280000,
  endBlock: 22290000
});

/**
 * Handle trace events
 */
processor.on("trace", async (trace: TraceEvent, ctx: TraceContext) => {
  try {
    // Skip failed or non-call traces
    if (trace.error || trace.type !== "CALL") {
      return;
    }

    // Skip traces that aren't to our target contract
    if (trace.to?.toLowerCase() !== UNISWAP_V2_ROUTER) {
      return;
    }

    // Get the input data
    const input = trace.input || "0x";
    
    // Check if this is a swapExactTokensForTokens call by looking at the function selector
    if (!input.startsWith(SWAP_EXACT_TOKENS_FOR_TOKENS_SIG)) {
      return;
    }

    // Decode the function arguments
    const decoded = swapInterface.decodeFunctionData("swapExactTokensForTokens", input);
    
    if (!decoded || !decoded.length) {
      return;
    }

    // Extract swap parameters
    const [amountIn, amountOutMin, path, to, deadline] = decoded;
    
    // Skip if the path doesn't have at least 2 tokens (in and out)
    if (!path || path.length < 2) {
      return;
    }

    // Create a unique ID for this swap
    const id = `${ctx.transaction?.hash || ""}-${ctx.transaction?.index || "0"}`;
    
    // Create normalized path (addresses in lowercase)
    const normalizedPath = path.map((addr: string) => addr.toLowerCase());

    // Get first and last tokens in path
    const tokenIn = normalizedPath[0];
    const tokenOut = normalizedPath[normalizedPath.length - 1];

    // Create swap entity
    const swap = new Swap({
      id: id,
      distinctId: to.toLowerCase(),
      amountIn: amountIn,
      amountOutMin: amountOutMin,
      deadline: deadline,
      path: normalizedPath,
      to: tokenOut,
      transaction: ctx.transaction?.hash.toLowerCase() || "",
      blockNumber: BigInt(ctx.blockNumber || 0)
    });
    
    // Store the swap entity
    await ctx.store.upsert(swap);
    
    // Track metrics
    ctx.meter.Counter("swaps").add(1);
    
    // Log the swap information
    console.log(`Recorded swap: ${id}`);
    console.log(`  From Token: ${tokenIn}`);
    console.log(`  To Token: ${tokenOut}`);
    console.log(`  Amount In: ${amountIn.toString()}`);
    console.log(`  Block: ${ctx.blockNumber}`);
  } catch (error) {
    console.error("Error processing trace:", error);
  }
});
