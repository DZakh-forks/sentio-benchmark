# Ethereum Transaction Gas Usage Indexing Benchmark

This benchmark tests the performance of various indexers when processing transaction data and computing gas usage metrics from Ethereum transactions.

## Benchmark Specification

- **Target Data**: All Ethereum transactions in the specified block range
- **Data Processed**: Transaction gas usage
- **Block Range**: 22280000 to 22290000 (10,000 blocks)
- **Data Operations**: Transaction processing with gas calculations
- **RPC Calls**: Required for transaction data retrieval

## Implementation Details

The benchmark requires each indexer to:
1. Process all transactions within the target block range
2. Extract gas usage data from each transaction
3. Create records with the following information:
   - Transaction hash
   - Sender (from address)
   - Recipient (to address)
   - Gas price
   - Gas used
   - Block number
   - Transaction index

## Performance Results

| Indexer  | Time to Complete | Records Indexed | Notes |
|----------|------------------|----------------|-------|
| Sentio   | 23m              | 1,696,641      | |
| Envio    | 1m 25s           | 1,696,423      | Using HyperSync technology |
| Ponder   | 49h 45m          | ~1.7M          | Significantly slower processing time |
| Subsquid | 5m               | ~1.7M          | Fastest standard indexer |

## Implementation Examples

Each subdirectory contains the implementation for a specific indexing platform:
- `/sentio`: Sentio implementation 
- `/envio`: Envio implementation with HyperSync
- `/ponder`: Ponder implementation
- `/sqd`: Subsquid implementation

## Running the Benchmark

Each implementation includes its own setup and execution instructions. Generally, you will need to:

1. Install the required dependencies
2. Configure RPC endpoints
3. Start the indexer
4. Monitor progress
5. Record completion time

## Key Observations

- Subsquid demonstrates the fastest processing time for standard indexing
- Envio achieves exceptional performance through HyperSync technology
- Sentio provides solid performance for transaction processing
- Ponder requires significantly more time to process the same transaction volume

This benchmark showcases performance differences when processing raw transaction data and computing derivatives, which is a common pattern for dashboards, analytics, and monitoring applications.

## Access Information

### Sentio
- **Dashboard URL**: https://app.sentio.xyz/yufei/case_4_on_transaction/data-explorer/sql
- **API Access**: 
  ```
  curl -L -X POST 'https://app.sentio.xyz/api/v1/analytics/yufei/case_4_on_transaction/sql/execute' \
     -H 'Content-Type: application/json' \
     -H 'api-key: <API_KEY>' \
     --data-raw '{
       "sqlQuery": {
         "sql": "select count(blockNumber) from `GasSpent`"
       }
     }'
  ```
- **Data Summary**: 1,696,641 gas records

### Envio
- **Data Summary**: 
  - Total blocks processed: 9,996
  - Gas records collected: 1,696,423 transactions (approximately 170 transactions per block)
  - Unique senders: 493,181
  - Unique recipients: 315,861
  - Total gas value: 10,161,297,133,770,000,000,000 wei
  - Average gas value per transaction: 5,989,836,929,686,758 wei (approximately 0.00599 ETH)

### Ponder
- **Database Connection**:
  ```
  postgresql://postgres:YyWuPpZNatmmOXvczRYqKRYzMkkPTaVD@interchange.proxy.rlwy.net:28331/railway
  ```
- **Data Summary**: Approximately 1.7M gas records

### Subsquid
- **GraphQL Endpoint**: https://pine-quench.squids.live/case-4-on-transaction@v1/api/graphql
- **Data Summary**: Approximately 1.7M gas records within 10,000 block range

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

