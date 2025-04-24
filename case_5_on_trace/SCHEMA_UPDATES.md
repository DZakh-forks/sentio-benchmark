# Case 5 Schema Standardization

This document describes the schema standardization performed across all platforms for case 5.

## Standardized Schema

All platforms now use the following standardized schema for Uniswap V2 swap events:

| Field Name | Type | Description |
|------------|------|-------------|
| id | String | Primary key/unique identifier for the event |
| blockNumber | BigInt | Block number where the transaction was recorded |
| transactionHash | String | Hash of the transaction |
| from | String | Address initiating the swap (transaction sender) |
| to | String | Recipient address for the tokens |
| amountIn | BigInt | Input amount for the swap |
| amountOutMin | BigInt | Minimum output amount expected |
| deadline | BigInt | Transaction deadline timestamp |
| path | String | Comma-separated list of token addresses in the swap path |
| pathLength | Integer | Number of tokens in the path |

## Changes Made

### Sentio
- Updated `processor.ts` to convert path array to comma-separated string
- Added `pathLength` field
- Renamed `transaction` to `transactionHash`
- Added `from` field using transaction sender
- Updated `to` field to use recipient address instead of token

### Ponder
- Swapped meaning of `from` and `to` fields:
  - `from` now represents transaction sender
  - `to` now represents recipient address
- Ensured path is stored as comma-separated string

### Subsquid
- Created new `main.ts` processor that follows the standard schema
- Created model files with standardized fields
- Added path string conversion and length calculation

### Subgraph
- Updated `mapping.ts` to conform to standard field names
- Added transaction sender as `from` field
- Converted path array to comma-separated string
- Added `pathLength` field
- Renamed `transaction` to `transactionHash`

## Benefits of Standardization

1. **Consistent Data Format**: All platforms now store the same data in the same format, making comparison easier.
2. **Improved Path Handling**: Standardized path format as comma-separated string with pathLength for easier analytics.
3. **Clear Actor Identification**: Consistent `from` and `to` fields across all platforms.
4. **Simplified Download Scripts**: Download scripts can now use the same field names across all platforms.

## Validation

A validation script is available at `/downloads/validate-schemas.js` to check schema conformance across platforms. 