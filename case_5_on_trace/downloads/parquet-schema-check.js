const fs = require('fs');
const path = require('path');
const parquet = require('parquetjs');

// Configuration
const DATA_DIR = path.join(__dirname, '..', 'data');
const PLATFORM_FILES = {
  'sentio': 'sentio-case5-swaps.parquet',
  'subsquid': 'subsquid-case5-swaps.parquet',
  'envio': 'envio-case5-swaps.parquet',
  'subgraph': 'subgraph-case5-swaps.parquet'
};

async function checkParquetSchema(platform, filePath) {
  console.log(`\n=========== ${platform.toUpperCase()} SCHEMA ===========`);
  
  if (!fs.existsSync(filePath)) {
    console.error(`File does not exist: ${filePath}`);
    return;
  }
  
  try {
    const reader = await parquet.ParquetReader.openFile(filePath);
    
    // Read and print schema
    console.log('Schema Fields:');
    const schema = reader.schema;
    
    // Print field names and types
    for (const field in schema.fields) {
      if (schema.fields.hasOwnProperty(field)) {
        console.log(`  ${field}:`, schema.fields[field]);
      }
    }
    
    // Count rows
    const cursor = reader.getCursor();
    let count = 0;
    let record = null;
    
    try {
      record = await cursor.next();
      while (record) {
        count++;
        if (count === 1) {
          // Print first record as sample
          console.log('\nSample Record:');
          console.log(JSON.stringify(record, null, 2));
        }
        record = await cursor.next();
      }
    } catch (e) {
      console.error('Error reading records:', e.message);
    }
    
    console.log(`\nTotal Records: ${count}`);
    reader.close();
  } catch (err) {
    console.error(`Error reading Parquet file: ${err.message}`);
  }
}

async function main() {
  console.log('PARQUET SCHEMA CHECK');
  console.log('===================');
  
  for (const platform in PLATFORM_FILES) {
    if (PLATFORM_FILES.hasOwnProperty(platform)) {
      const filePath = path.join(DATA_DIR, PLATFORM_FILES[platform]);
      await checkParquetSchema(platform, filePath);
    }
  }
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
}); 