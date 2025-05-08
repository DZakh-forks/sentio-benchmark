# Case 6: Uniswap V2 Template Benchmark

This case benchmarks various blockchain indexers using a Uniswap V2 template, focusing on swap and pair events.

## Block Range
- Start Block: 19,000,000
- End Block: 19,100,000

## Indexers Tested
1. [Subgraph](https://api.studio.thegraph.com/query/108520/case_6_template/version/latest)
2. [Sentio](https://app.sentio.xyz/api/v1/analytics/yufei/case_6_template/sql/execute)
3. [Subsquid](https://squid.subsquid.io)
4. [Envio](https://envio.dev)
5. [Ponder](https://ponder.sh)

## Performance Results
| Indexer    | Indexing Time |
|------------|---------------|
| Envio      | 10 seconds    |
| Subsquid   | 2 minutes     |
| Sentio     | 12 minutes    |
| Subgraph   | 34 minutes    |
| Ponder     | 2 hours 24 minutes |

## Data Analysis Results

### Pairs Data
- All platforms have exactly 232 total pairs
- All platforms have 236 unique tokens
- No missing pairs between platforms
- Consistent pair data structure across all platforms

### Swaps Data
- Most platforms (ponder, subgraph, sentio, envio): 35,039 swaps
- SQD: 33,972 swaps (1,067 fewer than other platforms)
- High similarity between platforms (Jaccard similarity > 0.999 for most comparisons)

### Unique Entities
- Most platforms:
  - 212 unique pairs from swaps
  - 135 unique senders
  - ~8,790 unique recipients
- SQD:
  - 211 unique pairs from swaps
  - 134 unique senders
  - 8,374 unique recipients

## Setup Instructions

### Data Collection
1. Navigate to the `downloads` directory
2. Run the comparison script:
   ```bash
   node compare_all_platforms.js
   ```
3. View the generated reports:
   - JSON report: `data/template_comparison_report.json`
   - HTML report: `data/template_comparison_report.html`

### Analysis Tools
The comparison script provides:
- Detailed pair and swap analysis
- Volume comparisons
- Missing data detection
- Jaccard similarity calculations

## Key Findings
1. **Data Consistency**: All platforms show high consistency in pair data
2. **Performance**: Significant variation in indexing times
3. **Data Completeness**: SQD shows slightly fewer swaps and unique entities
4. **Volume Accuracy**: All platforms show similar volume patterns

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