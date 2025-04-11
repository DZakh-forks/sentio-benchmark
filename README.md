# benchmark:

case_1_lbtc_event_only
 - README.md: description, features: event, no rpc call, write only
 - sentio
 - envio
 - ponder
case_2_lbtc_full
    transfer+balanceOf 22210000-22239000

 - README.md: description, features: event, rpc call, read after write

case_3_ethereum_block: 0-10000000,
  onBlockHandler -> entity

  envio has no block handlers




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
 ------              |  sentio    | envio | ponder
  lbtc_event_only    |    3ns     |       |  7m (missing 5% data)
  lbtc_full          |

| Metric | Sentio | Envio | Ponder | Subsquid | Subgraph |
|--------|--------|-------|--------|----------|----------|
| case_1_lbtc_event_only | 8m | 3m | 76m | 8m | 4h |
|   # records up to block 22210921 | 296734 | 296734 | 296138 | 296734 | 296734 |
| case_2_lbtc_full  | 12m | 40m | - | 34m | - |
| case_3_ethereum_block | 11m | * | - | - | - |

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