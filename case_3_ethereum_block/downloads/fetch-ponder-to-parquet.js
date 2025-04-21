const { Pool } = require('pg');
const { writeFileSync } = require('fs');
const { unlink } = require('fs/promises');
const parquet = require('parquetjs');

// Configuration
const PONDER_CONNECTION_STRING = 'postgresql://postgres:LhYOfYxqnQbQAXQJrKdznIkDDTmsZHGC@yamabiko.proxy.rlwy.net:34027/railway';
const PONDER_SCHEMA = 'fb1dbd8f-487b-4ffe-be34-e440181efa32';
const OUTPUT_DIR = '/Users/yufeili/Desktop/sentio/indexer-benchmark/case_3_ethereum_block/data';
const BLOCKS_FILE = `${OUTPUT_DIR}/ponder-case3-blocks.parquet`;

// Define the schema for Ethereum blocks
const blockSchema = new parquet.ParquetSchema({
  id: { type: 'UTF8' },
  number: { type: 'INT64' },
  hash: { type: 'UTF8' },
  parentHash: { type: 'UTF8' },
  timestamp: { type: 'INT64' },
  // Add more fields as needed
});

// Initialize PostgreSQL connection
const pool = new Pool({
  connectionString: PONDER_CONNECTION_STRING,
});

// Fetch blocks from Ponder with pagination for a specific range
async function fetchPonderBlocksRange(startBlock, endBlock, writer) {
  console.log(`Fetching Ponder blocks from ${startBlock} to ${endBlock}...`);
  
  try {
    // Parameters for pagination
    const pageSize = 5000;
    let offset = 0;
    let hasMore = true;
    let totalRecords = 0;
    
    while (hasMore) {
      try {
        console.log(`Fetching blocks from offset ${offset}...`);
        
        // Query the database with schema, pagination, and block range filtering
        const query = `
          SELECT 
            id, 
            number, 
            hash, 
            parent_hash as "parentHash", 
            timestamp
          FROM 
            "${PONDER_SCHEMA}"."block"
          WHERE
            number >= ${startBlock} AND number <= ${endBlock}
          ORDER BY 
            number ASC
          LIMIT ${pageSize} OFFSET ${offset}
        `;
        
        const result = await pool.query(query);
        
        if (result.rows.length === 0) {
          hasMore = false;
          console.log('No more blocks to fetch.');
          break;
        }
        
        // Process and write blocks to parquet
        for (const block of result.rows) {
          try {
            if (block.number === null || block.hash === null) {
              continue;
            }
            
            // Create a record in the right format
            const record = {
              id: block.id,
              number: BigInt(block.number),
              hash: block.hash,
              parentHash: block.parentHash || '',
              timestamp: BigInt(block.timestamp || 0)
            };
            
            await writer.appendRow(record);
            totalRecords++;
          } catch (rowErr) {
            console.error(`Error processing block: ${JSON.stringify(block)}`, rowErr);
          }
        }
        
        console.log(`Processed ${result.rows.length} blocks from offset ${offset}`);
        offset += result.rows.length;
        
        if (result.rows.length < pageSize) {
          hasMore = false;
        }
      } catch (fetchErr) {
        console.error(`Error fetching blocks at offset ${offset}:`, fetchErr.message);
        if (offset === 0) {
          throw fetchErr; // Fail if we can't even fetch the first page
        }
        hasMore = false;
      }
    }
    
    console.log(`Total blocks fetched for range ${startBlock}-${endBlock}: ${totalRecords}`);
    return totalRecords;
  } catch (error) {
    console.error(`Error fetching blocks for range ${startBlock}-${endBlock}:`, error);
    throw error;
  }
}

// Fetch specific ranges of blocks
async function fetchPonderBlocks() {
  console.log('Fetching Ponder blocks...');
  
  try {
    // Delete existing file
    try {
      await unlink(BLOCKS_FILE);
      console.log(`Deleted existing file: ${BLOCKS_FILE}`);
    } catch (err) {
      if (err.code !== 'ENOENT') {
        throw err;
      }
    }
    
    // Create a writer
    const writer = await parquet.ParquetWriter.openFile(blockSchema, BLOCKS_FILE);
    
    // Get the maximum block number first
    const maxBlockResult = await pool.query(`SELECT MAX(number) as "maxBlock" FROM "${PONDER_SCHEMA}"."block"`);
    
    let maxBlock = 10000000; // Default fallback
    if (maxBlockResult.rows.length > 0 && maxBlockResult.rows[0].maxBlock) {
      maxBlock = parseInt(maxBlockResult.rows[0].maxBlock);
      console.log(`Maximum block number: ${maxBlock}`);
    } else {
      console.warn('Could not determine maximum block number, using default of 10,000,000');
    }
    
    let totalRecords = 0;
    
    // Fetch first 150,000 blocks
    totalRecords += await fetchPonderBlocksRange(0, 149999, writer);
    
    // Fetch last 150,000 blocks
    const lastBlockStart = Math.max(150000, maxBlock - 149999);
    totalRecords += await fetchPonderBlocksRange(lastBlockStart, maxBlock, writer);
    
    // If no blocks were processed, write a dummy record
    if (totalRecords === 0) {
      console.warn('No blocks were processed, writing a dummy record');
      await writer.appendRow({
        id: '0',
        number: BigInt(0),
        hash: 'dummy',
        parentHash: 'dummy',
        timestamp: BigInt(0)
      });
    }
    
    await writer.close();
    console.log(`Total blocks fetched: ${totalRecords}`);
    return totalRecords;
  } catch (error) {
    console.error('Error fetching blocks:', error);
    throw error;
  } finally {
    // Close the database connection pool
    await pool.end();
  }
}

// Main function to test
async function main() {
  try {
    // Make sure output directory exists
    try {
      writeFileSync(`${OUTPUT_DIR}/.gitkeep`, '');
    } catch (err) {
      console.error('Error creating output directory:', err);
    }
    
    // Test database connection
    const client = await pool.connect();
    try {
      await client.query('SELECT 1');
      console.log('Connection to Ponder database successful');
    } finally {
      client.release();
    }
    
    // Fetch and save blocks
    const blockCount = await fetchPonderBlocks();
    
    console.log('Data fetching complete!');
    console.log(`Total blocks: ${blockCount}`);
  } catch (error) {
    console.error('Error running the script:', error);
    process.exit(1);
  }
}

// Run the main function
main(); 