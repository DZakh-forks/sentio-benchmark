# benchmark:

case_1_lbtc_event_only
This benchmark focuses on indexing transfer events from the LBTC token contract from block 0 to 22200000. It represents a simple event indexing scenario with the following characteristics:
Only processes Transfer events
No RPC calls to external services
Write-only operations (no read operations after writing)
Tests the indexer's ability to efficiently process and store a large number of events
All data is derived directly from event logs without additional computation
case_2_lbtc_full
This benchmark indexes LBTC token transfer events and performs balanceOf RPC calls from block 22100000 to 22200000. It represents a more complex scenario with:
Processes Transfer events
Makes RPC calls to fetch token balances using contract.balanceOf()
Performs read-after-write operations
Creates snapshots of account balances
Tests the indexer's ability to manage both event data and RPC call results
Evaluates performance when combining on-chain data with additional queries
case_3_ethereum_block
This benchmark focuses on processing Ethereum blocks from 0 to 10000000, creating entities for each block with its metadata. Key characteristics include:
Uses block handlers instead of event handlers
No specific contract focus - processes all blocks
Creates block entities with block metadata (number, hash, timestamp, etc.)
Tests the indexer's ability to process large volumes of block data
Evaluates performance for block-level indexing scenarios
Note: Envio does not support block handlers, so it cannot be tested in this case
These benchmarks provide a comprehensive evaluation of different indexing patterns, from simple event indexing to complex scenarios with external calls and block-level processing.



README.md
  Link to latest benchmark result

 - test methodology
  - test timeout
 - how do we de sign test case
  - chain:
  - data type: event/block/transaction
  - rpc call: do we have rpc call (if platform doens't have builtin rpc support, we use alchemy growth tier for xxx)
  - write pattern: do we have read after write pattern

 indexers:
  - sentio
  - envio
  - ponder
  - Subsquid
  - subgraph
  - subgraph (goldsky)
  - subgraph (sentio)

   suportted chains
      evm    |  sui  | move | starknet  | cosmos
   x
   y
   z

   features
      event handler   |   block handler | move | starknet  | cosmos



benchmark_result_2025_2_5.md


test data 

performance

| Metric | Sentio | Envio | Ponder | Subsquid | Subgraph |
|--------|--------|-------|--------|----------|----------|
| case_1_lbtc_event_only | 6m | 2m | 1h40m | 10m | 3h9m |
| # records up to block 22210921 | 296734 | 296734 | 296138 | 296734 | 296734 |
| case_2_lbtc_full | 27m | 45m | 4h38m | 32m | 18h38m |
| case_3_ethereum_block | 4m | - | 55h37m | 45h | 24h |

* to 22200000
* startBlock: 22100000, endBlock: 22200000
* to 10000000

sentio:
1. 14:01:54-14:02:03

sqd:
1. 11:02:14-11:10:43
2. 14:06:47-14:40:34
3. 14:21:04-


11:02:14-11:10:43
10:40:29-10:48:28
* Not Available
-18:41:49

benchmark_result_2025_3_5.md
...