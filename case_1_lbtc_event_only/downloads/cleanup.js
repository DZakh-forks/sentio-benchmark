/**
 * Script to clean up the downloads directory
 * Keeps only essential files and removes unnecessary ones
 */

const fs = require('fs');
const path = require('path');

/**
 * This script cleans up unnecessary files from the downloads directory
 */
function cleanupDownloads() {
  const directoryPath = __dirname;
  
  // Files to keep
  const filesToKeep = [
    // Core scripts for generating comparisons
    'generate-parquet-comparison.js',
    'generate-parquet-comparison-visualization.js',
    'package.json',
    'package-lock.json',
    'cleanup.js',
    'README.md',
    
    // Parquet file generation scripts
    'fetch-sentio-to-parquet.js',
    'fetch-envio-to-parquet.js',
    'fetch-ponder-to-parquet.js',
    'fetch-subsquid-to-parquet.js',
    'fetch-subgraph-to-parquet.js',
    
    // Count utility
    'count-parquet-records.js',
    
    // Latest comparison reports
    'parquet-comparison-report.json',
    'parquet-comparison-report.html'
  ];
  
  // Files to delete
  const filesToDelete = [
    // Old comparison files
    'comparison-report.json',
    'comparison-report.html',
    'generate-report.js',
    'generate-comparison.js',
    
    // Old data files
    'sentio-data.json',
    'envio-data.json',
    'ponder-data.json',
    'subsquid-data.json',
    'subgraph-data.json',
    
    // Other obsolete files
    'fetch-all-data.js',
    'sentio-case1-complete.parquet'
  ];
  
  console.log('Starting cleanup of downloads directory...');
  
  // Read all files in the directory
  fs.readdir(directoryPath, (err, files) => {
    if (err) {
      console.error('Error reading directory:', err);
      return;
    }
    
    // Filter out node_modules directory and files we want to keep
    const filesToRemove = files.filter(file => {
      // Skip directories
      if (fs.statSync(path.join(directoryPath, file)).isDirectory()) {
        return false;
      }
      
      // Skip files we want to keep
      if (filesToKeep.includes(file)) {
        return false;
      }
      
      // Explicitly list files to delete
      if (filesToDelete.includes(file)) {
        return true;
      }
      
      // Keep any other files by default
      return false;
    });
    
    if (filesToRemove.length === 0) {
      console.log('No files to remove.');
      return;
    }
    
    console.log(`Found ${filesToRemove.length} files to remove:`);
    filesToRemove.forEach(file => console.log(`  - ${file}`));
    
    // Delete each file
    filesToRemove.forEach(file => {
      const filePath = path.join(directoryPath, file);
      try {
        fs.unlinkSync(filePath);
        console.log(`Deleted: ${file}`);
      } catch (error) {
        console.error(`Error deleting ${file}:`, error);
      }
    });
    
    console.log('Cleanup complete!');
  });
}

// Run the cleanup
cleanupDownloads(); 