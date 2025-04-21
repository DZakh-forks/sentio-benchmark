import { HypersyncClient, BlockField, TraceField } from "@envio-dev/hypersync-client";
import { BigNumber } from 'bignumber.js';
import { keccak256, toHex } from 'viem';
import * as fs from 'fs';
import * as path from 'path';
import parquet from 'parquetjs';
import { fileURLToPath } from 'url';

// Set up constants
const UNISWAP_V2_ROUTER = '0x7a250d5630b4cf539739df2c5dacb4c659f2488d'.toLowerCase();
const SWAP_METHOD_SIGNATURE = '0x38ed1739'; // swapExactTokensForTokens
const START_BLOCK = 22280000;
const END_BLOCK = 22290000;
const PARQUET_OUTPUT_PATH = '../data/envio-case5-swap-data.parquet';

// Get current file path for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create output directories if they don't exist
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Define schema for Parquet file
const swapSchema = new parquet.ParquetSchema({
    traceHash: { type: 'UTF8' },
    txHash: { type: 'UTF8' },
    blockNumber: { type: 'INT64' },
    tokenIn: { type: 'UTF8' },
    tokenOut: { type: 'UTF8' },
    path: { type: 'UTF8' },
    amountIn: { type: 'UTF8' }, // Store as string to preserve precision
    amountOutMin: { type: 'UTF8' }, // Store as string to preserve precision
    to: { type: 'UTF8' },
    timestamp: { type: 'INT64' }
});

// Function to decode parameters from trace input
function decodeSwapParams(input) {
  if (!input || !input.startsWith(SWAP_METHOD_SIGNATURE)) {
    return null;
  }

  try {
    // Remove method signature (first 10 characters including '0x')
    const parametersHex = `0x${input.slice(10)}`;
    
    // Extract parameters at specific offsets
    const amountInHex = parametersHex.slice(2, 66);
    const amountOutMinHex = parametersHex.slice(66, 130);
    const deadlineHex = parametersHex.slice(130, 194);
    
    // Extract token addresses from the path array
    // First, extract the path length and offsets
    const pathOffset = 192;
    const pathLengthHex = parametersHex.slice(pathOffset, pathOffset + 64);
    const pathLength = parseInt(pathLengthHex, 16);
    
    // Now extract all tokens in the path
    const pathTokens = [];
    for (let i = 0; i < pathLength && i < 10; i++) { // Limit to 10 tokens to prevent errors
      const tokenOffset = pathOffset + 64 + (i * 64);
      const tokenAddress = `0x${parametersHex.slice(tokenOffset + 24, tokenOffset + 64)}`;
      pathTokens.push(tokenAddress);
    }
    
    // Get first and last token from path
    const tokenIn = pathTokens[0];
    const tokenOut = pathTokens[pathTokens.length - 1];
    
    // Extract recipient address (after the path array)
    const toOffset = pathOffset + 64 + (pathLength * 64); // Position after path array
    const to = `0x${parametersHex.slice(toOffset + 24, toOffset + 64)}`;
    
    // Convert hex values to BigNumber for safe handling of large numbers
    const amountIn = new BigNumber(`0x${amountInHex}`).toString(10);
    const amountOutMin = new BigNumber(`0x${amountOutMinHex}`).toString(10);
    const deadline = new BigNumber(`0x${deadlineHex}`).toString(10);
    
    return {
      tokenIn,
      tokenOut,
      path: pathTokens.join(','),
      amountIn,
      amountOutMin,
      deadline,
      to
    };
  } catch (error) {
    console.error('Error decoding swap parameters:', error);
    return null;
  }
}

async function main() {
  console.log(`Collecting Uniswap V2 swap trace data from blocks ${START_BLOCK} to ${END_BLOCK}`);
  
  // Initialize data structures for collecting swap info
  const swapRecords = [];
  const uniqueInputTokens = new Set();
  const uniqueOutputTokens = new Set();
  const uniqueRecipients = new Set();
  const inputAmounts = [];
  let totalTraces = 0;
  let successfulDecodes = 0;
  
  // Start measuring time
  const startTime = performance.now();
  
  try {
    // Initialize HyperSync client
    const client = await HypersyncClient.new({
      url: "http://eth.hypersync.xyz",
    });
    console.log('HyperSync client initialized');
    
    // Define query for Uniswap V2 Router traces
    const query = {
      fromBlock: START_BLOCK,
      toBlock: END_BLOCK,
      traces: [
        {
          to: [UNISWAP_V2_ROUTER]
        }
      ],
      fieldSelection: {
        trace: [
          TraceField.TransactionHash,
          TraceField.BlockNumber,
          TraceField.From,
          TraceField.To,
          TraceField.Input,
          TraceField.Value,
          TraceField.CallType,
          TraceField.TraceAddress
        ],
        block: [
          BlockField.Number,
          BlockField.Timestamp,
        ],
      }
    };
    
    console.log('Starting to stream traces...');
    
    // Use stream API
    const stream = await client.stream(query, {});
    
    while (true) {
      const res = await stream.recv();
      
      // Exit if we've reached the end of the data
      if (res === null) {
        console.log("End of data reached");
        break;
      }
      
      // Log progress
      if (res.nextBlock && res.nextBlock % 1000 === 0) {
        console.log(`Processing at block ${res.nextBlock}`);
        console.log(`Found ${swapRecords.length} swap records so far`);
      }
      
      // Skip if no trace data
      if (!res.data || !res.data.traces) {
        continue;
      }
      
      // Process traces in this response
      const traces = res.data.traces;
      const blockNumber = res.data.block?.number || 0;
      const timestamp = res.data.block?.timestamp || Math.floor(Date.now() / 1000);
      
      totalTraces += traces.length;
      
      // Process each trace
      for (const trace of traces) {
        if (trace.to && trace.to.toLowerCase() === UNISWAP_V2_ROUTER && 
            trace.input && trace.input.startsWith(SWAP_METHOD_SIGNATURE)) {
            
          const swapParams = decodeSwapParams(trace.input);
          if (swapParams) {
            successfulDecodes++;
            
            const swapRecord = {
              traceHash: trace.transactionHash + '-' + (trace.traceAddress?.join('-') || '0'),
              txHash: trace.transactionHash,
              blockNumber: trace.blockNumber || blockNumber,
              tokenIn: swapParams.tokenIn,
              tokenOut: swapParams.tokenOut,
              path: swapParams.path,
              amountIn: swapParams.amountIn,
              amountOutMin: swapParams.amountOutMin,
              to: swapParams.to,
              timestamp
            };
            
            swapRecords.push(swapRecord);
            uniqueInputTokens.add(swapParams.tokenIn);
            uniqueOutputTokens.add(swapParams.tokenOut);
            uniqueRecipients.add(swapParams.to);
            inputAmounts.push(new BigNumber(swapParams.amountIn));
          }
        }
      }
    }
    
    // Calculate execution time
    const executionTime = (performance.now() - startTime) / 1000;
    
    console.log(`\nData collection complete.`);
    console.log(`Processed ${END_BLOCK - START_BLOCK} blocks`);
    console.log(`Processed ${totalTraces} traces`);
    console.log(`Found ${swapRecords.length} swap records`);
    console.log(`Successful decodes: ${successfulDecodes}`);
    console.log(`Unique input tokens: ${uniqueInputTokens.size}`);
    console.log(`Unique output tokens: ${uniqueOutputTokens.size}`);
    console.log(`Unique recipients: ${uniqueRecipients.size}`);
    
    // Calculate total input amount (if any swaps were found)
    if (inputAmounts.length > 0) {
      const totalInputAmount = inputAmounts.reduce((acc, val) => acc.plus(val), new BigNumber(0));
      console.log(`Total input amount: ${totalInputAmount.toString()}`);
    }
    
    console.log(`Total execution time: ${executionTime.toFixed(2)} seconds`);
    
    // Save to Parquet format
    if (swapRecords.length > 0) {
      const writer = await parquet.ParquetWriter.openFile(swapSchema, path.resolve(__dirname, PARQUET_OUTPUT_PATH));
      
      for (const record of swapRecords) {
        await writer.appendRow(record);
      }
      
      await writer.close();
      console.log(`Data saved to ${PARQUET_OUTPUT_PATH}`);
    } else {
      console.log('No swap records found, skipping Parquet file creation');
    }
    
  } catch (error) {
    console.error('Error collecting swap data:', error);
  }
}

main().catch(console.error); 