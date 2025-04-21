const fs = require('fs');
const path = require('path');
const axios = require('axios');
const parquet = require('parquetjs');

// Output directory setup
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Envio GraphQL details - Updated to use the latest working endpoint
const ENVIO_ENDPOINT = 'https://indexer.dev.hyperindex.xyz/1cadf75/v1/graphql';  // Latest working endpoint

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
  timestamp: { type: 'INT64' } // Timestamp field
});

const snapshotSchema = new parquet.ParquetSchema({
  id: { type: 'UTF8' },
  accountId: { type: 'UTF8' },
  balance: { type: 'UTF8' }, // Using UTF8 for large numbers
  timestampMilli: { type: 'INT64' },
  point: { type: 'UTF8' } // Add point field
});

// Fetch and save transfer data
async function fetchEnvioTransfers() {
  const outputPath = path.join(dataDir, 'envio-case2-transfers.parquet');
  
  // Remove existing file if it exists
  if (fs.existsSync(outputPath)) {
    fs.unlinkSync(outputPath);
    console.log(`Removed existing file: ${outputPath}`);
  }

  try {
    const writer = await parquet.ParquetWriter.openFile(transferSchema, outputPath);
    let offset = 0;
    const pageSize = 1000;
    let totalRows = 0;
    
    console.log('Fetching transfer data from Envio GraphQL...');
    
    while (true) {
      console.log(`Fetching transfers with offset: ${offset}...`);
      
      // Updated query based on the schema
      const query = `
        query {
          Transfer(limit: ${pageSize}, offset: ${offset}, order_by: {id: asc}) {
            id
            blockNumber
            transactionHash
            from
            to
            value
          }
        }
      `;
      
      try {
        const response = await axios.post(
          ENVIO_ENDPOINT,
          { query },
          {
            headers: { 'Content-Type': 'application/json' },
            timeout: 180000 // 3 minute timeout
          }
        );
        
        // Check if response has the expected structure
        if (!response.data || !response.data.data || !response.data.data.Transfer) {
          console.log('Invalid response structure:', JSON.stringify(response.data, null, 2));
          break;
        }
        
        const transfers = response.data.data.Transfer;
        console.log(`Received ${transfers.length} transfers`);
        
        if (transfers.length === 0) {
          break;
        }
        
        for (const transfer of transfers) {
          const record = {
            id: transfer.id,
            blockNumber: BigInt(transfer.blockNumber),
            transactionHash: transfer.transactionHash,
            from: transfer.from,
            to: transfer.to,
            value: transfer.value
          };
          
          await writer.appendRow(record);
        }
        
        totalRows += transfers.length;
        offset += transfers.length;
        
        if (transfers.length < pageSize) {
          break;
        }
      } catch (error) {
        console.error('Error fetching transfers:', error.message);
        if (error.response) {
          console.error('Response status:', error.response.status);
          console.error('Response data:', JSON.stringify(error.response.data, null, 2));
        }
        break;
      }
    }
    
    await writer.close();
    console.log(`Saved ${totalRows} transfer records to ${outputPath}`);
  } catch (error) {
    console.error('Error in fetchEnvioTransfers:', error);
  }
}

// Fetch and save account data
async function fetchEnvioAccounts() {
  const outputPath = path.join(dataDir, 'envio-case2-accounts.parquet');
  
  // Remove existing file if it exists
  if (fs.existsSync(outputPath)) {
    fs.unlinkSync(outputPath);
    console.log(`Removed existing file: ${outputPath}`);
  }

  try {
    // Step 1: Fetch all snapshots directly to build account balance map
    console.log('Fetching all snapshots to build account balance map...');
    
    const accountBalanceMap = new Map();
    let offset = 0;
    const pageSize = 1000;
    
    while (true) {
      console.log(`Fetching snapshots with offset: ${offset}...`);
      
      try {
        const response = await axios.post(
          ENVIO_ENDPOINT,
          {
            query: `
              query {
                Snapshot(limit: ${pageSize}, offset: ${offset}, order_by: {timestampMilli: desc}) {
                  id
                  timestampMilli
                  balance
                  point
                }
              }
            `
          },
          {
            headers: { 'Content-Type': 'application/json' },
            timeout: 180000 // 3 minute timeout
          }
        );
        
        // Process the response data
        const snapshots = response.data.data.Snapshot;
        console.log(`Received ${snapshots.length} snapshots for balance mapping`);
        
        if (snapshots.length === 0) {
          break;
        }
        
        for (const snapshot of snapshots) {
          // Extract account ID from snapshot ID (format is typically: "accountId-timestamp")
          const parts = snapshot.id.split('-');
          if (parts.length < 2) continue;
          
          const accountId = parts[0];
          const timestamp = snapshot.timestampMilli || '0';
          
          if (!accountBalanceMap.has(accountId) || 
              BigInt(timestamp) > BigInt(accountBalanceMap.get(accountId).timestamp)) {
            accountBalanceMap.set(accountId, {
              balance: snapshot.balance || '0',
              timestamp: timestamp,
              point: snapshot.point || '0'
            });
          }
        }
        
        offset += snapshots.length;
        
        if (snapshots.length < pageSize) {
          break;
        }
      } catch (error) {
        console.error('Error fetching snapshots for balance mapping:', error.message);
        if (error.response) {
          console.error('Response status:', error.response.status);
          console.error('Response data:', JSON.stringify(error.response.data, null, 2));
        }
        break;
      }
    }
    
    console.log(`Built balance map for ${accountBalanceMap.size} accounts`);
    
    // Step 2: Create the accounts parquet file
    const writer = await parquet.ParquetWriter.openFile(accountSchema, outputPath);
    
    console.log('Fetching account data from Envio GraphQL...');
    offset = 0;
    let totalRows = 0;
    
    while (true) {
      console.log(`Fetching accounts with offset: ${offset}...`);
      
      try {
        const response = await axios.post(
          ENVIO_ENDPOINT,
          {
            query: `
              query {
                Accounts(limit: ${pageSize}, offset: ${offset}, order_by: {id: asc}) {
                  id
                  lastSnapshotTimestamp
                }
              }
            `
          },
          {
            headers: { 'Content-Type': 'application/json' },
            timeout: 180000 // 3 minute timeout
          }
        );
        
        // Process the response data
        const accounts = response.data.data.Accounts;
        console.log(`Received ${accounts.length} accounts`);
        
        if (accounts.length === 0) {
          break;
        }
        
        for (const account of accounts) {
          const accountId = account.id;
          
          // Get the latest snapshot data for this account
          const snapshotData = accountBalanceMap.get(accountId) || { 
            balance: '0', 
            timestamp: account.lastSnapshotTimestamp || '0',
            point: '0'
          };
          
          const record = {
            id: accountId,
            balance: snapshotData.balance,
            point: snapshotData.point,
            timestamp: BigInt(snapshotData.timestamp)
          };
          
          await writer.appendRow(record);
          totalRows++;
        }
        
        offset += accounts.length;
        
        if (accounts.length < pageSize) {
          break;
        }
      } catch (error) {
        console.error('Error fetching accounts:', error.message);
        if (error.response) {
          console.error('Response status:', error.response.status);
          console.error('Response data:', JSON.stringify(error.response.data, null, 2));
        }
        break;
      }
    }
    
    await writer.close();
    console.log(`Saved ${totalRows} account records to ${outputPath}`);
    return totalRows;
  } catch (error) {
    console.error('Error in fetchEnvioAccounts:', error);
    return 0;
  }
}

// Fetch and save snapshot data
async function fetchEnvioSnapshots(returnData = false) {
  const outputPath = path.join(dataDir, 'envio-case2-snapshots.parquet');
  
  // Remove existing file if it exists
  if (fs.existsSync(outputPath)) {
    fs.unlinkSync(outputPath);
    console.log(`Removed existing file: ${outputPath}`);
  }

  try {
    const writer = await parquet.ParquetWriter.openFile(snapshotSchema, outputPath);
    let offset = 0;
    const pageSize = 1000;
    let totalRows = 0;
    
    console.log('Fetching snapshot data from Envio GraphQL...');
    
    const allSnapshots = [];
    
    while (true) {
      console.log(`Fetching snapshots with offset: ${offset}...`);
      
      try {
        const response = await axios.post(
          ENVIO_ENDPOINT,
          {
            query: `
              query {
                Snapshot(limit: ${pageSize}, offset: ${offset}, order_by: {timestampMilli: desc}) {
                  id
                  timestampMilli
                  balance
                  point
                }
              }
            `
          },
          {
            headers: { 'Content-Type': 'application/json' },
            timeout: 180000 // 3 minute timeout
          }
        );
        
        // Process the response data
        const snapshots = response.data.data.Snapshot;
        console.log(`Received ${snapshots.length} snapshots`);
        
        if (snapshots.length === 0) {
          break;
        }
        
        for (const snapshot of snapshots) {
          // Extract account ID from snapshot ID (format is typically: "accountId-timestamp")
          const parts = snapshot.id.split('-');
          if (parts.length < 2) continue;
          
          const accountId = parts[0];
          
          const record = {
            id: snapshot.id,
            accountId: accountId,
            balance: snapshot.balance || '0',
            timestampMilli: BigInt(snapshot.timestampMilli || 0),
            point: snapshot.point || '0'
          };
          
          await writer.appendRow(record);
          if (returnData) {
            allSnapshots.push(record);
          }
        }
        
        totalRows += snapshots.length;
        offset += snapshots.length;
        
        if (snapshots.length < pageSize) {
          break;
        }
      } catch (error) {
        console.error('Error fetching snapshots:', error.message);
        if (error.response) {
          console.error('Response status:', error.response.status);
          console.error('Response data:', JSON.stringify(error.response.data, null, 2));
        }
        break;
      }
    }
    
    try {
      if (totalRows > 0) {
        await writer.close();
        console.log(`Saved ${totalRows} snapshot records to ${outputPath}`);
      } else {
        console.log('No snapshots found to save');
      }
    } catch (error) {
      console.error('Error closing writer:', error.message);
    }
    
    return returnData ? allSnapshots : null;
  } catch (error) {
    console.error('Error in fetchEnvioSnapshots:', error);
    return returnData ? [] : null;
  }
}

// Test connection before starting
async function testConnection() {
  console.log(`Testing connection to Envio endpoint: ${ENVIO_ENDPOINT}`);
  try {
    const response = await axios.post(
      ENVIO_ENDPOINT,
      { 
        query: `{ 
          Transfer(limit: 1) { 
            id 
          } 
        }`
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000 // 10 seconds timeout
      }
    );
    
    console.log('Connection test successful!');
    return true;
  } catch (error) {
    console.error('Connection test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
    return false;
  }
}

// Main execution function
async function main() {
  console.log('Starting Envio data extraction to Parquet files');
  
  try {
    await testConnection();
    
    console.log('1. Fetching transfers');
    const transferCount = await fetchEnvioTransfers();
    console.log(`Completed transfer fetch: ${transferCount} records saved\n`);
    
    console.log('2. Fetching accounts from snapshot data');
    const accountCount = await fetchEnvioAccounts();
    console.log(`Completed account fetch: ${accountCount} records saved\n`);
    
    console.log('All data has been successfully fetched and saved to Parquet files!');
  } catch (error) {
    console.error('Error in main execution:', error);
    process.exit(1);
  }
}

// Execute the main function
main(); 