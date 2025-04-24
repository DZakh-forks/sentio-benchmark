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

// Function to get a specific block range from all platforms
async function getBlockRangeAcrossPlatforms(startBlock, endBlock) {
  console.log(`Analyzing blocks ${startBlock} to ${endBlock} across all platforms...`);
  
  // Results container
  const platformBlocks = {};
  
  for (const platform of platforms) {
    const filepath = platformFiles[platform];
    
    if (!fs.existsSync(filepath)) {
      console.log(`File not found for ${platform}: ${filepath}`);
      continue;
    }
    
    try {
      console.log(`\nReading blocks from ${platform}...`);
      const reader = await parquet.ParquetReader.openFile(filepath);
      const cursor = reader.getCursor();
      
      let record;
      const blocks = [];
      
      // Process all records
      while ((record = await cursor.next()) !== null) {
        const blockNumber = record.blockNumber !== undefined ? record.blockNumber : record.number;
        const blockNum = typeof blockNumber === 'bigint' ? Number(blockNumber) : blockNumber;
        
        // Only collect blocks in the specified range
        if (blockNum >= startBlock && blockNum <= endBlock) {
          blocks.push({
            number: blockNum,
            hash: record.hash || '',
            parentHash: record.parentHash || '',
            timestamp: typeof record.timestamp === 'bigint' ? Number(record.timestamp) : record.timestamp || 0,
            id: record.id || '',
            originalRecord: record
          });
        }
      }
      
      platformBlocks[platform] = blocks;
      console.log(`Found ${blocks.length} blocks in the range for ${platform}`);
      
      reader.close();
    } catch (error) {
      console.error(`Error reading from ${platform}:`, error);
    }
  }
  
  // Now we'll compare the blocks across platforms
  compareBlocksAcrossPlatforms(platformBlocks, startBlock, endBlock);
}

// Function to compare blocks across platforms
function compareBlocksAcrossPlatforms(platformBlocks, startBlock, endBlock) {
  console.log(`\n=== COMPARISON OF BLOCKS ${startBlock}-${endBlock} ACROSS PLATFORMS ===`);
  
  // First, get all block numbers from all platforms
  const allBlockNumbers = new Set();
  for (const platform of platforms) {
    if (platformBlocks[platform]) {
      platformBlocks[platform].forEach(block => allBlockNumbers.add(block.number));
    }
  }
  
  console.log(`Total unique block numbers across all platforms: ${allBlockNumbers.size}`);
  
  // Count how many platforms have each block
  const blockCoverage = {};
  for (const blockNum of allBlockNumbers) {
    blockCoverage[blockNum] = [];
    for (const platform of platforms) {
      if (platformBlocks[platform] && platformBlocks[platform].some(block => block.number === blockNum)) {
        blockCoverage[blockNum].push(platform);
      }
    }
  }
  
  // Count blocks by platform coverage
  const coverageCounts = {};
  for (const [blockNum, platformsWithBlock] of Object.entries(blockCoverage)) {
    const count = platformsWithBlock.length;
    coverageCounts[count] = (coverageCounts[count] || 0) + 1;
  }
  
  console.log("Block coverage distribution:");
  for (let i = 1; i <= platforms.length; i++) {
    console.log(`  ${i} platform${i > 1 ? 's' : ''}: ${coverageCounts[i] || 0} blocks`);
  }
  
  // Find blocks that appear in all platforms
  const commonBlocks = Object.entries(blockCoverage)
    .filter(([_, platformsWithBlock]) => platformsWithBlock.length === platforms.length)
    .map(([blockNum, _]) => parseInt(blockNum));
  
  console.log(`\nBlocks common to all platforms: ${commonBlocks.length}`);
  
  if (commonBlocks.length > 0) {
    // Get a sample of up to 5 blocks that are in all platforms
    const sampleBlocks = commonBlocks.slice(0, 5);
    
    console.log(`\nDetailed comparison for ${sampleBlocks.length} sample blocks:`);
    
    for (const blockNum of sampleBlocks) {
      console.log(`\n--- Block ${blockNum} ---`);
      
      // Get the block from each platform
      const blocksForComparison = {};
      for (const platform of platforms) {
        if (platformBlocks[platform]) {
          const block = platformBlocks[platform].find(block => block.number === blockNum);
          if (block) {
            blocksForComparison[platform] = block;
          }
        }
      }
      
      // Compare the blocks
      const fields = ['hash', 'parentHash', 'timestamp'];
      
      for (const field of fields) {
        console.log(`\nField: ${field}`);
        const fieldValues = {};
        
        for (const platform of platforms) {
          if (blocksForComparison[platform]) {
            let value = blocksForComparison[platform][field];
            
            // Apply normalization for comparison
            if (field === 'hash' || field === 'parentHash') {
              value = normalizeHash(value);
            } else if (field === 'timestamp') {
              value = normalizeTimestamp(value);
            }
            
            fieldValues[platform] = value;
          }
        }
        
        // Check if all values are the same
        const allValues = Object.values(fieldValues);
        const allSame = allValues.every(val => val === allValues[0]);
        
        if (allSame) {
          console.log(`  All platforms have the same value: ${allValues[0]}`);
        } else {
          // Show differences
          for (const platform of platforms) {
            if (blocksForComparison[platform]) {
              console.log(`  ${platform}: ${fieldValues[platform]}`);
            }
          }
        }
      }
    }
    
    // Find cases where blocks differ
    console.log("\n=== EXAMPLES OF DIFFERING BLOCKS ===");
    
    // Check each block common to all platforms for differences
    const differingBlocks = [];
    
    for (const blockNum of commonBlocks) {
      const normalizedBlocks = {};
      
      // Normalize field values for comparison
      for (const platform of platforms) {
        if (platformBlocks[platform]) {
          const block = platformBlocks[platform].find(block => block.number === blockNum);
          if (block) {
            normalizedBlocks[platform] = {
              hash: normalizeHash(block.hash),
              parentHash: normalizeHash(block.parentHash),
              timestamp: normalizeTimestamp(block.timestamp)
            };
          }
        }
      }
      
      // Check for differences
      let hasDifferences = false;
      
      // Get the reference platform (first one in the list that has this block)
      let referencePlatform = null;
      for (const platform of platforms) {
        if (normalizedBlocks[platform]) {
          referencePlatform = platform;
          break;
        }
      }
      
      if (!referencePlatform) continue;
      
      const referenceBlock = normalizedBlocks[referencePlatform];
      
      // Compare other platforms to the reference
      for (const platform of platforms) {
        if (platform !== referencePlatform && normalizedBlocks[platform]) {
          const block = normalizedBlocks[platform];
          
          for (const field of ['hash', 'parentHash', 'timestamp']) {
            if (block[field] !== referenceBlock[field]) {
              hasDifferences = true;
              break;
            }
          }
          
          if (hasDifferences) break;
        }
      }
      
      if (hasDifferences) {
        differingBlocks.push(blockNum);
        if (differingBlocks.length >= 5) break; // Limit to 5 examples
      }
    }
    
    if (differingBlocks.length > 0) {
      console.log(`Found ${differingBlocks.length} blocks with differences across platforms`);
      
      for (const blockNum of differingBlocks) {
        console.log(`\n--- Block ${blockNum} Differences ---`);
        
        // Display differences for each field
        const fields = ['hash', 'parentHash', 'timestamp'];
        
        for (const field of fields) {
          const fieldValues = {};
          let hasDifference = false;
          
          // Get all values
          for (const platform of platforms) {
            if (platformBlocks[platform]) {
              const block = platformBlocks[platform].find(block => block.number === blockNum);
              if (block) {
                let value = block[field];
                
                // Apply normalization for display
                if (field === 'hash' || field === 'parentHash') {
                  value = normalizeHash(value);
                } else if (field === 'timestamp') {
                  value = normalizeTimestamp(value);
                }
                
                fieldValues[platform] = value;
              }
            }
          }
          
          // Check if all values are the same
          const allValues = Object.values(fieldValues);
          const allSame = allValues.every(val => val === allValues[0]);
          
          if (!allSame) {
            console.log(`\nField: ${field} (DIFFERS)`);
            for (const platform of platforms) {
              if (fieldValues[platform] !== undefined) {
                console.log(`  ${platform}: ${fieldValues[platform]}`);
              }
            }
          }
        }
      }
    } else {
      console.log("No differing blocks found in the common blocks.");
    }
  }
  
  // Generate a comprehensive similarity report in table format
  console.log("\n=== SIMILARITY TABLE FOR CASE 3 ===");
  console.log("Platform Pair | Common Blocks | Similarity (%) | Hash Diff | ParentHash Diff | Timestamp Diff");
  console.log("-------------|--------------|---------------|-----------|----------------|---------------");
  
  // Compare all platform pairs
  for (let i = 0; i < platforms.length; i++) {
    const platform1 = platforms[i];
    
    // Skip if no data
    if (!platformBlocks[platform1] || platformBlocks[platform1].length === 0) continue;
    
    for (let j = i + 1; j < platforms.length; j++) {
      const platform2 = platforms[j];
      
      // Skip if no data
      if (!platformBlocks[platform2] || platformBlocks[platform2].length === 0) continue;
      
      // Get blocks from each platform
      const blocks1 = new Map(platformBlocks[platform1].map(block => [block.number, block]));
      const blocks2 = new Map(platformBlocks[platform2].map(block => [block.number, block]));
      
      // Find common block numbers
      const commonBlockNumbers = new Set();
      for (const blockNum of blocks1.keys()) {
        if (blocks2.has(blockNum)) {
          commonBlockNumbers.add(blockNum);
        }
      }
      
      // Count field differences
      let hashDiff = 0;
      let parentHashDiff = 0;
      let timestampDiff = 0;
      
      // Compare each common block
      for (const blockNum of commonBlockNumbers) {
        const block1 = blocks1.get(blockNum);
        const block2 = blocks2.get(blockNum);
        
        // Compare fields with normalization
        if (normalizeHash(block1.hash) !== normalizeHash(block2.hash)) {
          hashDiff++;
        }
        
        if (normalizeHash(block1.parentHash) !== normalizeHash(block2.parentHash)) {
          parentHashDiff++;
        }
        
        if (normalizeTimestamp(block1.timestamp) !== normalizeTimestamp(block2.timestamp)) {
          timestampDiff++;
        }
      }
      
      // Calculate overall similarity percentage (weighted by field importance)
      // We consider all fields equally important
      const totalComparisons = commonBlockNumbers.size * 3; // 3 fields per block
      const totalDifferences = hashDiff + parentHashDiff + timestampDiff;
      const similarityPercentage = totalComparisons > 0 ? 
        ((totalComparisons - totalDifferences) / totalComparisons) * 100 : 0;
      
      console.log(`${platform1} vs ${platform2.padEnd(8)} | ${commonBlockNumbers.size.toString().padEnd(12)} | ${similarityPercentage.toFixed(2).padEnd(13)}% | ${hashDiff.toString().padEnd(9)} | ${parentHashDiff.toString().padEnd(14)} | ${timestampDiff.toString()}`);
    }
  }
}

// Execute the analysis for blocks 46000-47000 where all platforms should have blocks
getBlockRangeAcrossPlatforms(46000, 47000).catch(error => {
  console.error('Error in analysis process:', error);
}); 