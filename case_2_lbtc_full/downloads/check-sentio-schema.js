const axios = require('axios');

// Sentio API details
const API_KEY = 'hnZ7Z8cRsoxRadrVdhih2jRjBlH0lIYWl';
const BASE_URL = 'https://app.sentio.xyz/api/v1/analytics/yufei/case_2_lbtc_full/sql/execute';

async function checkSchema() {
  try {
    console.log('Checking Sentio API for point_update table and fields...');
    
    // SQL query to get a single record from point_update
    const sql = `
      SELECT *
      FROM point_update
      LIMIT 1
    `;
    
    const response = await axios.post(
      BASE_URL,
      {
        sqlQuery: {
          sql: sql
        }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'api-key': API_KEY
        },
        timeout: 60000 // 1 minute timeout
      }
    );
    
    // Check response structure
    if (response.data && response.data.result && response.data.result.rows && response.data.result.rows.length > 0) {
      const row = response.data.result.rows[0];
      console.log('Fields in point_update table:');
      console.log(JSON.stringify(Object.keys(row), null, 2));
      
      if ('point' in row) {
        console.log('\nThe point field exists in the point_update table!');
        console.log(`Sample value: ${row.point}`);
        console.log(`Value type: ${typeof row.point}`);
      } else {
        console.log('\nThe point field does NOT exist in the point_update table.');
      }
      
      // Show sample record
      console.log('\nSample record:');
      console.log(JSON.stringify(row, null, 2));
    } else {
      console.log('No records found in point_update table or table does not exist.');
      
      // Try listing all tables to see what's available
      console.log('\nChecking for available tables...');
      const tablesResponse = await axios.post(
        BASE_URL,
        {
          sqlQuery: {
            sql: `SHOW TABLES`
          }
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'api-key': API_KEY
          },
          timeout: 60000
        }
      );
      
      if (tablesResponse.data && tablesResponse.data.result && tablesResponse.data.result.rows) {
        console.log('Available tables:');
        console.log(JSON.stringify(tablesResponse.data.result.rows, null, 2));
      } else {
        console.log('Could not retrieve table list.');
      }
    }
  } catch (error) {
    console.error('Error checking schema:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run the script
checkSchema(); 