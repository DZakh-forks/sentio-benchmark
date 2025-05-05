import { config as dotenvConfig } from 'dotenv';

dotenvConfig();

export const config = {
  ARCHIVE_NODE: process.env.ARCHIVE_NODE || 'https://eth.archive.subsquid.io',
  CHAIN_NODE: process.env.CHAIN_NODE || 'https://rpc.sentio.xyz/oTSQQwOgzr9ERJ0petpRSbgkQDCPJ9Al/ethereum',
}; 