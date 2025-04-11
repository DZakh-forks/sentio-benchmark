"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processor = void 0;
const util_internal_1 = require("@subsquid/util-internal");
const evm_processor_1 = require("@subsquid/evm-processor");
const constant_1 = require("./constant");
const lbtcAbi = __importStar(require("./abi/LBTC.js"));
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
    url: (0, util_internal_1.assertNotNull)("https://rpc.sentio.xyz/Gq7RebwEu2BcPerSmdu8HzPMR4YXGMjq/ethereum", 'No RPC endpoint supplied')
})
    .setFinalityConfirmation(75)
    .setFields({
    block: {
        height: true,
        timestamp: true,
    },
    transaction: {
        hash: true,
        from: true,
        value: true,
    },
})
    .setBlockRange({
    from: 0,
    to: 22200000,
})
    .addLog({
    address: [constant_1.LBTC_PROXY],
    topic0: [lbtcAbi.events.Transfer.topic],
    transaction: true,
    transactionLogs: false,
});
//# sourceMappingURL=processor.js.map