const fs = require('fs');
const path = require('path');

async function generateComparisonReport() {
  console.log('Generating comparison report...');
  
  // Load data from each platform
  const platformData = {};
  const platforms = ['sentio', 'envio', 'subgraph'];
  
  for (const platform of platforms) {
    const filename = `${platform}-data.json`;
    try {
      if (fs.existsSync(filename)) {
        const rawData = fs.readFileSync(filename, 'utf8');
        let data;
        
        try {
          data = JSON.parse(rawData);
          // Handle the different data structures from different platforms
          if (platform === 'sentio' && data.rows) {
            platformData[platform] = data.rows;
          } else {
            platformData[platform] = data;
          }
          console.log(`Loaded ${platformData[platform].length} records from ${platform}`);
        } catch (parseError) {
          console.error(`Error parsing ${platform} data:`, parseError.message);
          platformData[platform] = { error: `JSON parse error: ${parseError.message}` };
        }
      } else {
        console.warn(`${filename} not found`);
        platformData[platform] = { error: 'File not found' };
      }
    } catch (error) {
      console.error(`Error loading ${platform} data:`, error.message);
      platformData[platform] = { error: error.message };
    }
  }
  
  // Initialize report structure
  const report = {
    timestamp: new Date().toISOString(),
    dataCount: {},
    uniqueCounts: {},
    blockRanges: {},
    consistencyResults: {}
  };
  
  // Process data counts
  for (const platform of platforms) {
    if (Array.isArray(platformData[platform])) {
      report.dataCount[platform] = {
        count: platformData[platform].length,
        loadSuccess: true,
        error: null
      };
    } else {
      report.dataCount[platform] = {
        count: 0,
        loadSuccess: false,
        error: platformData[platform].error || 'Unknown error'
      };
    }
  }
  
  // Calculate unique blocks and transactions for each platform
  for (const platform of platforms) {
    if (!Array.isArray(platformData[platform])) continue;
    
    const blocks = new Set();
    const transactions = new Set();
    
    for (const item of platformData[platform]) {
      if (item.blockNumber) blocks.add(parseInt(item.blockNumber));
      if (item.transactionHash) transactions.add(item.transactionHash);
    }
    
    report.uniqueCounts[platform] = {
      uniqueBlocks: blocks.size,
      uniqueTxs: transactions.size
    };
  }
  
  // Calculate block ranges for each platform
  for (const platform of platforms) {
    if (!Array.isArray(platformData[platform])) continue;
    
    let minBlock = Infinity;
    let maxBlock = 0;
    
    for (const item of platformData[platform]) {
      if (item.blockNumber) {
        const blockNum = parseInt(item.blockNumber);
        if (blockNum < minBlock) minBlock = blockNum;
        if (blockNum > maxBlock) maxBlock = blockNum;
      }
    }
    
    report.blockRanges[platform] = {
      min: minBlock === Infinity ? null : minBlock,
      max: maxBlock === 0 ? null : maxBlock,
      count: maxBlock - minBlock + 1
    };
  }
  
  // Compare data consistency between platforms
  for (let i = 0; i < platforms.length; i++) {
    for (let j = i + 1; j < platforms.length; j++) {
      const platform1 = platforms[i];
      const platform2 = platforms[j];
      
      if (!Array.isArray(platformData[platform1]) || !Array.isArray(platformData[platform2])) continue;
      
      const txs1 = new Set(platformData[platform1].map(item => item.transactionHash).filter(Boolean));
      const txs2 = new Set(platformData[platform2].map(item => item.transactionHash).filter(Boolean));
      
      const common = [...txs1].filter(tx => txs2.has(tx)).length;
      const uniqueToPlat1 = txs1.size - common;
      const uniqueToPlat2 = txs2.size - common;
      
      // Calculate Jaccard similarity
      const union = txs1.size + txs2.size - common;
      const jaccardSimilarity = union > 0 ? common / union : 0;
      
      report.consistencyResults[`${platform1}_vs_${platform2}`] = {
        platform1Count: txs1.size,
        platform2Count: txs2.size,
        commonTxs: common,
        uniqueToPlat1,
        uniqueToPlat2,
        jaccardSimilarity
      };
    }
  }
  
  // Save the report to a file
  fs.writeFileSync('comparison-report.json', JSON.stringify(report, null, 2));
  console.log('Comparison report saved to comparison-report.json');
  
  return report;
}

// Run the comparison generator
generateComparisonReport().catch(error => {
  console.error('Error generating comparison report:', error);
}); 