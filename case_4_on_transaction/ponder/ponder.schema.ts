import { onchainTable } from "ponder";

export const gasSpent = onchainTable("gas_spent", (t) => ({
  id: t.text().primaryKey(), // transaction hash
  from: t.hex().notNull(), // From address
  to: t.hex().notNull(), // To address
  gasValue: t.bigint().notNull(), // gasPrice * gasUsed
  blockNumber: t.bigint().notNull(), // Block number
  transactionHash: t.hex().notNull(),
}));
