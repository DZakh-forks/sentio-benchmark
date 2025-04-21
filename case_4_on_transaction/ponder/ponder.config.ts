import { createConfig } from "ponder";
import { http } from "viem";

export default createConfig({
  networks: {
    mainnet: {
      chainId: 1,
      transport: http(process.env.PONDER_RPC_URL_1),
    },
  },
  blocks: {
    EveryBlock: {
      network: "mainnet",
      interval: 1, // Process every block
      startBlock: 22280000,
      endBlock: 22290000,
    }
  },
  database: {
    kind: "pglite",
    directory: "./.ponder/db",
  },
});
