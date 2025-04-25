# Ethereum Block Indexing Benchmark

This benchmark tests the performance of various indexers when processing Ethereum blocks rather than specific events, creating an entity for each block with its metadata.

## Benchmark Specification

- **Target**: Ethereum blocks
- **Block Range**: 0 to 100,000
- **Data Operations**: Block-level indexing
- **Handler Type**: Block handlers (not event handlers)
- **Block Data**: Block number, hash, timestamp, parent hash, etc.
- **Dataset**: [Google Drive](https://drive.google.com/drive/u/0/folders/1fqXsjO4CMkLJTxqOg2dKG8qPY8oM1x8E)

## Performance Results

| Indexer  | Processing Time | Records | Block Range | Coverage |
|----------|----------------|---------|-------------|----------|
| Sentio   | 18m            | 100,000 | 1-100,000   | Complete (excluding block 0) |
| Subsquid | 1m*            | 13,156  | 0-100,000   | Sparse (13.16%) |
| Envio    | 7.9s           | 100,000 | 0-99,999    | Complete |
| Ponder   | 33m            | 100,001 | 0-100,000   | Complete (includes block 0) |
| Subgraph | 10m            | 100,001 | 0-100,000   | Complete (includes block 0) |

\* *Subsquid used an archival node but has missing data, primarily indexing blocks in the 45,000-100,000 range*

## Block Distribution Details

- **Sentio**: Even distribution across the entire range (blocks 1-100,000, excluding block 0)
- **Subsquid**: Highly sparse distribution:
  - 0-9,999: Just 1 block (0.01% coverage) - only block 0
  - 10,000-39,999: No blocks at all (0% coverage)
  - 40,000-49,999: 1,455 blocks (14.55% coverage)
  - 50,000-59,999: 2,092 blocks (20.92% coverage) 
  - 60,000-69,999: 2,322 blocks (23.22% coverage)
  - 70,000-79,999: 2,296 blocks (22.96% coverage)
  - 80,000-89,999: 2,770 blocks (27.70% coverage)
  - 90,000-100,000: 2,220 blocks (22.20% coverage)
  - Largest gap: Block 0 to block 46,147 (46,146 missing blocks)
  - Overall, 86.84% of blocks in the range are missing
- **Envio**: Complete coverage from 0-99,999 (100,000 blocks total)
- **Ponder**: Complete coverage from 0-100,000 (100,001 blocks total, including genesis block 0)
- **Subgraph**: Complete coverage from 0-100,000 (100,001 blocks total, including genesis block 0)

## Similarity Analysis

We compared all platforms pairwise, focusing on three key fields:
- Block hash
- Parent hash
- Timestamp

### Similarity Table

| Platform Pair      | Common Blocks | Matching Blocks | Similarity (%) |
|--------------------|---------------|-----------------|----------------|
| Sentio vs Subsquid | 13,155        | 13,155          | 100.00%        |
| Sentio vs Envio    | 99,999        | 99,999          | 100.00%        |
| Sentio vs Ponder   | 100,000       | 100,000         | 100.00%        |
| Sentio vs Subgraph | 100,000       | 100,000         | 100.00%        |
| Subsquid vs Envio  | 13,155        | 13,155          | 100.00%        |
| Subsquid vs Ponder | 13,156        | 13,156          | 100.00%        |
| Subsquid vs Subgraph | 13,156      | 13,156          | 100.00%        |
| Envio vs Ponder    | 100,000       | 100,000         | 100.00%        |
| Envio vs Subgraph  | 100,000       | 100,000         | 100.00%        |
| Ponder vs Subgraph | 100,001       | 100,001         | 100.00%        |

## Key Findings

1. **Perfect Data Consistency**: All platforms show 100% similarity for the blocks they have in common. No differences were found in any of the key fields (hash, parentHash, timestamp) across any platform pair.

2. **Coverage Variations**:
   - **Complete Coverage**: Ponder and Subgraph have the most complete coverage with all 100,001 blocks (0-100,000, including genesis block).
   - **Near Complete**: Sentio (missing only block 0) and Envio (complete 0-99,999) have essentially complete coverage.
   - **Sparse Coverage**: Subsquid has significantly lower coverage with only 13,156 blocks, primarily in the 40,000-100,000 range.

3. **Performance Differences**:
   - **Envio** demonstrated the fastest processing with HyperSync (7.9 seconds), but does not support traditional block handlers
   - **Sentio**, **Ponder**, and **Subgraph** all completed indexing in reasonable timeframes (18-33 minutes)
   - **Subsquid** completed quickly (1 minute) but with significant data gaps

## Implementation Details

Each subdirectory contains the implementation for a specific indexing platform:
- `/sentio`: Sentio implementation 
- `/ponder`: Ponder implementation
- `/sqd`: Subsquid implementation
- `/subgraph`: The Graph subgraph implementation
- `/envio`: Envio implementation using HyperSync (not traditional block handlers)

## Platform Notes

### Sentio
- Complete coverage of blocks 1-100,000
- Completed in 18 minutes

### Subsquid
- Sparse coverage (13.16%) with significant gaps, primarily indexing blocks in 45,000-100,000 range
- Uses archival node but still has missing data
- Total of 9,071 gaps identified with the largest being 46,146 consecutive missing blocks
- Database connection: `PGPASSWORD="hcGgm1BIXTjbZ-lhkKeZ8vfBFQ3Xmkka" psql -h pg.squid.subsquid.io -d 16307_lf5mma -U 16307_lf5mma`

### Envio
- Does not support traditional block handlers, but achieved complete coverage using HyperSync
- Fastest processing time at 7.9 seconds for 100,000 blocks
- Processes approximately 12,658 blocks per second

### Ponder
- Complete coverage of blocks 0-100,000
- Completed in 33 minutes
- Used PGlite database

### Subgraph
- Complete coverage of blocks 0-100,000
- Completed in 10 minutes

## Conclusion

The analysis reveals exceptional consistency in Ethereum block data across all five indexing platforms. Despite the differences in coverage, where blocks are present in multiple platforms, the data shows 100% consistency across all examined fields.

This benchmark highlights significant differences in processing approaches across platforms, with Envio's HyperSync demonstrating exceptional speed but through a different approach than traditional block-by-block indexing. Sentio, Ponder, and Subgraph all performed reliably with complete data, while Subsquid showed gaps in its coverage despite fast processing.

## Access Information

### Exported Data
All the block data collected from each platform has been exported and is available via Google Drive:
- **Google Drive Folder**: [Case 3 - Ethereum Block Data](https://drive.google.com/drive/u/0/folders/1fqXsjO4CMkLJTxqOg2dKG8qPY8oM1x8E)
- Contains Parquet files with block data from all platforms
- Includes comparison reports and visualization data

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