const parquet = require('parquetjs');
const path = require('path');

async function analyzeBlockDistribution() {
  const filePath = path.join(__dirname, '../data/subsquid-case3-blocks.parquet');
  console.log(`Analyzing block distribution in: ${filePath}`);
  
  try {
    const reader = await parquet.ParquetReader.openFile(filePath);
    const cursor = reader.getCursor();
    
    // Collect all block numbers
    let blocks = [];
    let row = await cursor.next();
    let count = 0;
    
    while (row) {
      blocks.push(parseInt(row.number.toString()));
      count++;
      if (count % 10000 === 0) {
        process.stdout.write(`Reading blocks: ${count}\r`);
      }
      row = await cursor.next();
    }
    
    console.log(`\nRead ${blocks.length} blocks`);
    
    // Sort blocks
    blocks.sort((a, b) => a - b);
    
    // Basic statistics
    const minBlock = blocks[0];
    const maxBlock = blocks[blocks.length - 1];
    const expectedBlocks = maxBlock - minBlock + 1;
    const missingBlocks = expectedBlocks - blocks.length;
    
    console.log(`First 10 blocks: ${blocks.slice(0, 10).join(', ')}`);
    console.log(`Last 10 blocks: ${blocks.slice(-10).join(', ')}`);
    console.log(`Min block: ${minBlock}, Max block: ${maxBlock}`);
    console.log(`Total blocks in range: ${expectedBlocks}`);
    console.log(`Missing blocks: ${missingBlocks} (${(missingBlocks / expectedBlocks * 100).toFixed(2)}% of range)`);
    
    // Analyze distribution by ranges
    const ranges = [
      { start: 0, end: 149999 },
      { start: 150000, end: 299999 },
      { start: 300000, end: 449999 },
      { start: 450000, end: 599999 },
      { start: 600000, end: 749999 },
      { start: 750000, end: 899999 },
      { start: 900000, end: 1000000 }
    ];
    
    console.log('\nBlock distribution by range:');
    for (const range of ranges) {
      const blocksInRange = blocks.filter(b => b >= range.start && b <= range.end);
      const rangeSize = range.end - range.start + 1;
      console.log(`  ${range.start}-${range.end}: ${blocksInRange.length} blocks (${(blocksInRange.length / rangeSize * 100).toFixed(2)}% coverage)`);
    }
    
    reader.close();
  } catch (error) {
    console.error('Error analyzing block distribution:', error);
  }
}

analyzeBlockDistribution().catch(console.error); 