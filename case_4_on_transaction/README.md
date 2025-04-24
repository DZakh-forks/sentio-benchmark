# Ethereum Transaction Gas Usage Indexing Benchmark

This benchmark tests the performance of various indexers when processing transaction data and computing gas usage metrics from Ethereum transactions.

## Benchmark Specification

- **Target Data**: All Ethereum transactions in the specified block range
- **Data Processed**: Transaction gas usage
- **Block Range**: 22280000 to 22290000 (10,000 blocks)
- **Data Operations**: Transaction processing with gas calculations
- **RPC Calls**: Required for transaction data retrieval
- **Dataset**: [Google Drive](https://drive.google.com/drive/u/0/folders/1Wxnc9bv5eVzCCQzDCdj_NI-rFB4e8iXk)

## Performance Results

| Indexer  | Processing Time | Records | Block Range | Coverage |
|----------|----------------|---------|-------------|----------|
| Sentio   | 23m            | 1,696,641 | 22,280,000-22,290,000 | Complete |
| Subsquid | 5m             | ~1,700,000 | 22,280,000-22,290,000 | Complete |
| Envio    | 1m 26s         | 1,696,423 | 22,280,000-22,290,000 | Complete (9,996 blocks) |
| Ponder   | 33m            | 1,696,423 | 22,280,000-22,290,000 | Complete |
| Subgraph | N/A            | N/A      | N/A         | Not supported |

## Data Distribution Details

The distribution of transactions across platforms is remarkably consistent, with approximately 170 transactions per block on average:

- **Sentio**: 1,696,641 transaction records (highest count)
- **Subsquid**: ~1,700,000 transaction records
- **Envio**: 1,696,423 transaction records
  - Unique senders: 493,181
  - Unique recipients: 315,861
  - Total gas value: 10,161,297,133,770,000,000,000 wei
  - Average gas value per transaction: 5,989,836,929,686,758 wei (~0.00599 ETH)
- **Ponder**: 1,696,423 transaction records
  - Average processing time per block event: 33.057ms
- **Subgraph**: Not supported (The Graph does not support transaction handlers)

## Key Findings

1. **Complete Data Coverage**: Sentio, Subsquid, Envio, and Ponder all demonstrated complete coverage of the transaction data in the target block range, with minimal variations in the total record count.

2. **Performance Differences**:
   - **Envio with HyperSync** demonstrated exceptional performance at 1 minute 26 seconds, processing transactions at a rate of approximately 20,000 transactions per second.
   - **Subsquid** showed excellent performance at 5 minutes, making it the fastest among the traditional indexers.
   - **Sentio** completed in 23 minutes with reliable performance.
   - **Ponder** processed all transactions in 33 minutes.

3. **Implementation Approaches**:
   - Envio's implementation leverages their HyperSync technology for optimized blockchain data access.
   - Traditional indexers process transactions through block-by-block handlers with RPC calls.

## Implementation Details

Each subdirectory contains the implementation for a specific indexing platform:
- `/sentio`: Sentio implementation 
- `/envio`: Envio implementation with HyperSync
- `/ponder`: Ponder implementation
- `/sqd`: Subsquid implementation

## Platform Notes

### Sentio
- Complete coverage of all transactions
- Processing time: 23 minutes (18:26:14 - 18:49:39)
- Total transaction records: 1,696,641

### Subsquid
- Complete coverage of all transactions
- Processing time: 5 minutes (18:47:50 - 18:52:17)
- Total transaction records: ~1,700,000

### Envio
- Uses HyperSync technology for optimized data access
- Processing time: 1 minute 26 seconds (85.59s)
- Total transaction records: 1,696,423
- Processed 9,996 blocks with ~170 transactions per block

### Ponder
- Complete coverage of all transactions
- Processing time: 33 minutes
- Total transaction records: 1,696,423
- Average processing time per block event: 33.057ms

### Subgraph
- Does not support transaction handlers
- No implementation for this benchmark case

## Conclusion

This benchmark demonstrates significant performance differences in transaction data processing across indexing platforms. Envio's HyperSync technology demonstrates exceptional speed, followed by Subsquid's efficient processing. All platforms show impressive consistency in the data captured, with minimal variations in transaction counts.

These results highlight the importance of choosing the right indexing solution based on specific use cases, especially for applications requiring transaction-level analysis such as gas usage tracking, fee market analysis, or transaction monitoring.

## Access Information

### Exported Data
All the transaction data collected from each platform has been exported and is available via Google Drive:
- **Google Drive Folder**: [Case 4 - Transaction Gas Usage Data](https://drive.google.com/drive/u/0/folders/1Wxnc9bv5eVzCCQzDCdj_NI-rFB4e8iXk)
- Contains datasets with transaction gas usage data from all platforms
- Includes comparative analysis and benchmark results

### Sentio
- **Dashboard URL**: https://app.sentio.xyz/yufei/case_4_on_transaction/data-explorer/sql
- **API Access**: 
  ```
  curl -L -X POST 'https://app.sentio.xyz/api/v1/analytics/yufei/case_4_on_transaction/sql/execute' \
     -H 'Content-Type: application/json' \
     -H 'api-key: hnZ7Z8cRsoxRadrVdhih2jRjBlH0lIYWl' \
     --data-raw '{
       "sqlQuery": {
         "sql": "select count(blockNumber) from `GasSpent`"
       }
     }'
  ```
- **Data Summary**: 1,696,641 gas records with complete coverage

### Envio
- **Data Summary**: 
  - Total blocks processed: 9,996
  - Gas records collected: 1,696,423 transactions (approximately 170 transactions per block)
  - Unique senders: 493,181
  - Unique recipients: 315,861
  - Total gas value: 10,161,297,133,770,000,000,000 wei
  - Average gas value per transaction: 5,989,836,929,686,758 wei (approximately 0.00599 ETH)

### Ponder
- **Data Summary**: 
  - Total Records Processed: 1,696,423 gas transaction records
  - Blocks Processed: 10,000 blocks (from block 22,280,000 to 22,290,000)
  - Average Processing Time per Block Event: 33.057ms
  - Average Transactions per Block: ~170 transactions

### Subsquid
- **GraphQL Endpoint**: https://pine-quench.squids.live/case-4-on-transaction@v1/api/graphql
- **Data Summary**: Approximately 1.7M gas records within 10,000 block range
- Processing completed in 5 minutes

