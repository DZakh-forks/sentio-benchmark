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
const outputPath = path.join(dataDir, 'subsquid-case4-gas.parquet');

// Subsquid API details
const SUBSQUID_ENDPOINT = 'https://pine-quench.squids.live/case-4-on-transaction@v1/api/graphql';

// Define the GraphQL query for gas records, updated to match actual schema
const gasQuery = `
query GasRecords($limit: Int!, $offset: Int!) {
  gasSpents(limit: $limit, offset: $offset, orderBy: blockNumber_ASC) {
    id
    blockNumber
    transactionHash
    from
    to
    gasValue
  }
}
`;

// Define the Parquet schema for gas records
const gasSchema = new parquet.ParquetSchema({
  id: { type: 'UTF8' },
  blockNumber: { type: 'INT64' },
  transactionHash: { type: 'UTF8' },
  sender: { type: 'UTF8' },
  recipient: { type: 'UTF8' },
  gasValue: { type: 'UTF8' }, // Using UTF8 for large numbers
  gasUsed: { type: 'UTF8' }, // Not in the schema but keeping for consistency
  gasPrice: { type: 'UTF8' } // Not in the schema but keeping for consistency
});

// Function to fetch and save Subsquid data
async function fetchSubsquidData() {
  try {
    console.log('Fetching gas usage data from Subsquid...');
    
    // Create a Parquet writer
    const writer = await parquet.ParquetWriter.openFile(gasSchema, outputPath);
    
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
            query: gasQuery,
            variables: { limit: pageSize, offset: offset }
          },
          {
            headers: { 'Content-Type': 'application/json' },
            timeout: 60000 // 1 minute timeout
          }
        );
        
        if (response.data && response.data.data && response.data.data.gasSpents) {
          const gasRecords = response.data.data.gasSpents;
          console.log(`Received ${gasRecords.length} gas records`);
          
          if (gasRecords.length === 0) {
            hasMoreData = false;
            break;
          }
          
          // Add records to parquet file
          for (const record of gasRecords) {
            await writer.appendRow({
              id: record.id,
              blockNumber: BigInt(record.blockNumber),
              transactionHash: record.transactionHash || '',
              sender: record.from || '',
              recipient: record.to || '',
              gasValue: record.gasValue ? record.gasValue.toString() : '0',
              gasUsed: '0', // Not provided by API
              gasPrice: '0'  // Not provided by API
            });
          }
          
          totalRows += gasRecords.length;
          console.log(`Total records processed so far: ${totalRows}`);
          
          // Continue pagination only if we received a full page
          hasMoreData = gasRecords.length === pageSize;
          offset += gasRecords.length;
          
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
    console.log(`Saved ${totalRows} gas records to ${outputPath}`);
    return { success: true, count: totalRows };
  } catch (error) {
    console.error('Error in fetchSubsquidData:', error);
    return { success: false, error: error.message };
  }
}

// Main function
async function main() {
  console.log('Starting data collection from Subsquid for case 4...');
  
  const result = await fetchSubsquidData();
  
  if (result.success) {
    console.log(`Successfully collected ${result.count} gas records from Subsquid`);
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