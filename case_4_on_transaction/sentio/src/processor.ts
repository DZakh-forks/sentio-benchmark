import { EthChainId, GlobalContext, GlobalProcessor } from '@sentio/sdk/eth'
import { getPriceByType, token } from '@sentio/sdk/utils'
import { BigDecimal, scaleDown } from '@sentio/sdk'
import { GasSpent } from './schema/schema.js'

GlobalProcessor.bind({ startBlock: 22280000, endBlock: 22290000 }).onTransaction(
  async (tx, ctx) => {
    // Only process transactions with a valid receipt
    if (!ctx.transactionReceipt || !ctx.transaction) {
      return
    }
    
    // Use the tx parameter directly where possible
    const from = tx.from.toLowerCase()
    const to = (tx.to || '0x0').toLowerCase()
    const gasValue = BigInt(ctx.transactionReceipt.gasUsed) * BigInt(ctx.transactionReceipt.effectiveGasPrice || ctx.transactionReceipt.gasPrice || 0n)
    const blockNumber = BigInt(tx.blockNumber || 0)

    // Create a unique ID for this transaction - use tx.hash directly
    const txHash = tx.hash.toLowerCase()
    
    // Store the gas spent record in the database with optimized buffer conversion
    const gasSpent = new GasSpent({
      id: txHash,
      from: from,
      to: to,
      gasValue: gasValue,
      blockNumber: blockNumber,
      transactionHash: Buffer.from(txHash.slice(2), 'hex')
    })
    
    // Use store.upsert efficiently
    await ctx.store.upsert(gasSpent)
  },
  { transaction: true, transactionReceipt: true }
)

