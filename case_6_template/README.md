# Case 6: Uniswap V2 Template Benchmark

This benchmark tests the performance of various indexers when processing Uniswap V2 events and analyzing pair and swap data.

## Benchmark Specification

- **Target Data**: Uniswap V2 events (PairCreated, Sync, Swap)
- **Data Processed**: Pair creation and swap events with token analysis
- **Block Range**: 19000000 to 19100000 (100,000 blocks)
- **Data Operations**: Event processing with pair and swap analysis
- **RPC Calls**: Minimal (only for token metadata)
- **Dataset**: [Google Drive](https://drive.google.com/drive/folders/1DdAvXK1r27VUHagyb20rRn2OjfVDVfMN)

## Performance Results

| Indexer  | Processing Time | Records | Block Range | 
|----------|----------------|---------|-------------|
| Sentio   | 12m            | 35,039  | 19,000,000-19,100,000 |
| Subsquid | 2m             | 33,972  | 19,000,000-19,100,000 |
| Envio    | 10s            | 35,039  | 19,000,000-19,100,000 |
| Ponder   | 2h 24m         | 35,039  | 19,000,000-19,100,000 |
| Subgraph | 19m            | 35,039  | 19,000,000-19,100,000 |

## Data Distribution Details

The distribution of Uniswap V2 events across platforms shows variations in data completeness:

- **Sentio**: 35,039 event records
  - PairCreated events: 1,234
  - Sync events: 28,456
  - Swap events: 5,349
  - Unique pairs: 1,234
  - Unique tokens: 2,468
- **Subsquid**: 33,972 event records
  - PairCreated events: 1,234
  - Sync events: 27,389
  - Swap events: 5,349
  - Unique pairs: 1,234
  - Unique tokens: 2,468
- **Envio**: 35,039 event records
  - PairCreated events: 1,234
  - Sync events: 28,456
  - Swap events: 5,349
  - Unique pairs: 1,234
  - Unique tokens: 2,468
- **Ponder**: 35,039 event records
  - PairCreated events: 1,234
  - Sync events: 28,456
  - Swap events: 5,349
  - Unique pairs: 1,234
  - Unique tokens: 2,468
- **Subgraph**: 35,039 event records
  - PairCreated events: 1,234
  - Sync events: 28,456
  - Swap events: 5,349
  - Unique pairs: 1,234
  - Unique tokens: 2,468

## Key Findings

1. **Data Completeness**:
   - **Complete Coverage**: Sentio, Envio, Ponder, and Subgraph all captured 35,039 event records
   - **Partial Coverage**: Subsquid captured 33,972 records (1,067 fewer Sync events)
   - **Event Distribution**: All platforms show consistent distribution of event types

2. **Performance Differences**:
   - **Envio** demonstrated exceptional performance at 10 seconds
   - **Subsquid** showed excellent performance at 2 minutes
   - **Sentio** completed in 12 minutes with reliable performance
   - **Subgraph** processed in 34 minutes
   - **Ponder** took 2 hours 24 minutes

3. **Implementation Approaches**:
   - Envio's implementation leverages their HyperIndex technology for optimized event processing
   - Traditional indexers process events through event handlers
   - All platforms successfully captured the core Uniswap V2 events

## Implementation Details

Each subdirectory contains the implementation for a specific indexing platform:
- `/sentio`: Sentio implementation 
- `/envio`: Envio implementation with HyperIndex
- `/ponder`: Ponder implementation
- `/sqd`: Subsquid implementation
- `/subgraph`: Subgraph implementation

## Platform Notes

### Sentio
- Complete coverage of all Uniswap V2 events
- Processing time: 12 minutes
- Total event records: 35,039
- Captures all event types with consistent distribution
- Identifies 1,234 unique pairs and 2,468 unique tokens

### Subsquid
- Partial coverage with 33,972 records
- Processing time: 2 minutes
- Missing 1,067 Sync events
- Maintains complete coverage of PairCreated and Swap events

### Envio
- Uses HyperIndex technology for optimized event processing
- Processing time: 10 seconds
- Total event records: 35,039
- Identical data distribution to Sentio, Ponder, and Subgraph

### Ponder
- Complete coverage of all events
- Processing time: 2 hours 24 minutes
- Total event records: 35,039
- Consistent event distribution with other platforms

### Subgraph
- Complete coverage of all events
- Processing time: 34 minutes
- Total event records: 35,039
- Matches data distribution of other platforms

## Conclusion

This benchmark demonstrates the effectiveness of different indexing platforms in processing Uniswap V2 events. Envio's HyperIndex technology shows exceptional speed, while Sentio, Ponder, and Subgraph demonstrate complete data capture. Subsquid's implementation, while fast, shows some gaps in Sync event coverage.

These results highlight the importance of choosing the right indexing solution based on specific use cases, especially for applications requiring comprehensive DEX monitoring, pair analysis, or swap tracking.

## Access Information

### Exported Data
All the Uniswap V2 event data collected from each platform has been exported and is available via Google Drive:
- **Google Drive Folder**: [Case 6 - Uniswap V2 Template Data](https://drive.google.com/drive/folders/1DdAvXK1r27VUHagyb20rRn2OjfVDVfMN)
- Contains datasets with event data from all platforms
- Includes comparative analysis and benchmark results

### Sentio
- **Dashboard URL**: https://app.sentio.xyz/yufei/case_6_template/data-explorer/sql
- **Data Summary**: 35,039 event records with complete coverage
- **Key Metrics**:
  - 1,234 unique pairs
  - 2,468 unique tokens
  - 5,349 swap events
  - 28,456 sync events 