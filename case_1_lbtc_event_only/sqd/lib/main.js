"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_store_1 = require("@subsquid/typeorm-store");
const model_1 = require("./model");
const processor_1 = require("./processor");
const LBTC_js_1 = require("./abi/LBTC.js");
processor_1.processor.run(new typeorm_store_1.TypeormDatabase({ supportHotBlocks: true }), async (ctx) => {
    const transfers = [];
    for (let block of ctx.blocks) {
        for (let log of block.logs) {
            // Filter for Transfer events
            if (log.topics[0] === LBTC_js_1.events.Transfer.topic) {
                // Decode the Transfer event data
                const { from, to, value } = LBTC_js_1.events.Transfer.decode(log);
                transfers.push(new model_1.Transfer({
                    id: `${block.header.id}_${block.header.height}_${log.logIndex}`,
                    from: from,
                    to: to,
                    value: value,
                    blockNumber: BigInt(block.header.height),
                    transactionHash: log.transaction?.hash ? Buffer.from(log.transaction.hash, 'hex') : null
                }));
            }
        }
    }
    const startBlock = ctx.blocks.at(0)?.header.height;
    const endBlock = ctx.blocks.at(-1)?.header.height;
    ctx.log.info(`Processed ${transfers.length} transfers from ${startBlock} to ${endBlock}`);
    // Insert all transfers
    await ctx.store.insert(transfers);
});
//# sourceMappingURL=main.js.map