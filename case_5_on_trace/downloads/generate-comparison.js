const fs = require('fs');
const path = require('path');
const parquet = require('parquetjs');

// Configuration
const DATA_DIR = path.join(__dirname, '..', 'data');
const OUTPUT_FILE = path.join(__dirname, 'comparison-report.json');
const HTML_OUTPUT_FILE = path.join(__dirname, 'comparison-report.html');

// The platforms to compare
const PLATFORM_FILES = {
  'sentio': 'sentio-case5-swaps.parquet',
  'subsquid': 'subsquid-case5-swaps.parquet',
  'envio': 'envio-case5-swaps.parquet',
  'ponder': 'ponder-case5-swaps.parquet',
  'subgraph': 'subgraph-case5-swaps.parquet'
};

/**
 * Load data from a Parquet file
 */
async function loadParquetData(platform, filePath) {
  try {
    console.log(`Loading ${platform} data from ${filePath}...`);
    
    if (!fs.existsSync(filePath)) {
      console.warn(`${filePath} not found`);
      return { 
        count: 0,
        loadSuccess: false, 
        error: 'File not found',
        data: []
      };
    }
    
    // Read the Parquet file
    const reader = await parquet.ParquetReader.openFile(filePath);
    
    // Get row count and data
    let rowCount = 0;
    const data = [];
    
    try {
      // Use cursor to read all rows and count them
      const cursor = reader.getCursor();
      let row;
      while ((row = await cursor.next()) !== null) {
        data.push(row);
        rowCount++;
      }
    } catch (e) {
      console.error(`Error reading rows from ${platform}: ${e.message}`);
    }
    
    console.log(`Successfully loaded ${platform} with ${rowCount} rows`);
    
    await reader.close();
    
    return {
      count: rowCount,
      loadSuccess: true,
      error: null,
      data: data
    };
  } catch (error) {
    console.error(`Error loading ${platform} data:`, error.message);
    return { 
      count: 0,
      loadSuccess: false, 
      error: error.message,
      data: []
    };
  }
}

async function generateComparisonReport() {
  console.log('Generating Parquet data comparison report...');
  
  // Load data from each platform
  const platformData = {};
  
  for (const [platform, fileName] of Object.entries(PLATFORM_FILES)) {
    const filePath = path.join(DATA_DIR, fileName);
    platformData[platform] = await loadParquetData(platform, filePath);
  }
  
  // Initialize report structure
  const report = {
    timestamp: new Date().toISOString(),
    data_type: 'uniswap_swaps',
    data_counts: {},
    unique_counts: {},
    block_ranges: {},
    amount_stats: {},
    address_stats: {},
    path_stats: {},
    content_comparison: {},
    differing_records_examples: {}
  };
  
  // Process data counts
  for (const [platform, data] of Object.entries(platformData)) {
    report.data_counts[platform] = {
      count: data.count,
      loadSuccess: data.loadSuccess,
      error: data.error
    };
  }
  
  // Process unique blocks and transactions for each platform
  for (const [platform, data] of Object.entries(platformData)) {
    if (!data.data || !Array.isArray(data.data)) {
      report.unique_counts[platform] = {
        uniqueBlocks: 0,
        uniqueTxs: 0
      };
      continue;
    }
    
    const blocks = new Set();
    const transactions = new Set();
    
    for (const item of data.data) {
      // Handle both camelCase and snake_case formats
      const blockNumber = item.blockNumber || item.block_number;
      const txHash = item.transactionHash || item.transaction_hash;
      
      if (blockNumber) blocks.add(parseInt(blockNumber.toString()));
      if (txHash) transactions.add(txHash.toString());
    }
    
    report.unique_counts[platform] = {
      uniqueBlocks: blocks.size,
      uniqueTxs: transactions.size
    };
  }
  
  // Calculate block ranges for each platform
  for (const [platform, data] of Object.entries(platformData)) {
    if (!data.data || !Array.isArray(data.data) || data.data.length === 0) {
      report.block_ranges[platform] = {
        min: null,
        max: null,
        count: 0
      };
      continue;
    }
    
    let minBlock = Infinity;
    let maxBlock = 0;
    
    for (const item of data.data) {
      // Handle both camelCase and snake_case formats
      const blockNumber = item.blockNumber || item.block_number;
      
      if (blockNumber) {
        const blockNum = parseInt(blockNumber.toString());
        if (blockNum < minBlock) minBlock = blockNum;
        if (blockNum > maxBlock) maxBlock = blockNum;
      }
    }
    
    report.block_ranges[platform] = {
      min: minBlock === Infinity ? null : minBlock,
      max: maxBlock === 0 ? null : maxBlock,
      count: maxBlock - minBlock + 1
    };
  }
  
  // Calculate amount statistics for each platform
  for (const [platform, data] of Object.entries(platformData)) {
    if (!data.data || !Array.isArray(data.data) || data.data.length === 0) {
      report.amount_stats[platform] = {
        total_amount_in: "0",
        avg_amount_in: "0",
        total_amount_out_min: "0",
        avg_amount_out_min: "0"
      };
      continue;
    }
    
    let totalAmountIn = 0n;
    let totalAmountOutMin = 0n;
    let validAmountInCount = 0;
    let validAmountOutMinCount = 0;
    
    for (const item of data.data) {
      // Handle both camelCase and snake_case formats
      const amountIn = item.amountIn || item.amount_in;
      const amountOutMin = item.amountOutMin || item.amount_out_min;
      
      if (amountIn) {
        try {
          // Convert to BigInt for consistent handling of large numbers
          totalAmountIn += BigInt(amountIn.toString());
          validAmountInCount++;
        } catch (error) {
          console.warn(`Error converting amountIn to BigInt: ${amountIn}`);
        }
      }
      
      if (amountOutMin) {
        try {
          totalAmountOutMin += BigInt(amountOutMin.toString());
          validAmountOutMinCount++;
        } catch (error) {
          console.warn(`Error converting amountOutMin to BigInt: ${amountOutMin}`);
        }
      }
    }
    
    report.amount_stats[platform] = {
      total_amount_in: totalAmountIn.toString(),
      avg_amount_in: validAmountInCount > 0 ? (Number(totalAmountIn) / validAmountInCount).toString() : "0",
      total_amount_out_min: totalAmountOutMin.toString(),
      avg_amount_out_min: validAmountOutMinCount > 0 ? (Number(totalAmountOutMin) / validAmountOutMinCount).toString() : "0"
    };
    
    console.log(`${platform} amount stats:
      - Total amountIn: ${totalAmountIn.toString()}
      - Avg amountIn: ${report.amount_stats[platform].avg_amount_in}
      - Total amountOutMin: ${totalAmountOutMin.toString()}
      - Avg amountOutMin: ${report.amount_stats[platform].avg_amount_out_min}
    `);
  }
  
  // Calculate address statistics for each platform
  for (const [platform, data] of Object.entries(platformData)) {
    if (!data.data || !Array.isArray(data.data) || data.data.length === 0) {
      report.address_stats[platform] = {
        unique_senders: 0,
        unique_recipients: 0
      };
      continue;
    }
    
    const uniqueSenders = new Set();
    const uniqueRecipients = new Set();
    
    for (const item of data.data) {
      // Handle both camelCase and snake_case formats
      const from = item.from;
      const to = item.to;
      
      if (from) uniqueSenders.add(from.toLowerCase());
      if (to) uniqueRecipients.add(to.toLowerCase());
    }
    
    report.address_stats[platform] = {
      unique_senders: uniqueSenders.size,
      unique_recipients: uniqueRecipients.size
    };
    
    console.log(`${platform} address stats:
      - Unique senders: ${uniqueSenders.size}
      - Unique recipients: ${uniqueRecipients.size}
    `);
  }
  
  // Calculate path statistics for each platform
  for (const [platform, data] of Object.entries(platformData)) {
    if (!data.data || !Array.isArray(data.data) || data.data.length === 0) {
      report.path_stats[platform] = {
        avg_path_length: 0,
        unique_tokens: 0,
        most_common_tokens: []
      };
      continue;
    }
    
    let totalPathLength = 0;
    let validPathLengthCount = 0;
    const tokenCounts = new Map();
    
    for (const item of data.data) {
      // Handle both camelCase and snake_case formats
      const pathLength = item.pathLength || item.path_length;
      const path = item.path;
      
      if (pathLength) {
        totalPathLength += parseInt(pathLength.toString());
        validPathLengthCount++;
      }
      
      if (path) {
        // Split the path by comma to get individual tokens
        const tokens = path.split(',');
        tokens.forEach(token => {
          const normalizedToken = token.toLowerCase().trim();
          if (normalizedToken) {
            tokenCounts.set(normalizedToken, (tokenCounts.get(normalizedToken) || 0) + 1);
          }
        });
      }
    }
    
    // Get most common tokens
    const mostCommonTokens = Array.from(tokenCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([token, count]) => ({ token, count }));
    
    report.path_stats[platform] = {
      avg_path_length: validPathLengthCount > 0 ? totalPathLength / validPathLengthCount : 0,
      unique_tokens: tokenCounts.size,
      most_common_tokens: mostCommonTokens
    };
    
    console.log(`${platform} path stats:
      - Avg path length: ${report.path_stats[platform].avg_path_length.toFixed(2)}
      - Unique tokens: ${tokenCounts.size}
      - Top tokens: ${mostCommonTokens.map(t => `${t.token} (${t.count})`).join(', ')}
    `);
  }
  
  // Compare data consistency between platforms (only if we have data)
  const platforms = Object.keys(PLATFORM_FILES);
  for (let i = 0; i < platforms.length; i++) {
    for (let j = i + 1; j < platforms.length; j++) {
      const platform1 = platforms[i];
      const platform2 = platforms[j];
      
      const data1 = platformData[platform1].data;
      const data2 = platformData[platform2].data;
      
      if (!Array.isArray(data1) || !Array.isArray(data2) || data1.length === 0 || data2.length === 0) {
        report.content_comparison[`${platform1}_vs_${platform2}`] = {
          platform1Count: Array.isArray(data1) ? data1.length : 0,
          platform2Count: Array.isArray(data2) ? data2.length : 0,
          commonTxs: 0,
          uniqueToPlat1: 0,
          uniqueToPlat2: 0,
          jaccardSimilarity: 0
        };
        continue;
      }
      
      // Create maps of transaction hashes to records for comparison
      const txHashMap1 = {};
      const txHashMap2 = {};
      
      // Handle both camelCase and snake_case field names
      for (const record of data1) {
        // Check for different field name variations
        let txHash = record.transactionHash || record.transaction_hash || '';
        if (txHash) txHashMap1[txHash.toLowerCase()] = record;
      }
      
      for (const record of data2) {
        let txHash = record.transactionHash || record.transaction_hash || '';
        if (txHash) txHashMap2[txHash.toLowerCase()] = record;
      }
      
      // Compare content of the records
      let commonTxs = 0;
      let identicalRecords = 0;
      let differentRecords = 0;
      let uniqueToPlat1 = 0;
      let uniqueToPlat2 = 0;
      const diffExamples = {};
      let diffExamplesCount = 0;
      const MAX_EXAMPLES = 5;
      
      // Process records that are in both datasets
      for (const txHash in txHashMap1) {
        if (!txHashMap1.hasOwnProperty(txHash)) continue;
        
        if (txHashMap2[txHash]) {
          // Both datasets have this transaction
          commonTxs++;
          
          const record1 = txHashMap1[txHash];
          const record2 = txHashMap2[txHash];
          
          // Define fields to compare (exclude ID field)
          const fieldsToCompare = [
            { p1: 'blockNumber', p2: 'block_number' },
            { p1: 'transactionHash', p2: 'transaction_hash' },
            { p1: 'from', p2: 'from' },
            { p1: 'to', p2: 'to' },
            { p1: 'amountIn', p2: 'amount_in' },
            { p1: 'amountOutMin', p2: 'amount_out_min' },
            { p1: 'deadline', p2: 'deadline' },
            { p1: 'path', p2: 'path' },
            { p1: 'pathLength', p2: 'path_length' }
          ];
          
          // Check if all fields match
          let isIdentical = true;
          const differences = [];
          const reportedErrors = {};
          
          for (const field of fieldsToCompare) {
            // Get field values from both records, checking both camelCase and snake_case formats
            let value1 = record1[field.p1];
            if (value1 === undefined && record1[field.p2] !== undefined) {
              value1 = record1[field.p2];
            }
            
            let value2 = record2[field.p2];
            if (value2 === undefined && record2[field.p1] !== undefined) {
              value2 = record2[field.p1];
            }
            
            // Convert values to string for comparison
            const strValue1 = String(value1 !== undefined ? value1 : '');
            const strValue2 = String(value2 !== undefined ? value2 : '');
            
            // If both values are undefined, they're considered equal
            if (value1 === undefined && value2 === undefined) {
              continue;
            }
            
            // Try to normalize numbers - convert scientific notation and regular integers to same format
            let normalizedValue1 = strValue1;
            let normalizedValue2 = strValue2;
            
            // Check if both values can be parsed as numbers
            const num1 = Number(strValue1);
            const num2 = Number(strValue2);
            
            if (!isNaN(num1) && !isNaN(num2)) {
              // If they represent the same number, consider them identical
              if (num1 === num2) {
                // Values are numerically identical, continue to next field
                continue;
              }
              
              // For amount fields, try to handle scientific notation vs. regular notation
              if (field.p1.includes('amount') || field.p1.includes('deadline')) {
                try {
                  // Try to compare as BigInt if possible
                  // This may not work for scientific notation, so we catch the error
                  if (BigInt(strValue1) === BigInt(strValue2)) {
                    continue;
                  }
                } catch (error) {
                  // Only log this error once per field to avoid flooding the console
                  const errorKey = `${field.p1}_bigint_conversion`;
                  if (!reportedErrors[errorKey]) {
                    console.log(`Error converting ${field.p1} to BigInt for first time: ${strValue1} vs ${strValue2}`);
                    reportedErrors[errorKey] = true;
                  }
                  
                  // If the numerical values are within 0.1% of each other, consider them the same
                  const relDiff = Math.abs((num1 - num2) / (Math.abs(num1) + Math.abs(num2) / 2));
                  if (relDiff < 0.001) {
                    continue;
                  }
                }
              }
            }
            
            if (normalizedValue1 !== normalizedValue2) {
              isIdentical = false;
              differences.push({
                field: field.p1,
                value1: strValue1,
                value2: strValue2
              });
            }
          }
          
          if (isIdentical) {
            identicalRecords++;
          } else {
            differentRecords++;
            
            // Store examples of differing records
            if (diffExamplesCount < MAX_EXAMPLES) {
              const p1 = platform1;
              const p2 = platform2;
              
              if (!diffExamples[`${p1}_vs_${p2}`]) {
                diffExamples[`${p1}_vs_${p2}`] = [];
              }
              
              // Add example with differences highlighted
              diffExamples[`${p1}_vs_${p2}`].push({
                txHash: txHash,
                differences: differences,
                [p1]: record1,
                [p2]: record2
              });
              
              diffExamplesCount++;
            }
          }
        } else {
          // Only in first dataset
          uniqueToPlat1++;
        }
      }
      
      // Check for records in platform2 that are not in platform1
      for (const txHash in txHashMap2) {
        if (!txHashMap2.hasOwnProperty(txHash)) continue;
        
        if (!txHashMap1[txHash]) {
          uniqueToPlat2++;
        }
      }
      
      // Calculate similarity metrics
      const txCount1 = Object.keys(txHashMap1).length;
      const txCount2 = Object.keys(txHashMap2).length;
      const unionSize = txCount1 + txCount2 - commonTxs;
      const jaccardSimilarity = unionSize > 0 ? commonTxs / unionSize : 0;
      
      // Content-based similarity (proportion of records that are identical)
      const contentSimilarity = commonTxs > 0 ? identicalRecords / commonTxs : 0;
      
      report.content_comparison[`${platform1}_vs_${platform2}`] = {
        platform1Count: txCount1,
        platform2Count: txCount2,
        commonTxs: commonTxs,
        identicalRecords,
        differentRecords: differentRecords,
        uniqueToPlat1: uniqueToPlat1,
        uniqueToPlat2: uniqueToPlat2,
        jaccardSimilarity,
        contentSimilarity
      };
      
      console.log(`Comparison ${platform1} vs ${platform2}:
        - Common transactions: ${commonTxs}
        - Identical records: ${identicalRecords}
        - Different records: ${differentRecords}
        - Unique to ${platform1}: ${uniqueToPlat1}
        - Unique to ${platform2}: ${uniqueToPlat2}
        - Jaccard similarity: ${jaccardSimilarity.toFixed(4)}
        - Content similarity: ${contentSimilarity.toFixed(4)}
      `);
      
      if (Object.keys(diffExamples).length > 0) {
        report.differing_records_examples = report.differing_records_examples || {};
        report.differing_records_examples[`${platform1}_vs_${platform2}`] = diffExamples[`${platform1}_vs_${platform2}`];
      }
    }
  }
  
  // Save the report to a file
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(report, null, 2));
  console.log(`Comparison report saved to ${OUTPUT_FILE}`);
  
  // Generate HTML report
  generateHTMLReport(report);
  
  return report;
}

function generateHTMLReport(report) {
  // Helper function to safely format numbers
  const formatNumber = (value) => {
    if (value === null || value === undefined) return 'N/A';
    return value.toLocaleString();
  };

  // Generate HTML content
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Uniswap V2 Swaps Comparison Report - Case 5</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; padding: 20px; max-width: 1200px; margin: 0 auto; }
    h1, h2, h3 { color: #333; }
    table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f2f2f2; }
    tr:nth-child(even) { background-color: #f9f9f9; }
    .chart-container { height: 400px; margin: 20px 0; }
    .success { color: green; }
    .failure { color: red; }
    .transaction-hash { font-family: monospace; word-break: break-all; }
    .not-present { color: #999; font-style: italic; }
    details { margin: 20px 0; }
    summary { cursor: pointer; font-weight: bold; }
    .info-box { background-color: #e7f3fe; border-left: 6px solid #2196F3; padding: 10px; margin: 15px 0; }
  </style>
</head>
<body>
  <h1>Uniswap V2 Swaps Comparison Report - Case 5</h1>
  <p>Generated at: ${report.timestamp}</p>
  
  <div class="info-box">
    <p><strong>Transaction Amount Analysis</strong>: Similar to gas usage metrics in Case 4, this report analyzes the economic values (amounts) involved in Uniswap V2 swaps across different indexing platforms. The comparison includes total amounts, average amounts, and transaction counts to provide insights into the economic activity captured by each platform.</p>
  </div>
  
  <h2>1. Record Counts</h2>
  <table>
    <tr>
      <th>Platform</th>
      <th>Record Count</th>
      <th>Status</th>
    </tr>
    ${Object.entries(report.data_counts).map(([platform, data]) => `
      <tr>
        <td>${platform}</td>
        <td>${formatNumber(data.count)}</td>
        <td class="${data.loadSuccess ? 'success' : 'failure'}">${data.loadSuccess ? 'Success' : 'Failed'}</td>
      </tr>
    `).join('')}
  </table>
  
  <h2>2. Block Ranges</h2>
  <table>
    <tr>
      <th>Platform</th>
      <th>Min Block</th>
      <th>Max Block</th>
      <th>Block Count</th>
    </tr>
    ${Object.entries(report.block_ranges).map(([platform, data]) => `
      <tr>
        <td>${platform}</td>
        <td>${data.min === null ? 'N/A' : formatNumber(data.min)}</td>
        <td>${data.max === null ? 'N/A' : formatNumber(data.max)}</td>
        <td>${formatNumber(data.count)}</td>
      </tr>
    `).join('')}
  </table>
  
  <h2>3. Address Statistics</h2>
  <table>
    <tr>
      <th>Platform</th>
      <th>Unique Senders</th>
      <th>Unique Recipients</th>
    </tr>
    ${Object.entries(report.address_stats).map(([platform, data]) => `
      <tr>
        <td>${platform}</td>
        <td>${formatNumber(data.unique_senders)}</td>
        <td>${formatNumber(data.unique_recipients)}</td>
      </tr>
    `).join('')}
  </table>
  
  <h2>4. Amount Statistics</h2>
  <table>
    <tr>
      <th>Platform</th>
      <th>Total Amount In</th>
      <th>Avg Amount In</th>
      <th>Total Amount Out Min</th>
      <th>Avg Amount Out Min</th>
    </tr>
    ${Object.entries(report.amount_stats).map(([platform, data]) => `
      <tr>
        <td>${platform}</td>
        <td>${data.total_amount_in || '0'}</td>
        <td>${data.avg_amount_in ? parseFloat(data.avg_amount_in).toLocaleString() : '0'}</td>
        <td>${data.total_amount_out_min || '0'}</td>
        <td>${data.avg_amount_out_min ? parseFloat(data.avg_amount_out_min).toLocaleString() : '0'}</td>
      </tr>
    `).join('')}
  </table>
  
  <h2>5. Path Statistics</h2>
  <table>
    <tr>
      <th>Platform</th>
      <th>Avg Path Length</th>
      <th>Unique Tokens</th>
      <th>Most Common Tokens</th>
    </tr>
    ${Object.entries(report.path_stats).map(([platform, data]) => `
      <tr>
        <td>${platform}</td>
        <td>${data.avg_path_length !== undefined ? data.avg_path_length.toFixed(2) : 'N/A'}</td>
        <td>${formatNumber(data.unique_tokens)}</td>
        <td>${data.most_common_tokens && data.most_common_tokens.length > 0 ? 
          data.most_common_tokens.map(t => `${t.token.slice(0, 8)}... (${t.count})`).join(', ') : 'N/A'}</td>
      </tr>
    `).join('')}
  </table>
  
  <h2>6. Content Similarity</h2>
  <div class="info-box">
    <p><strong>New Similarity Metrics:</strong> We've enhanced our comparison to evaluate all fields (except the ID field) for more comprehensive analysis:</p>
    <ul>
      <li><strong>Jaccard Similarity:</strong> Measures the intersection over union of transaction sets, showing what percentage of all transactions are common to both platforms.</li>
      <li><strong>Content Similarity:</strong> Of the transactions found in both platforms, what percentage have identical values across all fields (excluding ID).</li>
    </ul>
    <p>Higher percentages indicate greater similarity between the datasets.</p>
  </div>
  <table>
    <tr>
      <th>Comparison</th>
      <th>Common Transactions</th>
      <th>Identical Records</th>
      <th>Different Records</th>
      <th>Unique to First</th>
      <th>Unique to Second</th>
      <th>Jaccard Similarity</th>
      <th>Content Similarity</th>
    </tr>
    ${Object.entries(report.content_comparison || {})
      .filter(([key]) => key.includes('_vs_'))
      .map(([key, data]) => `
        <tr>
          <td>${key}</td>
          <td>${formatNumber(data.commonTxs)}</td>
          <td>${formatNumber(data.identicalRecords)}</td>
          <td>${formatNumber(data.differentRecords)}</td>
          <td>${formatNumber(data.uniqueToPlat1)}</td>
          <td>${formatNumber(data.uniqueToPlat2)}</td>
          <td>${data.jaccardSimilarity !== undefined ? (data.jaccardSimilarity * 100).toFixed(2) : 'N/A'}%</td>
          <td>${data.contentSimilarity !== undefined ? (data.contentSimilarity * 100).toFixed(2) : 'N/A'}%</td>
        </tr>
      `).join('')}
  </table>
  
  <h2>7. Example Differing Records</h2>
  ${Object.entries(report.differing_records_examples || {}).map(([comparison, examples]) => `
    <details>
      <summary>${comparison} (${examples.length} examples)</summary>
      <table>
        <tr>
          <th>Transaction Hash</th>
          <th>${comparison.split('_vs_')[0]}</th>
          <th>${comparison.split('_vs_')[1]}</th>
          <th>Fields with Differences</th>
        </tr>
        ${examples.map(example => `
          <tr>
            <td class="transaction-hash">${example.txHash}</td>
            <td>
              ${example[comparison.split('_vs_')[0]] === "Not present" 
                ? '<span class="not-present">Not present</span>' 
                : `
                  <strong>Amount In:</strong> ${example[comparison.split('_vs_')[0]].amountIn || example[comparison.split('_vs_')[0]].amount_in || 'N/A'}<br>
                  <strong>Block:</strong> ${example[comparison.split('_vs_')[0]].blockNumber || example[comparison.split('_vs_')[0]].block_number || 'N/A'}<br>
                  <strong>From:</strong> ${example[comparison.split('_vs_')[0]].from || 'N/A'}<br>
                  <strong>To:</strong> ${example[comparison.split('_vs_')[0]].to || 'N/A'}<br>
                  <strong>Path Length:</strong> ${example[comparison.split('_vs_')[0]].pathLength || example[comparison.split('_vs_')[0]].path_length || 'N/A'}
                `
              }
            </td>
            <td>
              ${example[comparison.split('_vs_')[1]] === "Not present" 
                ? '<span class="not-present">Not present</span>' 
                : `
                  <strong>Amount In:</strong> ${example[comparison.split('_vs_')[1]].amountIn || example[comparison.split('_vs_')[1]].amount_in || 'N/A'}<br>
                  <strong>Block:</strong> ${example[comparison.split('_vs_')[1]].blockNumber || example[comparison.split('_vs_')[1]].block_number || 'N/A'}<br>
                  <strong>From:</strong> ${example[comparison.split('_vs_')[1]].from || 'N/A'}<br>
                  <strong>To:</strong> ${example[comparison.split('_vs_')[1]].to || 'N/A'}<br>
                  <strong>Path Length:</strong> ${example[comparison.split('_vs_')[1]].pathLength || example[comparison.split('_vs_')[1]].path_length || 'N/A'}
                `
              }
            </td>
            <td>
              ${Array.isArray(example.differences) 
                ? example.differences.map(diff => `
                  <strong>${diff.field}:</strong> ${diff.value1 || 'undefined'} vs ${diff.value2 || 'undefined'}
                `).join('<br>') 
                : '(Unknown)'}
            </td>
          </tr>
        `).join('')}
      </table>
    </details>
  `).join('')}
  
  <h2>8. Summary</h2>
  <p>
    This report compares Uniswap V2 swap data from ${Object.keys(report.data_counts).length} different platforms.
    The most complete dataset came from ${
      Object.entries(report.data_counts)
        .sort((a, b) => (b[1].count || 0) - (a[1].count || 0))
        .filter(([_, data]) => data.loadSuccess)
        .map(([platform]) => platform)[0] || 'N/A'
    } with ${
      Math.max(...Object.values(report.data_counts).map(d => d.count || 0)).toLocaleString()
    } records.
  </p>
  
  <h2>9. Subsquid Data Fix</h2>
  <div class="info-box">
    <p><strong>Issue:</strong> The original Subsquid implementation had problems with the <code>to</code> address and <code>path</code> fields being set to zero addresses instead of properly extracting them from the transaction call data.</p>
    <p><strong>Fix Applied:</strong> The Subsquid indexer implementation was updated to properly decode the transaction calldata. Specifically:</p>
    <ul>
      <li>The <code>to</code> address is now extracted from bytes 192-256 of the calldata (taking the last 20 bytes)</li>
      <li>The <code>path</code> array is extracted by calculating the offset in the calldata based on the path pointer, then reading each address</li>
      <li>The <code>deadline</code> parameter is now properly read from the calldata</li>
    </ul>
    <p>These changes ensure that Subsquid correctly captures all the necessary fields for Uniswap V2 swaps, with proper addresses for <code>to</code> and token <code>path</code> entries.</p>
  </div>
</body>
</html>
  `;
  
  fs.writeFileSync(HTML_OUTPUT_FILE, html);
  console.log(`HTML report saved to ${HTML_OUTPUT_FILE}`);
}

// Run the comparison
generateComparisonReport().catch(err => {
  console.error('Error generating comparison report:', err);
}); 