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
const outputPath = path.join(dataDir, 'sentio-case4-gas.parquet');

// Sentio API details
const SENTIO_API_KEY = 'hnZ7Z8cRsoxRadrVdhih2jRjBlH0lIYWl'; // Use the provided API key
const SENTIO_API_URL = 'https://app.sentio.xyz/api/v1/analytics/yufei/case_4_on_transaction/sql/execute';

// Define the Parquet schema for gas records
const gasSchema = new parquet.ParquetSchema({
  id: { type: 'UTF8' },
  blockNumber: { type: 'INT64' },
  transactionHash: { type: 'UTF8' },
  sender: { type: 'UTF8' },
  recipient: { type: 'UTF8' },
  gasValue: { type: 'UTF8' }, // Using UTF8 for large numbers
  gasUsed: { type: 'UTF8' }, // Not present in Sentio schema but included for compatibility
  gasPrice: { type: 'UTF8' } // Not present in Sentio schema but included for compatibility
});

// Function to fetch data from Sentio API
async function fetchSentioData() {
  try {
    console.log('Fetching gas usage data from Sentio for case 4...');
    
    // Create Parquet writer
    const writer = await parquet.ParquetWriter.openFile(gasSchema, outputPath);
    
    // Sentio SQL query for gas data
    const sqlQuery = `
      SELECT 
        id, 
        blockNumber, 
        transactionHash, 
        from__ as sender, 
        to__ as recipient,
        gasValue 
      FROM 
        GasSpent
      ORDER BY 
        blockNumber ASC
      LIMIT 2000000
    `;
    
    const pageSize = 1000;
    let offset = 0;
    let totalRows = 0;
    let hasMoreData = true;
    
    // Fetch in batches to avoid memory issues
    while (hasMoreData) {
      console.log(`Fetching page ${Math.floor(offset/pageSize) + 1} (offset: ${offset}, limit: ${pageSize})...`);
      
      try {
        const response = await axios({
          method: 'post',
          url: SENTIO_API_URL,
          headers: {
            'Content-Type': 'application/json',
            'api-key': SENTIO_API_KEY,
          },
          data: {
            sqlQuery: {
              sql: sqlQuery,
              params: {},
              offset: offset,
              limit: pageSize
            }
          },
          timeout: 60000 // 1 minute timeout
        });
        
        // The API returns results in response.result.rows
        if (response.data && response.data.result && response.data.result.rows && Array.isArray(response.data.result.rows)) {
          const rows = response.data.result.rows;
          console.log(`Received ${rows.length} records`);
          
          if (rows.length === 0) {
            console.log('No more data available or empty response received.');
            hasMoreData = false;
            break;
          }
          
          // Process rows and write to Parquet file
          for (const row of rows) {
            const record = {
              id: row.id || '',
              blockNumber: BigInt(row.blockNumber || 0),
              transactionHash: row.transactionHash || '',
              sender: row.sender || '',
              recipient: row.recipient || '',
              gasValue: row.gasValue ? row.gasValue.toString() : '0',
              gasUsed: '0', // Not provided by Sentio
              gasPrice: '0'  // Not provided by Sentio
            };
            
            await writer.appendRow(record);
          }
          
          totalRows += rows.length;
          console.log(`Total records processed so far: ${totalRows}`);
          
          // Continue pagination only if we received a full page
          hasMoreData = rows.length === pageSize;
          offset += rows.length;
          
          // Add a small delay to avoid overwhelming the API
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          console.log('Invalid response format or no data returned', response.data);
          hasMoreData = false;
        }
      } catch (error) {
        console.error('Error fetching Sentio data:', error.message);
        if (error.response) {
          console.error('Response status:', error.response.status);
          console.error('Response data:', error.response.data);
        }
        hasMoreData = false;
      }
    }
    
    if (totalRows === 0) {
      throw new Error('no_data_fetched');
    }
    
    await writer.close();
    console.log(`Saved ${totalRows} gas records to ${outputPath}`);
    return { success: true, count: totalRows };
  } catch (error) {
    console.error('Error in fetchSentioData:', error);
    return { success: false, error: error.message };
  }
}

// Main function
async function main() {
  console.log('Starting gas usage data collection from Sentio for case 4...');
  
  const result = await fetchSentioData();
  
  if (result.success) {
    console.log(`Successfully collected ${result.count} gas records from Sentio`);
  } else {
    console.error(`Failed to collect complete data: ${result.error}`);
  }
  
  console.log('Data collection complete!');
}

// Run the main function
main().catch(error => {
  console.error('Error in main execution:', error);
  process.exit(1);
}); 