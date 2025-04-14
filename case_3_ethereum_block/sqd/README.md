[![Open in Gitpod](https://gitpod.io/button/open-in-gitpod.svg)](https://gitpod.io/#https://github.com/subsquid/squid-evm-template)

# Subsquid Implementation - Ethereum Block Benchmark

This directory contains a Subsquid implementation for indexing Ethereum blocks and tracking block-level statistics, demonstrating Subsquid's capabilities for processing blockchain data at the block level.

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

- `src/` - Contains processor configuration and block handlers
- `lib/` - Compiled JavaScript output
- `schema.graphql` - GraphQL schema defining block statistics entities
- `db/migrations/` - Database migration files
- `squid.yaml` - Squid configuration

## Implementation Details

This implementation:
1. Uses `EvmBatchProcessor` to fetch Ethereum blocks
2. Processes blocks to extract and store statistics such as:
   - Gas used
   - Transaction count
   - Block size
   - Timestamp information
3. Provides a GraphQL API for querying block statistics

The main processor configuration is in `src/processor.ts`:

```typescript
const processor = new EvmBatchProcessor()
  .setGateway('https://v2.archive.subsquid.io/network/ethereum-mainnet')
  .setRpcEndpoint('https://rpc.ankr.com/eth')
  .setFinalityConfirmation(75)
  .setBlockRange({ from: 16_000_000, to: 16_050_000 })
  .addBlock()
```

This configuration enables the processor to fetch Ethereum blocks within the specified range, utilizing Subsquid's Archive gateway for optimized blockchain data access.

## Performance Results

In the benchmark test, this Subsquid implementation indexed 50,000 Ethereum blocks in **15 minutes**, demonstrating its efficiency for block-level data processing.

## Additional Commands

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
-- Get block statistics
SELECT * FROM block_stats ORDER BY height DESC LIMIT 10;

-- Get average gas used
SELECT AVG(gas_used) FROM block_stats;
```

For more details on Subsquid SDK, refer to the [official documentation](https://docs.sqd.ai/sdk/quickstart/).

