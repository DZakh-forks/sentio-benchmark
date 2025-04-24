# Case 3: Ethereum Block Data Similarity Report

## Overview

This report presents a comprehensive comparison of Ethereum block data across five indexing platforms:
- Sentio
- Subsquid
- Envio
- Ponder
- Subgraph

The analysis examines the full range of blocks (0-100,000) available in each platform's dataset.

## Platform Summary

| Platform | Total Records | Min Block | Max Block | Coverage |
|----------|---------------|-----------|-----------|----------|
| Sentio   | 100,000       | 1         | 100,000   | Complete (excluding block 0) |
| Subsquid | 13,156        | 0         | 100,000   | Sparse (focused on 40,000-100,000 range) |
| Envio    | 99,990        | 0         | 99,998    | Near complete (missing a few blocks) |
| Ponder   | 100,001       | 0         | 100,000   | Complete |
| Subgraph | 100,001       | 0         | 100,000   | Complete |

### Block Distribution Details

- **Sentio**: Even distribution across the entire range (blocks 1-100,000)
- **Subsquid**: Highly sparse distribution with focus on blocks 40,000-100,000
- **Envio**: Near complete coverage from 0-99,998, missing ~10 blocks
- **Ponder**: Complete coverage from 0-100,000
- **Subgraph**: Complete coverage from 0-100,000

## Similarity Analysis

We compared all platforms pairwise, focusing on three key fields:
- Block hash
- Parent hash
- Timestamp

### Similarity Table (Full Range)

| Platform Pair      | Common Blocks | Matching Blocks | Similarity (%) | Hash Diff | ParentHash Diff | Timestamp Diff |
|--------------------|---------------|-----------------|----------------|-----------|-----------------|----------------|
| Sentio vs Subsquid | 13,155        | 13,155          | 100.00%        | 0         | 0               | 0              |
| Sentio vs Envio    | 99,989        | 99,989          | 100.00%        | 0         | 0               | 0              |
| Sentio vs Ponder   | 100,000       | 100,000         | 100.00%        | 0         | 0               | 0              |
| Sentio vs Subgraph | 100,000       | 100,000         | 100.00%        | 0         | 0               | 0              |
| Subsquid vs Envio  | 13,155        | 13,155          | 100.00%        | 0         | 0               | 0              |
| Subsquid vs Ponder | 13,156        | 13,156          | 100.00%        | 0         | 0               | 0              |
| Subsquid vs Subgraph | 13,156      | 13,156          | 100.00%        | 0         | 0               | 0              |
| Envio vs Ponder    | 99,990        | 99,990          | 100.00%        | 0         | 0               | 0              |
| Envio vs Subgraph  | 99,990        | 99,990          | 100.00%        | 0         | 0               | 0              |
| Ponder vs Subgraph | 100,001       | 100,001         | 100.00%        | 0         | 0               | 0              |

## Key Findings

1. **Perfect Data Consistency**: All platforms show 100% similarity for the blocks they have in common. No differences were found in any of the key fields (hash, parentHash, timestamp) across any platform pair.

2. **Coverage Variations**:
   - **Complete Coverage**: Ponder and Subgraph have the most complete coverage with all 100,001 blocks (0-100,000).
   - **Near Complete**: Sentio (missing only block 0) and Envio (missing a few blocks) have near-complete coverage.
   - **Sparse Coverage**: Subsquid has significantly lower coverage with only 13,156 blocks, primarily in the 40,000-100,000 range.

3. **Common Blocks**:
   - The largest overlap is between Ponder and Subgraph (100,001 blocks).
   - The smallest overlap is between Subsquid and other platforms (around 13,155 blocks).

## Conclusion

The analysis reveals exceptional consistency in Ethereum block data across all five indexing platforms. Despite the differences in coverage, where blocks are present in multiple platforms, the data shows 100% consistency across all examined fields.

This suggests that, for Case 3 (Ethereum Block Data), all platforms accurately process and store the fundamental block properties, providing reliable and consistent blockchain data for applications built on these indexing platforms. 