# Data Files

The data files for this project have been moved to Google Drive for better storage management.

## Why We Moved the Data

- Large files in Git repositories can cause performance issues
- Git history grows indefinitely, making cloning slower
- Google Drive provides better versioning for large binary files

## How to Access the Data

1. Download the data from our [Google Drive folder](#) (add your Google Drive link here)
2. Extract the contents and place them in the corresponding data directories:
   - `case_1_lbtc_event_only/data/`
   - `case_2_lbtc_full/data/`
   - `case_3_ethereum_block/data/`
   - `case_4_on_transaction/data/`
   - `case_5_on_trace/data/`

## Data Files by Case

### Case 1: LBTC Event Only
- `envio-case1-complete.parquet`
- `ponder-case1-complete.parquet`
- `sentio-case1-complete.parquet`
- `subgraph-case1-complete.parquet`
- `subsquid-case1-complete.parquet`

### Case 2: LBTC Full
- `envio-case2-accounts.parquet`
- `envio-case2-transfers.parquet`
- `hypersync-case2-snapshots.parquet`
- `hypersync-case2-transfers.parquet`
- `ponder-case2-accounts.parquet`
- `ponder-case2-transfers.parquet`
- `sentio-case2-accounts.parquet`
- `sentio-case2-snapshots.parquet`
- `sentio-case2-transfers.parquet`
- `subgraph-case2-accounts.parquet`
- `subgraph-case2-transfers.parquet`
- `subsquid-case2-accounts.parquet`
- `subsquid-case2-transfers.parquet`

### Case 3: Ethereum Block
- `envio-case3-blocks.parquet`
- `ponder-case3-blocks.parquet`
- `sentio-case3-blocks.parquet`
- `subgraph-case3-blocks.parquet`
- `subsquid-case3-blocks.parquet`

### Case 4: On Transaction
- `envio-case4-gas-data.json`
- `envio-case4-gas-data.parquet`

### Case 5: On Trace
- `envio-case5-swap-data.parquet`

## Maintaining Data Directory Structure

To ensure that scripts can locate data files, the repository includes empty data directories with `.gitkeep` files. 