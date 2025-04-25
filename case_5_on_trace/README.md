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

| Indexer  | Processing Time | Records | Block Range | Coverage |
|----------|----------------|---------|-------------|----------|
| Sentio   | 16m            | N/A     | 22,200,000-22,290,000 | Complete |
| Subsquid | 2m             | N/A     | 22,200,000-22,290,000 | Complete |
| Envio    | 10.92s         | 50,191 swaps | 22,200,000-22,290,000 | Complete (90,000 blocks) |
| Ponder   | N/A            | 0       | 22,200,000-22,290,000 | Configuration issues |
| Subgraph | 8m             | 50,191 swaps | 22,200,000-22,290,000 | Complete |

## Data Distribution Details

The distribution of swap transactions across platforms shows consistent results:

- **Envio**: 50,191 swap records
  - Unique input tokens: 5,853
  - Unique output tokens: 1
  - Unique recipients: 1
  - Total input amount: 4.000827389278954379198121595012958e+33
  - Processing time: 12.74 seconds total (including data collection and processing)

- **Subgraph**: 50,191 swap records
  - Note: traceAddress is not directly accessible in Subgraph

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

1. **Complete Data Coverage**: Sentio, Subsquid, Envio, and Subgraph all demonstrated complete coverage of the swap transaction traces in the target block range.

2. **Performance Differences**:
   - **Envio with HyperSync** demonstrated exceptional performance at 10.92 seconds, processing traces at a remarkable rate.
   - **Subsquid** showed excellent performance at 2 minutes.
   - **Subgraph** completed in 8 minutes with reliable performance.
   - **Sentio** processed all traces in 16 minutes.
   - **Ponder** supports trace-level indexing in documentation but our implementation encountered configuration issues.

3. **Implementation Approaches**:
   - Envio's implementation leverages their HyperSync technology for optimized blockchain data access.
   - Traditional indexers process traces through transaction-level handlers with RPC calls.
   - Subgraph utilizes transaction handlers since traceAddress is not directly accessible.

## Platform Notes

### Sentio
- Complete coverage of all swap traces
- Processing time: 16 minutes

### Subsquid
- Complete coverage of all swap traces
- Processing time: 2 minutes

### Envio
- Uses HyperSync technology for optimized data access
- Processing time: 10.92 seconds
- Total swap records: 50,191
- Processed 90,000 blocks with 485,754 traces

### Ponder
- Officially supports trace-level indexing according to documentation
- Our implementation encountered persistent configuration issues
- Unable to capture trace data despite multiple setup and configuration attempts
- Issues included database connection problems and trace event handling

### Subgraph
- Complete coverage despite traceAddress not being directly accessible
- Processing time: 8 minutes (05:42:22 - 05:50:21)
- Total swap records: 50,191
- GraphQL endpoint: https://api.studio.thegraph.com/query/108520/case_5_on_trace/version/latest

## Conclusion

This benchmark demonstrates significant performance differences in transaction trace processing across indexing platforms. Envio's HyperSync technology demonstrates exceptional speed, followed by Subsquid's efficient processing. All platforms that support trace analysis show impressive consistency in the data captured.

These results highlight the importance of choosing the right indexing solution based on specific use cases, especially for applications requiring trace-level analysis such as DeFi transaction monitoring, swap analysis, or complex transaction tracing.

## Access Information

### Exported Data
All the trace data collected from each platform has been exported and is available via Google Drive:
- **Google Drive Folder**: [Case 5 - Transaction Trace Data](https://drive.google.com/drive/u/0/folders/1407EeP-KzUwzujdnkoP_DiewJNbOHqcY)
- Contains datasets with swap trace data from all platforms

### Subgraph
- **GraphQL Endpoint**: https://api.studio.thegraph.com/query/108520/case_5_on_trace/version/latest

