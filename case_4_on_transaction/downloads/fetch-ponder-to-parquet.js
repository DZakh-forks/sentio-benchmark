const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const parquet = require('parquetjs');

// Create output directory if it doesn't exist
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Output file path
const outputPath = path.join(dataDir, 'ponder-case4-gas.parquet');

// Ponder database details from the user
const connectionString = 'postgresql://postgres:YyWuPpZNatmmOXvczRYqKRYzMkkPTaVD@interchange.proxy.rlwy.net:28331/railway';
const schemaId = '3c87291b-dad4-4e60-b1d6-f1cd2cb48649';

// Define the Parquet schema for gas records
const gasSchema = new parquet.ParquetSchema({
  id: { type: 'UTF8' },
  blockNumber: { type: 'INT64' },
  transactionHash: { type: 'UTF8' },
  sender: { type: 'UTF8' },
  recipient: { type: 'UTF8' },
  gasPrice: { type: 'UTF8' }, // Using UTF8 for large numbers
  gasUsed: { type: 'UTF8' }, // Using UTF8 for large numbers
  transactionIndex: { type: 'INT32' },
  timestamp: { type: 'INT64' }
});

// Function to fetch and save Ponder data
async function fetchPonderData() {
  // Create a PostgreSQL client
  const client = new Client({
    connectionString: connectionString
  });

  try {
    console.log('Connecting to Ponder PostgreSQL database...');
    await client.connect();
    console.log('Connected to database. Checking schemas...');
    
    // List available schemas
    const schemasResult = await client.query('SELECT schema_name FROM information_schema.schemata');
    console.log('Available schemas:', schemasResult.rows.map(r => r.schema_name).join(', '));
    
    // Check if our schema exists
    const schemaExists = schemasResult.rows.some(row => row.schema_name === schemaId);
    
    // Set schema to use
    let schemaToUse = 'public';
    if (schemaExists) {
      schemaToUse = schemaId;
      console.log(`Using schema: ${schemaToUse}`);
    } else {
      console.log(`Schema ${schemaId} not found, using public schema`);
    }
    
    // List available tables in the schema
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = $1
    `, [schemaToUse]);
    
    console.log(`Tables in ${schemaToUse} schema:`, tablesResult.rows.map(r => r.table_name).join(', '));
    
    // Look for gas_spent table or similar
    let tableName = null;
    
    // First look for gas_spent table
    const gasSpentExists = tablesResult.rows.some(row => row.table_name === 'gas_spent');
    if (gasSpentExists) {
      tableName = 'gas_spent';
    } else {
      // Look for similar tables
      const gasRelatedTables = tablesResult.rows.filter(row => 
        row.table_name.includes('gas') || 
        row.table_name.includes('transaction') || 
        row.table_name.includes('tx')
      );
      
      if (gasRelatedTables.length > 0) {
        tableName = gasRelatedTables[0].table_name;
      } else if (tablesResult.rows.length > 0) {
        tableName = tablesResult.rows[0].table_name;
      }
    }
    
    if (!tableName) {
      throw new Error('No suitable tables found in the database');
    }
    
    console.log(`Using table: ${tableName}`);
    
    // Check table schema
    const columnsResult = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = $1 AND table_name = $2
    `, [schemaToUse, tableName]);
    
    console.log(`Columns in ${schemaToUse}.${tableName}:`, 
      columnsResult.rows.map(r => `${r.column_name} (${r.data_type})`).join(', '));
    
    // Create Parquet writer
    console.log('Creating Parquet writer...');
    const writer = await parquet.ParquetWriter.openFile(gasSchema, outputPath);
    
    // Block range from the README
    const startBlock = 22280000;
    const endBlock = 22290000;
    
    // Count total records
    const countQuery = `
      SELECT COUNT(*) as count 
      FROM "${schemaToUse}"."${tableName}" 
      WHERE "blockNumber" >= $1 AND "blockNumber" <= $2
    `;
    
    try {
      const countResult = await client.query(countQuery, [startBlock, endBlock]);
      const totalCount = parseInt(countResult.rows[0].count);
      console.log(`Total records to fetch: ${totalCount}`);
    } catch (countError) {
      console.warn('Error counting records:', countError.message);
      console.log('Continuing without count...');
    }
    
    // Fetch in batches to avoid memory issues
    const batchSize = 1000;
    let offset = 0;
    let totalRows = 0;
    let hasMoreData = true;
    
    console.log('Fetching gas usage data in batches...');
    
    while (hasMoreData) {
      console.log(`Fetching batch with offset ${offset}, limit ${batchSize}...`);
      
      try {
        // Query with pagination
        const query = `
          SELECT * FROM "${schemaToUse}"."${tableName}"
          WHERE "blockNumber" >= $1 AND "blockNumber" <= $2
          ORDER BY "blockNumber"
          LIMIT $3 OFFSET $4
        `;
        
        const result = await client.query(query, [startBlock, endBlock, batchSize, offset]);
        const records = result.rows;
        
        console.log(`Received ${records.length} records`);
        
        if (records.length === 0) {
          hasMoreData = false;
          break;
        }
        
        // Show sample of first record
        if (offset === 0 && records.length > 0) {
          console.log('Sample record:', JSON.stringify(records[0]));
        }
        
        // Add records to parquet file
        for (const record of records) {
          // Map database fields to Parquet schema
          await writer.appendRow({
            id: record.id || `${record.blockNumber}-${record.transactionIndex || 0}`,
            blockNumber: BigInt(record.blockNumber || 0),
            transactionHash: record.transactionHash || record.hash || record.id || '',
            sender: record.from || record.sender || '',
            recipient: record.to || record.recipient || '',
            gasPrice: record.gasPrice ? record.gasPrice.toString() : '0',
            gasUsed: record.gasUsed ? record.gasUsed.toString() : '0',
            transactionIndex: record.transactionIndex || 0,
            timestamp: record.timestamp ? BigInt(record.timestamp) : BigInt(0)
          });
        }
        
        totalRows += records.length;
        console.log(`Total records processed so far: ${totalRows}`);
        
        // Continue pagination only if we received a full batch
        hasMoreData = records.length === batchSize;
        offset += records.length;
      } catch (error) {
        console.error('Error fetching data batch:', error.message);
        hasMoreData = false;
      }
    }
    
    await writer.close();
    console.log(`Saved ${totalRows} gas records to ${outputPath}`);
    return { success: true, count: totalRows };
  } catch (error) {
    console.error('Error in fetchPonderData:', error);
    return { success: false, error: error.message };
  } finally {
    // Close the database connection
    try {
      await client.end();
      console.log('Database connection closed');
    } catch (closeError) {
      console.error('Error closing database connection:', closeError.message);
    }
  }
}

// Main function
async function main() {
  console.log('Starting data collection from Ponder for case 4...');
  
  const result = await fetchPonderData();
  
  if (result.success) {
    console.log(`Successfully collected ${result.count} gas records from Ponder`);
    
    // Verify file
    if (result.count > 0) {
      try {
        const stats = fs.statSync(outputPath);
        console.log(`Parquet file size: ${(stats.size / (1024 * 1024)).toFixed(2)} MB`);
        
        // Try to read the first few records to verify
        const reader = await parquet.ParquetReader.openFile(outputPath);
        const cursor = reader.getCursor();
        const sampleRecords = await cursor.next(5);
        console.log('Sample records:', JSON.stringify(sampleRecords, null, 2));
        
        const totalRows = reader.getRowCount();
        console.log(`Total rows in Parquet file: ${totalRows}`);
        
        reader.close();
      } catch (verifyError) {
        console.error('Error verifying file:', verifyError);
      }
    }
  } else {
    console.error(`Failed to collect Ponder data: ${result.error}`);
  }
  
  console.log('Data collection complete!');
}

// Run the main function
main().catch(error => {
  console.error('Error in main execution:', error);
  process.exit(1);
}); 