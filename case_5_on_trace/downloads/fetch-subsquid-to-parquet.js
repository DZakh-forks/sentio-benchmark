const fs = require('fs');
const path = require('path');
const axios = require('axios');
const parquet = require('parquetjs');

// Create output directory if it doesn't exist
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Output file path
const outputPath = path.join(dataDir, 'subsquid-case5-swaps.parquet');

// Subsquid API endpoint for case 5
// Note: This URL needs to be updated with the actual Subsquid endpoint for case 5
const SUBSQUID_ENDPOINT = 'https://pine-quench.squids.live/case-5-on-trace@v1/api/graphql';

// Define the GraphQL query for Uniswap V2 swap events
const swapsQuery = `
query SwapEvents($limit: Int!, $offset: Int!) {
  swapEvents(limit: $limit, offset: $offset, orderBy: blockNumber_ASC) {
    id
    blockNumber
    transactionHash
    sender
    amountIn
    amountOut
    tokenIn
    tokenOut
  }
}
`;

// Define the Parquet schema for swap records
const swapSchema = new parquet.ParquetSchema({
  id: { type: 'UTF8' },
  blockNumber: { type: 'INT64' },
  transactionHash: { type: 'UTF8' },
  sender: { type: 'UTF8' },
  amountIn: { type: 'UTF8' }, // Using UTF8 for large numbers
  amountOut: { type: 'UTF8' }, // Using UTF8 for large numbers
  tokenIn: { type: 'UTF8' },
  tokenOut: { type: 'UTF8' }
});

// Function to fetch and save Subsquid data
async function fetchSubsquidData() {
  try {
    console.log('Fetching Uniswap V2 swap data from Subsquid...');
    
    // Create a Parquet writer
    const writer = await parquet.ParquetWriter.openFile(swapSchema, outputPath);
    
    const pageSize = 1000;
    let offset = 0;
    let totalRows = 0;
    let hasMoreData = true;
    
    while (hasMoreData) {
      console.log(`Fetching page with offset ${offset}, limit ${pageSize}...`);
      
      try {
        const response = await axios.post(
          SUBSQUID_ENDPOINT,
          {
            query: swapsQuery,
            variables: { limit: pageSize, offset: offset }
          },
          {
            headers: { 'Content-Type': 'application/json' },
            timeout: 60000 // 1 minute timeout
          }
        );
        
        if (response.data && response.data.data && response.data.data.swapEvents) {
          const swapRecords = response.data.data.swapEvents;
          console.log(`Received ${swapRecords.length} swap records`);
          
          if (swapRecords.length === 0) {
            hasMoreData = false;
            break;
          }
          
          // Add records to parquet file
          for (const record of swapRecords) {
            await writer.appendRow({
              id: record.id,
              blockNumber: BigInt(record.blockNumber),
              transactionHash: record.transactionHash || '',
              sender: record.sender || '',
              amountIn: record.amountIn ? record.amountIn.toString() : '0',
              amountOut: record.amountOut ? record.amountOut.toString() : '0',
              tokenIn: record.tokenIn || '',
              tokenOut: record.tokenOut || ''
            });
          }
          
          totalRows += swapRecords.length;
          console.log(`Total records processed so far: ${totalRows}`);
          
          // Continue pagination only if we received a full page
          hasMoreData = swapRecords.length === pageSize;
          offset += swapRecords.length;
          
          // Add a small delay to avoid overwhelming the API
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          console.error('Invalid response format:', response.data);
          hasMoreData = false;
        }
      } catch (error) {
        console.error('Error fetching Subsquid data:', error.message);
        if (error.response) {
          console.error('Response status:', error.response.status);
          console.error('Response data:', error.response.data);
        }
        hasMoreData = false;
      }
    }
    
    await writer.close();
    console.log(`Saved ${totalRows} swap records to ${outputPath}`);
    return { success: true, count: totalRows };
  } catch (error) {
    console.error('Error in fetchSubsquidData:', error);
    return { success: false, error: error.message };
  }
}

// Main function
async function main() {
  console.log('Starting data collection from Subsquid for case 5...');
  
  const result = await fetchSubsquidData();
  
  if (result.success) {
    console.log(`Successfully collected ${result.count} swap records from Subsquid`);
  } else {
    console.error(`Failed to collect Subsquid data: ${result.error}`);
  }
  
  console.log('Data collection complete!');
}

// Run the main function
main().catch(error => {
  console.error('Error in main execution:', error);
  process.exit(1);
}); 