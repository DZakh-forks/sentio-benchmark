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

async function analyzeBlockRanges() {
  console.log('Analyzing block ranges in Parquet files...');
  console.log('Platform | Total Count | Min Block | Max Block | Block Distribution');
  console.log('---------|-------------|-----------|-----------|------------------');
  
  for (const platform of platforms) {
    const filepath = platformFiles[platform];
    
    if (!fs.existsSync(filepath)) {
      console.log(`${platform.padEnd(9)} | File not found`);
      continue;
    }
    
    try {
      const reader = await parquet.ParquetReader.openFile(filepath);
      const cursor = reader.getCursor();
      const totalCount = await reader.getRowCount();
      
      // Initialize variables for analysis
      let minBlock = Number.MAX_SAFE_INTEGER;
      let maxBlock = Number.MIN_SAFE_INTEGER;
      let blockNumbers = [];
      let record = null;
      let recordCount = 0;
      const maxSampleSize = 10000; // Limit sample size for memory considerations
      const bucketSize = 10000;
      const buckets = {};
      
      // Process all records
      while ((record = await cursor.next()) !== null) {
        const blockNumber = record.blockNumber !== undefined ? record.blockNumber : record.number;
        const blockNum = typeof blockNumber === 'bigint' ? Number(blockNumber) : blockNumber;
        
        // Update min and max
        if (blockNum < minBlock) minBlock = blockNum;
        if (blockNum > maxBlock) maxBlock = blockNum;
        
        // Track distribution in buckets (e.g., 0-10K, 10K-20K, etc.)
        const bucket = Math.floor(blockNum / bucketSize) * bucketSize;
        buckets[bucket] = (buckets[bucket] || 0) + 1;
        
        // Collect sample of block numbers for distribution analysis
        if (recordCount % Math.ceil(totalCount / maxSampleSize) === 0) {
          blockNumbers.push(blockNum);
        }
        
        recordCount++;
      }
      
      // Generate simple distribution visualization
      const distribution = Object.entries(buckets)
        .sort(([a], [b]) => parseInt(a) - parseInt(b))
        .map(([range, count]) => `${range}-${parseInt(range) + bucketSize-1}: ${count}`)
        .join(', ');
      
      console.log(`${platform.padEnd(9)} | ${totalCount.toString().padEnd(11)} | ${minBlock.toString().padEnd(9)} | ${maxBlock.toString().padEnd(9)} | ${distribution}`);
      
      reader.close();
    } catch (error) {
      console.error(`Error analyzing ${platform}:`, error);
      console.log(`${platform.padEnd(9)} | Error: ${error.message}`);
    }
  }
}

// Execute the analysis
analyzeBlockRanges().catch(error => {
  console.error('Error in analysis process:', error);
}); 