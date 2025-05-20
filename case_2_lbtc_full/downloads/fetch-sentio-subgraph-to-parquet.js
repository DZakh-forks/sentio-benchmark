const fs = require('fs');
const path = require('path');
const axios = require('axios');
const parquet = require('parquetjs');

// Output directory setup
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Sentio API details
const SENTIO_API_ENDPOINT = 'https://app.sentio.xyz/api/v1/analytics/yufei/case_2_lbtc_full_subgraph/sql/execute';
const API_KEY = 'hnZ7Z8cRsoxRadrVdhih2jRjBlH0lIYWl';

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
  point: { type: 'UTF8' },   // Add point field for accounts
  timestamp: { type: 'INT64' } // Add timestamp field
});

// Fetch and save transfer data
async function fetchSentioTransfers() {
  const outputPath = path.join(dataDir, 'sentio-case2-transfers.parquet');
  
  // Remove existing file if it exists
  if (fs.existsSync(outputPath)) {
    fs.unlinkSync(outputPath);
    console.log(`Removed existing file: ${outputPath}`);
  }

  const writer = await parquet.ParquetWriter.openFile(transferSchema, outputPath);
  
  console.log('Fetching transfer data from Sentio...');
  
  try {
    const response = await axios.post(
      SENTIO_API_ENDPOINT,
      {
        sqlQuery: {
          sql: "SELECT * FROM `Transfer`"
        }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'api-key': API_KEY
        }
      }
    );

    if (!response.data?.result?.rows) {
      console.error('Invalid response structure:', JSON.stringify(response.data, null, 2));
      throw new Error('Invalid response structure from Sentio API');
    }

    const transfers = response.data.result.rows.map(row => {
      const transfer = {};
      response.data.result.columns.forEach((col, index) => {
        transfer[col] = row[index];
      });
      return transfer;
    });

    console.log(`Received ${transfers.length} transfers`);

    for (const transfer of transfers) {
      const record = {
        id: transfer.id || '',
        blockNumber: Number(transfer.blockNumber || 0),
        transactionHash: transfer.transactionHash || '',
        from: transfer.from__ || '', // Note: column name is from__
        to: transfer.to__ || '',     // Note: column name is to__
        value: transfer.value?.toString() || '0'
      };
      
      await writer.appendRow(record);
    }

    await writer.close();
    console.log(`Saved ${transfers.length} transfer records to ${outputPath}`);
    return transfers.length;
  } catch (error) {
    console.error('Error fetching transfers:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

// Fetch and save account data
async function fetchSentioAccounts() {
  const outputPath = path.join(dataDir, 'sentio-case2-accounts.parquet');
  
  if (fs.existsSync(outputPath)) {
    fs.unlinkSync(outputPath);
    console.log(`Removed existing file: ${outputPath}`);
  }

  try {
    const writer = await parquet.ParquetWriter.openFile(accountSchema, outputPath);
    
    console.log('Fetching account data from Sentio...');
    
    const response = await axios.post(
      SENTIO_API_ENDPOINT,
      {
        sqlQuery: {
          sql: `
            WITH LatestSnapshots AS (
              SELECT 
                account_id as id,
                MAX(timestamp) as max_timestamp
              FROM Snapshot
              GROUP BY account_id
            )
            SELECT 
              s.account_id as id,
              s.balance,
              s.point,
              s.timestamp
            FROM Snapshot s
            INNER JOIN LatestSnapshots ls 
              ON s.account_id = ls.id 
              AND s.timestamp = ls.max_timestamp
            WHERE s.account_id != '0x0000000000000000000000000000000000000000'
          `
        }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'api-key': API_KEY
        }
      }
    );

    if (!response.data?.result?.rows) {
      console.error('Invalid response structure:', JSON.stringify(response.data, null, 2));
      throw new Error('Invalid response structure from Sentio API');
    }

    const accounts = response.data.result.rows.map(row => {
      const account = {};
      response.data.result.columns.forEach((col, index) => {
        account[col] = row[index];
      });
      return account;
    });

    console.log(`Received ${accounts.length} accounts`);

    for (const account of accounts) {
      const record = {
        id: account.id,
        balance: account.balance?.toString() || '0',
        point: account.point?.toString() || '0',
        timestamp: parseInt(account.timestamp, 10) || 0
      };
      
      await writer.appendRow(record);
    }

    await writer.close();
    console.log(`Saved ${accounts.length} account records to ${outputPath}`);
    return accounts.length;
  } catch (error) {
    console.error('Error fetching accounts:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

// Main function
async function main() {
  try {
    console.log("Fetching transfers from Sentio...");
    const transferCount = await fetchSentioTransfers();
    console.log(`Fetching transfers completed. Retrieved ${transferCount} records.`);
    
    console.log("Fetching accounts from Sentio...");
    const accountCount = await fetchSentioAccounts();
    console.log(`Fetching accounts completed. Retrieved ${accountCount} records.`);
    
    console.log('Sentio data fetching complete!');
  } catch (error) {
    console.error('Error occurred during data fetching:');
    console.error(error);
    process.exit(1);
  }
}

// Run the script
main().catch(error => {
  console.error('Error occurred during data fetching:');
  console.error(error);
  process.exit(1);
}); 