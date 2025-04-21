const fs = require('fs');
const path = require('path');
const axios = require('axios');
const parquet = require('parquetjs');

// Output directory setup
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Envio GraphQL details - Updated to use remote endpoint
const ENVIO_ENDPOINT = 'https://indexer.dev.hyperindex.xyz/fe03cea/v1/graphql';  // Remote endpoint from README

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
  timestamp: { type: 'INT64' },
  point: { type: 'UTF8' } // Add point field
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
        
        // Log the full response for debugging
        console.log('Response received:', JSON.stringify(response.data, null, 2));
        
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
    await fetchEnvioSnapshots();
    
    // Step 1: Build a map of accountId to latest account snapshot
    console.log('Fetching all snapshots to build account balance map...');
    
    const accountBalanceMap = new Map();
    
    // Read the snapshots file we just created
    const snapshotReader = await parquet.ParquetReader.openFile(path.join(dataDir, 'envio-case2-snapshots.parquet'));
    const snapshotCursor = snapshotReader.getCursor();
    
    let snapshot;
    while (snapshot = await snapshotCursor.next()) {
      const accountId = snapshot.accountId;
      
      if (!accountBalanceMap.has(accountId) || 
          BigInt(snapshot.timestamp) > BigInt(accountBalanceMap.get(accountId).timestamp)) {
        accountBalanceMap.set(accountId, {
          balance: snapshot.balance,
          timestamp: snapshot.timestamp,
          point: snapshot.point
        });
      }
    }
    
    snapshotReader.close();
    
    console.log(`Built balance map for ${accountBalanceMap.size} accounts`);
    
    // Step 2: Create the accounts parquet file
    const writer = await parquet.ParquetWriter.openFile(accountSchema, outputPath);
    
    console.log('Fetching account data from Envio GraphQL...');
    let offset = 0;
    const pageSize = 1000;
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
            headers: { 'Content-Type': 'application/json' }
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
          
          // Make sure we have a BigInt for timestamp
          const timestamp = BigInt(snapshotData.timestamp);
          
          // Multiply point by 10^8 to match balance scaling
          let pointValue = snapshotData.point || '0';
          if (pointValue !== '0') {
            // Try to convert to number, multiply, then back to string
            try {
              const pointNumber = parseFloat(pointValue) * 100000000;
              pointValue = pointNumber.toString();
            } catch (e) {
              console.warn(`Warning: Could not multiply point value for ${accountId}: ${pointValue}`);
            }
          }
          
          const record = {
            id: accountId,
            balance: snapshotData.balance,
            timestamp: timestamp,
            point: pointValue
          };
          
          await writer.appendRow(record);
          totalRows++;
        }
        
        offset += pageSize;
        
      } catch (error) {
        console.error('Error fetching accounts:', error.message);
        if (error.response) {
          console.error('Response data:', JSON.stringify(error.response.data, null, 2));
        }
        // Exit the loop on error
        break;
      }
    }
    
    // Write a dummy record if no accounts were processed to avoid Parquet errors
    if (totalRows === 0) {
      console.log('No accounts were processed. Writing a dummy record to avoid Parquet error.');
      await writer.appendRow({
        id: 'dummy',
        balance: '0',
        timestamp: BigInt(0),
        point: '0'
      });
      totalRows = 1;
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
  
  if (!returnData) {
    // Remove existing file if it exists
    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
      console.log(`Removed existing file: ${outputPath}`);
    }
  }
  
  try {
    let writer;
    if (!returnData) {
      writer = await parquet.ParquetWriter.openFile(snapshotSchema, outputPath);
    }
    
    let offset = 0;
    const limit = 1000;
    let totalRows = 0;
    const allSnapshots = [];
    
    console.log('Fetching snapshot data from Envio GraphQL...');
    
    while (true) {
      console.log(`Fetching snapshots with offset: ${offset}...`);
      
      const response = await axios.post(ENVIO_ENDPOINT, {
        query: `
          query {
            Snapshot(limit: ${limit}, offset: ${offset}, order_by: {id: asc}) {
              id
              account_id
              balance
              timestampMilli
              point
            }
          }
        `
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.data || !response.data.data || !response.data.data.Snapshot) {
        console.error('Invalid response structure:', response.data);
        break;
      }
      
      const snapshots = response.data.data.Snapshot;
      console.log(`Received ${snapshots.length} snapshots`);
      
      if (snapshots.length === 0) {
        break;
      }
      
      for (const snapshot of snapshots) {
        // Extract accountId from the id if account_id is null
        // The id format is "<accountId>-<timestamp>"
        let accountId = snapshot.account_id;
        if (!accountId && snapshot.id && snapshot.id.includes('-')) {
          accountId = snapshot.id.split('-')[0];
        }
        
        // Skip records without valid accountId
        if (!accountId) {
          console.log(`Skipping snapshot with invalid accountId: ${snapshot.id}`);
          continue;
        }
        
        const record = {
          id: snapshot.id,
          accountId: accountId,
          balance: snapshot.balance || '0',
          timestampMilli: BigInt(snapshot.timestampMilli || '0'),
          point: snapshot.point || '0' // Add point field
        };
        
        if (returnData) {
          allSnapshots.push(record);
        } else {
          await writer.appendRow(record);
        }
        totalRows++;
      }
      
      if (snapshots.length < limit) {
        break;
      }
      
      offset += limit;
    }
    
    if (returnData) {
      return allSnapshots;
    } else {
      // Write a dummy record if no snapshots were processed
      if (totalRows === 0) {
        console.log('No snapshots were processed. Writing a dummy record to avoid Parquet error.');
        await writer.appendRow({
          id: 'dummy',
          accountId: 'dummy',
          balance: '0',
          timestampMilli: BigInt(0),
          point: '0' // Add point field
        });
        totalRows = 1;
      }
      
      await writer.close();
      console.log(`Saved ${totalRows} snapshot records to ${outputPath}`);
      return totalRows;
    }
  } catch (error) {
    console.error('Error fetching snapshots:', error);
    if (returnData) {
      return [];
    }
    return 0;
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

// Main function
async function main() {
  try {
    // Test connection first
    const connected = await testConnection();
    if (!connected) {
      console.error('Could not connect to Envio API. Exiting.');
      return;
    }
    
    const transfersCount = await fetchEnvioTransfers();
    const accountsCount = await fetchEnvioAccounts();
    
    console.log('Envio data fetching complete!');
  } catch (error) {
    console.error('Error in main function:', error);
  }
}

// Run the script
main(); 