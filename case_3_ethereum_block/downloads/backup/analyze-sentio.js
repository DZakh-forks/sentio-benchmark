const parquet = require('parquetjs');
const path = require('path');

async function analyzeBlockDistribution() {
  const filePath = path.join(__dirname, '../data/sentio-case3-blocks.parquet');
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
      { start: 0, end: 14999 },
      { start: 15000, end: 29999 },
      { start: 30000, end: 44999 },
      { start: 45000, end: 59999 },
      { start: 60000, end: 74999 },
      { start: 75000, end: 89999 },
      { start: 90000, end: 100000 }
    ];
    
    console.log('\nBlock distribution by range:');
    for (const range of ranges) {
      const blocksInRange = blocks.filter(b => b >= range.start && b <= range.end);
      const rangeSize = range.end - range.start + 1;
      console.log(`  ${range.start}-${range.end}: ${blocksInRange.length} blocks (${(blocksInRange.length / rangeSize * 100).toFixed(2)}% coverage)`);
    }
    
    // Check for patterns in block sampling
    const firstIntervals = [];
    for (let i = 1; i < Math.min(20, blocks.length); i++) {
      firstIntervals.push(blocks[i] - blocks[i-1]);
    }
    
    console.log(`\nFirst 20 intervals between blocks: ${firstIntervals.join(', ')}`);
    
    // Check if there's a consistent sampling pattern
    const isConsistentSampling = firstIntervals.length > 1 && 
      firstIntervals.every(interval => interval === firstIntervals[0]);
    
    if (isConsistentSampling) {
      console.log(`Consistent sampling detected: every ${firstIntervals[0]} blocks`);
    } else {
      console.log('No consistent sampling pattern detected');
    }
    
    reader.close();
  } catch (error) {
    console.error('Error analyzing block distribution:', error);
  }
}

analyzeBlockDistribution().catch(console.error); 