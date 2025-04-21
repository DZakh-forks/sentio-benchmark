const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const parquet = require('parquetjs');

// Output directory setup
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Subsquid database details
const DB_CONFIG = {
  host: 'pg.squid.subsquid.io',
  database: '16175_0hotg1',
  user: '16175_0hotg1',
  password: '2lABMqtGktrOpcaZwKEVbwM2GAxXamat',
  // Increase connection timeout to 30 seconds
  connectionTimeoutMillis: 30000,
  // Increase query timeout to 3 minutes
  statement_timeout: 180000
};

// Schema definitions
const transferSchema = new parquet.ParquetSchema({
  id: { type: 'UTF8' },
  blockNumber: { type: 'INT64' },
  transactionHash: { type: 'UTF8' },
  from: { type: 'UTF8' },
  to: { type: 'UTF8' },
  value: { type: 'UTF8' } // Using UTF8 for large numbers
});

const accountSchema = new parquet.ParquetSchema({
  id: { type: 'UTF8' },
  balance: { type: 'UTF8' }, // Using UTF8 for large numbers
  point: { type: 'UTF8' },   // Add point field
  timestamp: { type: 'INT64' } // Add timestamp field
});

async function fetchSubsquidData() {
  const client = new Client(DB_CONFIG);
  await client.connect();
  
  // Set statement timeout
  await client.query(`SET statement_timeout TO ${DB_CONFIG.statement_timeout}`);
  
  // Fetch and save transfer data
  await fetchTransfers(client);
  
  // Fetch and save account data
  await fetchAccounts(client);
  
  // Close the database connection
  await client.end();
  console.log('Subsquid data fetching complete!');
}

async function fetchTransfers(client) {
  const outputPath = path.join(dataDir, 'subsquid-case2-transfers.parquet');
  
  // Remove existing file if it exists
  if (fs.existsSync(outputPath)) {
    fs.unlinkSync(outputPath);
    console.log(`Removed existing file: ${outputPath}`);
  }

  const writer = await parquet.ParquetWriter.openFile(transferSchema, outputPath);
  let offset = 0;
  const batchSize = 10000;
  let totalRows = 0;
  
  console.log('Fetching transfer data from Subsquid PostgreSQL...');
  
  while (true) {
    console.log(`Fetching transfers with offset ${offset}...`);
    
    const result = await client.query(
      `SELECT id, block_number, 
              encode(transaction_hash, 'hex') as transaction_hash, 
              "from", "to", value::text 
       FROM transfer 
       ORDER BY id 
       LIMIT $1 OFFSET $2`,
      [batchSize, offset]
    );
    
    console.log(`Received ${result.rows.length} transfers`);
    
    if (result.rows.length === 0) {
      break;
    }
    
    for (const row of result.rows) {
      const record = {
        id: row.id || '',
        blockNumber: Number(row.block_number || 0),
        transactionHash: row.transaction_hash || '',
        from: row.from || '',
        to: row.to || '',
        value: row.value || '0'
      };
      
      await writer.appendRow(record);
    }
    
    totalRows += result.rows.length;
    offset += batchSize;
    
    if (result.rows.length < batchSize) {
      break;
    }
  }
  
  await writer.close();
  console.log(`Saved ${totalRows} transfer records to ${outputPath}`);
}

async function fetchAccounts(client) {
  const outputPath = path.join(dataDir, 'subsquid-case2-accounts.parquet');
  
  // Remove existing file if it exists
  if (fs.existsSync(outputPath)) {
    fs.unlinkSync(outputPath);
    console.log(`Removed existing file: ${outputPath}`);
  }

  const writer = await parquet.ParquetWriter.openFile(accountSchema, outputPath);
  let totalRows = 0;
  
  console.log('Fetching account data from Subsquid PostgreSQL...');
  
  // Query to get the latest snapshot for each account
  const query = `
    WITH latest_snapshots AS (
      SELECT DISTINCT ON (account_id) 
        account_id AS id, 
        balance::text AS balance,
        point::text AS point,
        timestamp_milli
      FROM snapshot
      ORDER BY account_id, timestamp_milli DESC
    )
    SELECT * FROM latest_snapshots
    ORDER BY id
  `;
  
  const result = await client.query(query);
  console.log(`Received ${result.rows.length} accounts`);
  
  for (const row of result.rows) {
    const record = {
      id: row.id || '',
      balance: row.balance || '0',
      point: row.point || '0',
      timestamp: row.timestamp_milli ? Number(row.timestamp_milli) : 0
    };
    
    await writer.appendRow(record);
    totalRows++;
  }
  
  await writer.close();
  console.log(`Saved ${totalRows} account records to ${outputPath}`);
}

// Run the script with error handling
async function runWithErrorHandling() {
  try {
    await fetchSubsquidData();
  } catch (error) {
    console.error('Error occurred during data fetching:');
    console.error(error);
    process.exit(1);
  }
}

runWithErrorHandling(); 