const fs = require('fs');
const path = require('path');
const parquet = require('parquetjs');

// Define the platforms to compare
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

// Function to generate a composite key for comparison
function generateCompositeKey(record) {
  const blockNumber = record.blockNumber !== undefined ? record.blockNumber : record.number;
  const normalizedHash = normalizeHash(record.hash || '');
  const normalizedParentHash = normalizeHash(record.parentHash || '');
  const timestamp = normalizeTimestamp(record.timestamp || record.time || 0);
  
  return {
    compositeKey: `${blockNumber}:${normalizedHash}:${normalizedParentHash}:${timestamp}`,
    number: blockNumber,
    hash: normalizedHash,
    parentHash: normalizedParentHash,
    timestamp: timestamp
  };
}

// Load data from Parquet file with sampling
async function loadParquetData(filepath, platform, sampleSize = 5000) {
  if (!fs.existsSync(filepath)) {
    console.log(`File not found: ${filepath}`);
    return { records: [], totalCount: 0, min: null, max: null, distribution: {} };
  }

  try {
    const reader = await parquet.ParquetReader.openFile(filepath);
    const cursor = reader.getCursor();
    const totalCount = await reader.getRowCount();
    
    // Variables for analysis
    let minBlock = Number.MAX_SAFE_INTEGER;
    let maxBlock = Number.MIN_SAFE_INTEGER;
    const bucketSize = 10000;
    const buckets = {};
    
    // For sampling, scan every Nth record where N = totalCount / sampleSize
    const samplingInterval = Math.max(1, Math.floor(totalCount / sampleSize));
    const recordMap = new Map(); // Map to store sampled records by block number
    
    console.log(`Loading ${platform} data (sampling 1 in every ${samplingInterval} records)...`);
    
    let record = null;
    let recordCount = 0;
    
    // Process records for min/max and distribution
    while ((record = await cursor.next()) !== null) {
      const blockNumber = record.blockNumber !== undefined ? record.blockNumber : record.number;
      const blockNum = typeof blockNumber === 'bigint' ? Number(blockNumber) : blockNumber;
      
      // Update min and max
      if (blockNum < minBlock) minBlock = blockNum;
      if (blockNum > maxBlock) maxBlock = blockNum;
      
      // Track distribution in buckets
      const bucket = Math.floor(blockNum / bucketSize) * bucketSize;
      buckets[bucket] = (buckets[bucket] || 0) + 1;
      
      // Sample records
      if (recordCount % samplingInterval === 0) {
        recordMap.set(blockNum, record);
      }
      
      recordCount++;
    }
    
    // Convert map to array of records
    const records = Array.from(recordMap.values());
    
    reader.close();
    
    // Generate distribution string
    const distribution = Object.entries(buckets)
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .map(([range, count]) => `${range}-${parseInt(range) + bucketSize - 1}: ${count}`)
      .join(', ');
    
    console.log(`Loaded ${records.length} sample records from ${platform} (total: ${totalCount})`);
    
    return { 
      records, 
      totalCount, 
      min: minBlock === Number.MAX_SAFE_INTEGER ? null : minBlock, 
      max: maxBlock === Number.MIN_SAFE_INTEGER ? null : maxBlock,
      distribution: buckets
    };
  } catch (error) {
    console.error(`Error loading data from ${filepath}:`, error);
    return { records: [], totalCount: 0, min: null, max: null, distribution: {} };
  }
}

async function generateDetailedComparison() {
  console.log("Generating detailed comparison report for case 3...");
  
  // Load data for each platform
  const platformData = {};
  for (const platform of platforms) {
    platformData[platform] = await loadParquetData(platformFiles[platform], platform);
  }
  
  // Generate summary table
  console.log("\n=== PLATFORM SUMMARY ===");
  console.log("Platform | Total Records | Min Block | Max Block | Record Distribution");
  console.log("---------|---------------|-----------|-----------|-------------------");
  
  for (const platform of platforms) {
    const data = platformData[platform];
    // Summarize distribution for display
    const distributionSummary = Object.entries(data.distribution)
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .map(([range, count]) => {
        const start = parseInt(range);
        const end = start + 9999;
        return `${start}-${end}: ${count}`;
      })
      .join(', ');
    
    console.log(`${platform.padEnd(9)} | ${data.totalCount.toString().padEnd(13)} | ${data.min?.toString().padEnd(9) || 'N/A'.padEnd(9)} | ${data.max?.toString().padEnd(9) || 'N/A'.padEnd(9)} | ${distributionSummary.length > 80 ? distributionSummary.substring(0, 80) + '...' : distributionSummary}`);
  }
  
  // Generate pairwise comparisons
  console.log("\n=== PAIRWISE SIMILARITY ===");
  console.log("Platform Pair | Common Records | Total Records | Similarity | Differing Fields");
  console.log("-------------|---------------|--------------|-----------|----------------");
  
  // Storage for differing records to show as examples later
  const differingRecordExamples = {};
  
  for (let i = 0; i < platforms.length; i++) {
    const platform1 = platforms[i];
    
    // Skip if no data
    if (!platformData[platform1].records.length) continue;
    
    // Create composite keys for this platform
    const compositeKeys1 = new Map();
    for (const record of platformData[platform1].records) {
      const { compositeKey, number, hash, parentHash, timestamp } = generateCompositeKey(record);
      compositeKeys1.set(number, { compositeKey, record, number, hash, parentHash, timestamp });
    }
    
    for (let j = i + 1; j < platforms.length; j++) {
      const platform2 = platforms[j];
      
      // Skip if no data
      if (!platformData[platform2].records.length) continue;
      
      // Create composite keys for second platform
      const compositeKeys2 = new Map();
      for (const record of platformData[platform2].records) {
        const { compositeKey, number, hash, parentHash, timestamp } = generateCompositeKey(record);
        compositeKeys2.set(number, { compositeKey, record, number, hash, parentHash, timestamp });
      }
      
      // Find blocks that exist in both platforms
      const commonBlockNumbers = new Set();
      const differingBlocks = [];
      const matchingBlocks = [];
      
      // Find common block numbers
      for (const blockNum of compositeKeys1.keys()) {
        if (compositeKeys2.has(blockNum)) {
          commonBlockNumbers.add(blockNum);
        }
      }
      
      // Compare the common blocks
      for (const blockNum of commonBlockNumbers) {
        const record1 = compositeKeys1.get(blockNum);
        const record2 = compositeKeys2.get(blockNum);
        
        if (record1.compositeKey === record2.compositeKey) {
          matchingBlocks.push(blockNum);
        } else {
          // They differ - identify which fields differ
          const differences = [];
          if (record1.hash !== record2.hash) differences.push('hash');
          if (record1.parentHash !== record2.parentHash) differences.push('parentHash');
          if (record1.timestamp !== record2.timestamp) differences.push('timestamp');
          
          differingBlocks.push({
            blockNum,
            differences,
            record1: record1.record,
            record2: record2.record
          });
        }
      }
      
      // Calculate similarity
      const totalUniqueBlocks = new Set([...compositeKeys1.keys(), ...compositeKeys2.keys()]).size;
      const similarity = commonBlockNumbers.size > 0 ? 
        matchingBlocks.length / commonBlockNumbers.size : 0;
      
      // Count differing fields
      const differingFieldCounts = {
        hash: 0,
        parentHash: 0,
        timestamp: 0
      };
      
      differingBlocks.forEach(diff => {
        diff.differences.forEach(field => {
          differingFieldCounts[field]++;
        });
      });
      
      // Save examples of differing records
      if (differingBlocks.length > 0) {
        differingRecordExamples[`${platform1}_vs_${platform2}`] = differingBlocks.slice(0, 3); // Save up to 3 examples
      }
      
      // Generate differing fields summary
      const differingFieldsSummary = Object.entries(differingFieldCounts)
        .filter(([_, count]) => count > 0)
        .map(([field, count]) => `${field}: ${count}`)
        .join(', ') || 'None';
      
      console.log(`${platform1} vs ${platform2.padEnd(8)} | ${matchingBlocks.length.toString().padEnd(13)} | ${commonBlockNumbers.size.toString().padEnd(12)} | ${(similarity * 100).toFixed(2).padEnd(9)}% | ${differingFieldsSummary}`);
    }
  }
  
  // Show examples of differing records
  if (Object.keys(differingRecordExamples).length > 0) {
    console.log("\n=== EXAMPLES OF DIFFERING RECORDS ===");
    
    for (const [pairName, examples] of Object.entries(differingRecordExamples)) {
      const [platform1, platform2] = pairName.split('_vs_');
      
      console.log(`\nDifference examples between ${platform1} and ${platform2}:`);
      
      examples.forEach((example, index) => {
        console.log(`\nExample ${index + 1} - Block ${example.blockNum} - Differing fields: ${example.differences.join(', ')}`);
        console.log(`${platform1}:`, JSON.stringify(example.record1, (key, value) => {
          if (typeof value === 'bigint') return value.toString();
          return value;
        }, 2));
        console.log(`${platform2}:`, JSON.stringify(example.record2, (key, value) => {
          if (typeof value === 'bigint') return value.toString();
          return value;
        }, 2));
      });
    }
  } else {
    console.log("\nNo examples of differing records found in the sampled data.");
  }
}

// Execute the comparison
generateDetailedComparison().catch(error => {
  console.error('Error in comparison process:', error);
}); 