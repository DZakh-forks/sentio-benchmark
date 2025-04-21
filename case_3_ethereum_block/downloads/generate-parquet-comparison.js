const fs = require('fs');
const path = require('path');
const parquet = require('parquetjs');
const axios = require('axios');

// Define the platforms to compare
const platforms = ['sentio', 'subsquid', 'envio', 'ponder', 'subgraph'];

// Define paths to Parquet files
const platformFiles = {
  blocks: {
    sentio: path.join(__dirname, 'sentio-blocks.parquet'),
    subsquid: path.join(__dirname, 'subsquid-blocks.parquet'),
    ponder: path.join(__dirname, 'ponder-blocks.parquet'),
    subgraph: path.join(__dirname, 'subgraph-blocks.parquet')
    // Note: Envio doesn't support block handlers according to README
  }
};

// Load data from Parquet file
async function loadParquetData(filepath, platform) {
  if (!fs.existsSync(filepath)) {
    console.log(`File not found: ${filepath}`);
    return { records: [], fields: [] };
  }

  // Check if file is empty
  const stats = fs.statSync(filepath);
  if (stats.size === 0) {
    console.log(`File is empty: ${filepath}`);
    return { records: [], fields: [] };
  }

  try {
    const reader = await parquet.ParquetReader.openFile(filepath);
    const cursor = reader.getCursor();
    const records = [];
    const metadata = reader.getMetadata();
    const fields = metadata.schema.fields.map(field => field.name);
    
    let record = null;
    while (record = await cursor.next()) {
      records.push(record);
    }
    
    reader.close();
    console.log(`Loaded ${records.length} records from ${platform}`);
    console.log(`Fields: ${fields.join(', ')}`);
    
    return { records, fields };
  } catch (error) {
    console.error(`Error loading data from ${filepath}:`, error);
    return { records: [], fields: [] };
  }
}

// Generate comparison report
async function generateComparisonReport() {
  console.log('Generating comparison report for blocks...');
  await generateReportForType('blocks', platformFiles.blocks);
}

// Generate report for a specific data type (blocks)
async function generateReportForType(dataType, platformFiles) {
  const report = {
    timestamp: Date.now(),
    data_type: dataType,
    data_counts: {},
    block_ranges: {},
    unique_counts: {},
    consistency: {},
    content_comparison: {}
  };

  // Load data for each platform
  const platformData = {};
  for (const platform of platforms) {
    if (platformFiles[platform]) {
      const data = await loadParquetData(platformFiles[platform], platform);
      platformData[platform] = data;
      
      report.data_counts[platform] = {
        count: data.records.length,
        success: data.records.length > 0
      };
      
      // Calculate block range
      const blockNumbers = data.records
        .map(r => r.blockNumber !== undefined ? r.blockNumber : r.number)
        .filter(Boolean);
      
      const uniqueBlocks = new Set(blockNumbers);
      const uniqueTxHashes = new Set(data.records.map(r => r.hash).filter(Boolean));
      
      report.block_ranges[platform] = {
        min: blockNumbers.length > 0 ? Math.min(...blockNumbers) : null,
        max: blockNumbers.length > 0 ? Math.max(...blockNumbers) : null,
        count: blockNumbers.length
      };
      
      report.unique_counts[platform] = {
        blocks: uniqueBlocks.size,
        transactions: uniqueTxHashes.size
      };
    }
  }

  // Compare platforms by block hash
  for (let i = 0; i < platforms.length; i++) {
    const platform1 = platforms[i];
    
    if (!platformFiles[platform1] || !platformData[platform1]) continue;
    
    // Create sets of block hashes for this platform
    const blockHashes1 = new Set(platformData[platform1].records
      .map(record => record.hash)
      .filter(Boolean));
    
    for (let j = i + 1; j < platforms.length; j++) {
      const platform2 = platforms[j];
      
      if (!platformFiles[platform2] || !platformData[platform2]) continue;
      
      // Create sets of block hashes for the comparison platform
      const blockHashes2 = new Set(platformData[platform2].records
        .map(record => record.hash)
        .filter(Boolean));
      
      // Find common block hashes
      const commonBlocks = new Set([...blockHashes1].filter(hash => blockHashes2.has(hash)));
      const blocksUniqueToFirst = new Set([...blockHashes1].filter(hash => !blockHashes2.has(hash)));
      const blocksUniqueToSecond = new Set([...blockHashes2].filter(hash => !blockHashes1.has(hash)));
      
      // Calculate Jaccard similarity
      const blocksUnion = new Set([...blockHashes1, ...blockHashes2]);
      const jaccardSimilarity = blocksUnion.size > 0 ? commonBlocks.size / blocksUnion.size : 0;
      
      // Add to the report
      report.consistency[`${platform1}_vs_${platform2}`] = {
        common_blocks: commonBlocks.size,
        unique_to_1: blocksUniqueToFirst.size,
        unique_to_2: blocksUniqueToSecond.size,
        jaccard_similarity: jaccardSimilarity
      };
      
      console.log(`${platform1} vs ${platform2}: ${commonBlocks.size} common blocks, similarity: ${jaccardSimilarity.toFixed(4)}`);
      
      // Content-based comparison (block number and timestamp)
      const blockFingerprints1 = new Set();
      const blockFingerprints2 = new Set();
      
      // Create fingerprints for blocks based on block number and timestamp
      platformData[platform1].records.forEach(record => {
        const blockNumber = record.blockNumber !== undefined ? record.blockNumber : record.number;
        const timestamp = record.timestamp || record.time;
        if (blockNumber !== undefined && timestamp !== undefined) {
          blockFingerprints1.add(`${blockNumber}:${timestamp}`);
        }
      });
      
      platformData[platform2].records.forEach(record => {
        const blockNumber = record.blockNumber !== undefined ? record.blockNumber : record.number;
        const timestamp = record.timestamp || record.time;
        if (blockNumber !== undefined && timestamp !== undefined) {
          blockFingerprints2.add(`${blockNumber}:${timestamp}`);
        }
      });
      
      // Find common content fingerprints
      const commonContent = new Set([...blockFingerprints1].filter(fp => blockFingerprints2.has(fp)));
      const contentUniqueToFirst = new Set([...blockFingerprints1].filter(fp => !blockFingerprints2.has(fp)));
      const contentUniqueToSecond = new Set([...blockFingerprints2].filter(fp => !blockFingerprints1.has(fp)));
      
      // Calculate Jaccard similarity for content
      const contentUnion = new Set([...blockFingerprints1, ...blockFingerprints2]);
      const contentJaccardSimilarity = contentUnion.size > 0 ? commonContent.size / contentUnion.size : 0;
      
      report.content_comparison[`${platform1}_vs_${platform2}`] = {
        common_blocks: commonContent.size,
        unique_to_1: contentUniqueToFirst.size,
        unique_to_2: contentUniqueToSecond.size,
        jaccard_similarity: contentJaccardSimilarity
      };
      
      console.log(`${platform1} vs ${platform2} content comparison: ${commonContent.size} common blocks, similarity: ${contentJaccardSimilarity.toFixed(4)}`);
      
      // Add sample of unique blocks
      if (contentUniqueToFirst.size > 0 || contentUniqueToSecond.size > 0) {
        report.content_comparison[`${platform1}_vs_${platform2}`].examples = {
          unique_to_1: Array.from(contentUniqueToFirst).slice(0, 5).map(fp => {
            const parts = fp.split(':');
            return { number: parts[0], timestamp: parts[1] };
          }),
          unique_to_2: Array.from(contentUniqueToSecond).slice(0, 5).map(fp => {
            const parts = fp.split(':');
            return { number: parts[0], timestamp: parts[1] };
          })
        };
      }
    }
  }
  
  // Save the report to a file
  const reportPath = path.join(__dirname, `parquet-blocks-report.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`Blocks comparison report saved to ${reportPath}`);
}

// Run the comparison
generateComparisonReport().catch(error => {
  console.error('Error in comparison process:', error);
}); 