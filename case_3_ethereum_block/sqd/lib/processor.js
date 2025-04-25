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
const dotenv = __importStar(require("dotenv"));
// Load environment variables from .env file
dotenv.config();
// Get RPC endpoint from environment variable
const rpcEndpoint = process.env.RPC_ENDPOINT;
exports.processor = new evm_processor_1.EvmBatchProcessor()
    // Lookup archive by the network name in Subsquid registry
    // See https://docs.subsquid.io/evm-indexing/supported-networks/
    .setGateway('https://v2.archive.subsquid.io/network/ethereum-mainnet')
    // Chain RPC endpoint is required for
    //  - indexing unfinalized blocks https://docs.subsquid.io/basics/unfinalized-blocks/
    //  - querying the contract state https://docs.subsquid.io/evm-indexing/query-state/
    .setRpcEndpoint({
    // Use RPC endpoint from environment variable
    url: (0, util_internal_1.assertNotNull)(rpcEndpoint, 'No RPC endpoint supplied - set RPC_ENDPOINT environment variable'),
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