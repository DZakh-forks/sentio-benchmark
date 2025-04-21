const fs = require('fs');
const path = require('path');
const parquet = require('parquetjs');

/**
 * Count records in a Parquet file
 * @param {string} filePath - Path to the Parquet file
 * @returns {Promise<number>} - Number of records in the file
 */
async function countParquetRecords(filePath) {
  try {
    console.log(`Counting records in ${filePath}...`);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.error(`File not found: ${filePath}`);
      return 0;
    }
    
    // Open the parquet file for reading
    const reader = await parquet.ParquetReader.openFile(filePath);
    
    // Get the schema
    const schema = reader.schema;
    const fields = Object.keys(schema.fields);
    
    // We need to create a cursor to read records
    let recordCount = 0;
    const cursor = reader.getCursor();
    
    // Read all records to get the count
    let record = null;
    try {
      while (record = await cursor.next()) {
        recordCount++;
        
        // Log progress every 10,000 records
        if (recordCount % 10000 === 0) {
          console.log(`  Progress: ${recordCount} records read`);
        }
      }
    } catch (e) {
      // End of file reached
      console.log(`  Finished reading records`);
    }
    
    // Close the reader
    await reader.close();
    
    console.log(`File: ${path.basename(filePath)}`);
    console.log(`Number of records: ${recordCount}`);
    console.log(`Fields: ${fields.join(', ')}`);
    console.log('------------------------');
    
    return recordCount;
  } catch (error) {
    console.error(`Error counting records in ${filePath}:`, error);
    return 0;
  }
}

/**
 * Count records in all Parquet files in a directory
 * @param {string} directoryPath - Path to the directory containing Parquet files
 */
async function countAllParquetFiles(directoryPath) {
  try {
    console.log(`Checking Parquet files in ${directoryPath}...`);
    
    // Check if directory exists
    if (!fs.existsSync(directoryPath)) {
      console.error(`Directory not found: ${directoryPath}`);
      return;
    }
    
    // Get all .parquet files in the directory
    const files = fs.readdirSync(directoryPath)
      .filter(file => file.endsWith('.parquet'))
      .map(file => path.join(directoryPath, file));
    
    if (files.length === 0) {
      console.log('No Parquet files found in the directory.');
      return;
    }
    
    console.log(`Found ${files.length} Parquet files.\n`);
    
    // Count records in each file
    const counts = {};
    let totalRecords = 0;
    
    for (const file of files) {
      const count = await countParquetRecords(file);
      counts[path.basename(file)] = count;
      totalRecords += count;
    }
    
    console.log('\nSummary:');
    Object.entries(counts).forEach(([file, count]) => {
      console.log(`${file}: ${count} records`);
    });
    console.log(`Total records across all files: ${totalRecords}`);
  } catch (error) {
    console.error('Error processing Parquet files:', error);
  }
}

// Alternative method to count records using a different approach via exec
async function countRecordsWithPythonPandas(filePath) {
  try {
    console.log(`Counting records in ${filePath} using Python pandas...`);
    
    // Using Python pandas to count records (if Python with pandas is installed)
    const { exec } = require('child_process');
    const util = require('util');
    const execAsync = util.promisify(exec);
    
    const pythonCode = `
import pandas as pd
df = pd.read_parquet('${filePath}')
print(len(df))
print(','.join(df.columns))
`;
    
    const pythonCommand = `python3 -c "${pythonCode}"`;
    const { stdout, stderr } = await execAsync(pythonCommand);
    
    if (stderr) {
      console.error(`Python error: ${stderr}`);
      return 0;
    }
    
    const lines = stdout.trim().split('\n');
    const count = parseInt(lines[0], 10);
    const fields = lines[1] || '';
    
    console.log(`File: ${path.basename(filePath)}`);
    console.log(`Number of records: ${count}`);
    console.log(`Fields: ${fields}`);
    console.log('------------------------');
    
    return count;
  } catch (error) {
    console.error(`Error counting with Python: ${error.message}`);
    console.log(`Falling back to Node.js parquetjs method...`);
    return countParquetRecords(filePath);
  }
}

// Main function
async function main() {
  // Path to the data directory (relative to the script)
  const dataDir = path.join(__dirname, '..', 'data');
  
  console.log('Counting records in Parquet files...\n');
  
  // Try the Python pandas method first, as it's typically faster
  try {
    const { exec } = require('child_process');
    const util = require('util');
    const execAsync = util.promisify(exec);
    
    const { stdout } = await execAsync('python3 -c "import pandas" 2>/dev/null && echo "pandas_available" || echo "pandas_not_available"');
    
    if (stdout.trim() === 'pandas_available') {
      console.log('Using Python pandas to count records (faster method)\n');
      
      // Get all .parquet files in the directory
      const files = fs.readdirSync(dataDir)
        .filter(file => file.endsWith('.parquet'))
        .map(file => path.join(dataDir, file));
      
      if (files.length === 0) {
        console.log('No Parquet files found in the directory.');
        return;
      }
      
      console.log(`Found ${files.length} Parquet files.\n`);
      
      // Count records in each file
      const counts = {};
      let totalRecords = 0;
      
      for (const file of files) {
        const count = await countRecordsWithPythonPandas(file);
        counts[path.basename(file)] = count;
        totalRecords += count;
      }
      
      console.log('\nSummary:');
      Object.entries(counts).forEach(([file, count]) => {
        console.log(`${file}: ${count} records`);
      });
      console.log(`Total records across all files: ${totalRecords}`);
      return;
    }
  } catch (error) {
    console.log('Python pandas not available, using Node.js method\n');
  }
  
  // Fallback to pure Node.js method
  await countAllParquetFiles(dataDir);
}

// Run the main function
main().catch(error => {
  console.error('Error in main execution:', error);
  process.exit(1);
}); 