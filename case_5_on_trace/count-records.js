const parquet = require('parquetjs');
const path = require('path');

async function countParquetRecords(filePath) {
  try {
    const reader = await parquet.ParquetReader.openFile(filePath);
    const count = reader.getRowCount();
    console.log(`${path.basename(filePath)}: ${count} records`);
    reader.close();
    return count;
  } catch (error) {
    console.error(`Error reading ${path.basename(filePath)}: ${error.message}`);
    return 0;
  }
}

async function main() {
  console.log('Counting records in Parquet files...');
  
  const files = [
    './data/envio-case5-swaps.parquet',
    './data/sentio-case5-swaps.parquet',
    './data/subsquid-case5-swaps.parquet'
  ];
  
  for (const file of files) {
    await countParquetRecords(file);
  }
  
  console.log('Done.');
}

main().catch(error => {
  console.error('Error:', error);
}); 