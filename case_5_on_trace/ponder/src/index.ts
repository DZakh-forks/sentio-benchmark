// Add type declaration for parquetjs at the top of the file
// No need for declare module now that we have a types.d.ts file

import { ponder } from "ponder:registry";
import { type Address, type Hex } from "viem";
import schema from "ponder:schema";
import * as fs from 'fs-extra';
import { join } from 'path';
import * as parquet from 'parquetjs';

// Log when the indexer starts
console.log('🚀 Indexer starting - listening for UniswapV2Router02 traces');
console.log('DEBUG: Adding event handler for contract functions');

// Constants
const DATA_DIR = './data';
const BENCHMARK_DATA_DIR = '../downloads';
const BATCH_SIZE = 1000; // Number of swaps to collect before writing to a Parquet file
const swapBatch: any[] = [];
let totalSwapsFound = 0;
let lastLoggedBlock = 0;
let totalFunctionCalls = 0;
const UNISWAP_ROUTER_ADDRESS = '0x7a250d5630b4cf539739df2c5dacb4c659f2488d';

// Ensure data directory exists
fs.ensureDirSync(DATA_DIR);
console.log(`Data directory ensured at ${join(process.cwd(), DATA_DIR)}`);
// Ensure benchmark data directory exists
fs.ensureDirSync(BENCHMARK_DATA_DIR);
console.log(`Benchmark data directory ensured at ${join(process.cwd(), BENCHMARK_DATA_DIR)}`);

// Define Parquet schema with camelCase field names
const parquetSchema = new parquet.ParquetSchema({
  id: { type: 'UTF8' },
  blockNumber: { type: 'INT64' },
  transactionHash: { type: 'UTF8' },
  from: { type: 'UTF8' },
  to: { type: 'UTF8' },
  amountIn: { type: 'UTF8' },
  amountOutMin: { type: 'UTF8' },
  deadline: { type: 'UTF8' },
  path: { type: 'UTF8' },
  pathLength: { type: 'INT32' },
});

// Function to write swaps to a Parquet file
async function writeSwapsToParquet(swaps: any[]) {
  if (swaps.length === 0) return;
  
  // Create a file in the data directory with timestamp for regular backups
  const timestamp = Date.now();
  const filename = `swaps_${timestamp}.parquet`;
  const filepath = join(DATA_DIR, filename);
  
  // Also create a file with the standardized name for benchmark validation
  const benchmarkFilename = 'ponder-case5-swaps.parquet';
  const benchmarkFilepath = join(BENCHMARK_DATA_DIR, benchmarkFilename);
  
  console.log(`Writing ${swaps.length} swaps to ${filepath} and ${benchmarkFilepath}`);
  
  try {
    // Write to the regular backup file
    const writer = await parquet.ParquetWriter.openFile(parquetSchema, filepath);
    
    // Write to the benchmark file
    const benchmarkWriter = await parquet.ParquetWriter.openFile(parquetSchema, benchmarkFilepath);
    
    // Write each swap to both files, ensuring field names match the schema
    for (const swap of swaps) {
      await writer.appendRow({
        id: swap.id,
        blockNumber: BigInt(swap.blockNumber),
        transactionHash: swap.transactionHash,
        from: swap.from,
        to: swap.to,
        amountIn: swap.amountIn,
        amountOutMin: swap.amountOutMin,
        deadline: swap.deadline,
        path: swap.path,
        pathLength: swap.pathLength,
      });
      await benchmarkWriter.appendRow({
        id: swap.id,
        blockNumber: BigInt(swap.blockNumber),
        transactionHash: swap.transactionHash,
        from: swap.from,
        to: swap.to,
        amountIn: swap.amountIn,
        amountOutMin: swap.amountOutMin,
        deadline: swap.deadline,
        path: swap.path,
        pathLength: swap.pathLength,
      });
    }
    
    // Close both writers
    await writer.close();
    await benchmarkWriter.close();
    console.log(`✅ Successfully wrote Parquet files: ${filepath} and ${benchmarkFilepath}`);
  } catch (error) {
    console.error(`❌ Error writing Parquet files: ${error}`);
  }
}

// Log progress information periodically
function logProgress(blockNumber: number) {
  // Only log once per 1000 blocks
  if (blockNumber - lastLoggedBlock < 1000 && blockNumber !== lastLoggedBlock) {
    return;
  }
  
  console.log(`🔍 Progress Report - Block: ${blockNumber}, Total Swaps Found: ${totalSwapsFound}, Total Function Calls: ${totalFunctionCalls}, Current Batch: ${swapBatch.length}`);
  lastLoggedBlock = blockNumber;
}

// Instead of using the wildcard event, use the specific function with a fallback approach
console.log('DEBUG: Registering handler for swapExactTokensForTokens');

ponder.on('UniswapV2Router02:swapExactTokensForTokens', async ({ event, context }) => {
  console.log(`DEBUG: Handler called for swapExactTokensForTokens at block ${event.block.number}, tx ${event.transaction.hash}`);
  
  totalFunctionCalls++;
  const blockNumber = event.block.number;
  logProgress(Number(blockNumber));
  
  console.log(`🔄 Processing swapExactTokensForTokens in tx: ${event.transaction.hash}`);
  
  try {
    // Log the complete event object for debugging
    console.log('DEBUG: Event object:', JSON.stringify({
      blockNumber: event.block.number,
      transactionHash: event.transaction.hash,
      from: event.transaction.from,
      args: event.args
    }, null, 2));
    
    // Function arguments are in the expected order
    const [amountIn, amountOutMin, path, to, deadline] = event.args;
    console.log(`DEBUG: Extracted args - amountIn: ${amountIn}, amountOutMin: ${amountOutMin}, to: ${to}`);
    
    // Create a unique ID for this swap using the standardized format
    // Use trace index which uniquely identifies traces within a transaction
    let traceIdentifier = '0';
    
    // Use trace index as the unique identifier within a transaction
    if (event.trace && event.trace.traceIndex !== undefined) {
      traceIdentifier = event.trace.traceIndex.toString();
    }
    
    // Create a unique ID combining transaction hash and trace identifier
    const id = `${event.transaction.hash}-${traceIdentifier}`;
    
    // Get the transaction sender address (from)
    const fromAddress = event.transaction.from || "0x0000000000000000000000000000000000000000";
    
    // Get the recipient address (to)
    const toAddress = to as Hex;
    
    // Convert path array to comma-separated string
    const pathArray = path as readonly Address[];
    const pathString = pathArray.join(',');
    
    // Create swap object using camelCase field names to match the schema
    const swap = {
      id,
      blockNumber: BigInt(blockNumber),
      transactionHash: event.transaction.hash,
      from: fromAddress,
      to: toAddress,
      amountIn: amountIn,
      amountOutMin: amountOutMin,
      deadline: deadline,
      path: pathString,
      pathLength: pathArray.length
    };
    
    console.log(`DEBUG: Created swap object with ID ${id} (trace: ${traceIdentifier}): ${JSON.stringify(swap, (key, value) => 
      typeof value === 'bigint' ? value.toString() : value, 2)}`);
    
    // Store the swap information in database
    try {
      await context.db.insert(schema.swap).values({
        id: swap.id,
        blockNumber: swap.blockNumber,
        transactionHash: swap.transactionHash,
        from: swap.from,
        to: swap.to,
        amountIn: swap.amountIn,
        amountOutMin: swap.amountOutMin,
        deadline: swap.deadline,
        path: swap.path,
        pathLength: swap.pathLength
      });
      console.log(`DEBUG: Successfully inserted swap into database`);
    } catch (error) {
      console.error(`DEBUG: Error inserting swap into database: ${error}`);
    }
    
    // Add to batch for Parquet file
    swapBatch.push(swap);
    totalSwapsFound++;
    
    // If batch size reached, write to Parquet file
    if (swapBatch.length >= BATCH_SIZE) {
      console.log(`📦 Batch size of ${BATCH_SIZE} reached. Writing to Parquet file...`);
      await writeSwapsToParquet([...swapBatch]);
      swapBatch.length = 0; // Clear the batch
    }
    
    // Log first few tokens of each path for easier debugging
    const firstToken = pathArray[0]?.slice(0, 10) + '...';
    const lastToken = pathArray[pathArray.length - 1]?.slice(0, 10) + '...';
    
    console.log(`💾 Stored swap #${totalSwapsFound}: ID=${id}, from=${fromAddress.slice(0, 10)}..., path: ${firstToken} → ${lastToken}, amountIn: ${amountIn.toString()}`);
  } catch (error) {
    console.error(`DEBUG: Error in event handler: ${error}`);
  }
});

// Also try the function call format
ponder.on("UniswapV2Router02.swapExactTokensForTokens()", async ({ event, context }) => {
  console.log(`DEBUG: Alternative handler called for swapExactTokensForTokens at block ${event.block.number}, tx ${event.transaction.hash}`);
  
  // Reuse the same logic as above
  totalFunctionCalls++;
  const blockNumber = event.block.number;
  logProgress(Number(blockNumber));
  
  console.log(`🔄 Processing swapExactTokensForTokens in tx: ${event.transaction.hash}`);
  
  try {
    // Function arguments are in the expected order
    const [amountIn, amountOutMin, path, to, deadline] = event.args;
    console.log(`DEBUG: Extracted args - amountIn: ${amountIn}, amountOutMin: ${amountOutMin}, to: ${to}`);
    
    // Create a unique ID for this swap using the standardized format
    // Use trace index which uniquely identifies traces within a transaction
    let traceIdentifier = '0';
    
    // Use trace index as the unique identifier within a transaction
    if (event.trace && event.trace.traceIndex !== undefined) {
      traceIdentifier = event.trace.traceIndex.toString();
    }
    
    // Create a unique ID combining transaction hash and trace identifier
    const id = `${event.transaction.hash}-${traceIdentifier}`;
    
    // Get the transaction sender address (from)
    const fromAddress = event.transaction.from || "0x0000000000000000000000000000000000000000";
    
    // Get the recipient address (to)
    const toAddress = to as Hex;
    
    // Convert path array to comma-separated string
    const pathArray = path as readonly Address[];
    const pathString = pathArray.join(',');
    
    // Create swap object using camelCase field names to match the schema
    const swap = {
      id,
      blockNumber: BigInt(blockNumber),
      transactionHash: event.transaction.hash,
      from: fromAddress,
      to: toAddress,
      amountIn: amountIn,
      amountOutMin: amountOutMin,
      deadline: deadline,
      path: pathString,
      pathLength: pathArray.length
    };
    
    // Store the swap information in database
    try {
      await context.db.insert(schema.swap).values({
        id: swap.id,
        blockNumber: swap.blockNumber,
        transactionHash: swap.transactionHash,
        from: swap.from,
        to: swap.to,
        amountIn: swap.amountIn,
        amountOutMin: swap.amountOutMin,
        deadline: swap.deadline,
        path: swap.path,
        pathLength: swap.pathLength
      });
      console.log(`DEBUG: Successfully inserted swap into database`);
    } catch (error) {
      console.error(`DEBUG: Error inserting swap into database: ${error}`);
    }
    
    // Add to batch for Parquet file
    swapBatch.push(swap);
    totalSwapsFound++;
  } catch (error) {
    console.error(`DEBUG: Error in event handler: ${error}`);
  }
});

// Write remaining swaps every 5 minutes as a backup
const BACKUP_INTERVAL = 5 * 60 * 1000; // 5 minutes in milliseconds
setInterval(async () => {
  if (swapBatch.length > 0) {
    console.log(`⏱️ Interval backup: Writing ${swapBatch.length} swaps to Parquet file...`);
    await writeSwapsToParquet([...swapBatch]);
    swapBatch.length = 0; // Clear the batch
  }
}, BACKUP_INTERVAL);

// Make sure to write any remaining swaps when the process is about to exit
process.on('beforeExit', async () => {
  if (swapBatch.length > 0) {
    console.log(`🛑 Process exiting: Writing ${swapBatch.length} remaining swaps to Parquet file...`);
    await writeSwapsToParquet([...swapBatch]);
    swapBatch.length = 0;
  }
});