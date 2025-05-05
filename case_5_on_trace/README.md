# Case 5: Ethereum Transaction Trace Analysis Benchmark

This benchmark tests the performance of various indexers when processing Uniswap V2 swap transaction traces from Ethereum transactions.

## Block Range
- Start Block: 22,200,000
- End Block: 22,290,000 (90,000 blocks)

## Indexers Tested
1. [Sentio](https://app.sentio.xyz)
2. [Subsquid](https://squid.subsquid.io)
3. [Envio](https://envio.dev)
4. [Ponder](https://ponder.sh)
5. [Subgraph](https://thegraph.com)

## Performance Results
| Indexer    | Processing Time | Records | Block Range |
|------------|----------------|---------|-------------|
| Envio      | 41s            | 50,191  | 22,200,000-22,290,000 |
| Subsquid   | 2m             | 50,191  | 22,200,000-22,290,000 |
| Sentio     | 16m            | 45,895  | 22,200,000-22,290,000 |
| Subgraph   | 8m             | 29,058  | 22,200,000-22,290,000 |
| Ponder     | N/A            | 0       | 22,200,000-22,290,000 |

## Data Analysis Results

### Trace Processing
- **Envio & Subsquid**: Complete coverage with 50,191 swap records
- **Sentio**: 45,895 swap records (4,296 fewer than complete coverage)
- **Subgraph**: 29,058 swap records (21,133 fewer than complete coverage)
- **Ponder**: No records processed

### Unique Entities
- **Envio & Subsquid**:
  - 1,238 unique senders
  - 1,343 unique recipients
  - 24,858 processed blocks
  - 4,039,431 processed traces (Envio only)
- **Sentio**:
  - 1,171 unique senders
  - 1,283 unique recipients
  - 22,967 processed blocks
- **Subgraph**:
  - 427 unique senders
  - 1,272 unique recipients
  - 22,894 processed blocks

### Volume Analysis
- **Envio & Subsquid**: Total input amount: 4.0 × 10^33
- **Sentio**: Total input amount: 501,991,777,910,022,212,811,911
- **Subgraph**: Total input amount: 3.99 × 10^33

## Setup Instructions

### Data Collection
1. Navigate to the `downloads` directory
2. Run the comparison script:
   ```bash
   node compare_all_platforms.js
   ```
3. View the generated reports:
   - JSON report: `data/trace_comparison_report.json`
   - HTML report: `data/trace_comparison_report.html`

### Analysis Tools
The comparison script provides:
- Detailed trace analysis
- Swap transaction decoding
- Missing data detection
- Volume comparisons

## Key Findings
1. **Data Completeness**: 
   - Envio and Subsquid achieved complete coverage of swap traces
   - Sentio showed nearly complete coverage (91.4%)
   - Subgraph captured significantly fewer records (57.9%) due to architectural limitations

2. **Performance**:
   - Envio demonstrated exceptional performance (41s) using HyperSync technology
   - Subsquid showed excellent performance (2m)
   - Subgraph completed in 8m with reliable performance
   - Sentio processed traces in 16m
   - Ponder encountered technical issues preventing successful processing

3. **Implementation Approaches**:
   - Envio leverages HyperSync for optimized blockchain data access
   - Traditional indexers process traces through transaction-level handlers
   - Subgraph has fundamental limitations in trace data access

## Report Generation
The comparison script generates:
1. A detailed JSON report with raw data
2. An HTML report with visualizations
3. Console output with specific comparisons

## Notes
- The comparison takes into account different field naming conventions across platforms
- All addresses are normalized for comparison
- Timestamps are converted to a consistent format
- Volume calculations are performed with full precision
- Subgraph's architectural limitations affect trace data capture
- Ponder's implementation encountered technical issues including:
  - Database connection errors
  - ABI validation failures
  - Schema configuration problems

## Access Information

### Exported Data
All the trace data collected from each platform has been exported and is available via Google Drive:
- **Google Drive Folder**: [Case 5 - Transaction Trace Data](https://drive.google.com/drive/u/0/folders/1407EeP-KzUwzujdnkoP_DiewJNbOHqcY)
- Contains datasets with swap trace data from all platforms

### Subgraph
- **GraphQL Endpoint**: https://api.studio.thegraph.com/query/108520/case_5_on_trace/version/latest

