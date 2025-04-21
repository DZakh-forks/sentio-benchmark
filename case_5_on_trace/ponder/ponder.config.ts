import { createConfig } from "ponder";
import { http } from "viem";

// Import UniswapV2Router02 ABI
import { UniswapV2Router02ABI } from "./abis/UniswapV2Router02";

export default createConfig({
  database: {
    kind: "pglite",
  },
  networks: {
    ethereum: {
      chainId: 1,
      transport: http(process.env.PONDER_RPC_URL_1),
    },
  },
  contracts: {
    UniswapV2Router02: {
      network: "ethereum",
      abi: UniswapV2Router02ABI,
      address: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
      startBlock: 22200000,
      endBlock: 22300000,
      includeCallTraces: true,
    }
  },
});
