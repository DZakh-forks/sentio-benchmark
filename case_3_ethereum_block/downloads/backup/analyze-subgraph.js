const parquet = require('parquetjs');
const path = require('path');

async function analyzeBlockDistribution() {
  const filePath = path.join(__dirname, '../data/subgraph-case3-blocks.parquet');
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
      if (count % 1000 === 0) {
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
    
    // Check sampling pattern
    const blockSet = new Set(blocks);
    const stepSizes = new Set();
    const intervals = [];
    
    // Check for sequential pattern in first 100 blocks
    for (let i = 1; i < Math.min(100, blocks.length); i++) {
      const step = blocks[i] - blocks[i-1];
      stepSizes.add(step);
      intervals.push(step);
    }
    
    console.log(`\nStep sizes used (first 100 blocks): ${[...stepSizes].sort((a, b) => a - b).join(', ')}`);
    console.log(`First 20 intervals: ${intervals.slice(0, 20).join(', ')}`);
    
    // Analyze distribution by ranges
    const ranges = [
      { start: 0, end: 199999 },
      { start: 200000, end: 399999 },
      { start: 400000, end: 599999 },
      { start: 600000, end: 799999 },
      { start: 800000, end: 999999 }
    ];
    
    console.log('\nBlock distribution by range:');
    for (const range of ranges) {
      const blocksInRange = blocks.filter(b => b >= range.start && b <= range.end);
      const rangeSize = range.end - range.start + 1;
      console.log(`  ${range.start}-${range.end}: ${blocksInRange.length} blocks (${(blocksInRange.length / rangeSize * 100).toFixed(4)}% coverage)`);
    }
    
    reader.close();
  } catch (error) {
    console.error('Error analyzing block distribution:', error);
  }
}

analyzeBlockDistribution().catch(console.error); 