# Case 2: LBTC Full Indexing Benchmark

This benchmark tests the performance of various indexers when processing Transfer events and making RPC calls to fetch token balances from the LBTC token contract.

## Benchmark Specification

- **Target Contract**: LBTC Token (0x8236a87084f8B84306f72007F36F2618A5634494)
- **Events Indexed**: Transfer events
- **Block Range**: 22100000 to 22200000
- **Data Operations**: Read-after-write (fetching balances after processing transfers)
- **RPC Calls**: balanceOf() to fetch token balances for each address involved in transfers
- **Dataset**: [Google Drive](https://drive.google.com/drive/u/0/folders/1YV_xhTYViVaCiqXgEgPDDjoWb9s8QLMZ)

## Implementation Details

The benchmark requires each indexer to:
1. Listen for `Transfer(address indexed from, address indexed to, uint256 value)` events
2. Create a record for each Transfer event
3. Make RPC calls to fetch the current balance of both the sender and receiver
4. Create snapshot records with account balances
5. Update account records with latest balances and timestamps

This benchmark tests the ability of indexers to not only process events but also to make external RPC calls and manage more complex data relationships.

## Platform-Specific Implementation Details

Each platform handles periodic updates differently:

1. **Points Calculation**
   - All platforms calculate points whenever new transfers occur
   - This ensures real-time point updates for all accounts

2. **Periodic Updates**
   - **Sentio**: 
     - Features both `onTimeInterval` and `onBlockInterval` functionalities (`onTimeInterval` is exclusive to Sentio)
     - Dual-interval system:
       - Historical interval: For speedy catchup of past data
       - Ongoing interval: For prompt updates of new data
     - This dual approach enables:
       - Faster historical data processing
       - Real-time updates for new events
     - Example: Daily intervals for history + hourly intervals for ongoing updates
     - Other platforms must implement their own interval tracking mechanisms or rely on block intervals to mimic `onTimeInterval`

   - **Envio**: 
     - No built-in `onTimeInterval` or `onBlockInterval`
     - Implements global update timestamp in transfer handler
     - Updates on hourly basis within the handler

   - **Ponder**: 
     - Approximates time interval updates using fixed block intervals
     - Relies on block-based handler

   - **Subsquid**: 
     - Block-based starting points for all indexers
     - Implements global updates inside the processing loop
     - Uses fixed time intervals for updates

   - **Subgraph**: 
     - Uses `handleBlock` for periodic updates
     - Configurable block intervals in `subgraph.yaml`
     - Block-based scheduling approach

## Performance Results

### Latest Benchmark Results (Block Range: 22400000 - 22500000)

| Indexer | Duration | Records | RPC Time | Compute Time | Storage Time |
|---------|----------|---------|-----------|-------------|--------------|
| Sentio (timeInterval) | 7m | 7,634 | 181.12s | 0.55s | 53666.13s |
| Sentio (blockInterval) | 5m | 7,634 | 149.48s | 0.75s | 55715.68s |
| Ponder | 45m | 7,634 | 2401.97s | 0.26s | 83.49s |
| Envio | 3m | 7,634 | 136425.85s | 294926.20s | 337790.82s |
| Sqd | 34m | 7,634 | 1770.73s | 0.88s | 56268.61s |
| Subgraph | 1h3m | 7,634 | - | - | - |
| Sentio Subgraph | 56m | 7,634 | - | - | - |

### Performance Analysis

1. **RPC Performance**:
   - Sentio shows the most efficient RPC handling with both modes under 200s
   - Ponder demonstrates good RPC performance at 2401.97s
   - Sqd maintains moderate RPC time at 1770.73s
   - Envio shows the highest RPC time at 136425.85s
   - Note: Subgraph does not support `performance.now()` or `Date.now()` for time measurement, so detailed timing metrics are not available

2. **Compute Performance**:
   - All platforms show very fast compute times (under 1s) except Envio
   - Envio's compute time (294926.20s) is significantly higher due to:
     - Double counting of calculation time for each transfer (both sender and receiver)
     - Accumulation of calculation time in hourly updates
     - Reuse of timing variables in batch processing
   - Note: Envio's timing metrics are accumulated across all operations and may include double counting due to its unique batch processing architecture
   - Sentio's compute time is consistent between modes (0.55s vs 0.75s)
   - Note: Subgraph's compute time cannot be measured due to timing API limitations

3. **Storage Performance**:
   - Envio shows the highest storage time (337790.82s)
   - Note: Envio's storage time includes accumulated time across all operations, including parallel processing and batch updates
   - Sentio's storage time is high but consistent between modes (53666.13s vs 55715.68s)
   - Ponder demonstrates excellent storage performance at 83.49s
   - Sqd shows moderate storage time at 56268.61s
   - Note: Subgraph's storage operations cannot be timed due to timing API limitations

4. **Total Duration**:
   - Sentio's blockInterval mode is fastest at 5m
   - Envio follows at 3m despite high individual component times
   - Note: Envio's high component times (RPC, Compute, Storage) are accumulated across all operations and may include double counting, but its total duration is accurate
   - Ponder shows good overall performance at 45m
   - Sqd completes in 34m
   - Subgraph and Sentio Subgraph take longer at 1h3m and 56m respectively
   - Note: Subgraph's total duration is measured from deployment to completion, as internal timing is not available

### Key Observations

1. **Platform Strengths**:
   - Sentio: Best RPC performance and consistent compute times
   - Ponder: Excellent storage performance and balanced metrics
   - Envio: Fast total duration despite high component times, with unique batch processing architecture
   - Sqd: Good balance between RPC and compute times
   - Subgraph: Limited timing capabilities but provides reliable total duration measurements

2. **Architectural Differences**:
   - Sentio's dual-mode system (timeInterval/blockInterval) provides flexibility
   - Envio's architecture prioritizes total duration over individual component times, with accumulated timing metrics that may include double counting
   - Ponder's architecture shows strong storage optimization
   - Sqd maintains consistent performance across all metrics
   - Subgraph's architecture does not support fine-grained timing measurements

3. **Data Consistency**:
   - All platforms processed exactly 7,634 records
   - Perfect correlation in point calculations between platforms
   - Consistent data coverage across all implementations
   - Note: While Subgraph's timing metrics are limited, its data consistency matches other platforms

## Implementation Examples

Each subdirectory contains the implementation for a specific indexing platform:
- `/sentio`: Sentio implementation 
- `/envio`: Envio implementation
- `/ponder`: Ponder implementation
- `/sqd`: Subsquid implementation
- `/subgraph`: The Graph subgraph implementation

## Running the Benchmark

Each implementation includes its own setup and execution instructions. Generally, you will need to:

1. Install the required dependencies
2. Configure RPC endpoints with adequate rate limits
3. Start the indexer
4. Monitor progress
5. Record completion time

## Key Observations

- Adding RPC calls significantly increases indexing time across all platforms
- Sentio maintains the best performance with complex operations
- Ponder and Subgraph show substantial performance degradation with RPC calls
- Subsquid handles the additional complexity relatively well
- The read-after-write pattern creates additional processing overhead for all indexers

This benchmark showcases how performance is affected when indexers need to both process events and interact with the blockchain to fetch additional data, a common pattern in many dApp backends.

## Access Information

### Exported Data
All the transfer event data and balances collected from each platform have been exported and is available via Google Drive:
- **Google Drive Folder**: [Case 2 - LBTC Full Data](https://drive.google.com/drive/u/0/folders/1YV_xhTYViVaCiqXgEgPDDjoWb9s8QLMZ)
- Contains datasets with transfer events and account balances from all platforms
- Includes comparative analysis and benchmark results

### Sentio
- **Dashboard URL**: https://app.sentio.xyz/yufei/case_2_lbtc_full/data-explorer/sql
- **API Access**: 
  ```
  READ_ONLY KEY: hnZ7Z8cRsoxRadrVdhih2jRjBlH0lIYWl
  curl -L -X POST 'https://app.sentio.xyz/api/v1/analytics/yufei/case_2_lbtc_full/sql/execute' \
     -H 'Content-Type: application/json' \
     -H 'api-key: hnZ7Z8cRsoxRadrVdhih2jRjBlH0lIYWl' \
     --data-raw '{
       "sqlQuery": {
         "sql": "YOUR_QUERY_HERE"
       }
     }'
  ```
- **Data Summary**:
  - **Transfer Records**: Approximately 12,165 records
  - **Account Records**: Approximately 2,684 accounts
  - **Points Records**: Approximately 44,700 point_updates

### Envio
- **Dashboard URL**: https://envio.dev/app/0xdatapunk/case_2_lbtc_full
- **GraphQL Endpoint**: https://indexer.dev.hyperindex.xyz/6b5188a/v1/graphql
- **RPC Provider**: Using Sentio's RPC endpoint for blockchain interactions
- **Data Summary**:
  - **Transfer Records**: Approximately 12,165 records
  - **Block Range**: 22100049 to 22199998
  - **Account Records**: Approximately 2,685 accounts
  - **Snapshot Records**: Approximately 16,338 snapshots
  - **Timestamps**: Range from 1742618075 to 1743823319 (Unix millisecond timestamps)

### Sentio Subgraph
- **Dashboard URL**: https://app.sentio.xyz/yufei/case_2_lbtc_full_subgraph/data-explorer/sql
- **API Access**:
  ```
  READ_ONLY KEY: hnZ7Z8cRsoxRadrVdhih2jRjBlH0lIYWl
  curl -L -X POST 'https://app.sentio.xyz/api/v1/analytics/yufei/case_2_lbtc_full_subgraph/sql/execute' \
     -H 'Content-Type: application/json' \
     -H 'api-key: hnZ7Z8cRsoxRadrVdhih2jRjBlH0lIYWl' \
     --data-raw '{
       "sqlQuery": {
         "sql": "YOUR_QUERY_HERE"
       }
     }'
  ``` 

## Performance Comparison (Block Range: 22400000 - 22500000)

| Indexer | Duration | Records | RPC Time | Compute Time | Storage Time |
|---------|----------|---------|-----------|-------------|--------------|
| Sentio  | 6m       | 7,634   | 183.87s   | 1.40s       | 12604.55s   |
| Ponder  | 1h4m     | 7,634   | 3620.03s  | 0.27s       | 68.91s      |
| Envio   | 2m       | 7,634   | 153219.90s| 0.14s       | 8.12s       |
| Sqd     | 1h39m    | 7,634   | 5883.05s  | 2.06s       | 7.44s       |

### Notes:
- All indexers processed the same number of records (7,634)
- Envio had the fastest total duration but highest RPC time
- Sqd had the lowest storage time
- Ponder had balanced performance across all metrics
- Sentio had the highest storage time but moderate RPC time
