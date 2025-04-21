const parquet = require('parquetjs');
const fs = require('fs');
const path = require('path');

const DATA_DIR = '/Users/yufeili/Desktop/sentio/indexer-benchmark/case_3_ethereum_block/data';

async function countParquetRows(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.error(`File does not exist: ${filePath}`);
      return 0;
    }

    const reader = await parquet.ParquetReader.openFile(filePath);
    const count = reader.metadata.row_groups.reduce((sum, group) => sum + group.num_rows, 0);
    await reader.close();
    return count;
  } catch (error) {
    console.error(`Error reading ${path.basename(filePath)}: ${error.message}`);
    return 0;
  }
}

async function main() {
  const files = fs.readdirSync(DATA_DIR)
    .filter(file => file.endsWith('.parquet'))
    .map(file => path.join(DATA_DIR, file));

  console.log('Counting rows in Parquet files:');
  for (const file of files) {
    const count = await countParquetRows(file);
    const size = (fs.statSync(file).size / 1024 / 1024).toFixed(2);
    console.log(`${path.basename(file)}: ${count.toLocaleString()} rows (${size} MB)`);
  }
}

main().catch(err => console.error('Error:', err)); 