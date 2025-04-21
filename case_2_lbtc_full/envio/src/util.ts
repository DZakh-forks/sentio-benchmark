import { createPublicClient, http, parseAbi, getContract } from "viem";
import { mainnet } from "viem/chains";

// Define the ABI for the ERC20 balanceOf function
const erc20Abi = parseAbi([
  "function balanceOf(address owner) view returns (uint256)"
]);

// Create a public client to interact with the blockchain
const client = createPublicClient({
  chain: mainnet,
  transport: http("https://rpc.sentio.xyz/p2IDojGk5lF0glj6CNaCKtuW0NvuIv6n/ethereum"), // Changed from Ankr which requires API key
});

// Get the contract instance for LBTC
const lbtcContract = getContract({
  abi: erc20Abi,
  address: "0x8236a87084f8B84306f72007F36F2618A5634494",
  client: client,
});

// Function to get the balance of a specific address at a specific block
export async function getBalance(address: string, blockNumber?: bigint) {
  try {
    // If blockNumber is provided, use it to get balance at that specific block
    const options = blockNumber ? { blockNumber } : undefined;
    const balance = await lbtcContract.read.balanceOf([address as `0x${string}`], options);
    
    // Only log on successful retrieval to reduce noise
    console.log(`Balance of ${address}${blockNumber ? ` at block ${blockNumber}` : ''}: ${balance}`);
    return balance;
  } catch (error) {
    console.error(`Error getting balance for ${address}: ${error}`);
    // Return 0 on error to prevent processing failures
    return BigInt(0);
  }
}