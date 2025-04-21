import { ponder } from "ponder:registry";
import { type Address } from "viem";
import schema from "ponder:schema";

// Handle function calls to UniswapV2Router02.swapExactTokensForTokens
ponder.on("UniswapV2Router02.swapExactTokensForTokens()", async ({ event, context }) => {
  console.log(`Processing swapExactTokensForTokens call in tx: ${event.transaction.hash}`);
  
  try {
    // Function arguments are in the expected order
    const [amountIn, amountOutMin, path, to, deadline] = event.args;
    
    // Create a unique ID for this swap
    const id = `${event.transaction.hash}-${event.transaction.transactionIndex || '0'}`;
    
    // Get the final token in the path (destination token)
    const pathArray = path as readonly Address[];
    const finalToken = pathArray[pathArray.length - 1];
    
    // Store the swap information
    await context.db.insert(schema.swap).values({
      id,
      from: to || "0x0000000000000000000000000000000000000000", // Ensure we have a valid address
      to: finalToken || "0x0000000000000000000000000000000000000000", // Ensure valid address
      amountIn: amountIn,
      amountOutMin: amountOutMin,
      deadline: deadline,
      path: pathArray.join(','),
      pathLength: pathArray.length, // Changed from BigInt to number
      blockNumber: BigInt(event.block.number),
      transactionHash: event.transaction.hash
    });
    
    console.log(`Stored swap: ${id}, from: ${to}, to: ${finalToken}, amountIn: ${amountIn.toString()}`);
  } catch (error) {
    console.error(`Error processing swap:`, error);
  }
});