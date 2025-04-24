"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processor = void 0;
const evm_processor_1 = require("@subsquid/evm-processor");
exports.processor = new evm_processor_1.EvmBatchProcessor()
    // Lookup archive by the network name in Subsquid registry
    // See https://docs.subsquid.io/evm-indexing/supported-networks/
    .setGateway('https://v2.archive.subsquid.io/network/ethereum-mainnet')
    // Chain RPC endpoint is required for
    //  - indexing unfinalized blocks https://docs.subsquid.io/basics/unfinalized-blocks/
    //  - querying the contract state https://docs.subsquid.io/evm-indexing/query-state/
    .setRpcEndpoint({
    url: 'https://rpc.sentio.xyz/p2IDojGk5lF0glj6CNaCKtuW0NvuIv6n/ethereum',
})
    .setFinalityConfirmation(75)
    .setFields({
    block: {
        height: true,
        timestamp: true,
        hash: true,
        parentHash: true,
    },
})
    .setBlockRange({
    from: 0,
    to: 100000
})
    .addTransaction({});
//# sourceMappingURL=processor.js.map