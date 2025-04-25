# Ethereum Transaction Trace Analysis Benchmark

This benchmark tests the performance of various indexers when processing Uniswap V2 swap transaction traces from Ethereum transactions.

## Benchmark Specification

- **Target Data**: Uniswap V2 Router02 swap function calls
- **Data Processed**: Transaction trace data for swap operations
- **Block Range**: 22200000 to 22290000 (90,000 blocks)
- **Data Operations**: Transaction trace decoding and analysis
- **RPC Calls**: Required for transaction trace retrieval
- **Dataset**: [Google Drive](https://drive.google.com/drive/u/0/folders/1407EeP-KzUwzujdnkoP_DiewJNbOHqcY)

## Performance Results

| Indexer  | Processing Time | Records | Block Range | 
|----------|----------------|---------|-------------|
| Sentio   | 16m            | 45,895  | 22,200,000-22,290,000 |
| Subsquid | 2m             | 50,191  | 22,200,000-22,290,000 |
| Envio    | 41s            | 50,191  | 22,200,000-22,290,000 |
| Ponder   | N/A            | 0       | 22,200,000-22,290,000 |
| Subgraph | 8m             | 29,058  | 22,200,000-22,290,000 |

## Data Distribution Details

The distribution of swap transactions across platforms shows the following results:

- **Sentio**: 45,895 swap records
  - Unique senders: 1,171
  - Unique recipients: 1,283
  - Processed blocks: 22,967
  - Total input amount: 501,991,777,910,022,212,811,911
  - Average path length: 2.06

- **Subsquid**: 50,191 swap records
  - Unique senders: 1,238
  - Unique recipients: 1,343
  - Processed blocks: 24,858
  - Total input amount: 4.0 × 10^33
  - Average path length: 2.07

- **Envio**: 50,191 swap records
  - Unique senders: 1,238
  - Unique recipients: 1,343
  - Processed blocks: 90,000
  - Processed traces: 4,039,431
  - Total input amount: 4.0 × 10^33
  - Processing time: 41 seconds total

- **Subgraph**: 29,058 swap records
  - Unique senders: 427
  - Unique recipients: 1,272
  - Processed blocks: 22,894
  - Total input amount: 3.99 × 10^33
  - Average path length: 2.09
  - Note: Limited trace data capture due to architectural constraints explained below

## Implementation Details

The benchmark requires each indexer to:
1. Process transaction traces to identify Uniswap V2 Router02 swap function calls
2. Decode the swap function parameters
3. Extract key information like:
   - Transaction hash
   - Block number
   - From address (sender)
   - To address (recipient)
   - Input token amount
   - Minimum output token amount
   - Token path
   - Deadline

## Key Findings

1. **Complete Data Coverage**: Subsquid and Envio demonstrated complete coverage of the swap transaction traces in the target block range. Sentio showed nearly complete coverage but with fewer records. Subgraph showed partial coverage due to architectural limitations.

2. **Data Discrepancies**:
   - **Sentio** processed 45,895 records compared to 50,191 records in Subsquid and Envio. This discrepancy appears to be due to failed trace calls resulting from insufficient fees. Further investigation is needed to understand the underlying cause and to achieve complete data matching between Sentio, Envio, and Subsquid implementations.
   - **Subgraph** captured significantly fewer records (~29,058) due to architectural limitations in accessing internal transaction traces.

3. **Performance Differences**:
   - **Envio with HyperSync** demonstrated exceptional performance at 30.75 seconds, processing over 4 million traces at a remarkable rate.
   - **Subsquid** showed excellent performance at 2 minutes.
   - **Subgraph** completed in 8 minutes with reliable performance, but captured ~40% fewer records due to limitations in trace access.
   - **Sentio** processed traces in 16 minutes.
   - **Ponder** supports trace-level indexing but our implementation encountered technical issues including database connection errors, ABI validation failures, and schema configuration problems.

4. **Implementation Approaches**:
   - Envio's implementation leverages their HyperSync technology for optimized blockchain data access.
   - Traditional indexers process traces through transaction-level handlers with RPC calls.
   - Subgraph utilizes call handlers but has fundamental limitations in trace data access.

## Platform Notes

### Sentio
- Nearly complete coverage of swap traces (45,895 records vs 50,191 in Subsquid/Envio)
- Processing time: 16 minutes
- Investigation needed to achieve complete data matching with Subsquid and Envio implementations

### Subsquid
- Complete coverage of all swap traces
- Processing time: 2 minutes

### Envio
- Uses HyperSync technology for optimized data access
- Processing time: 41 seconds
- Total swap records: 50,191
- Processed 90,000 blocks with 4,039,431 traces

### Ponder
- Officially supports trace-level indexing according to documentation
- Our implementation encountered persistent configuration issues
- Unable to capture trace data despite multiple setup and configuration attempts
- Issues included:
  - Database connection errors ("Connection terminated unexpectedly")
  - Event validation failures ("Event name for event 'swapExactTokensForTokens' not found in the contract ABI")
  - Database schema issues (swap table not being created despite successful startup)
  - Monitoring revealed "No sample swaps found. Trace capture may not be working correctly"

### Subgraph
- Partial coverage due to architectural limitations with trace data
- Processing time: 8 minutes (05:42:22 - 05:50:21)
- Total swap records: 29,058 (vs. ~50,000 in trace-based indexers)
- Significantly fewer unique senders (427 vs. ~1,200 in trace-based indexers)
- GraphQL endpoint: https://api.studio.thegraph.com/query/108520/case_5_on_trace/version/latest
- **Limitations**:
  - Cannot access internal transaction traces, only direct contract calls
  - `call.from` returns the immediate caller contract, not the original EOA transaction sender
  - Missing ~40% of swap transactions that occur within internal transactions
  - Architectural constraints of The Graph protocol prevent complete trace access

## Conclusion

This benchmark demonstrates significant performance differences in transaction trace processing across indexing platforms. Envio's HyperSync technology demonstrates exceptional speed, followed by Subsquid's efficient processing.

The benchmark also highlights important architectural differences between indexing platforms:

1. **Trace-based indexers** (Sentio, Subsquid, Envio) provide complete access to all transaction traces, including internal transactions, capturing ~50,000 records with ~1,200 unique senders.

2. **The Graph** (Subgraph) is fundamentally limited in its ability to access internal transaction data, capturing only ~29,000 records (missing ~40%) with only ~427 unique senders (missing ~65% of actual users).

These results clearly demonstrate that for use cases requiring comprehensive trace-level analysis (such as DeFi transaction monitoring, complex swap analysis, or user analytics), trace-based indexers offer significantly more complete data compared to subgraph implementations.

While Ponder documentation indicates support for trace-level indexing, our implementation faced multiple technical hurdles that prevented successful trace capture. This suggests that trace support in some platforms may require more specialized configuration or may be in an experimental state.

## Access Information

### Exported Data
All the trace data collected from each platform has been exported and is available via Google Drive:
- **Google Drive Folder**: [Case 5 - Transaction Trace Data](https://drive.google.com/drive/u/0/folders/1407EeP-KzUwzujdnkoP_DiewJNbOHqcY)
- Contains datasets with swap trace data from all platforms

### Subgraph
- **GraphQL Endpoint**: https://api.studio.thegraph.com/query/108520/case_5_on_trace/version/latest

