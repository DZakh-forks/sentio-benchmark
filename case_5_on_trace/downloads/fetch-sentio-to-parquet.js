const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');
const parquet = require('parquetjs'); // You may need to run: npm install parquetjs

// Create a writer once and keep appending to it
let writer = null;
let parquetSchema = null;

async function fetchSentioDataWithPagination() {
  try {
    console.log('Fetching complete dataset from Sentio for case 5 (Uniswap V2 traces)...');
    
    const pageSize = 5000;
    let totalRows = 0;
    let page = 0;
    let hasMoreData = true;
    
    // Block range
    const startBlock = 0;
    const endBlock = 22200000;
    
    // Fetch data in batches until we get everything
    while (hasMoreData) {
      const offset = page * pageSize;
      console.log(`Fetching page ${page + 1} (offset: ${offset}, limit: ${pageSize})...`);
      
      // Query with pagination
      const cmd = 'curl -L -X POST "https://app.sentio.xyz/api/v1/analytics/yufei/case_5_on_trace/sql/execute" ' +
        '-H "Content-Type: application/json" ' +
        '-H "api-key: hnZ7Z8cRsoxRadrVdhih2jRjBlH0lIYWl" ' +
        `-d '{"sqlQuery":{"sql":"SELECT * FROM UniswapV2SwapEvent WHERE block_number >= ${startBlock} AND block_number <= ${endBlock} ORDER BY transaction_hash, log_index LIMIT ${pageSize} OFFSET ${offset}"}}' --silent`;
      
      try {
        const result = execSync(cmd, { 
          encoding: 'utf8',
          maxBuffer: 100 * 1024 * 1024,
          timeout: 180000 // 3 minutes timeout
        });
        
        const data = JSON.parse(result);
        
        if (data.result && data.result.rows && data.result.rows.length > 0) {
          const rowsCount = data.result.rows.length;
          console.log(`Received ${rowsCount} rows on page ${page + 1}`);
          
          // Process the batch of data
          await processDataBatch(data.result.rows, page === 0);
          totalRows += rowsCount;
          console.log(`Total rows processed so far: ${totalRows}`);
          
          // Continue pagination only if we received a full page
          hasMoreData = rowsCount >= pageSize;
          page++;
          
          // Small delay to avoid overwhelming the API
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          console.log('No more data available or empty response received.');
          hasMoreData = false;
        }
      } catch (error) {
        console.error(`Error fetching page ${page + 1}:`, error.message);
        hasMoreData = false;
      }
    }
    
    if (totalRows === 0) {
      console.log('Failed to fetch any data.');
      return { success: false, error: 'no_data_fetched' };
    }
    
    // Finish up and close the Parquet writer
    if (writer) {
      await writer.close();
      console.log(`Complete dataset saved to Parquet file: sentio-case5-complete.parquet`);
    }
    
    console.log(`Successfully retrieved and processed ${totalRows} total rows of data`);
    return { success: true, count: totalRows };
  } catch (error) {
    console.error('Error in pagination process:', error.message);
    // Try to close the writer if it exists
    if (writer) {
      try {
        await writer.close();
      } catch (closeError) {
        console.error('Error closing Parquet writer:', closeError.message);
      }
    }
    return { success: false, error: 'pagination_error' };
  }
}

async function processDataBatch(dataBatch, isFirstBatch) {
  if (!dataBatch || dataBatch.length === 0) {
    return;
  }
  
  // Initialize the Parquet writer with the schema on the first batch
  if (isFirstBatch) {
    // Infer schema from the first row
    const firstRow = dataBatch[0];
    const schema = {};
    
    Object.keys(firstRow).forEach(key => {
      const value = firstRow[key];
      if (typeof value === 'number') {
        schema[key] = { type: 'DOUBLE' };
      } else if (typeof value === 'boolean') {
        schema[key] = { type: 'BOOLEAN' };
      } else {
        // Default to STRING for other types
        schema[key] = { type: 'UTF8' };
      }
    });
    
    console.log('Parquet schema:', JSON.stringify(schema, null, 2));
    console.log('Sample row fields:', Object.keys(dataBatch[0]).join(', '));
    
    // Create parquet schema and writer
    parquetSchema = new parquet.ParquetSchema(schema);
    writer = await parquet.ParquetWriter.openFile(parquetSchema, 'sentio-case5-complete.parquet');
    console.log('Parquet file initialized and ready for writing');
  }
  
  // Write all rows from this batch to the Parquet file
  if (writer) {
    for (const row of dataBatch) {
      await writer.appendRow(row);
    }
    console.log(`Wrote ${dataBatch.length} rows to Parquet file`);
  } else {
    console.error('Parquet writer not initialized');
  }
}

// Main function to fetch Sentio data
async function main() {
  console.log('Starting full data collection from Sentio for case 5...');
  
  const sentioResult = await fetchSentioDataWithPagination();
  console.log('Sentio fetch result:', sentioResult);
  
  if (sentioResult.success) {
    console.log(`Successfully collected ${sentioResult.count} total rows of data from Sentio.`);
  } else {
    console.error(`Failed to collect complete data: ${sentioResult.error}`);
  }
  
  console.log('Data collection complete!');
}

// Run the main function
main().catch(error => {
  console.error('Error in main execution:', error);
  process.exit(1);
}); 