# Standardized Schema for Case 5 - Uniswap V2 Swaps

This document defines the standardized schema format that all platforms should follow for consistency in the case 5 benchmark.

## Core Fields (Required in all implementations)

| Field Name | Type | Description |
|------------|------|-------------|
| id | String | Primary key/unique identifier for the event |
| blockNumber | BigInt | Block number where the transaction was recorded |
| transactionHash | String | Hash of the transaction |
| from | String | Address initiating the swap |
| to | String | Recipient address for the tokens |
| amountIn | BigInt | Input amount for the swap |
| amountOutMin | BigInt | Minimum output amount expected |
| deadline | BigInt | Transaction deadline timestamp |
| path | String | Comma-separated list of token addresses in the swap path |
| pathLength | Integer | Number of tokens in the path |

## Platform Implementation Notes

1. All numeric blockchain values (amounts, block numbers) should use BigInt (or equivalent)
2. All address fields should be stored in lowercase for consistent comparison
3. Path should be stored as a comma-separated string for consistent serialization
4. When exporting to Parquet, large numbers should be stored as strings to maintain precision

## Parquet Schema

When exporting to Parquet, use the following schema:

```javascript
const swapSchema = new parquet.ParquetSchema({
  id: { type: 'UTF8' },
  blockNumber: { type: 'INT64' },
  transactionHash: { type: 'UTF8' },
  from: { type: 'UTF8' },
  to: { type: 'UTF8' },
  amountIn: { type: 'UTF8' },  // Store as strings to maintain precision
  amountOutMin: { type: 'UTF8' },
  deadline: { type: 'UTF8' },
  path: { type: 'UTF8' },
  pathLength: { type: 'INT32' }
});
``` 