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

// Helper function to normalize hash values
function normalizeHash(hash) {
  if (!hash) return '';
  // Convert to lowercase and remove '0x' prefix if present
  let normalized = hash.toLowerCase();
  if (normalized.startsWith('0x')) {
    normalized = normalized.substring(2);
  }
  return normalized;
}

// Helper function to normalize timestamp values
function normalizeTimestamp(timestamp) {
  if (timestamp === undefined || timestamp === null) return '';
  // Convert milliseconds to seconds if needed
  if (timestamp > 10000000000) { // likely milliseconds
    return Math.floor(timestamp / 1000);
  }
  return timestamp;
}

// Helper function to create an index of blocks from a platform
async function indexBlocksFromPlatform(platform, filepath) {
  if (!fs.existsSync(filepath)) {
    console.log(`File not found: ${filepath}`);
    return {
      blocks: new Map(),
      stats: { totalCount: 0, min: null, max: null, distribution: {} }
    };
  }

  console.log(`Indexing blocks from ${platform}...`);
  const reader = await parquet.ParquetReader.openFile(filepath);
  const cursor = reader.getCursor();
  const totalCount = await reader.getRowCount();
  
  // Stats tracking
  let minBlock = Number.MAX_SAFE_INTEGER;
  let maxBlock = Number.MIN_SAFE_INTEGER;
  const bucketSize = 10000;
  const buckets = {};
  
  // Index storage
  const blockIndex = new Map();
  
  let record;
  let recordCount = 0;
  let lastLogTime = Date.now();
  
  // Process all records
  console.log(`Total records to process: ${totalCount}`);
  
  while ((record = await cursor.next()) !== null) {
    const blockNumber = record.blockNumber !== undefined ? record.blockNumber : record.number;
    const blockNum = typeof blockNumber === 'bigint' ? Number(blockNumber) : blockNumber;
    
    // Update min and max
    if (blockNum < minBlock) minBlock = blockNum;
    if (blockNum > maxBlock) maxBlock = blockNum;
    
    // Track distribution in buckets
    const bucket = Math.floor(blockNum / bucketSize) * bucketSize;
    buckets[bucket] = (buckets[bucket] || 0) + 1;
    
    // Store the normalized block data in the index
    blockIndex.set(blockNum, {
      number: blockNum,
      hash: normalizeHash(record.hash || ''),
      parentHash: normalizeHash(record.parentHash || ''),
      timestamp: normalizeTimestamp(record.timestamp || 0)
    });
    
    recordCount++;
    
    // Log progress every 30 seconds
    const now = Date.now();
    if (now - lastLogTime > 30000) {
      console.log(`  ${platform}: Processed ${recordCount}/${totalCount} records (${Math.round(recordCount / totalCount * 100)}%)`);
      lastLogTime = now;
    }
  }
  
  reader.close();
  
  console.log(`Indexed ${recordCount} blocks from ${platform} (min: ${minBlock}, max: ${maxBlock})`);
  
  return {
    blocks: blockIndex,
    stats: {
      totalCount,
      min: minBlock === Number.MAX_SAFE_INTEGER ? null : minBlock,
      max: maxBlock === Number.MIN_SAFE_INTEGER ? null : maxBlock,
      distribution: buckets
    }
  };
}

// Compare two platforms block by block for the entire range
function comparePlatforms(platform1, platform1Data, platform2, platform2Data) {
  console.log(`\nComparing ${platform1} vs ${platform2}...`);
  
  // Find blocks that exist in both platforms
  const blocks1 = platform1Data.blocks;
  const blocks2 = platform2Data.blocks;
  
  // Get intersection of block numbers
  const blockNumbers1 = new Set(blocks1.keys());
  const blockNumbers2 = new Set(blocks2.keys());
  
  // Find common blocks
  const commonBlockNumbers = new Set();
  for (const blockNum of blockNumbers1) {
    if (blockNumbers2.has(blockNum)) {
      commonBlockNumbers.add(blockNum);
    }
  }
  
  console.log(`Common blocks between ${platform1} and ${platform2}: ${commonBlockNumbers.size}`);
  
  if (commonBlockNumbers.size === 0) {
    return {
      commonBlocks: 0,
      matchingBlocks: 0,
      hashDiff: 0,
      parentHashDiff: 0,
      timestampDiff: 0,
      similarity: 0
    };
  }
  
  // Compare each field for the common blocks
  let matchingBlocks = 0;
  let hashDiff = 0;
  let parentHashDiff = 0;
  let timestampDiff = 0;
  
  // Sample of differing blocks for reporting
  const differingSamples = {
    hash: [],
    parentHash: [],
    timestamp: []
  };
  
  for (const blockNum of commonBlockNumbers) {
    const block1 = blocks1.get(blockNum);
    const block2 = blocks2.get(blockNum);
    
    let blockMatches = true;
    
    // Compare hash
    if (block1.hash !== block2.hash) {
      hashDiff++;
      blockMatches = false;
      if (differingSamples.hash.length < 5) {
        differingSamples.hash.push({
          blockNum,
          [platform1]: block1.hash,
          [platform2]: block2.hash
        });
      }
    }
    
    // Compare parentHash
    if (block1.parentHash !== block2.parentHash) {
      parentHashDiff++;
      blockMatches = false;
      if (differingSamples.parentHash.length < 5) {
        differingSamples.parentHash.push({
          blockNum,
          [platform1]: block1.parentHash,
          [platform2]: block2.parentHash
        });
      }
    }
    
    // Compare timestamp
    if (block1.timestamp !== block2.timestamp) {
      timestampDiff++;
      blockMatches = false;
      if (differingSamples.timestamp.length < 5) {
        differingSamples.timestamp.push({
          blockNum,
          [platform1]: block1.timestamp,
          [platform2]: block2.timestamp
        });
      }
    }
    
    if (blockMatches) {
      matchingBlocks++;
    }
  }
  
  // Calculate similarity percentage
  const totalComparisons = commonBlockNumbers.size * 3; // 3 fields per block
  const totalDifferences = hashDiff + parentHashDiff + timestampDiff;
  const similarityPercentage = ((totalComparisons - totalDifferences) / totalComparisons) * 100;
  
  console.log(`  Common blocks: ${commonBlockNumbers.size}`);
  console.log(`  Exact matching blocks: ${matchingBlocks}`);
  console.log(`  Similarity: ${similarityPercentage.toFixed(2)}%`);
  console.log(`  Differences - Hash: ${hashDiff}, ParentHash: ${parentHashDiff}, Timestamp: ${timestampDiff}`);
  
  return {
    commonBlocks: commonBlockNumbers.size,
    matchingBlocks,
    hashDiff,
    parentHashDiff,
    timestampDiff,
    similarity: similarityPercentage,
    differingSamples
  };
}

// Main function to run the full range comparison
async function runFullRangeComparison() {
  console.log("Starting full range comparison across all platforms...");
  
  // First, load and index all platform data
  const platformData = {};
  
  for (const platform of platforms) {
    try {
      platformData[platform] = await indexBlocksFromPlatform(platform, platformFiles[platform]);
    } catch (error) {
      console.error(`Error indexing ${platform}:`, error);
      platformData[platform] = { blocks: new Map(), stats: { totalCount: 0 } };
    }
  }
  
  // Print summary of each platform
  console.log("\n=== PLATFORM SUMMARY ===");
  console.log("Platform | Total Records | Min Block | Max Block | Block Range Distribution");
  console.log("---------|---------------|-----------|-----------|------------------------");
  
  for (const platform of platforms) {
    const stats = platformData[platform].stats;
    
    // Format distribution for display
    const distribution = Object.entries(stats.distribution || {})
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .map(([range, count]) => {
        const start = parseInt(range);
        const end = start + 9999;
        return `${start}-${end}: ${count}`;
      })
      .join(', ');
    
    const distributionSummary = distribution.length > 80 ? 
      distribution.substring(0, 77) + '...' : 
      distribution;
    
    console.log(`${platform.padEnd(9)} | ${stats.totalCount.toString().padEnd(13)} | ${(stats.min?.toString() || 'N/A').padEnd(9)} | ${(stats.max?.toString() || 'N/A').padEnd(9)} | ${distributionSummary}`);
  }
  
  // Now compare all platform pairs
  console.log("\n=== SIMILARITY TABLE FOR CASE 3 (FULL RANGE) ===");
  console.log("Platform Pair | Common Blocks | Matching Blocks | Similarity (%) | Hash Diff | ParentHash Diff | Timestamp Diff");
  console.log("-------------|--------------|----------------|---------------|-----------|----------------|---------------");
  
  const results = [];
  
  for (let i = 0; i < platforms.length; i++) {
    const platform1 = platforms[i];
    
    for (let j = i + 1; j < platforms.length; j++) {
      const platform2 = platforms[j];
      
      const result = comparePlatforms(platform1, platformData[platform1], platform2, platformData[platform2]);
      results.push({ platform1, platform2, ...result });
      
      console.log(`${platform1} vs ${platform2.padEnd(8)} | ${result.commonBlocks.toString().padEnd(12)} | ${result.matchingBlocks.toString().padEnd(14)} | ${result.similarity.toFixed(2).padEnd(13)}% | ${result.hashDiff.toString().padEnd(9)} | ${result.parentHashDiff.toString().padEnd(14)} | ${result.timestampDiff}`);
    }
  }
  
  // Show examples of differences if there are any
  const hasDifferences = results.some(result => result.hashDiff > 0 || result.parentHashDiff > 0 || result.timestampDiff > 0);
  
  if (hasDifferences) {
    console.log("\n=== EXAMPLES OF DIFFERING BLOCKS ===");
    
    for (const result of results) {
      const { platform1, platform2, differingSamples } = result;
      
      const hasSamples = Object.values(differingSamples).some(samples => samples.length > 0);
      
      if (hasSamples) {
        console.log(`\nDifferences between ${platform1} and ${platform2}:`);
        
        // Hash differences
        if (differingSamples.hash.length > 0) {
          console.log(`\n  Hash differences (${result.hashDiff} total):`);
          differingSamples.hash.forEach(diff => {
            console.log(`    Block ${diff.blockNum}:`);
            console.log(`      ${platform1}: ${diff[platform1]}`);
            console.log(`      ${platform2}: ${diff[platform2]}`);
          });
        }
        
        // ParentHash differences
        if (differingSamples.parentHash.length > 0) {
          console.log(`\n  ParentHash differences (${result.parentHashDiff} total):`);
          differingSamples.parentHash.forEach(diff => {
            console.log(`    Block ${diff.blockNum}:`);
            console.log(`      ${platform1}: ${diff[platform1]}`);
            console.log(`      ${platform2}: ${diff[platform2]}`);
          });
        }
        
        // Timestamp differences
        if (differingSamples.timestamp.length > 0) {
          console.log(`\n  Timestamp differences (${result.timestampDiff} total):`);
          differingSamples.timestamp.forEach(diff => {
            console.log(`    Block ${diff.blockNum}:`);
            console.log(`      ${platform1}: ${diff[platform1]}`);
            console.log(`      ${platform2}: ${diff[platform2]}`);
          });
        }
      }
    }
  } else {
    console.log("\nNo differences found between any platforms!");
  }
  
  console.log("\nFull range comparison completed.");
}

// Run the full range comparison
runFullRangeComparison().catch(error => {
  console.error('Error in full range comparison:', error);
}); 