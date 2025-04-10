import { onchainTable } from "ponder";

export const snapshot = onchainTable("snapshot", (t) => ({
  id: t.text().primaryKey(),
  accountId: t.hex().notNull(),
  timestampMilli: t.bigint().notNull(),
  mintAmount: t.bigint().notNull(),
  balance: t.bigint().notNull(),
  point: t.bigint().notNull(),
}));

export const accounts = onchainTable("accounts", (t) => ({
  id: t.hex().primaryKey(),
  lastSnapshotTimestamp: t.bigint().notNull(),
}));

export const accountRegistry = onchainTable("account_registry", (t) => ({
  id: t.text().primaryKey(), // Always "main"
  accounts: t.hex().array().notNull(),
  lastSnapshotTimestamp: t.bigint().notNull(),
}));

export const lbtcTransfer = onchainTable("lbtc_transfer", (t) => ({
  id: t.text().primaryKey(),
  from: t.hex().notNull(),
  to: t.hex().notNull(),
  value: t.bigint().notNull(),
  blockNumber: t.bigint().notNull(),
  transactionHash: t.hex().notNull(),
}));
