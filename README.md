# Indexer Benchmarks

This repository contains performance benchmarks for various blockchain indexers, comparing their capabilities and performance across different indexing scenarios.

## Benchmark Cases

| Case | Description | Features |
|------|-------------|----------|
| [case_1_lbtc_event_only](./case_1_lbtc_event_only/) | Simple event indexing of LBTC token transfers | Event handling, No RPC calls, Write-only operations |
| [case_2_lbtc_full](./case_2_lbtc_full/) | Complex indexing with RPC calls for token balances | Event handling, RPC calls, Read-after-write operations |
| [case_3_ethereum_block](./case_3_ethereum_block/) | Block-level indexing of Ethereum blocks | Block handling, Metadata extraction |
| [case_4_on_transaction](./case_4_on_transaction/) | Transaction gas usage indexing | Transaction handling, Gas calculations |
| [case_5_on_trace](./case_5_on_trace/) | Uniswap V2 transaction trace analysis | Transaction trace handling, Swap decoding |

## Latest Benchmark Results

Our most recent benchmark (April 2025) shows significant performance differences between indexers:

- **Fastest Event Processing**: Envio (2m) and Sentio (6m) for simple event indexing
- **Best RPC Performance**: Envio (13m) and Sentio (45m) for complex RPC interactions
- **Block Processing Leader**: Envio with HyperSync (7.9s) and Sentio (18m) for block-level indexing
- **Transaction Processing**: Subsquid (5m) and Envio with HyperSync (1.5m) for gas usage indexing
- **Trace Processing Leader**: Envio with HyperSync (10.92s) and Subsquid (2m) for transaction trace analysis

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
   - Transactions: Gas usage in case_4
   - Traces: Uniswap V2 swap transactions in case_5

3. **RPC Patterns**:
   - No RPC: case_1 tests raw event processing
   - RPC Calls: case_2 tests balanceOf() calls
   - Block Data: case_3 tests block processing
   - Transaction Data: case_4 tests transaction processing
   - Trace Data: case_5 tests transaction trace processing

4. **Write Patterns**:
   - Write-only: case_1 tests simple data storage
   - Read-after-write: case_2 tests database interaction complexity
   - Computational: case_4 tests calculation and derivation of metrics

## Indexer Platforms

### Supported Chains

| Chain | Sentio | Envio | Ponder | Subsquid | Subgraph |
|-------|--------|-------|--------|----------|----------|
| EVM* | ✅ | ✅ | ✅ | ✅ | ✅ |
| Sui | ✅ | ❌ | ❌ | ✅ | ❌ |
| Aptos | ✅ | ❌ | ❌ | ❌ | ❌ |
| StarkNet | ✅ | ❌ | ❌ | ✅ | ✅ |
| Cosmos | ⚠️ | ❌ | ❌ | ✅ | ✅ |
| Solana | ⚠️ | ❌ | ✅ | ✅ | ✅ |
| Bitcoin | ⚠️ | ❌ | ✅ | ✅ | ✅ |
| Fuel | ✅ | ❌ | ❌ | ✅ | ❌ |

\* Including many EVM-compatible L1/L2 chains

⚠️ Limited support

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
| case_3_ethereum_block | Ethereum Block Processing | Ethereum | 0 to 100000 | Block handling, Metadata extraction |
| case_4_on_transaction | Ethereum Transaction Gas Usage | Ethereum | 22280000 to 22290000 | Transaction handling, Gas calculations |
| case_5_on_trace | Uniswap V2 Swap Trace Analysis | Ethereum | 22200000 to 22290000 | Transaction trace handling, Swap decoding |

### Performance Results

| Case | Sentio | Envio | Ponder | Subsquid | Subgraph | Sentio_Subgraph | Goldsky_Subgraph |
|------|--------|-------|--------|----------|----------| ----------| ----------|
| case_1_lbtc_event_only | 8m | 2m | 1h40m* | 10m | 3h9m | 26m |  |
| case_2_lbtc_full | 45m | 13m | 4h38m | 32m | 18h38m | |  |
| case_3_ethereum_block | 18m | 7.9s† | 33m | 1m‡ | 10m | |  |
| case_4_on_transaction | 23m | 1m 26s†† | 33m | 5m | N/A | |  |
| case_5_on_trace | 16m | 10.92s‡‡ | N/A§ | 2m | 8m | |  |

\* Ponder is missing about 5% of data in case_1  
† Envio implementation uses HyperSync technology  
‡ Subsquid is missing about 87% of blocks  
†† Envio implementation uses HyperSync technology  
‡‡ Envio implementation uses HyperSync technology  
§ Ponder claims trace-level support, but implementation struggles with capturing traces in our testing configuration

### Data Completeness

| Case | Sentio | Envio | Ponder | Subsquid | Subgraph |
|------|--------|-------|--------|----------|----------|
| case_1_lbtc_event_only | 296,734 | 296,734 | 296,138* | 296,734 | 296,734 |
| case_2_lbtc_full | 12,165 transfers, 2,684 accounts | 12,165 transfers, 2,685 accounts | 12,165 transfers, 2,684 accounts | 12,165 transfers, 2,685 accounts | 12,165 transfers, N/A accounts‡ |
| case_3_ethereum_block | 100,000 (1-100,000) | 100,000 (0-99,999) | 100,001 (0-100,000) | 13,156† | 100,001 (0-100,000) |
| case_4_on_transaction | 1,696,641 | 1,696,423 | 1,696,423 | ~1.7M | N/A |
| case_5_on_trace | N/A | 50,191 swaps | 0** | N/A | 50,191 swaps |

\* Missing ~5% of events  
† Missing 86,844 blocks (86.84% of target range)  
‡ Subgraph does not report account counts in the same way as other implementations  
** Ponder documentation indicates trace support, but our implementation encountered configuration issues that prevented successful trace capture

### Key Observations

1. **Performance Comparison**:
   - Sentio and Envio show the fastest indexing times across most test cases
   - Envio's HyperSync technology demonstrates exceptional performance for block and transaction indexing
   - Ponder shows longer indexing times but with complete data coverage in most cases
   - Subgraph demonstrates efficient block processing (10m for 100K blocks) with complete coverage

2. **Data Completeness**:
   - Ponder is missing approximately 5% of data in case_1
   - Subsquid is missing about 87% of blocks in case_3, primarily indexing blocks in the 45,000-100,000 range
   - All other indexers processed the complete dataset in their supported cases
   - Case 3 shows perfect data consistency with 100% similarity for blocks across all platforms

3. **Specialized Capabilities**:
   - Envio shows exceptional performance with HyperSync technology (7.9s for 100K blocks, 10.92s for 90K blocks with trace data)
   - Sentio performs consistently well across all test cases
   - Subsquid shows fast processing but significant data gaps in block-level indexing
   - Subgraph handles trace data effectively despite traceAddress not being directly accessible

4. **Resource Efficiency**:
   - Event processing (case_1) is efficient across all indexers
   - Block-level indexing (case_3) shows dramatic performance differences between traditional approaches and Envio's HyperSync
   - RPC calls and complex data handling (case_2) increase indexing time for all indexers
   - Trace processing (case_5) demonstrates the efficiency of specialized data access methods, with Envio's HyperSync showing exceptional performance
   - While Ponder officially supports trace-level indexing, our implementation encountered persistent issues with capturing trace data despite multiple configuration attempts
