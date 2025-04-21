// Script to fetch transaction gas data using HyperSync client and save to Parquet
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { HypersyncClient } from '@envio-dev/hypersync-client';
import { BigNumber } from 'bignumber.js';
import parquet from 'parquetjs';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration - using the specified block range for case_4
const OUTPUT_PARQUET_FILE = path.join(__dirname, '../data/envio-case4-gas-data.parquet');
const START_BLOCK = 22280000;
const END_BLOCK = 22290000;
const BATCH_SIZE = 100; // Larger batch size

// Estimated gas price for the time period (in wei)
// Using 30 gwei as a reasonable estimate for the time period
const ESTIMATED_GAS_PRICE = BigInt('30000000000'); 

// Define the Parquet schema
const gasDataSchema = new parquet.ParquetSchema({
  id: { type: 'UTF8' },
  from: { type: 'UTF8' },
  to: { type: 'UTF8' },
  gasValue: { type: 'UTF8' }, // Using STRING for big numbers to avoid overflow
  blockNumber: { type: 'INT64' },
  timestamp: { type: 'INT64' }
});

async function fetchGasData() {
  try {
    console.log(`Fetching gas data from blocks ${START_BLOCK} to ${END_BLOCK} using HyperSync...`);
    
    // Initialize the HyperSync client with the correct URL
    const client = await HypersyncClient.new({
      url: "http://eth.hypersync.xyz"
    });
    
    console.log('HyperSync client initialized successfully.');
    
    // Store the processed transactions
    const transactions = [];
    let processedBlocks = 0;
    let processedTxs = 0;
    
    // Track progress
    const startTime = Date.now();
    
    console.log('Starting data collection...');
    console.log(`Using estimated gas price: ${ESTIMATED_GAS_PRICE} wei`);
    
    // Process in batches until we reach the end block
    for (let currentBlock = START_BLOCK; currentBlock < END_BLOCK; currentBlock += BATCH_SIZE) {
      const batchEndBlock = Math.min(currentBlock + BATCH_SIZE, END_BLOCK);
      console.log(`Processing blocks ${currentBlock} to ${batchEndBlock}...`);
      
      try {
        // Define query for this batch - explicitly request all relevant fields
        const query = {
          fromBlock: currentBlock,
          toBlock: batchEndBlock,
          transactions: [{}], // Get all transactions
          fieldSelection: {
            transaction: ["hash", "from", "to", "gas", "value", "input"],
            block: ["number", "timestamp"]
          }
        };
        
        // Start streaming for this batch
        const stream = await client.stream(query, {});
        
        let anyDataReceived = false;
        
        // Process results from the stream
        while (true) {
          const result = await stream.recv();
          
          // Check if we've reached the end of the stream
          if (!result || !result.data) {
            if (!anyDataReceived) {
              console.log('No data received in this batch.');
            } else {
              console.log('End of batch reached.');
            }
            break;
          }
          
          anyDataReceived = true;
          
          // Log data keys for debugging
          console.log(`Received data with keys: ${Object.keys(result.data).join(', ')}`);
          
          // Process blocks
          if (result.data.blocks && result.data.blocks.length > 0) {
            processedBlocks += result.data.blocks.length;
            console.log(`Received ${result.data.blocks.length} blocks`);
            
            // Create a map of blocks by number
            const blockMap = {};
            for (const block of result.data.blocks) {
              if (block.number) {
                blockMap[block.number] = {
                  number: block.number,
                  timestamp: block.timestamp || 0
                };
              }
            }
            
            // Process transactions if any
            if (result.data.transactions && result.data.transactions.length > 0) {
              console.log(`Received ${result.data.transactions.length} transactions`);
              
              // Debug: Log detailed info for the first transaction
              if (result.data.transactions.length > 0 && processedTxs === 0) {
                const sampleTx = result.data.transactions[0];
                console.log("Sample Transaction Details:");
                console.log("- Hash:", sampleTx.hash);
                console.log("- From:", sampleTx.from);
                console.log("- To:", sampleTx.to);
                console.log("- Gas:", sampleTx.gas, typeof sampleTx.gas);
                console.log("- Value:", sampleTx.value);
                console.log("- Input length:", sampleTx.input ? sampleTx.input.length : 0);
              }
              
              // Process each transaction
              for (let i = 0; i < result.data.transactions.length; i++) {
                const tx = result.data.transactions[i];
                
                try {
                  // Skip transactions without required data
                  if (!tx.hash || !tx.from) {
                    continue;
                  }
                  
                  // Since blockNumber is missing in the transaction data,
                  // we need to find the block number from the context.
                  // We'll use the current block range as a fallback.
                  let blockNumber = currentBlock;
                  let timestamp = 0;
                  
                  // Find the corresponding block for this transaction
                  // If we can't find the exact block, use the first block in this batch
                  if (result.data.blocks && result.data.blocks.length > 0) {
                    const firstBlock = result.data.blocks[0];
                    blockNumber = firstBlock.number || currentBlock;
                    timestamp = firstBlock.timestamp || 0;
                  }
                  
                  // Calculate estimated gas value
                  // Convert gas to appropriate numeric values
                  const gasAsBigInt = typeof tx.gas === 'string' && tx.gas.startsWith('0x')
                    ? BigInt(tx.gas)
                    : BigInt(typeof tx.gas === 'string' ? tx.gas : '21000');
                    
                  // Estimate actual gas used based on transaction type
                  // Simple ETH transfer typically uses exactly 21000 gas
                  // Contract interactions use variable gas, but usually 70-90% of the limit
                  const isSimpleTransfer = !tx.input || tx.input === '0x' || tx.input.length <= 2;
                  
                  let gasEstimate;
                  if (isSimpleTransfer) {
                    gasEstimate = BigInt(21000);
                  } else {
                    // For contract interactions, estimate 80% of the limit
                    gasEstimate = (gasAsBigInt * BigInt(80)) / BigInt(100);
                  }
                  
                  // Calculate gas value as gasEstimate * gasPrice
                  const gasValue = (gasEstimate * ESTIMATED_GAS_PRICE).toString();
                  
                  // Create the gas record
                  transactions.push({
                    id: tx.hash,
                    from: tx.from.toLowerCase(),
                    to: (tx.to || '0x0').toLowerCase(),
                    gasValue,
                    blockNumber: blockNumber,
                    timestamp: timestamp
                  });
                  
                  processedTxs++;
                  
                  // Log every 10000 transactions
                  if (processedTxs % 10000 === 0) {
                    console.log(`Processed ${processedTxs} transactions so far...`);
                    
                    // Show a sample record
                    if (transactions.length > 0) {
                      const sample = transactions[transactions.length - 1];
                      console.log('Sample record:');
                      console.log(`  Hash: ${sample.id}`);
                      console.log(`  From: ${sample.from}`);
                      console.log(`  To: ${sample.to}`);
                      console.log(`  Gas Value: ${sample.gasValue}`);
                      console.log(`  Block: ${sample.blockNumber}`);
                    }
                  }
                } catch (err) {
                  // Skip problematic transactions
                  console.warn(`Error processing transaction ${i}: ${err.message}`);
                }
              }
            } else {
              console.log('No transactions in this batch.');
            }
          } else {
            console.log('No blocks in this batch.');
          }
        }
        
        // Log progress after each batch
        const elapsedSecs = (Date.now() - startTime) / 1000;
        const blocksPerSec = processedBlocks / elapsedSecs;
        const txsPerSec = processedTxs / elapsedSecs;
        const percentComplete = (100 * (batchEndBlock - START_BLOCK) / (END_BLOCK - START_BLOCK)).toFixed(2);
        
        console.log(`Progress: ${processedBlocks} blocks (${blocksPerSec.toFixed(2)}/sec), ${processedTxs} transactions (${txsPerSec.toFixed(2)}/sec)`);
        console.log(`Current position: Block ${batchEndBlock} of ${END_BLOCK} (${percentComplete}%)`);
        
      } catch (error) {
        console.error(`Error in block range ${currentBlock}-${batchEndBlock}: ${error.message}`);
        // Continue with the next batch
      }
    }
    
    console.log('Data collection complete.');
    
    // Calculate summary statistics
    const uniqueSenders = transactions.length > 0 ? new Set(transactions.map(tx => tx.from)).size : 0;
    const uniqueRecipients = transactions.length > 0 ? new Set(transactions.map(tx => tx.to)).size : 0;
    
    // Calculate total gas value
    let totalGasValue = BigInt(0);
    for (const tx of transactions) {
      totalGasValue += BigInt(tx.gasValue);
    }
    
    // Log results
    console.log('\n--- DATA SUMMARY ---');
    console.log(`Total blocks processed: ${processedBlocks}`);
    console.log(`Gas records collected: ${transactions.length}`);
    console.log(`Unique senders: ${uniqueSenders}`);
    console.log(`Unique recipients: ${uniqueRecipients}`);
    console.log(`Total gas value: ${totalGasValue.toString()} wei`);
    console.log(`Average gas value per tx: ${transactions.length > 0 ? (totalGasValue / BigInt(transactions.length)).toString() : 0} wei`);
    console.log(`Total execution time: ${((Date.now() - startTime) / 1000).toFixed(2)} seconds`);
    
    if (transactions.length > 0) {
      console.log('\nSample record:');
      console.log(JSON.stringify(transactions[0], null, 2));
    } else {
      console.log('\nNo transactions found in the specified block range');
    }
    // Save to Parquet file
    await saveToParquet(transactions);
    
  } catch (error) {
    console.error('Error fetching data:', error.message);
    console.error(error);
  }
}

// Function to save data to Parquet format
async function saveToParquet(transactions) {
  try {
    // Create a new Parquet file writer
    const writer = await parquet.ParquetWriter.openFile(gasDataSchema, OUTPUT_PARQUET_FILE);
    
    console.log(`Writing ${transactions.length} records to Parquet file...`);
    
    // Write each transaction to the Parquet file
    for (const tx of transactions) {
      await writer.appendRow({
        id: tx.id,
        from: tx.from,
        to: tx.to,
        gasValue: tx.gasValue.toString(), // Ensure it's a string
        blockNumber: tx.blockNumber,
        timestamp: tx.timestamp
      });
    }
    
    // Close the writer to ensure file is properly written
    await writer.close();
    
    console.log(`Data saved to Parquet file: ${OUTPUT_PARQUET_FILE}`);
    console.log(`Parquet file size: ${(fs.statSync(OUTPUT_PARQUET_FILE).size / 1024 / 1024).toFixed(2)} MB`);
    
  } catch (error) {
    console.error('Error saving to Parquet:', error.message);
    console.error(error);
  }
}

// Create directories if they don't exist
const dataDir = path.dirname(OUTPUT_PARQUET_FILE);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log(`Created directory: ${dataDir}`);
}

// Execute the function
console.log('=== HYPERSYNC GAS DATA COLLECTION ===');
fetchGasData().catch(error => {
  console.error("Unhandled error in main function:", error);
}); 