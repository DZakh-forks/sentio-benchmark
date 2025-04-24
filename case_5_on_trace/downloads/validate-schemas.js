const fs = require('fs');
const path = require('path');
const parquet = require('parquetjs');

// Configuration
const DATA_DIR = path.join(__dirname, '..', 'data');
const OUTPUT_FILE = path.join(__dirname, 'schema-validation-report.json');

// The expected standardized fields
const EXPECTED_FIELDS = [
  'id', 'blockNumber', 'transactionHash', 'from', 'to',
  'amountIn', 'amountOutMin', 'deadline', 'path', 'pathLength'
];

// Maps the platform name to its Parquet file
const PLATFORM_FILES = {
  'sentio': 'sentio-case5-swaps.parquet',
  'subsquid': 'subsquid-case5-swaps.parquet',
  'envio': 'envio-case5-swaps.parquet',
  'ponder': 'ponder-case5-swaps.parquet',
  'subgraph': 'subgraph-case5-swaps.parquet'
};

async function validateSchema(platformName, filePath) {
  try {
    console.log(`Validating ${platformName} schema at path: ${filePath}`);
    console.log(`File exists check: ${fs.existsSync(filePath)}`);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return {
        platform: platformName,
        exists: false,
        error: 'File does not exist',
        fields: [],
        missingFields: EXPECTED_FIELDS,
        extraFields: []
      };
    }

    // Read Parquet metadata to get schema
    console.log(`Attempting to open parquet file for ${platformName}...`);
    const reader = await parquet.ParquetReader.openFile(filePath);
    console.log(`Successfully opened ${platformName} parquet file.`);
    const metadata = reader.metadata;
    console.log(`Got metadata for ${platformName}.`);
    const schema = reader.schema;
    console.log(`Got schema for ${platformName}: ${JSON.stringify(schema.fields)}`);
    
    // Extract field names from schema
    const fields = Object.keys(schema.fields);
    
    // Find missing and extra fields
    const missingFields = EXPECTED_FIELDS.filter(field => !fields.includes(field));
    const extraFields = fields.filter(field => !EXPECTED_FIELDS.includes(field));
    
    // Get row count
    console.log(`Reading row count from metadata for ${platformName}...`);
    console.log(`Reader info: ${JSON.stringify(reader.info || {})}`);
    console.log(`Metadata: ${JSON.stringify(metadata || {})}`);
    const count = metadata && metadata.numRows ? metadata.numRows : 0;
    console.log(`Found ${count} rows for ${platformName}`);
    
    // Read a sample row if available
    let sampleRow = null;
    if (count > 0) {
      const cursor = reader.getCursor();
      sampleRow = await cursor.next();
    }
    
    await reader.close();
    
    return {
      platform: platformName,
      exists: true,
      rowCount: count,
      fields: fields,
      fieldsMatch: missingFields.length === 0 && extraFields.length === 0,
      missingFields: missingFields,
      extraFields: extraFields,
      sampleRow: sampleRow
    };
  } catch (error) {
    return {
      platform: platformName,
      exists: false,
      error: error.message,
      fields: [],
      missingFields: EXPECTED_FIELDS,
      extraFields: []
    };
  }
}

async function validateAllPlatforms() {
  const results = {};
  let allMatch = true;
  
  for (const [platform, fileName] of Object.entries(PLATFORM_FILES)) {
    const filePath = path.join(DATA_DIR, fileName);
    const result = await validateSchema(platform, filePath);
    results[platform] = result;
    
    if (!result.exists || !result.fieldsMatch) {
      allMatch = false;
    }
    
    // Print results for this platform
    console.log(`\n=== ${platform.toUpperCase()} ===`);
    console.log(`File: ${fileName}`);
    console.log(`Exists: ${result.exists}`);
    if (result.exists) {
      console.log(`Row Count: ${result.rowCount}`);
      console.log(`Fields Match: ${result.fieldsMatch}`);
      if (result.missingFields.length > 0) {
        console.log(`Missing Fields: ${result.missingFields.join(', ')}`);
      }
      if (result.extraFields.length > 0) {
        console.log(`Extra Fields: ${result.extraFields.join(', ')}`);
      }
    } else {
      console.log(`Error: ${result.error}`);
    }
  }
  
  // Write detailed results to file
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify({
    standardizedFields: EXPECTED_FIELDS,
    allMatch: allMatch,
    results: results
  }, null, 2));
  
  console.log('\n=== SUMMARY ===');
  console.log(`All platforms match standard schema: ${allMatch}`);
  console.log(`Detailed report saved to: ${OUTPUT_FILE}`);
  
  return allMatch;
}

// Main function
async function main() {
  try {
    console.log('Validating standardized schemas across all platforms...');
    const allMatch = await validateAllPlatforms();
    
    if (allMatch) {
      console.log('\nSuccess! All platform schemas match the standardized format.');
    } else {
      console.log('\nWarning: Not all platform schemas match the standardized format.');
      console.log('Review the detailed report and update the necessary schemas.');
    }
  } catch (error) {
    console.error('Error validating schemas:', error);
  }
}

// Run the main function
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 