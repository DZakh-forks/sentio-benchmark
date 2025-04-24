const parquet = require('parquetjs');
const path = require('path');

async function analyzeBlockGaps() {
  const filePath = path.join(__dirname, '../data/subsquid-case3-blocks.parquet');
  console.log(`Analyzing block gaps in: ${filePath}`);
  
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
    
    // Analyze gaps
    let gaps = [];
    for (let i = 1; i < blocks.length; i++) {
      const gap = blocks[i] - blocks[i-1] - 1;
      if (gap > 0) {
        gaps.push({
          start: blocks[i-1],
          end: blocks[i],
          size: gap
        });
      }
    }
    
    // Sort gaps by size (largest first)
    gaps.sort((a, b) => b.size - a.size);
    
    console.log(`\nTotal gaps found: ${gaps.length}`);
    console.log('\nLargest 10 gaps:');
    for (let i = 0; i < Math.min(10, gaps.length); i++) {
      console.log(`  Gap #${i+1}: ${gaps[i].start} to ${gaps[i].end} (${gaps[i].size} blocks)`);
    }
    
    // Analyze distribution of block numbers
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
      console.log(`  ${range.start}-${range.end}: ${blocksInRange.length} blocks (${(blocksInRange.length / (range.end - range.start + 1) * 100).toFixed(2)}% coverage)`);
    }
    
    reader.close();
  } catch (error) {
    console.error('Error analyzing block gaps:', error);
  }
}

analyzeBlockGaps().catch(console.error);