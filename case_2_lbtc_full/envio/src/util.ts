import { createPublicClient, http, parseAbi, getContract } from "viem";
import { mainnet } from "viem/chains";

// Define the ABI for the ERC20 balanceOf function
const erc20Abi = parseAbi([
  "function balanceOf(address owner) view returns (uint256)"
]);

// Create a public client to interact with the blockchain
const client = createPublicClient({
  chain: mainnet,
  transport: http("https://eth-mainnet.g.alchemy.com/v2/gcIt66S3FTL_up1cu59EMwZv1JGR7ySA"), // Changed from Ankr which requires API key
});

// Get the contract instance for LBTC
const lbtcContract = getContract({
  abi: erc20Abi,
  address: "0x8236a87084f8B84306f72007F36F2618A5634494",
  client: client,
});

// Function to get the balance of a specific address
export async function getBalance(address: string) {
  const balance = await lbtcContract.read.balanceOf([address as `0x${string}`]);
  console.log(`Balance of ${address}: ${balance}`);
  return balance;
}