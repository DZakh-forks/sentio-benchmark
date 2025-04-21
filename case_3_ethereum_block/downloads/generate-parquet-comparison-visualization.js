const fs = require('fs');
const path = require('path');

function generateHTML() {
  const reportPath = path.join(__dirname, 'parquet-blocks-report.json');
  
  // Check if the report file exists
  if (!fs.existsSync(reportPath)) {
    console.error(`Report file not found: ${reportPath}`);
    return;
  }
  
  console.log('Generating HTML visualization...');
  
  // Read the JSON report
  const reportData = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  const timestamp = new Date(reportData.timestamp).toLocaleString();
  
  // Generate HTML content
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ethereum Block Comparison Report</title>
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
    .dashboard {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .card {
      background: #fff;
      border-radius: 5px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.1);
      padding: 20px;
      margin-bottom: 20px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 8px 12px;
      text-align: left;
    }
    th {
      background-color: #f2f2f2;
    }
    tr:nth-child(even) {
      background-color: #f9f9f9;
    }
    .chart-container {
      height: 300px;
      margin-bottom: 30px;
    }
    .heatmap {
      display: grid;
      grid-template-columns: repeat(${Object.keys(reportData.data_counts).length + 1}, 1fr);
      gap: 2px;
    }
    .heatmap-cell {
      padding: 10px;
      text-align: center;
      color: white;
      font-weight: bold;
    }
    .header-cell {
      background-color: #2c3e50;
    }
    .platform-cell {
      background-color: #2c3e50;
      color: white;
    }
    .similarity-cell {
      transition: background-color 0.3s;
    }
    .missing-data {
      background-color: #f8f9fa;
      color: #6c757d;
      padding: 15px;
      border-radius: 5px;
      border-left: 5px solid #6c757d;
      margin-bottom: 20px;
    }
  </style>
</head>
<body>
  <h1>Ethereum Block Comparison Report</h1>
  <p>Generated on: ${timestamp}</p>
  
  ${generateSummarySection(reportData)}
  ${generateDataCountsSection(reportData)}
  ${generateBlockRangeSection(reportData)}
  ${generateConsistencySection(reportData)}
  ${generatePairwiseComparisons(reportData)}
  
  <script>
    // Function to generate color based on similarity value
    function getColor(value) {
      // Red (0) to Green (1) gradient
      const r = Math.floor(255 * (1 - value));
      const g = Math.floor(255 * value);
      const b = 0;
      return \`rgb(\${r}, \${g}, \${b})\`;
    }
    
    // Apply colors to similarity cells
    document.querySelectorAll('.similarity-cell').forEach(cell => {
      const value = parseFloat(cell.getAttribute('data-value'));
      if (!isNaN(value)) {
        cell.style.backgroundColor = getColor(value);
      } else {
        cell.style.backgroundColor = '#f8f9fa';
        cell.style.color = '#6c757d';
      }
    });
  </script>
</body>
</html>
  `;
  
  // Write the HTML to a file
  const outputPath = path.join(__dirname, 'parquet-comparison-report.html');
  fs.writeFileSync(outputPath, html);
  
  console.log(`HTML report generated at: ${outputPath}`);
}

function generateSummarySection(reportData) {
  const platforms = Object.keys(reportData.data_counts);
  
  // Check if any platform has data
  const hasData = platforms.some(platform => reportData.data_counts[platform].count > 0);
  
  if (!hasData) {
    return `
    <div class="card">
      <h2>Summary</h2>
      <div class="missing-data">
        <p><strong>No block data available.</strong> None of the platforms have successfully indexed blocks or the Parquet files could not be found.</p>
        <p>Please check the following:</p>
        <ul>
          <li>The indexers have completed their runs</li>
          <li>The Parquet files are in the correct location</li>
          <li>The files are correctly formatted</li>
        </ul>
      </div>
    </div>`;
  }
  
  return `
  <div class="card">
    <h2>Summary</h2>
    <p>This report compares Ethereum block data indexed by different platforms.</p>
    <ul>
      ${platforms.map(platform => {
        const count = reportData.data_counts[platform].count;
        const success = reportData.data_counts[platform].success;
        return `<li><strong>${platform.charAt(0).toUpperCase() + platform.slice(1)}:</strong> ${count} blocks ${success ? 'successfully indexed' : 'indexing failed'}</li>`;
      }).join('')}
    </ul>
  </div>`;
}

function generateDataCountsSection(reportData) {
  return `
  <div class="card">
    <h2>Record Counts</h2>
    <table>
      <tr>
        <th>Platform</th>
        <th>Block Count</th>
        <th>Status</th>
      </tr>
      ${Object.entries(reportData.data_counts).map(([platform, data]) => `
        <tr>
          <td>${platform.charAt(0).toUpperCase() + platform.slice(1)}</td>
          <td>${data.count.toLocaleString()}</td>
          <td>${data.success ? '✅ Success' : '❌ Failed'}</td>
        </tr>
      `).join('')}
    </table>
  </div>`;
}

function generateBlockRangeSection(reportData) {
  return `
  <div class="card">
    <h2>Block Range Coverage</h2>
    <table>
      <tr>
        <th>Platform</th>
        <th>Min Block</th>
        <th>Max Block</th>
        <th>Block Count</th>
      </tr>
      ${Object.entries(reportData.block_ranges).map(([platform, data]) => `
        <tr>
          <td>${platform.charAt(0).toUpperCase() + platform.slice(1)}</td>
          <td>${data.min !== null ? data.min.toLocaleString() : 'N/A'}</td>
          <td>${data.max !== null ? data.max.toLocaleString() : 'N/A'}</td>
          <td>${data.count.toLocaleString()}</td>
        </tr>
      `).join('')}
    </table>
  </div>`;
}

function generateConsistencySection(reportData) {
  const platforms = Object.keys(reportData.data_counts);
  
  // Check if there's any data to display
  const hasData = Object.values(reportData.consistency).some(comparison => 
    comparison.common_blocks > 0 || comparison.unique_to_1 > 0 || comparison.unique_to_2 > 0);
  
  if (!hasData) {
    return `
    <div class="card">
      <h2>Consistency Analysis</h2>
      <div class="missing-data">
        <p>No block overlap data available to analyze consistency between platforms.</p>
      </div>
    </div>`;
  }
  
  return `
  <div class="card">
    <h2>Consistency Analysis</h2>
    
    <h3>Block Number Overlap</h3>
    <div class="heatmap">
      <div class="heatmap-cell header-cell">Platform</div>
      ${platforms.map(platform => `
        <div class="heatmap-cell header-cell">${platform.charAt(0).toUpperCase() + platform.slice(1)}</div>
      `).join('')}
      
      ${platforms.map(platform1 => `
        <div class="heatmap-cell platform-cell">${platform1.charAt(0).toUpperCase() + platform1.slice(1)}</div>
        ${platforms.map(platform2 => {
          if (platform1 === platform2) {
            return `<div class="heatmap-cell similarity-cell" data-value="1.0">1.00</div>`;
          }
          
          // Get the comparison key (ensuring alphabetical order)
          const key = [platform1, platform2].sort().join('_vs_');
          const comparisonKey = reportData.consistency[`${platform1}_vs_${platform2}`] ? 
                                `${platform1}_vs_${platform2}` : 
                                `${platform2}_vs_${platform1}`;
          
          const comparison = reportData.consistency[comparisonKey];
          if (!comparison) {
            return `<div class="heatmap-cell similarity-cell" data-value="N/A">N/A</div>`;
          }
          
          return `<div class="heatmap-cell similarity-cell" data-value="${comparison.jaccard_similarity}">${comparison.jaccard_similarity.toFixed(2)}</div>`;
        }).join('')}
      `).join('')}
    </div>
    
    <h3>Content Comparison</h3>
    <div class="heatmap">
      <div class="heatmap-cell header-cell">Platform</div>
      ${platforms.map(platform => `
        <div class="heatmap-cell header-cell">${platform.charAt(0).toUpperCase() + platform.slice(1)}</div>
      `).join('')}
      
      ${platforms.map(platform1 => `
        <div class="heatmap-cell platform-cell">${platform1.charAt(0).toUpperCase() + platform1.slice(1)}</div>
        ${platforms.map(platform2 => {
          if (platform1 === platform2) {
            return `<div class="heatmap-cell similarity-cell" data-value="1.0">1.00</div>`;
          }
          
          // Get the comparison key (ensuring alphabetical order)
          const comparisonKey = reportData.content_comparison[`${platform1}_vs_${platform2}`] ? 
                                `${platform1}_vs_${platform2}` : 
                                `${platform2}_vs_${platform1}`;
          
          const comparison = reportData.content_comparison[comparisonKey];
          if (!comparison) {
            return `<div class="heatmap-cell similarity-cell" data-value="N/A">N/A</div>`;
          }
          
          return `<div class="heatmap-cell similarity-cell" data-value="${comparison.jaccard_similarity}">${comparison.jaccard_similarity.toFixed(2)}</div>`;
        }).join('')}
      `).join('')}
    </div>
  </div>`;
}

function generatePairwiseComparisons(reportData) {
  const pairwiseComparisons = [];
  const platforms = Object.keys(reportData.data_counts);
  
  // Check if there's any data to display
  const hasData = Object.values(reportData.consistency).some(comparison => 
    comparison.common_blocks > 0 || comparison.unique_to_1 > 0 || comparison.unique_to_2 > 0);
  
  if (!hasData) {
    return `
    <div class="card">
      <h2>Pairwise Comparisons</h2>
      <div class="missing-data">
        <p>No data available for pairwise comparisons between platforms.</p>
      </div>
    </div>`;
  }
  
  // Generate all pairwise comparisons
  for (let i = 0; i < platforms.length; i++) {
    for (let j = i + 1; j < platforms.length; j++) {
      const platform1 = platforms[i];
      const platform2 = platforms[j];
      
      const comparisonKey = `${platform1}_vs_${platform2}`;
      const consistency = reportData.consistency[comparisonKey];
      const contentComparison = reportData.content_comparison[comparisonKey];
      
      if (!consistency || !contentComparison) continue;
      
      pairwiseComparisons.push(`
      <div class="card">
        <h3>${platform1.charAt(0).toUpperCase() + platform1.slice(1)} vs ${platform2.charAt(0).toUpperCase() + platform2.slice(1)}</h3>
        
        <h4>Block Number Overlap</h4>
        <table>
          <tr>
            <th>Common Blocks</th>
            <th>Unique to ${platform1}</th>
            <th>Unique to ${platform2}</th>
            <th>Jaccard Similarity</th>
          </tr>
          <tr>
            <td>${consistency.common_blocks.toLocaleString()}</td>
            <td>${consistency.unique_to_1.toLocaleString()}</td>
            <td>${consistency.unique_to_2.toLocaleString()}</td>
            <td>${consistency.jaccard_similarity.toFixed(4)}</td>
          </tr>
        </table>
        
        <h4>Content Comparison</h4>
        <table>
          <tr>
            <th>Common Content</th>
            <th>Unique to ${platform1}</th>
            <th>Unique to ${platform2}</th>
            <th>Jaccard Similarity</th>
          </tr>
          <tr>
            <td>${contentComparison.common_blocks.toLocaleString()}</td>
            <td>${contentComparison.unique_to_1.toLocaleString()}</td>
            <td>${contentComparison.unique_to_2.toLocaleString()}</td>
            <td>${contentComparison.jaccard_similarity.toFixed(4)}</td>
          </tr>
        </table>
      </div>`);
    }
  }
  
  return `
  <h2>Detailed Pairwise Comparisons</h2>
  <div class="dashboard">
    ${pairwiseComparisons.join('')}
  </div>`;
}

// Execute the HTML generation
generateHTML();

// If you want to run this script directly with Node.js
if (require.main === module) {
  generateHTML();
}

module.exports = { generateHTML }; 