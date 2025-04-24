const fs = require('fs');
const parquet = require('parquetjs');
const path = require('path');

async function main() {
  const filePath = path.join(__dirname, '../data/subsquid-case3-blocks.parquet');
  
  console.log(`Checking Parquet file: ${filePath}`);
  
  try {
    // Open the Parquet file
    const reader = await parquet.ParquetReader.openFile(filePath);
    
    // Get schema information
    console.log('Schema:');
    const schema = reader.schema;
    for (const field in schema.fields) {
      if (schema.fields.hasOwnProperty(field)) {
        console.log(`  ${field}:`, schema.fields[field]);
      }
    }
    
    // Read some sample rows
    console.log('\nSample Rows:');
    const cursor = reader.getCursor();
    let count = 0;
    let row = await cursor.next();
    
    while (row && count < 5) {
      console.log(`  Row ${count + 1}:`, JSON.stringify(row));
      row = await cursor.next();
      count++;
    }
    
    // Count total rows
    let totalCount = 0;
    const countCursor = reader.getCursor();
    row = await countCursor.next();
    while (row) {
      totalCount++;
      if (totalCount % 10000 === 0) {
        process.stdout.write(`Counting: ${totalCount} rows\r`);
      }
      row = await countCursor.next();
    }
    
    console.log(`\nTotal rows in file: ${totalCount}`);
    
    // Close the reader
    reader.close();
    
  } catch (error) {
    console.error('Error reading Parquet file:', error);
  }
}

main().catch(console.error); 