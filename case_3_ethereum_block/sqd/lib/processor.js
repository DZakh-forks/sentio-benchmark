"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processor = void 0;
const util_internal_1 = require("@subsquid/util-internal");
const evm_processor_1 = require("@subsquid/evm-processor");
exports.processor = new evm_processor_1.EvmBatchProcessor()
    // Lookup archive by the network name in Subsquid registry
    // See https://docs.subsquid.io/evm-indexing/supported-networks/
    .setGateway('https://v2.archive.subsquid.io/network/ethereum-mainnet')
    // Chain RPC endpoint is required for
    //  - indexing unfinalized blocks https://docs.subsquid.io/basics/unfinalized-blocks/
    //  - querying the contract state https://docs.subsquid.io/evm-indexing/query-state/
    .setRpcEndpoint({
    // Set the URL via .env for local runs or via secrets when deploying to Subsquid Cloud
    // https://docs.subsquid.io/deploy-squid/env-variables/
    url: (0, util_internal_1.assertNotNull)(process.env.RPC_ETH_HTTP, 'No RPC endpoint supplied'),
    // More RPC connection options at https://docs.subsquid.io/evm-indexing/configuration/initialization/#set-data-source
    rateLimit: 10
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
    to: 10000000,
})
    .addTransaction({});
//# sourceMappingURL=processor.js.map