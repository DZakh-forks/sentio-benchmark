# Ethereum Block Indexing Benchmark

This benchmark tests the performance of various indexers when processing Ethereum blocks rather than specific events, creating an entity for each block with its metadata.

## Benchmark Specification

- **Target**: Ethereum blocks
- **Block Range**: 0 to 10000000
- **Data Operations**: Block-level indexing
- **Handler Type**: Block handlers (not event handlers)
- **Block Data**: Block number, hash, timestamp, parent hash, etc.

## Implementation Details

The benchmark requires each indexer to:
1. Process each block in the specified range
2. Extract block metadata (number, hash, timestamp, parent hash)
3. Create a Block entity for each processed block
4. Store all blocks in the database

This benchmark tests the ability of indexers to process a large volume of blocks efficiently without focusing on specific events or contracts.

## Performance Results

| Indexer  | Time to Complete | Notes |
|----------|------------------|-------|
| Sentio   | 4m               | Fastest processing time |
| Envio    | N/A              | Does not support block handlers |
| Ponder   | 55h37m           | Longest processing time |
| Subsquid | 45h              | |
| Subgraph | 24h              | |

## Implementation Examples

Each subdirectory contains the implementation for a specific indexing platform:
- `/sentio`: Sentio implementation 
- `/ponder`: Ponder implementation
- `/sqd`: Subsquid implementation
- `/subgraph`: The Graph subgraph implementation

Note: Envio does not support block handlers, so there is no implementation for this benchmark.

## Running the Benchmark

Each implementation includes its own setup and execution instructions. Generally, you will need to:

1. Install the required dependencies
2. Configure RPC endpoints
3. Start the indexer
4. Monitor progress
5. Record completion time

## Key Observations

- Sentio demonstrates exceptional performance for block-level indexing
- Block processing is significantly more resource-intensive than event processing for most platforms
- Ponder shows the most substantial performance degradation with block-level indexing
- Platform-specific optimizations for bulk block processing make a significant difference
- Not all indexers support block-level handlers (Envio)

This benchmark highlights the performance differences when handling large volumes of blockchain blocks, which is important for applications that need to analyze block-level data or track chain reorganizations.

## Access Information

### Sentio
- **Dashboard URL**: https://app.sentio.xyz/yufei/case_3_ethereum_block/data-explorer/sql
- **API Access**: 
  ```
  READ_ONLY KEY: hnZ7Z8cRsoxRadrVdhih2jRjBlH0lIYWl
  curl -L -X POST 'https://app.sentio.xyz/api/v1/analytics/yufei/case_3_ethereum_block/sql/execute' \
     -H 'Content-Type: application/json' \
     -H 'api-key: hnZ7Z8cRsoxRadrVdhih2jRjBlH0lIYWl' \
     --data-raw '{
       "sqlQuery": {
         "sql": "YOUR_QUERY_HERE"
       }
     }'
  ```
- **Data Summary**: Contains multiple tables including autogen_ tables with block data

### Ponder
- **Dashboard URL**: https://railway.com/project/70f3a628-e9b8-4bcc-b6c5-9424995be243?environmentId=38b9735b-3a5a-4179-b498-f230060d5c51
- **Database Connection**:
  ```
  postgresql://postgres:LhYOfYxqnQbQAXQJrKdznIkDDTmsZHGC@yamabiko.proxy.rlwy.net:34027/railway
  --schema fb1dbd8f-487b-4ffe-be34-e440181efa32
  ```
- **Data Summary**:
  - **Block Records**: 10,000,001 records in the block table
  - **Block Range**: Block 0 to Block 10,000,000
  - **Indexing Status**: Complete (ready: true)
  - **Latest Block Timestamp**: 1588598533 (May 4, 2020)

### Subsquid
- **Dashboard URL**: https://app.subsquid.io/squids/case-3-ethereum-block/v1/logs
- **Database Connection**:
  ```
  PGPASSWORD="9nsMlK7fnUVlbpSgf1OEZjcPEK3eAeZ1" psql -h pg.squid.subsquid.io -d 16180_8ocmrp -U 16180_8ocmrp
  ```
- **Data Summary**:
  - **Block Records**: 8,498,930 records in the block table
  - **Block Range**: Block 0 to Block 10,000,000
  - **Missing Blocks**: 1,501,071 blocks (15% of the target range)

### Subgraph
- **Dashboard URL**: https://thegraph.com/studio/subgraph/case_3_ethereum_block/
- **GraphQL Endpoint**: https://api.studio.thegraph.com/query/108520/case_3_ethereum_block/version/latest

> Note: Envio does not support block handlers, so there is no implementation for this benchmark case. 