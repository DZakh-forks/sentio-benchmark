const fs = require('fs');
const path = require('path');
const parquet = require('parquetjs-lite');

// Configuration
const platforms = ['sentio', 'subsquid', 'envio', 'ponder', 'subgraph'];
const outputDir = '../results';
const blockRange = 100000;
const bucketSize = 5000; // Size of each bucket for distribution analysis

// Make sure the output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Function to read parquet file and extract block numbers
async function readBlockNumbers(platform) {
  const filePath = `../data/${platform}-case3-blocks.parquet`;
  
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    return [];
  }
  
  const reader = await parquet.ParquetReader.openFile(filePath);
  const cursor = reader.getCursor();
  
  const blockNumbers = [];
  let record = null;
  
  try {
    while (record = await cursor.next()) {
      blockNumbers.push(Number(record.number));
    }
  } catch (err) {
    console.error(`Error reading ${platform} parquet:`, err);
  } finally {
    await reader.close();
  }
  
  return blockNumbers;
}

// Function to analyze distribution of blocks in buckets
function analyzeDistribution(blockNumbers, bucketSize) {
  const buckets = {};
  const totalBuckets = Math.ceil(blockRange / bucketSize);
  
  // Initialize all buckets with 0
  for (let i = 0; i < totalBuckets; i++) {
    const bucketStart = i * bucketSize;
    const bucketEnd = Math.min((i + 1) * bucketSize - 1, blockRange);
    buckets[`${bucketStart}-${bucketEnd}`] = 0;
  }
  
  // Count blocks in each bucket
  for (const blockNum of blockNumbers) {
    if (blockNum <= blockRange) {
      const bucketIndex = Math.floor(blockNum / bucketSize);
      const bucketStart = bucketIndex * bucketSize;
      const bucketEnd = Math.min((bucketIndex + 1) * bucketSize - 1, blockRange);
      buckets[`${bucketStart}-${bucketEnd}`]++;
    }
  }
  
  return buckets;
}

// Function to generate CSV for visualization
function generateCSV(platformData) {
  let csv = 'Block Range';
  
  // Add platform headers
  platforms.forEach(platform => {
    csv += `,${platform}`;
  });
  csv += '\n';
  
  // Get all unique bucket keys from all platforms
  const allBuckets = new Set();
  Object.values(platformData).forEach(data => {
    Object.keys(data.distribution).forEach(bucket => allBuckets.add(bucket));
  });
  
  // Sort buckets
  const sortedBuckets = Array.from(allBuckets).sort((a, b) => {
    const aStart = parseInt(a.split('-')[0]);
    const bStart = parseInt(b.split('-')[0]);
    return aStart - bStart;
  });
  
  // Add data rows
  sortedBuckets.forEach(bucket => {
    csv += bucket;
    platforms.forEach(platform => {
      const value = platformData[platform]?.distribution[bucket] || 0;
      csv += `,${value}`;
    });
    csv += '\n';
  });
  
  return csv;
}

// Function to generate a basic HTML report with coverage visualization
function generateHTMLReport(platformData) {
  let html = `<!DOCTYPE html>
<html>
<head>
  <title>Ethereum Block Coverage Analysis</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1, h2 { color: #333; }
    table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f2f2f2; }
    tr:nth-child(even) { background-color: #f9f9f9; }
    .chart-container { height: 400px; margin-bottom: 40px; }
    .platform-summary { display: flex; flex-wrap: wrap; gap: 20px; margin-bottom: 20px; }
    .platform-card { border: 1px solid #ddd; border-radius: 5px; padding: 15px; flex: 1; min-width: 200px; }
    .coverage-bar { height: 20px; background-color: #4CAF50; margin-top: 5px; }
  </style>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
  <h1>Ethereum Block Coverage Analysis</h1>
  
  <h2>Platform Summary</h2>
  <div class="platform-summary">`;

  // Add platform summary cards
  platforms.forEach(platform => {
    const data = platformData[platform];
    const coverage = (data.totalBlocks / blockRange * 100).toFixed(2);
    
    html += `
    <div class="platform-card">
      <h3>${platform}</h3>
      <p>Total Blocks: ${data.totalBlocks}</p>
      <p>Min Block: ${data.minBlock}</p>
      <p>Max Block: ${data.maxBlock}</p>
      <p>Coverage: ${coverage}%</p>
      <div class="coverage-bar" style="width: ${coverage}%"></div>
    </div>`;
  });

  html += `
  </div>
  
  <h2>Block Distribution</h2>
  <div class="chart-container">
    <canvas id="distributionChart"></canvas>
  </div>
  
  <h2>Coverage Heatmap</h2>
  <div class="chart-container">
    <canvas id="heatmapChart"></canvas>
  </div>
  
  <script>
    // Distribution Chart
    const ctx1 = document.getElementById('distributionChart').getContext('2d');
    new Chart(ctx1, {
      type: 'bar',
      data: {
        labels: [${Object.keys(platformData[platforms[0]].distribution).map(b => `'${b}'`).join(', ')}],
        datasets: [
          ${platforms.map((platform, i) => `{
            label: '${platform}',
            data: [${Object.values(platformData[platform].distribution).join(', ')}],
            backgroundColor: getColor(${i}),
            borderColor: getDarkerColor(${i}),
            borderWidth: 1
          }`).join(',\n          ')}
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            stacked: false,
            title: {
              display: true,
              text: 'Block Range'
            }
          },
          y: {
            stacked: false,
            title: {
              display: true,
              text: 'Number of Blocks'
            }
          }
        }
      }
    });
    
    // Helper functions for colors
    function getColor(index) {
      const colors = [
        'rgba(54, 162, 235, 0.5)',
        'rgba(255, 99, 132, 0.5)',
        'rgba(75, 192, 192, 0.5)',
        'rgba(255, 159, 64, 0.5)',
        'rgba(153, 102, 255, 0.5)'
      ];
      return colors[index % colors.length];
    }
    
    function getDarkerColor(index) {
      const colors = [
        'rgba(54, 162, 235, 1)',
        'rgba(255, 99, 132, 1)',
        'rgba(75, 192, 192, 1)',
        'rgba(255, 159, 64, 1)',
        'rgba(153, 102, 255, 1)'
      ];
      return colors[index % colors.length];
    }
  </script>
</body>
</html>`;

  return html;
}

// Main function
async function main() {
  const platformData = {};
  
  // Process each platform
  for (const platform of platforms) {
    console.log(`Processing ${platform}...`);
    const blockNumbers = await readBlockNumbers(platform);
    
    if (blockNumbers.length === 0) {
      console.warn(`No blocks found for ${platform}, skipping`);
      continue;
    }
    
    const minBlock = Math.min(...blockNumbers);
    const maxBlock = Math.max(...blockNumbers);
    const distribution = analyzeDistribution(blockNumbers, bucketSize);
    
    platformData[platform] = {
      totalBlocks: blockNumbers.length,
      minBlock,
      maxBlock,
      distribution
    };
    
    console.log(`  - ${platform}: ${blockNumbers.length} blocks (min: ${minBlock}, max: ${maxBlock})`);
  }
  
  // Generate and save CSV
  const csv = generateCSV(platformData);
  fs.writeFileSync(path.join(outputDir, 'block-distribution.csv'), csv);
  console.log(`CSV saved to ${path.join(outputDir, 'block-distribution.csv')}`);
  
  // Generate and save HTML report
  const html = generateHTMLReport(platformData);
  fs.writeFileSync(path.join(outputDir, 'coverage-report.html'), html);
  console.log(`HTML report saved to ${path.join(outputDir, 'coverage-report.html')}`);
  
  console.log('Done!');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
}); 