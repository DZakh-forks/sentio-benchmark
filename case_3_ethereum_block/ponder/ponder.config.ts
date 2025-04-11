import { createConfig, mergeAbis } from "ponder";
import { http } from "viem";

import { LBTCAbi } from "./abis/LBTCAbi";

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
      interval: 1,
      startBlock: 0,
      endBlock: 10000000,
    }
  },
});
