#!/usr/bin/env node

/**
 * Data Upload Script for Google Drive
 * 
 * This script helps upload the data files to Google Drive.
 * Before running this script, you need to:
 * 1. Install required dependencies: npm install googleapis@105 @google-cloud/local-auth@2.1.0
 * 2. Set up Google API credentials (see instructions below)
 * 
 * For detailed instructions on setting up Google Drive API, see:
 * https://developers.google.com/drive/api/quickstart/nodejs
 */

const fs = require('fs').promises;
const path = require('path');
const process = require('process');
const {authenticate} = require('@google-cloud/local-auth');
const {google} = require('googleapis');

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/drive.file'];
// The credentials file from Google Cloud Console
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');

/**
 * List of data directories and files to upload
 */
const DATA_DIRECTORIES = [
  {
    path: 'case_1_lbtc_event_only/data',
    description: 'LBTC Event Only Data'
  },
  {
    path: 'case_2_lbtc_full/data',
    description: 'LBTC Full Data'
  },
  {
    path: 'case_3_ethereum_block/data',
    description: 'Ethereum Block Data'
  },
  {
    path: 'case_4_on_transaction/data',
    description: 'On Transaction Data'
  },
  {
    path: 'case_5_on_trace/data',
    description: 'On Trace Data'
  }
];

/**
 * Authenticate with Google
 */
async function authorize() {
  let client = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });
  
  return client;
}

/**
 * Upload a file to Google Drive
 */
async function uploadFile(auth, filePath, parentFolderId = null) {
  const drive = google.drive({version: 'v3', auth});
  const fileName = path.basename(filePath);
  
  // File metadata
  const fileMetadata = {
    name: fileName,
  };
  
  // Add to specific folder if provided
  if (parentFolderId) {
    fileMetadata.parents = [parentFolderId];
  }
  
  // File content
  const media = {
    mimeType: 'application/octet-stream',
    body: fs.createReadStream(filePath),
  };
  
  try {
    const res = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id,name,webViewLink',
    });
    
    console.log(`Uploaded: ${fileName}`);
    console.log(`File ID: ${res.data.id}`);
    console.log(`View URL: ${res.data.webViewLink}`);
    return res.data;
  } catch (err) {
    console.error(`Error uploading ${fileName}:`, err.message);
    throw err;
  }
}

/**
 * Create a folder in Google Drive
 */
async function createFolder(auth, folderName, parentFolderId = null) {
  const drive = google.drive({version: 'v3', auth});
  
  const folderMetadata = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
  };
  
  if (parentFolderId) {
    folderMetadata.parents = [parentFolderId];
  }
  
  try {
    const res = await drive.files.create({
      resource: folderMetadata,
      fields: 'id,name,webViewLink',
    });
    
    console.log(`Created folder: ${folderName}`);
    console.log(`Folder ID: ${res.data.id}`);
    console.log(`View URL: ${res.data.webViewLink}`);
    return res.data;
  } catch (err) {
    console.error(`Error creating folder ${folderName}:`, err.message);
    throw err;
  }
}

/**
 * Upload all files in a directory
 */
async function uploadDirectory(auth, dirPath, parentFolderId = null) {
  try {
    const files = await fs.readdir(dirPath);
    const directoryName = path.basename(dirPath);
    
    // Create a folder for this directory
    const folder = await createFolder(auth, directoryName, parentFolderId);
    
    // Upload each file
    for (const file of files) {
      // Skip .gitkeep and hidden files
      if (file === '.gitkeep' || file.startsWith('.')) {
        continue;
      }
      
      const filePath = path.join(dirPath, file);
      const stats = await fs.stat(filePath);
      
      if (stats.isFile()) {
        await uploadFile(auth, filePath, folder.id);
      }
    }
    
    return folder;
  } catch (err) {
    console.error(`Error processing directory ${dirPath}:`, err.message);
    throw err;
  }
}

/**
 * Main function to upload all data
 */
async function main() {
  try {
    console.log('Authenticating with Google Drive...');
    const auth = await authorize();
    
    // Create main folder
    const mainFolder = await createFolder(auth, 'Indexer Benchmark Data');
    
    // Process each data directory
    for (const dir of DATA_DIRECTORIES) {
      console.log(`\nProcessing ${dir.description}...`);
      await uploadDirectory(auth, dir.path, mainFolder.id);
    }
    
    console.log('\nAll data uploaded successfully!');
    console.log(`Main folder: ${mainFolder.webViewLink}`);
    
    // Save the drive URL for reference
    await fs.writeFile('data-drive-url.txt', mainFolder.webViewLink);
    console.log('Drive URL saved to data-drive-url.txt');
    
  } catch (err) {
    console.error('Error:', err.message);
  }
}

// Run the script
if (require.main === module) {
  console.log('Starting data upload to Google Drive...');
  console.log('NOTE: This requires Google Drive API credentials to be set up.');
  console.log('If you have not set up credentials, see instructions in the script.\n');
  
  main().catch(console.error);
} 