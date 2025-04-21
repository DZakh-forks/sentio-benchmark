const fs = require('fs');
const path = require('path');

function generateHTMLReport() {
  try {
    // Read the comparison report JSON
    const reportData = JSON.parse(fs.readFileSync(path.join(__dirname, 'comparison-report.json'), 'utf8'));
    
    // Generate HTML content
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Uniswap V2 Swap Trace Indexing Comparison</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    h1, h2, h3 {
      color: #2c3e50;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin-bottom: 20px;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 8px;
      text-align: left;
    }
    th {
      background-color: #f2f2f2;
    }
    tr:nth-child(even) {
      background-color: #f9f9f9;
    }
    .chart-container {
      display: flex;
      gap: 20px;
      margin-bottom: 30px;
    }
    .chart {
      flex: 1;
      max-width: 500px;
      height: 400px;
    }
    .status-success {
      color: green;
    }
    .status-error {
      color: red;
    }
    .summary {
      background-color: #f8f9fa;
      padding: 15px;
      border-radius: 5px;
      margin-bottom: 20px;
    }
    .timestamp {
      font-style: italic;
      color: #666;
      margin-bottom: 20px;
    }
  </style>
</head>
<body>
  <h1>Uniswap V2 Swap Trace Indexing Comparison</h1>
  <p class="timestamp">Report generated on: ${new Date(reportData.timestamp).toLocaleString()}</p>
  
  <div class="summary">
    <h2>Overview</h2>
    <p>This report compares the performance and consistency of different indexing platforms for Uniswap V2 swap trace data.</p>
  </div>
  
  <h2>Data Load Status</h2>
  <table>
    <tr>
      <th>Platform</th>
      <th>Status</th>
      <th>Data Count</th>
      <th>Error (if any)</th>
    </tr>
    ${Object.entries(reportData.dataCount).map(([platform, data]) => `
    <tr>
      <td>${platform}</td>
      <td class="${data.loadSuccess ? 'status-success' : 'status-error'}">${data.loadSuccess ? 'Success' : 'Failed'}</td>
      <td>${data.count}</td>
      <td>${data.error ? data.error : 'None'}</td>
    </tr>
    `).join('')}
  </table>
  
  <h2>Unique Counts</h2>
  <table>
    <tr>
      <th>Platform</th>
      <th>Unique Blocks</th>
      <th>Unique Transactions</th>
    </tr>
    ${Object.entries(reportData.uniqueCounts).map(([platform, data]) => `
    <tr>
      <td>${platform}</td>
      <td>${data.uniqueBlocks}</td>
      <td>${data.uniqueTxs}</td>
    </tr>
    `).join('')}
  </table>
  
  <h2>Block Range Analysis</h2>
  <table>
    <tr>
      <th>Platform</th>
      <th>Min Block</th>
      <th>Max Block</th>
      <th>Block Range</th>
    </tr>
    ${Object.entries(reportData.blockRanges).map(([platform, data]) => `
    <tr>
      <td>${platform}</td>
      <td>${data.min !== null ? data.min : 'N/A'}</td>
      <td>${data.max !== null ? data.max : 'N/A'}</td>
      <td>${data.count !== null ? data.count : 'N/A'}</td>
    </tr>
    `).join('')}
  </table>
  
  <h2>Data Consistency Comparison</h2>
  <table>
    <tr>
      <th>Comparison</th>
      <th>Platform 1 Count</th>
      <th>Platform 2 Count</th>
      <th>Common Transactions</th>
      <th>Unique to Platform 1</th>
      <th>Unique to Platform 2</th>
      <th>Jaccard Similarity</th>
    </tr>
    ${Object.entries(reportData.consistencyResults).map(([comparison, data]) => `
    <tr>
      <td>${comparison.replace('_', ' vs ')}</td>
      <td>${data.platform1Count}</td>
      <td>${data.platform2Count}</td>
      <td>${data.commonTxs}</td>
      <td>${data.uniqueToPlat1}</td>
      <td>${data.uniqueToPlat2}</td>
      <td>${data.jaccardSimilarity.toFixed(4)}</td>
    </tr>
    `).join('')}
  </table>
  
  <h2>Visualizations</h2>
  
  <div class="chart-container">
    <div class="chart">
      <canvas id="countChart"></canvas>
    </div>
    <div class="chart">
      <canvas id="similarityChart"></canvas>
    </div>
  </div>
  
  <script>
    // Data from the report
    const reportData = ${JSON.stringify(reportData)};
    
    // Event Count Chart
    const countCtx = document.getElementById('countChart').getContext('2d');
    const platforms = Object.keys(reportData.dataCount);
    const counts = platforms.map(platform => reportData.dataCount[platform].count);
    
    new Chart(countCtx, {
      type: 'bar',
      data: {
        labels: platforms,
        datasets: [{
          label: 'Number of Swap Events Indexed',
          data: counts,
          backgroundColor: [
            'rgba(54, 162, 235, 0.6)',
            'rgba(255, 99, 132, 0.6)',
            'rgba(75, 192, 192, 0.6)',
            'rgba(255, 206, 86, 0.6)',
            'rgba(153, 102, 255, 0.6)'
          ],
          borderColor: [
            'rgba(54, 162, 235, 1)',
            'rgba(255, 99, 132, 1)',
            'rgba(75, 192, 192, 1)',
            'rgba(255, 206, 86, 1)',
            'rgba(153, 102, 255, 1)'
          ],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Number of Uniswap V2 Swap Events by Platform'
          },
        },
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
    
    // Jaccard Similarity Chart
    const similarityCtx = document.getElementById('similarityChart').getContext('2d');
    const comparisons = Object.keys(reportData.consistencyResults).map(key => key.replace('_', ' vs '));
    const similarities = Object.values(reportData.consistencyResults).map(value => value.jaccardSimilarity);
    
    new Chart(similarityCtx, {
      type: 'bar',
      data: {
        labels: comparisons,
        datasets: [{
          label: 'Jaccard Similarity',
          data: similarities,
          backgroundColor: 'rgba(75, 192, 192, 0.6)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Data Consistency (Jaccard Similarity) Between Platforms'
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 1
          }
        }
      }
    });
  </script>
</body>
</html>
    `;
    
    // Write the HTML file
    fs.writeFileSync(path.join(__dirname, 'comparison-report.html'), html);
    console.log('HTML report generated successfully!');
  } catch (error) {
    console.error('Error generating HTML report:', error);
  }
}

// Generate the report
generateHTMLReport(); 