# Indexer Benchmarks

This repository contains benchmarks for various blockchain indexers, comparing their performance across different indexing scenarios.

## Benchmark Cases

### case_1_lbtc_event_only
This benchmark focuses on indexing transfer events from the LBTC token contract from block 0 to 22200000. It represents a simple event indexing scenario with the following characteristics:
- Only processes Transfer events
- No RPC calls to external services
- Write-only operations (no read operations after writing)
- Tests the indexer's ability to efficiently process and store a large number of events
- All data is derived directly from event logs without additional computation

### case_2_lbtc_full
This benchmark indexes LBTC token transfer events and performs balanceOf RPC calls from block 22100000 to 22200000. It represents a more complex scenario with:
- Processes Transfer events
- Makes RPC calls to fetch token balances using contract.balanceOf()
- Performs read-after-write operations
- Creates snapshots of account balances
- Tests the indexer's ability to manage both event data and RPC call results
- Evaluates performance when combining on-chain data with additional queries

### case_3_ethereum_block
This benchmark focuses on processing Ethereum blocks from 0 to 10000000, creating entities for each block with its metadata. Key characteristics include:
- Uses block handlers instead of event handlers
- No specific contract focus - processes all blocks
- Creates block entities with block metadata (number, hash, timestamp, etc.)
- Tests the indexer's ability to process large volumes of block data
- Evaluates performance for block-level indexing scenarios
- Note: Envio does not support block handlers, so it cannot be tested in this case

## Performance Results

| Metric | Sentio | Envio | Ponder | Subsquid | Subgraph |
|--------|--------|-------|--------|----------|----------|
| case_1_lbtc_event_only | 6m | 2m | 1h40m | 10m | 3h9m |
| # records up to block 22210921 | 296,734 | 296,734 | 296,138 | 296,734 | 296,734 |
| case_2_lbtc_full | 27m | 45m | 4h38m | 32m | 18h38m |
| case_3_ethereum_block | 4m | N/A | 55h37m | 45h | 24h |

## Notes
- case_1: Blocks 0 to 22200000
- case_2: Blocks 22100000 to 22200000
- case_3: Blocks 0 to 10000000
- Ponder is missing about 5% of data in case_1
- Envio does not support block handlers, so case_3 cannot be tested

## Detailed Timing Logs

### Sentio
1. case_1: 15:06:51 - 15:12:55 (6m)
2. case_2: 15:25:55 - 15:52:14 (27m)
3. case_3: 13:54:48 - 13:58:57 (4m)

### Envio
1. case_1: 4:55 PM - 4:57 PM (2m)
2. case_2: 4:55 PM - 5:40:02 PM (45m)
3. case_3: Not supported

### Ponder
1. case_1: 8:29 PM - 10:09:43 PM (1h40m)
2. case_2: 8:30:24 PM - 3:08:00 AM (4h38m)
3. case_3: 4/11 8:29:41 PM - 4/14 4:06:45 AM (55h37m)

### Subsquid
1. case_1: 15:21:20 - 15:31:40 (10m)
2. case_2: 14:08:47 - 14:40:34 (32m)
3. case_3: 11.04.2025 14:21:04 - 13.04.2025 11:21:44 (45h)

### Subgraph
1. case_1: 2025-04-11 05:15:47 PM - 2025-04-11 08:25:44 PM (3h9m)
2. case_2: 2025-04-11 05:16:30 PM - 2025-04-12 11:54:25 AM (18h38m)
3. case_3: 2025-04-11 05:14:26 PM - 2025-04-12 05:14:53 PM (24h)

## Key Observations

1. **Performance Comparison**:
   - Sentio and Envio show the fastest indexing times across most test cases
   - Ponder generally shows the slowest indexing performance
   - Subgraph shows significantly longer indexing times compared to Sentio and Subsquid

2. **Data Completeness**:
   - Ponder is missing approximately 5% of data in case_1
   - All other indexers processed the complete dataset

3. **Specialized Capabilities**:
   - Envio shows excellent performance for event processing but lacks block handler support
   - Sentio performs consistently well across all test cases, including the block-level scenario
   - Subsquid shows balanced performance but longer processing times for block-level indexing

4. **Resource Efficiency**:
   - Event processing (case_1) is most efficient across all indexers
   - Block-level indexing (case_3) requires significantly more processing time for all platforms
   - RPC calls and complex data handling (case_2) increase indexing time for all indexers

This benchmark provides a comparative analysis of indexer performance across different scenarios, helping developers choose the most appropriate indexing solution for their specific needs.