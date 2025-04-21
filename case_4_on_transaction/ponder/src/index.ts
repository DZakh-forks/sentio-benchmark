import { ponder } from "ponder:registry";
import schema from "ponder:schema";

ponder.on("EveryBlock:block", async ({ event, context }) => {
  const blockNumber = BigInt(event.block.number);
  console.log(`Processing block ${event.block.number}`);
  
  try {
    // Get all transaction hashes from the block
    const blockWithTransactions = await context.client.getBlock({
      blockHash: event.block.hash,
      includeTransactions: true
    });
    
    if (!blockWithTransactions.transactions || blockWithTransactions.transactions.length === 0) {
      console.log(`Block ${event.block.number} has no transactions`);
      return;
    }
    
    console.log(`Found ${blockWithTransactions.transactions.length} transactions in block ${event.block.number}`);
    
    // Prepare batch records for insertion
    const gasSpentRecords = [];
    
    // Process each transaction
    for (const tx of blockWithTransactions.transactions) {
      try {
        // Get transaction receipt for gas data
        const receipt = await context.client.getTransactionReceipt({
          hash: tx.hash,
        });
        
        if (receipt) {
          // Calculate gas value
          const gasUsed = receipt.gasUsed;
          const effectiveGasPrice = receipt.effectiveGasPrice || tx.gasPrice;
          
          if (gasUsed && effectiveGasPrice) {
            const gasValue = gasUsed * effectiveGasPrice;
            
            // Add to batch records
            gasSpentRecords.push({
              id: tx.hash,
              from: tx.from,
              to: tx.to || "0x0000000000000000000000000000000000000000",
              gasValue,
              blockNumber,
              transactionHash: tx.hash
            });
          }
        }
      } catch (error) {
        console.error(`Error processing transaction ${tx.hash}:`, error);
      }
    }
    
    // Insert records in batch if any were collected
    if (gasSpentRecords.length > 0) {
      await context.db.insert(schema.gasSpent).values(gasSpentRecords);
      console.log(`Block ${event.block.number}: Inserted ${gasSpentRecords.length} gas records`);
    }
    
  } catch (error) {
    console.error(`Error processing block ${event.block.number}:`, error);
  }
});
