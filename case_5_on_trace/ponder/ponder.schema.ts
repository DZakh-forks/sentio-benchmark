import { onchainTable } from "ponder";

export const swap = onchainTable("swap", (t) => ({
  id: t.text().primaryKey(),
  blockNumber: t.bigint().notNull(),
  transactionHash: t.hex().notNull(),
  from: t.hex().notNull(),
  to: t.hex().notNull(),
  amountIn: t.bigint().notNull(),
  amountOutMin: t.bigint().notNull(),
  deadline: t.bigint().notNull(),
  path: t.text().notNull(), // Comma-separated path of token addresses
  pathLength: t.integer().notNull(),
}));
