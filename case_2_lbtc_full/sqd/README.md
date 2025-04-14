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

# Minimal EVM squid

This is a starter template of a squid indexer for EVM networks (Ethereum, Polygon, BSC, etc.). See [Squid SDK docs](https://docs.subsquid.io/) for a complete reference.

To extract EVM logs and transactions by a topic or a contract address, use [`.addLog()`](https://docs.subsquid.io/evm-indexing/configuration/evm-logs/), [`.addTransaction()`](https://docs.subsquid.io/evm-indexing/configuration/transactions/), [`.addTrace()`](https://docs.subsquid.io/evm-indexing/configuration/traces/) or [`.addStateDiff()`](https://docs.subsquid.io/evm-indexing/configuration/state-diffs/) methods of the `EvmBatchProcessor` instance defined in `src/processor.ts`. Select data fields with [`.setFields()`](https://docs.subsquid.io/evm-indexing/configuration/data-selection/).

The requested data is transformed in batches by a single handler provided to the `processor.run()` method. 

For a full list of supported networks and config options,
check the [`EvmBatchProcessor` overview](https://docs.subsquid.io/evm-indexing/evm-processor/) and the [setup section](https://docs.subsquid.io/evm-indexing/configuration/).

For a step-by-step migration guide from TheGraph, see [the dedicated docs page](https://docs.subsquid.io/migrate/migrate-subgraph/).

Dependencies: Node.js v16 or newer, Git, Docker.

## Quickstart

```bash
# 0. Install @subsquid/cli a.k.a. the sqd command globally
npm i -g @subsquid/cli

# 1. Retrieve the template
sqd init my_squid_name -t evm
cd my_squid_name

# 2. Install dependencies
npm i

# 3. Start a Postgres database container and detach
sqd up

# 4. Build the squid
sqd build

# 5. Start both the squid processor and the GraphQL server
sqd run .
```
A GraphiQL playground will be available at [localhost:4350/graphql](http://localhost:4350/graphql).

You can also start squid services one by one:
```bash
sqd process
sqd serve
```

## Dev flow

### 1. Define database schema

Start development by defining the schema of the target database via `schema.graphql`.
Schema definition consists of regular graphql type declarations annotated with custom directives.
Full description of `schema.graphql` dialect is available [here](https://docs.subsquid.io/store/postgres/schema-file/).

### 2. Generate TypeORM classes

Mapping developers use TypeORM [EntityManager](https://typeorm.io/#/working-with-entity-manager)
to interact with target database during data processing. All necessary entity classes are
generated by the squid framework from `schema.graphql`. This is done by running `sqd codegen`
command.

### 3. Generate database migrations

All database changes are applied through migration files located at `db/migrations`.
`squid-typeorm-migration(1)` tool provides several commands to drive the process.

```bash
## drop create the database
sqd down
sqd up

## replace any old schemas with a new one made from the entities
sqd migration:generate
```
See [docs on database migrations](https://docs.subsquid.io/store/postgres/db-migrations/) for more details.

### 4. Import ABI contract and generate interfaces to decode events

It is necessary to import the respective ABI definition to decode EVM logs. One way to generate a type-safe facade class to decode EVM logs is by placing the relevant JSON ABIs to `./abi`, then using `squid-evm-typegen(1)` via an `sqd` script:

```bash
sqd typegen
```

See more details on the [`squid-evm-typegen` doc page](https://docs.subsquid.io/evm-indexing/squid-evm-typegen).

## Project conventions

Squid tools assume a certain [project layout](https://docs.subsquid.io/basics/squid-structure):

* All compiled js files must reside in `lib` and all TypeScript sources in `src`.
The layout of `lib` must reflect `src`.
* All TypeORM classes must be exported by `src/model/index.ts` (`lib/model` module).
* Database schema must be defined in `schema.graphql`.
* Database migrations must reside in `db/migrations` and must be plain js files.
* `sqd(1)` and `squid-*(1)` executables consult `.env` file for environment variables.


deploy
sqd deploy --org pine-quench .