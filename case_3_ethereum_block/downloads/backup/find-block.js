const fs = require('fs');
const path = require('path');
const parquet = require('parquetjs');

// Define the platforms to check
const platforms = ['sentio', 'subsquid', 'envio', 'ponder', 'subgraph'];

// Define paths to Parquet files
const platformFiles = {
  sentio: path.join(__dirname, '../data/sentio-case3-blocks.parquet'),
  subsquid: path.join(__dirname, '../data/subsquid-case3-blocks.parquet'),
  envio: path.join(__dirname, '../data/envio-case3-blocks.parquet'),
  ponder: path.join(__dirname, '../data/ponder-case3-blocks.parquet'),
  subgraph: path.join(__dirname, '../data/subgraph-case3-blocks.parquet')
};

// Helper function to normalize hash values
function normalizeHash(hash) {
  if (!hash) return '';
  // Convert to lowercase and remove '0x' prefix if present
  let normalized = hash.toLowerCase();
  if (normalized.startsWith('0x')) {
    normalized = normalized.substring(2);
  }
  return normalized;
}

// Helper function to normalize timestamp values
function normalizeTimestamp(timestamp) {
  if (timestamp === undefined || timestamp === null) return '';
  // Convert milliseconds to seconds if needed
  if (timestamp > 10000000000) { // likely milliseconds
    return Math.floor(timestamp / 1000);
  }
  return timestamp;
}

// Function to search for a block by hash or number across all platforms
async function findBlock(blockHashOrNumber) {
  console.log(`Searching for block: ${blockHashOrNumber}`);
  
  const isHash = typeof blockHashOrNumber === 'string' && 
                (blockHashOrNumber.startsWith('0x') || blockHashOrNumber.length > 10);
  
  const normalizedHash = isHash ? normalizeHash(blockHashOrNumber) : null;
  const blockNumber = isHash ? null : parseInt(blockHashOrNumber);
  
  console.log(`Looking for ${isHash ? 'hash' : 'block number'}: ${isHash ? normalizedHash : blockNumber}`);
  
  // Results holder
  const results = {};
  
  // Search in each platform
  for (const platform of platforms) {
    const filepath = platformFiles[platform];
    
    if (!fs.existsSync(filepath)) {
      console.log(`File not found for ${platform}: ${filepath}`);
      continue;
    }
    
    try {
      console.log(`\nSearching in ${platform}...`);
      const reader = await parquet.ParquetReader.openFile(filepath);
      const cursor = reader.getCursor();
      
      let record;
      let found = false;
      
      // Process records until we find a match
      while ((record = await cursor.next()) !== null) {
        if (isHash) {
          const recordHash = normalizeHash(record.hash || '');
          if (recordHash === normalizedHash) {
            found = true;
            break;
          }
        } else {
          const recordNumber = record.blockNumber !== undefined ? record.blockNumber : record.number;
          // Handle bigint or number type
          const blockNum = typeof recordNumber === 'bigint' ? Number(recordNumber) : recordNumber;
          if (blockNum === blockNumber) {
            found = true;
            break;
          }
        }
      }
      
      if (found && record) {
        console.log(`Found in ${platform}:`);
        console.log(JSON.stringify(record, (key, value) => {
          if (typeof value === 'bigint') {
            return value.toString();
          }
          return value;
        }, 2));
        results[platform] = { ...record };
      } else {
        console.log(`Not found in ${platform}`);
      }
      
      reader.close();
    } catch (error) {
      console.error(`Error searching in ${platform}:`, error);
    }
  }
  
  // Compare the records found across platforms
  console.log("\n=== COMPARISON ACROSS PLATFORMS ===");
  const platforms_with_block = Object.keys(results);
  
  if (platforms_with_block.length < 2) {
    console.log(`Block only found in ${platforms_with_block.length === 1 ? platforms_with_block[0] : 'no platforms'}`);
    return;
  }
  
  // Compare fields across platforms
  console.log("\nField Comparison:");
  const allFields = new Set();
  platforms_with_block.forEach(platform => {
    Object.keys(results[platform]).forEach(field => allFields.add(field));
  });
  
  // Tabular comparison of each field
  for (const field of allFields) {
    if (field === 'id') {
      console.log(`\nField: ${field} (ID formats may vary between platforms)`);
    } else {
      console.log(`\nField: ${field}`);
    }
    
    platforms_with_block.forEach(platform => {
      let value = results[platform][field];
      if (typeof value === 'undefined') {
        value = 'N/A';
      } else if (field === 'hash' || field === 'parentHash') {
        // Show both original and normalized hash
        const normalizedValue = normalizeHash(value);
        value = `${value} (normalized: ${normalizedValue})`;
      } else if (field === 'timestamp') {
        // Show normalized timestamp
        value = normalizeTimestamp(value);
      }
      console.log(`  - ${platform}: ${value}`);
    });
  }
}

// Execute the search
const targetHash = '0xa3f3248eaf2fd4fa94f6263122ac37d6b991ef36f28838bebf2285067af64c29';
findBlock(targetHash).catch(error => {
  console.error('Error in search process:', error);
}); 