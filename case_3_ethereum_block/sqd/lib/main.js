"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_store_1 = require("@subsquid/typeorm-store");
const model_1 = require("./model");
const processor_1 = require("./processor");
processor_1.processor.run(new typeorm_store_1.TypeormDatabase({ supportHotBlocks: true }), async (ctx) => {
    const blocks = [];
    for (let block of ctx.blocks) {
        // Create a block entity
        blocks.push(new model_1.Block({
            id: `1-${block.header.height}`, // Using 1 as the chainId for Ethereum mainnet
            number: BigInt(block.header.height),
            hash: block.header.hash,
            parentHash: block.header.parentHash,
            timestamp: BigInt(block.header.timestamp),
        }));
    }
    const blockStartBlock = ctx.blocks[0]?.header.height;
    const blockEndBlock = ctx.blocks[ctx.blocks.length - 1]?.header.height;
    // Insert all blocks
    await ctx.store.insert(blocks);
});
//# sourceMappingURL=main.js.map