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

## Note on Envio Implementation

For the Envio implementation, we used Envio's HyperSync API to access blockchain data efficiently:

1. **HyperSync Integration**: The implementation directly queries the Ethereum blockchain using Envio's HyperSync technology, which provides optimized access to blockchain data including blocks, transactions, and receipts.

2. **Field Selection**: We utilized HyperSync's field selection capability to only request specific transaction and receipt data needed for gas calculations, minimizing unnecessary data transfer.

3. **Data Processing**: The script processes transaction data in batches, calculating gas values from transaction receipts to generate the required dataset.

### About Envio HyperSync

Envio's HyperSync technology provides ultra-fast access to blockchain data with several key advantages:
- Efficient data access with minimal setup
- Field selection to retrieve only the data needed
- Join capabilities to connect related blockchain data
- Support for 70+ EVM-compatible networks

For production applications, Envio offers:
- Full HyperSync client library
- Advanced filtering capabilities 
- Streaming API for real-time data processing

Learn more at the [HyperSync documentation](https://docs.envio.dev/docs/HyperSync/hypersync-quickstart).

