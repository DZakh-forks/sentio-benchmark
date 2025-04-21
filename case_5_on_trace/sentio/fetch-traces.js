import { keccak256, toHex } from "viem";
import {
  HypersyncClient,
  JoinMode,
  BlockField,
  TraceField,
} from "@envio-dev/hypersync-client";
import { BigNumber } from 'bignumber.js';
import * as fs from 'fs';
import * as path from 'path';
import parquet from 'parquetjs';
import { fileURLToPath } from 'url';

// Set up constants
const UNISWAP_V2_ROUTER = '0x7a250d5630b4cf539739df2c5dacb4c659f2488d'.toLowerCase();
const SWAP_METHOD_SIGNATURE = '0x38ed1739'; // swapExactTokensForTokens
const START_BLOCK = 22280000;
const END_BLOCK = 22290000;
const OUTPUT_PATH = '../data/sentio-case5-swap-data.json';
const PARQUET_OUTPUT_PATH = '../data/sentio-case5-swap-data.parquet';

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
    
    // Extract token addresses from the path array
    // First, we need to find where the path array starts
    const pathOffset = 192; // This is the offset to the first element in the path array
    
    // Extract token addresses (first two tokens in the path)
    const tokenIn = `0x${parametersHex.slice(pathOffset + 24, pathOffset + 64)}`;
    const tokenOut = `0x${parametersHex.slice(pathOffset + 64 + 24, pathOffset + 64 + 64)}`;
    
    // Extract recipient address
    const toOffset = 320; // This is approximately where the 'to' address starts
    const to = `0x${parametersHex.slice(toOffset + 24, toOffset + 64)}`;
    
    // Convert hex values to BigNumber for safe handling of large numbers
    const amountIn = new BigNumber(`0x${amountInHex}`).toString(10);
    const amountOutMin = new BigNumber(`0x${amountOutMinHex}`).toString(10);
    
    return {
      tokenIn,
      tokenOut,
      amountIn,
      amountOutMin,
      to
    };
  } catch (error) {
    console.error('Error decoding swap parameters:', error);
    return null;
  }
}

const main = async () => {
  console.log(`Collecting Uniswap V2 swap trace data from blocks ${START_BLOCK} to ${END_BLOCK}`);
  
  // Initialize data structures for collecting swap info
  const swapRecords = [];
  const uniqueInputTokens = new Set();
  const uniqueOutputTokens = new Set();
  const uniqueRecipients = new Set();
  const inputAmounts = [];
  let successfulDecodes = 0;
  let totalTraces = 0;
  
  // Start measuring time
  const startTime = performance.now();
  
  try {
    // Initialize HyperSync client
    const client = await HypersyncClient.new({
      url: "http://eth.hypersync.xyz",
    });
    console.log('HyperSync client initialized');
    
    // Define query for Uniswap V2 Router traces
    let query = {
      fromBlock: START_BLOCK,
      toBlock: END_BLOCK,
      traces: [
        {
          to: [UNISWAP_V2_ROUTER],
          callType: ["CALL"]
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
          TraceField.Type,
          TraceField.Gas,
          TraceField.GasUsed,
        ],
        block: [
          BlockField.Timestamp,
          BlockField.Number
        ],
      },
      joinMode: JoinMode.JoinBlocks,
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
      if (res.nextBlock) {
        console.log(`Processing at block ${res.nextBlock}`);
      }
      
      // Skip if no trace data
      if (!res.data || !res.data.traces) {
        continue;
      }
      
      // Process traces in this response
      const traces = res.data.traces;
      const blockNumber = res.data.block?.number || 0;
      const timestamp = res.data.block?.timestamp || Math.floor(Date.now() / 1000);
      
      console.log(`Found ${traces.length} traces in batch`);
      totalTraces += traces.length;
      
      // Process each trace
      for (const trace of traces) {
        if (trace.to && trace.to.toLowerCase() === UNISWAP_V2_ROUTER && 
            trace.input && trace.input.startsWith(SWAP_METHOD_SIGNATURE)) {
            
          const swapParams = decodeSwapParams(trace.input);
          
          if (swapParams) {
            successfulDecodes++;
            
            const swapRecord = {
              traceHash: trace.traceHash || `trace-${trace.transactionHash}-${successfulDecodes}`,
              txHash: trace.transactionHash,
              blockNumber: trace.blockNumber || blockNumber,
              tokenIn: swapParams.tokenIn,
              tokenOut: swapParams.tokenOut,
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
            
            if (swapRecords.length % 10 === 0) {
              console.log(`Found ${swapRecords.length} swap records so far`);
            }
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
    
    // Save the data to a JSON file
    fs.writeFileSync(path.resolve(__dirname, OUTPUT_PATH), JSON.stringify(swapRecords, null, 2));
    console.log(`Data saved to ${OUTPUT_PATH}`);
    
    // Save to Parquet format
    try {
      if (swapRecords.length > 0) {
        const writer = await parquet.ParquetWriter.openFile(swapSchema, path.resolve(__dirname, PARQUET_OUTPUT_PATH));
        
        for (const record of swapRecords) {
          await writer.appendRow(record);
        }
        
        await writer.close();
        console.log(`Data saved to ${PARQUET_OUTPUT_PATH}`);
      } else {
        console.log('Cannot write a parquet file with zero rows');
      }
    } catch (error) {
      console.error('Error saving to Parquet:', error);
    }
    
    console.log(`Total execution time: ${executionTime.toFixed(2)} seconds`);
    
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
};

main(); 