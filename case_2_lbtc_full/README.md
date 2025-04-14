# LBTC Full Indexing Benchmark

This benchmark tests the performance of various indexers when processing Transfer events and making RPC calls to fetch token balances from the LBTC token contract.

## Benchmark Specification

- **Target Contract**: LBTC Token (0x8236a87084f8B84306f72007F36F2618A5634494)
- **Events Indexed**: Transfer events
- **Block Range**: 22100000 to 22200000
- **Data Operations**: Read-after-write (fetching balances after processing transfers)
- **RPC Calls**: balanceOf() to fetch token balances for each address involved in transfers

## Implementation Details

The benchmark requires each indexer to:
1. Listen for `Transfer(address indexed from, address indexed to, uint256 value)` events
2. Create a record for each Transfer event
3. Make RPC calls to fetch the current balance of both the sender and receiver
4. Create snapshot records with account balances
5. Update account records with latest balances and timestamps

This benchmark tests the ability of indexers to not only process events but also to make external RPC calls and manage more complex data relationships.

## Performance Results

| Indexer  | Time to Complete | Notes |
|----------|------------------|-------|
| Sentio   | 45m              | |
| Envio    | 45m              | |
| Ponder   | 4h38m            | Significantly slower with RPC calls |
| Subsquid | 32m              | |
| Subgraph | 18h38m           | Longest processing time |

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
2. Configure RPC endpoints with adequate rate limits
3. Start the indexer
4. Monitor progress
5. Record completion time

## Key Observations

- Adding RPC calls significantly increases indexing time across all platforms
- Sentio maintains the best performance with complex operations
- Ponder and Subgraph show substantial performance degradation with RPC calls
- Subsquid handles the additional complexity relatively well
- The read-after-write pattern creates additional processing overhead for all indexers

This benchmark showcases how performance is affected when indexers need to both process events and interact with the blockchain to fetch additional data, a common pattern in many dApp backends.

## Access Information

### Sentio
- **Dashboard URL**: https://app.sentio.xyz/yufei/case_2_lbtc_full/data-explorer/sql
- **API Access**: 
  ```
  READ_ONLY KEY: hnZ7Z8cRsoxRadrVdhih2jRjBlH0lIYWl
  curl -L -X POST 'https://app.sentio.xyz/api/v1/analytics/yufei/case_2_lbtc_full/sql/execute' \
     -H 'Content-Type: application/json' \
     -H 'api-key: hnZ7Z8cRsoxRadrVdhih2jRjBlH0lIYWl' \
     --data-raw '{
       "sqlQuery": {
         "sql": "YOUR_QUERY_HERE"
       }
     }'
  ```
- **Data Summary**:
  - **Transfer Records**: Approximately 12,165 records
  - **Account Records**: Approximately 2,663 accounts
  - **Points Records**: Approximately 44,700 point_updates

### Envio
- **Dashboard URL**: https://envio.dev/app/0xdatapunk/case_2_lbtc_full
- **GraphQL Endpoint**: https://indexer.dev.hyperindex.xyz/f11543e/v1/graphql
- **Data Summary**:
  - **Transfer Records**: Approximately 12,165 records
  - **Block Range**: 22100049 to 22199998
  - **Account Records**: Approximately 2,663 accounts
  - **Snapshot Records**: Approximately 16,338 snapshots
  - **Timestamps**: Range from 1742618075 to 1743823319 (Unix millisecond timestamps)

### Ponder
- **Database Connection**:
  ```
  postgresql://postgres:OlKFhKmUqTqTvHzpGBuZOPuOFhAIbold@yamabiko.proxy.rlwy.net:10767/railway
  --schema 99ac6069-d39a-4622-8d96-8f8121a42b7b
  ```
- **Data Summary**:
  - **Transfer Records**: 12,165 records in lbtc_transfer table
  - **Account Records**: 2,684 records in accounts table
  - **Snapshot Records**: 501,711 records in snapshot table

### Subsquid
- **Dashboard URL**: https://app.subsquid.io/squids/case-2-lbtc-full/v1
- **Database Connection**:
  ```
  PGPASSWORD="2lABMqtGktrOpcaZwKEVbwM2GAxXamat" psql -h pg.squid.subsquid.io -d 16175_0hotg1 -U 16175_0hotg1
  ```
- **Data Summary**:
  - **Transfer Records**: 12,165 records in the transfer table
  - **Account Records**: 2,685 records in the accounts table
  - **Snapshot Records**: 24,618 records in the snapshot table
  - **Block Range**: Block 22100049 to Block 22199998

### Subgraph
- **Dashboard URL**: https://thegraph.com/studio/subgraph/case_2_lbtc_full/endpoints
- **GraphQL Endpoint**: https://api.studio.thegraph.com/query/108520/case_2_lbtc_full/version/latest

### Sentio Subgraph
- **Dashboard URL**: https://app.sentio.xyz/yufei/case_2_lbtc_full_subgraph/data-explorer/sql
- **API Access**:
  ```
  READ_ONLY KEY: hnZ7Z8cRsoxRadrVdhih2jRjBlH0lIYWl
  curl -L -X POST 'https://app.sentio.xyz/api/v1/analytics/yufei/case_2_lbtc_full_subgraph/sql/execute' \
     -H 'Content-Type: application/json' \
     -H 'api-key: hnZ7Z8cRsoxRadrVdhih2jRjBlH0lIYWl' \
     --data-raw '{
       "sqlQuery": {
         "sql": "YOUR_QUERY_HERE"
       }
     }'
  ``` 