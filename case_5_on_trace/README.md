# LBTC Event-Only Indexing Benchmark

This benchmark tests the performance of various indexers when processing simple Transfer events from the LBTC token contract.

## Benchmark Specification

- **Target Contract**: LBTC Token (0x8236a87084f8B84306f72007F36F2618A5634494)
- **Events Indexed**: Transfer events only
- **Block Range**: 0 to 22200000
- **Data Operations**: Write-only (no read-after-write)
- **RPC Calls**: None (data derived directly from event logs)

## Implementation Details

The benchmark requires each indexer to:
1. Listen for `Transfer(address indexed from, address indexed to, uint256 value)` events
2. Create a record for each Transfer event with the following fields:
   - ID (unique identifier)
   - From address
   - To address
   - Value transferred
   - Block number
   - Transaction hash

## Performance Results

| Indexer  | Time to Complete | Records Indexed | Notes |
|----------|------------------|----------------|-------|
| Sentio   | 6m               | 296,734        | |
| Envio    | 2m               | 296,734        | Fastest processing time |
| Ponder   | 1h40m            | 296,138        | Missing ~5% of events |
| Subsquid | 10m              | 296,734        | |
| Subgraph | 3h9m             | 296,734        | |

## Implementation Examples

Each subdirectory contains the implementation for a specific indexing platform:
- `/sentio`: Sentio implementation 
- `/envio`: Envio implementation
- `/ponder`: Ponder implementation
- `/sqd`: Subsquid implementation
- `/subgraph`: The Graph subgraph implementation

## Running the Benchmark

Each implementation includes its own setup and execution instructions. Generally, you will need to:

1. Install the required dependencies
2. Configure RPC endpoints
3. Start the indexer
4. Monitor progress
5. Record completion time

## Key Observations

- Envio demonstrates the fastest processing time for this simple event indexing scenario
- Ponder processes events significantly slower and misses approximately 5% of the data
- Sentio and Subsquid offer good balance of speed and completeness
- Subgraph requires significantly more time to complete the indexing

This benchmark showcases performance differences when handling straightforward event-only indexing, which is a common use case for blockchain data indexing.

## Access Information

### Sentio
- **Dashboard URL**: https://app.sentio.xyz/yufei/case_1_lbtc_event_only/data-explorer/sql
- **API Access**: 
  ```
  READ_ONLY KEY: hnZ7Z8cRsoxRadrVdhih2jRjBlH0lIYWl
  curl -L -X POST 'https://app.sentio.xyz/api/v1/analytics/yufei/case_1_lbtc_event_only/sql/execute' \
     -H 'Content-Type: application/json' \
     -H 'api-key: hnZ7Z8cRsoxRadrVdhih2jRjBlH0lIYWl' \
     --data-raw '{
       "sqlQuery": {
         "sql": "YOUR_QUERY_HERE"
       }
     }'
  ```
- **Data Summary**: Approximately 294,278 records in the transfers collection
- **Block Range**: Block 20016816 to Block 22199998

### Envio
- **Dashboard URL**: https://envio.dev/app/0xdatapunk/case_1_lbtc_event_only
- **GraphQL Endpoint**: https://indexer.dev.hyperindex.xyz/6c63ec1/v1/graphql
- **Data Summary**: 
  - Block Range: 20016816 to 22199998
  - Total Records: Approximately 294,278

### Ponder
- **Database Connection**:
  ```
  postgresql://postgres:IaYFUoJeDdJXgiTXXXOZmaNkjjXjkBZJ@shinkansen.proxy.rlwy.net:29835/railway
  --schema fc56df99-dd01-4846-9d2e-67fbaf93c52d
  ```
- **Data Summary**:
  - Total Transfer Records: 293,682 in the "lbtc_transfer" table
  - Block Range: Block 20016816 to Block 22199998

### Subsquid
- **Dashboard URL**: https://app.subsquid.io/squids/case-1-lbtc-event-only/v1
- **Database Connection**:
  ```
  PGPASSWORD="kbr06QnqfXX66cb7Bm9Qdovvx6TvU8C~" psql -h pg.squid.subsquid.io -d 16177_ku9u1f -U 16177_ku9u1f
  ```
- **Data Summary**:
  - Transfer Records: 294,278 records in the transfer table
  - Block Range: Block 20016816 to Block 22199998

### Subgraph
- **Dashboard URL**: https://thegraph.com/studio/subgraph/case_1_lbtc_event_only/endpoints
- **GraphQL Endpoint**: https://api.studio.thegraph.com/query/108520/case_1_lbtc_event_only/version/latest

### Sentio Subgraph
- **Dashboard URL**: https://app.sentio.xyz/yufei/case_1_lbtc_event_only_subgraph/data-explorer/sql
- **API Access**:
  ```
  READ_ONLY KEY: hnZ7Z8cRsoxRadrVdhih2jRjBlH0lIYWl
  curl -L -X POST 'https://app.sentio.xyz/api/v1/analytics/yufei/case_1_lbtc_event_only_subgraph/sql/execute' \
     -H 'Content-Type: application/json' \
     -H 'api-key: hnZ7Z8cRsoxRadrVdhih2jRjBlH0lIYWl' \
     --data-raw '{
       "sqlQuery": {
         "sql": "YOUR_QUERY_HERE"
       }
     }'
  ```

# Case 5: On-Trace Performance Benchmark

This benchmark compares two approaches for processing Uniswap V2 swap traces:

1. **TheGraph Subgraph**: Processes transactions in the Subgraph's `handleTransaction` handler
2. **Envio HyperSync**: Processes traces directly using the HyperSync API

## Block Range

All implementations use a consistent block range from **22280000** to **22281000** (1,000 blocks) for benchmarking purposes.

## Project Structure

- `/subgraph/`: Contains the TheGraph implementation
  - `schema.graphql`: Defines the Swap entity
  - `src/mapping.ts`: Contains the transaction handler that parses swap data
  - `generated/`: Auto-generated code for the schema

- `/envio/`: Contains the HyperSync implementation
  - `src/TraceMonitor.ts`: Implements the trace extraction logic
  - `trace-runner.ts`: Entry point script for running the trace extraction
  - `generate-sample.js`: Helper script to generate sample data for testing

## Sample Data

The repository includes a script to generate sample Uniswap V2 swap data:

```bash
cd envio
node generate-sample.js
```

This creates a `uniswap-v2-swaps.json` file with sample swap data that can be used to test both implementations.

## Running the Subgraph

To deploy and run the subgraph:

1. Install dependencies:
   ```bash
   cd subgraph
   npm install
   ```

2. Generate code from schema:
   ```bash
   npm run codegen
   ```

3. Build the subgraph:
   ```bash
   npm run build
   ```

4. Deploy to a local Graph Node instance:
   ```bash
   npm run deploy-local
   ```

## Running the HyperSync Trace Extractor

To run the HyperSync implementation:

1. Install dependencies:
   ```bash
   cd envio
   npm install
   ```

2. Run the trace extractor:
   ```bash
   npm start
   ```

Or use the generator to create sample data:
   ```bash
   node generate-sample.js
   ```

## Performance Comparison

The benchmark measures:

1. **Throughput**: Number of traces processed per second
2. **Latency**: Time taken to process a batch of traces
3. **Resource Usage**: CPU and memory consumption during processing

Results will vary based on your hardware and network conditions.

## Troubleshooting

If you encounter errors with the HyperSync client:

1. Ensure you have a valid API key or are using the free tier correctly
2. Check your internet connection to the HyperSync API endpoint
3. Verify the block range being queried contains Uniswap V2 transactions

For subgraph issues:

1. Ensure your Graph Node is running and properly configured
2. Check the subgraph logs for any deployment or indexing errors

