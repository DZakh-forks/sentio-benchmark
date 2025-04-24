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
    
    // Check for patterns in block numbers
    // Check if there are any gaps
    let gaps = false;
    for (let i = 1; i < Math.min(1000, blocks.length); i++) {
      if (blocks[i] - blocks[i-1] > 1) {
        gaps = true;
        break;
      }
    }
    
    console.log(`\nGaps found in first 1000 blocks: ${gaps ? 'Yes' : 'No'}`);
    
    if (!gaps) {
      console.log('All blocks appear to be sequential with no gaps');
    }
    
    // Distribution by range (10K blocks per range)
    const ranges = [];
    for (let i = 0; i <= 100000; i += 10000) {
      ranges.push({
        start: i,
        end: Math.min(i + 9999, 100000)
      });
    }
    
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