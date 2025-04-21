import {TypeormDatabase} from '@subsquid/typeorm-store'
import {GasSpent} from './model/generated/gas-spent.model'
import {processor} from './processor'

processor.run(new TypeormDatabase({supportHotBlocks: true}), async (ctx) => {
    const gasRecords: GasSpent[] = []
    for (let block of ctx.blocks) {
        // Process transactions for gas usage
        for (let txn of block.transactions) {
            if (txn.gasUsed !== undefined && txn.gasPrice !== undefined) {
                const from = txn.from.toLowerCase()
                const to = txn.to ? txn.to.toLowerCase() : '0x0'
                const gasValue = BigInt(txn.gasUsed) * BigInt(txn.gasPrice)
                
                gasRecords.push(
                    new GasSpent({
                        id: txn.hash,
                        from: from,
                        to: to,
                        gasValue: gasValue,
                        blockNumber: BigInt(block.header.height),
                        transactionHash: Buffer.from(txn.hash.substring(2), 'hex') // More efficient by removing '0x' prefix
                    })
                )
            }
        }
    }
    // Insert all entities
    await ctx.store.insert(gasRecords)
})
