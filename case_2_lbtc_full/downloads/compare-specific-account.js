const fs = require('fs');
const path = require('path');
const parquet = require('parquetjs');

// Function to load data from Parquet file
async function loadParquetData(filepath) {
  try {
    const reader = await parquet.ParquetReader.openFile(filepath);
    const cursor = reader.getCursor();
    const records = [];
    
    // Read all records
    let record = null;
    while (record = await cursor.next()) {
      records.push(record);
    }
    
    reader.close();
    console.log(`Loaded ${records.length} records from ${filepath}`);
    return records;
  } catch (error) {
    console.error(`Error loading data from ${filepath}:`, error);
    return [];
  }
}

// Function to find accounts with non-zero balances that differ between platforms
async function compareNonZeroAccountBalances() {
  console.log('Comparing non-zero account balances between platforms...');
  
  // Define file paths
  const envioFilePath = path.join(__dirname, '..', 'data', 'envio-case2-accounts.parquet');
  const subsquidFilePath = path.join(__dirname, '..', 'data', 'subsquid-case2-accounts.parquet');
  const sentioFilePath = path.join(__dirname, '..', 'data', 'sentio-case2-accounts.parquet');
  
  // Load data from all files
  const envioAccounts = await loadParquetData(envioFilePath);
  const subsquidAccounts = await loadParquetData(subsquidFilePath);
  const sentioAccounts = await loadParquetData(sentioFilePath);
  
  // Convert to maps for easy lookup
  const envioBalances = new Map();
  for (const account of envioAccounts) {
    // Convert all balances to strings for consistent comparison
    envioBalances.set(account.id, String(account.balance));
  }
  
  const subsquidBalances = new Map();
  for (const account of subsquidAccounts) {
    // Convert all balances to strings for consistent comparison
    subsquidBalances.set(account.id, String(account.balance));
  }
  
  const sentioBalances = new Map();
  for (const account of sentioAccounts) {
    sentioBalances.set(account.id, String(account.balance));
  }
  
  // Find accounts with different non-zero balances
  const envioOnlyAccounts = [];
  const subsquidOnlyAccounts = [];
  const differentBalanceAccounts = [];
  
  // Count stats
  let totalNonZeroAccounts = 0;
  let commonNonZeroAccounts = 0;
  
  // Check Envio accounts against Subsquid
  for (const [id, envioBalance] of envioBalances.entries()) {
    // Skip zero balances
    if (envioBalance === '0') continue;
    
    totalNonZeroAccounts++;
    const subsquidBalance = subsquidBalances.get(id);
    
    // If the account exists in both datasets
    if (subsquidBalance !== undefined) {
      commonNonZeroAccounts++;
      if (envioBalance !== subsquidBalance) {
        differentBalanceAccounts.push({
          id,
          envioBalance,
          subsquidBalance,
          sentioBalance: sentioBalances.get(id) || 'N/A',
          diffPercentage: calculateDiffPercentage(envioBalance, subsquidBalance),
          status: 'Different Balance'
        });
      }
    } else {
      // Account exists only in Envio
      envioOnlyAccounts.push({
        id,
        envioBalance,
        subsquidBalance: 'N/A',
        sentioBalance: sentioBalances.get(id) || 'N/A',
        diffPercentage: 100,
        status: 'Only in Envio'
      });
    }
  }
  
  // Check for accounts that are only in Subsquid
  for (const [id, subsquidBalance] of subsquidBalances.entries()) {
    // Skip zero balances
    if (subsquidBalance === '0') continue;
    
    // If the account only exists in Subsquid
    if (!envioBalances.has(id)) {
      subsquidOnlyAccounts.push({
        id,
        envioBalance: 'N/A',
        subsquidBalance,
        sentioBalance: sentioBalances.get(id) || 'N/A',
        diffPercentage: 100,
        status: 'Only in Subsquid'
      });
    }
  }
  
  // Combine all differences
  const allDifferences = [
    ...differentBalanceAccounts,
    ...envioOnlyAccounts,
    ...subsquidOnlyAccounts
  ];
  
  // Sort by the difference percentage (largest first)
  allDifferences.sort((a, b) => b.diffPercentage - a.diffPercentage);
  
  // Print the statistics
  console.log('\nSummary Statistics:');
  console.log('-------------------');
  console.log(`Total accounts with non-zero balance in Envio: ${totalNonZeroAccounts}`);
  console.log(`Accounts common to both Envio and Subsquid: ${commonNonZeroAccounts}`);
  console.log(`Accounts only in Envio: ${envioOnlyAccounts.length}`);
  console.log(`Accounts only in Subsquid: ${subsquidOnlyAccounts.length}`);
  console.log(`Accounts with different balances: ${differentBalanceAccounts.length}`);
  console.log(`Total differences: ${allDifferences.length}`);
  console.log('-------------------');
  
  // Print Subsquid-only accounts first
  if (subsquidOnlyAccounts.length > 0) {
    console.log('\nAccounts Only in Subsquid:');
    console.log('-------------------------');
    
    // Limit to 10 examples for readability
    const topSubsquidOnly = subsquidOnlyAccounts.slice(0, 10);
    
    for (const diff of topSubsquidOnly) {
      console.log(`Account: ${diff.id}`);
      console.log(`  Subsquid balance: ${diff.subsquidBalance}`);
      console.log(`  Sentio balance:   ${diff.sentioBalance}`);
      console.log('-------------------------');
    }
  }
  
  // Print accounts with different balances
  if (differentBalanceAccounts.length > 0) {
    console.log('\nAccounts With Different Balances:');
    console.log('-------------------------------');
    
    // Limit to 10 examples for readability
    const topDifferentBalances = differentBalanceAccounts.slice(0, 10);
    
    for (const diff of topDifferentBalances) {
      console.log(`Account: ${diff.id}`);
      console.log(`  Envio balance:    ${diff.envioBalance}`);
      console.log(`  Subsquid balance: ${diff.subsquidBalance}`);
      console.log(`  Sentio balance:   ${diff.sentioBalance}`);
      console.log(`  Difference:       ${diff.diffPercentage.toFixed(2)}%`);
      console.log('-------------------------------');
    }
  }
  
  // Find interesting cases with discrepancies across all three platforms
  findInterestingCases(envioBalances, subsquidBalances, sentioBalances);
}

// Function to find interesting cases where all three platforms have different values
function findInterestingCases(envioBalances, subsquidBalances, sentioBalances) {
  console.log('\nInteresting Cases (Different Values Across All Platforms):');
  console.log('----------------------------------------------------------');
  
  const interestingCases = [];
  
  // Check accounts that exist in all three platforms
  for (const [id, envioBalance] of envioBalances.entries()) {
    // Skip zero balances
    if (envioBalance === '0') continue;
    
    const subsquidBalance = subsquidBalances.get(id);
    const sentioBalance = sentioBalances.get(id);
    
    // If account exists in all platforms and balances are all different
    if (subsquidBalance && sentioBalance &&
        envioBalance !== subsquidBalance && 
        envioBalance !== sentioBalance && 
        subsquidBalance !== sentioBalance) {
      
      interestingCases.push({
        id,
        envioBalance,
        subsquidBalance,
        sentioBalance
      });
    }
  }
  
  if (interestingCases.length === 0) {
    console.log('No accounts found with different balances across all three platforms.');
    return;
  }
  
  // Limit to 5 examples
  const topCases = interestingCases.slice(0, 5);
  
  for (const kase of topCases) {
    console.log(`Account: ${kase.id}`);
    console.log(`  Envio:    ${kase.envioBalance}`);
    console.log(`  Subsquid: ${kase.subsquidBalance}`);
    console.log(`  Sentio:   ${kase.sentioBalance}`);
    console.log('----------------------------------------------------------');
  }
}

// Helper function to calculate percentage difference
function calculateDiffPercentage(val1, val2) {
  const num1 = parseFloat(val1);
  const num2 = parseFloat(val2);
  
  if (isNaN(num1) || isNaN(num2)) return 100;
  if (num1 === 0 && num2 === 0) return 0;
  if (num1 === 0 || num2 === 0) return 100; // 100% difference if one is zero
  
  const avg = (num1 + num2) / 2;
  return Math.abs((num1 - num2) / avg) * 100;
}

// Run the comparison
compareNonZeroAccountBalances().catch(error => {
  console.error('Error in comparison process:', error);
}); 