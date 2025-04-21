# Uniswap V2 Trace Subgraph

This subgraph indexes traces from the Uniswap V2 Router, specifically capturing `swapExactTokensForTokens` function calls and storing detailed information about the swaps.

## Overview

The trace monitoring approach allows the subgraph to capture *all* interactions with the Uniswap V2 Router, including those made through proxies and other contracts that might not emit events. This provides a more comprehensive view of Uniswap V2 activity compared to only monitoring events.

## Features

- Monitors transaction traces to Uniswap V2 Router
- Decodes `swapExactTokensForTokens` function calls
- Extracts detailed swap information:
  - Input/output tokens
  - Amounts
  - Sender and recipient
  - Transaction metadata
- Creates token entities to track tokens involved in swaps

## Technical Architecture

### Entities

1. **SwapExactTokensForTokens**
   - Stores information about each swap transaction
   - Includes transaction details, token addresses, amounts, timestamps

2. **Token**
   - Tracks tokens used in swaps
   - Maintains relationships with swaps via virtual fields

### Trace Processing

The subgraph uses transaction handlers to process transaction traces:

1. Filters transactions with traces to the Uniswap V2 Router
2. Identifies function calls by signature (function selector)
3. Decodes input data to extract swap parameters
4. Creates and links entities in the database

## Comparison with Event-Based Approaches

Traditional subgraphs typically rely on events emitted by contracts. This trace-based approach offers several advantages:

- **Complete coverage**: Captures all function calls, even if they don't emit events
- **Internal transaction visibility**: Sees through proxy patterns and internal contract interactions
- **Function parameter access**: Direct access to all function parameters, not just those included in events

## Installation & Setup

1. Install the Graph CLI:
```bash
npm install -g @graphprotocol/graph-cli
```

2. Install dependencies:
```bash
npm install
```

3. Generate AssemblyScript types:
```bash
npm run codegen
```

4. Build the subgraph:
```bash
npm run build
```

## Deployment

### Local Deployment

```bash
# Start a local Graph Node
docker-compose up

# Create and deploy the subgraph locally
npm run create-local
npm run deploy-local
```

### Hosted Service Deployment

```bash
# Deploy to the Graph's hosted service (requires authentication)
npm run deploy
```

## Implementation Notes

### Trace Decoding

The Graph Protocol doesn't provide native ABI decoding for trace data. The mapping.ts file implements a manual decoding approach for extracting parameters from the raw transaction input data, following the Solidity ABI specification.

### Performance Considerations

- Transaction trace handling can be more resource-intensive than event handling
- The subgraph focuses on a specific function signature to improve efficiency
- Consider adjusting the startBlock in subgraph.yaml based on your needs

## Query Examples

Query for recent swaps:

```graphql
{
  swapExactTokensForTokenses(first: 10, orderBy: blockNumber, orderDirection: desc) {
    id
    txHash
    from
    tokenIn
    tokenOut
    amountIn
    amountOutMin
    recipient
    blockNumber
    timestamp
  }
}
```

Query for a specific token's swaps:

```graphql
{
  token(id: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48") {
    address
    swapsIn {
      id
      txHash
      amountIn
      tokenOut
    }
    swapsOut {
      id
      txHash
      amountOutMin
      tokenIn
    }
  }
}
```

## License

This project is licensed under the MIT License - see the LICENSE file for details. 