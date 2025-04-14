[![Open in Gitpod](https://gitpod.io/button/open-in-gitpod.svg)](https://gitpod.io/#https://github.com/subsquid/squid-evm-template)

# Subsquid Implementation - LBTC Full Benchmark

This directory contains a Subsquid implementation for indexing LBTC token transfers with RPC calls to fetch token balances, demonstrating Subsquid's ability to handle complex data relationships and contract interactions.

## Prerequisites

* **Node.js:** v18 or newer
* **Git**
* **Docker** (for running Postgres)
* **Squid CLI:** `npm i -g @subsquid/cli`

## Setup & Running Instructions

### 1. Install Dependencies

```bash
npm i
```

### 2. Start PostgreSQL Database

```bash
sqd up
```

This starts a local PostgreSQL database in a Docker container for storing indexed data.

### 3. Build the Squid

```bash
sqd build
```

### 4. Apply Database Migrations

```bash
sqd migration generate
sqd migration apply
```

### 5. Start the Squid

Run both the processor and GraphQL server:

```bash
sqd run .
```

Alternatively, run services individually:

```bash
# Start processor only
sqd process

# Start GraphQL server only
sqd serve
```

### 6. Access the GraphQL API

Once running, access the GraphQL playground at:
```
http://localhost:4350/graphql
```

## Project Structure

- `src/` - Contains processor configuration and event handlers with RPC call logic
- `lib/` - Compiled JavaScript output
- `abi/` - ABI definitions for the LBTC contract
- `schema.graphql` - GraphQL schema defining transfer, account, and snapshot entities
- `db/migrations/` - Database migration files
- `squid.yaml` - Squid configuration

## Implementation Details

This implementation:
1. Uses `EvmBatchProcessor` to fetch LBTC token Transfer events
2. Makes direct RPC calls to fetch token balances using the contract.balanceOf() method
3. Creates and updates Account entities with balance information
4. Creates Snapshot entities to record historical balance changes
5. Demonstrates Subsquid's ability to handle read-after-write operations

The main processor configuration is in `src/processor.ts`:

```typescript
const processor = new EvmBatchProcessor()
  .setGateway('https://v2.archive.subsquid.io/network/ethereum-mainnet')
  .setRpcEndpoint('https://rpc.ankr.com/eth')
  .setFinalityConfirmation(75)
  .addLog({
    range: { from: 22100000 },
    address: [LBTC_CONTRACT_ADDRESS],
    topic0: [erc20abi.events.Transfer.topic],
  })
```

## Performance Results

In the benchmark test, this Subsquid implementation indexed LBTC transfers with RPC calls in **32 minutes**, showing excellent performance for complex data processing with external contract calls.

## Additional Commands

### Typegen (Generate TypeScript interfaces from ABIs)

```bash
sqd typegen
```

### Reset Database

```bash
sqd down
sqd up
```

### Get Logs

```bash
sqd logs
```

### Deploy to SQD Cloud

```bash
sqd deploy --org <org-name> .
```

## Database Access

Connect to the PostgreSQL database directly:

```bash
PGPASSWORD="2lABMqtGktrOpcaZwKEVbwM2GAxXamat" psql -h pg.squid.subsquid.io -d 16175_0hotg1 -U 16175_0hotg1
```

Example queries:
```sql
-- Count records in tables
SELECT COUNT(*) FROM transfer;
SELECT COUNT(*) FROM accounts;
SELECT COUNT(*) FROM snapshot;
```

For more details on Subsquid SDK, refer to the [official documentation](https://docs.sqd.ai/sdk/quickstart/).
