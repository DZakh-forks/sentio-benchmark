# Indexer Benchmarks

This repository contains performance benchmarks for various blockchain indexers, comparing their capabilities and performance across different indexing scenarios.

## Benchmark Cases

| Case | Description | Features |
|------|-------------|----------|
| [case_1_lbtc_event_only](./case_1_lbtc_event_only/) | Simple event indexing of LBTC token transfers | Event handling, No RPC calls, Write-only operations |
| [case_2_lbtc_full](./case_2_lbtc_full/) | Complex indexing with RPC calls for token balances | Event handling, RPC calls, Read-after-write operations |
| [case_3_ethereum_block](./case_3_ethereum_block/) | Block-level indexing of Ethereum blocks | Block handling, Metadata extraction |

## Latest Benchmark Results

Our most recent benchmark (April 2025) shows significant performance differences between indexers:

- **Fastest Event Processing**: Envio (2m) and Sentio (6m) for simple event indexing
- **Best RPC Performance**: Sentio (27m) for complex RPC interactions
- **Block Processing Leader**: Sentio (4m) for block-level indexing

See the [complete benchmark results](#current-benchmark-results---april-2025) for detailed timing data, completeness metrics, and analysis.

## Test Methodology

### Test Configuration
- All benchmarks run on standardized hardware environments
- Each test runs until completion or timeout (72 hours)
- RPC providers: When built-in RPC support isn't available, we use Alchemy Growth tier

### Test Case Design
Our benchmark cases are designed to test different aspects of indexer performance:

1. **Chain Selection**: 
   - Ethereum Mainnet for all test cases

2. **Data Types**:
   - Events: Transfer events in case_1 and case_2
   - Blocks: Block data in case_3
   - Transactions: Included within block data

3. **RPC Patterns**:
   - No RPC: case_1 tests raw event processing
   - RPC Calls: case_2 tests balanceOf() calls
   - Block Data: case_3 tests block processing

4. **Write Patterns**:
   - Write-only: case_1 tests simple data storage
   - Read-after-write: case_2 tests database interaction complexity

## Indexer Platforms

### Supported Chains

| Chain | Sentio | Envio | Ponder | Subsquid | Subgraph |
|-------|--------|-------|--------|----------|----------|
| EVM | ✅ | ✅* | ✅ | ✅ | ✅ |
| Sui | ✅ | ❌ | ❌ | ✅ | ❌ |
| Move | ✅ | ❌ | ❌ | ❌ | ❌ |
| StarkNet | ✅ | ❌ | ❌ | ✅ | ✅ |
| Cosmos | ✅ | ❌ | ❌ | ✅ | ✅ |
| Solana | ✅ | ❌ | ✅ | ✅ | ✅ |
| Arweave | ❌ | ❌ | ❌ | ✅ | ✅ |
| Bitcoin | ❌ | ❌ | ✅ | ✅ | ✅ |
| Near | ❌ | ❌ | ❌ | ✅ | ❌ |

\* Envio supports hundreds of EVM-compatible chains through their HyperIndex technology

### Supported Features

| Feature | Sentio | Envio | Ponder | Subsquid | Subgraph |
|---------|--------|-------|--------|----------|----------|
| Event Handler | ✅ | ✅ | ✅ | ✅ | ✅ |
| Block Handler | ✅ | ❌ | ✅ | ✅ | ✅ |
| Transaction Handler | ✅ | ❌ | ✅ | ✅ | ✅ |
| Native RPC | ✅ | ✅ | ✅ | ✅ | ❌ |
| Read-After-Write | ✅ | ✅ | ✅ | ✅ | ✅ |
| High-Speed Data Access | ✅ | ✅* | ⚠️ | ✅ | ⚠️ |
| SQL Querying | ✅ | ✅ | ✅ | ✅ | ❌ |
| GraphQL API | ✅ | ✅ | ✅ | ✅ | ✅ |
| Auto Scaling | ✅ | ✅ | ⚠️ | ✅ | ✅ |
| Decentralized Network | ❌ | ❌ | ❌ | ✅ | ✅ |

\* Envio's HyperSync technology offers up to 2000x faster data access compared to traditional RPC methods

⚠️ Limited capability or requires additional configuration

This benchmark provides a comparative analysis of indexer performance across different scenarios, helping developers choose the most appropriate indexing solution for their specific needs.

## Current Benchmark Results - April 2025

### Test Data

| Case | Description | Chain | Block Range | Features |
|------|-------------|-------|------------|----------|
| case_1_lbtc_event_only | LBTC Token Transfer Events | Ethereum | 0 to 22200000 | Event handling, No RPC calls, Write-only |
| case_2_lbtc_full | LBTC Token with RPC calls | Ethereum | 22100000 to 22200000 | Event handling, RPC calls, Read-after-write |
| case_3_ethereum_block | Ethereum Block Processing | Ethereum | 0 to 10000000 | Block handling, Metadata extraction |

### Performance Results

| Case | Sentio | Envio | Ponder | Subsquid | Subgraph |
|------|--------|-------|--------|----------|----------|
| case_1_lbtc_event_only | 6m | 2m | 1h40m* | 10m | 3h9m |
| case_2_lbtc_full | 27m | 45m | 4h38m | 32m | 18h38m |
| case_3_ethereum_block | 4m | N/A† | 55h37m | 45h‡ | 24h |

\* Ponder is missing about 5% of data in case_1  
† Envio does not support block handlers  
‡ Subsquid is missing about 15% of blocks  

### Data Completeness

| Case | Sentio | Envio | Ponder | Subsquid | Subgraph |
|------|--------|-------|--------|----------|----------|
| case_1_lbtc_event_only | 296,734 | 296,734 | 296,138* | 296,734 | 296,734 |
| case_2_lbtc_full | 11,552 transfers, 213,782 positions | 12,165 transfers, 2,663 accounts, 16,338 snapshots | 12,165 transfers, 2,684 accounts, 501,711 snapshots | 12,165 transfers, 2,685 accounts, 24,618 snapshots | 12,165 transfers, N/A accounts‡ |
| case_3_ethereum_block | 10,000,001 | N/A | 10,000,001 | 8,498,930† | 10,000,001 |

\* Missing ~5% of events  
† Missing 1,501,071 blocks (15% of target range)  
‡ Subgraph does not report account counts in the same way as other implementations

### Key Observations

1. **Performance Comparison**:
   - Sentio and Envio show the fastest indexing times across most test cases
   - Ponder generally shows the slowest indexing performance
   - Subgraph shows significantly longer indexing times compared to Sentio and Subsquid

2. **Data Completeness**:
   - Ponder is missing approximately 5% of data in case_1
   - Subsquid is missing about 15% of blocks in case_3
   - All other indexers processed the complete dataset in their supported cases
   - Case 2 implementations show different approaches to tracking accounts and snapshots, with significant variations in snapshot counts (ranging from ~16K to ~500K)

3. **Specialized Capabilities**:
   - Envio shows excellent performance for event processing but lacks block handler support
   - Sentio performs consistently well across all test cases, including the block-level scenario
   - Subsquid shows balanced performance but longer processing times for block-level indexing

4. **Resource Efficiency**:
   - Event processing (case_1) is most efficient across all indexers
   - Block-level indexing (case_3) requires significantly more processing time for all platforms
   - RPC calls and complex data handling (case_2) increase indexing time for all indexers
