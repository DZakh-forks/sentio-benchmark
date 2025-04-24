# Block Range Standardization for Case 5

To ensure fair comparison between indexing platforms in Case 5, we've standardized the block range across all implementations.

## Standard Block Range

All platforms are now configured to use the block range from **22200000** to **22290000** (90,000 blocks).

## Platform-Specific Configurations

### Sentio
- Configuration in `sentio.yaml`:
  ```yaml
  contracts:
    - chain: "1"
      address: "0x7a250d5630b4cf539739df2c5dacb4c659f2488d"
      name: UniswapV2Router02
      startBlock: 22200000
      endBlock: 22290000
  ```

### Ponder
- Configuration in `ponder.config.ts`:
  ```typescript
  contracts: {
    UniswapV2Router02: {
      network: "ethereum",
      abi: UniswapV2Router02ABI,
      address: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
      startBlock: 22200000,
      endBlock: 22300000,
      includeCallTraces: true,
    }
  }
  ```

### Subsquid
- Configuration in `processor.ts`:
  ```typescript
  .setBlockRange({
      from: 22200000,
      to:   22290000,
  })
  ```

### Subgraph
- Configuration in `subgraph.yaml`:
  ```yaml
  source:
    address: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"
    abi: UniswapV2Router02
    startBlock: 22200000
    endBlock: 22290000
  ```

### Envio
- Configuration in `fetch-data.js`:
  ```javascript
  const START_BLOCK = 22200000;
  const END_BLOCK = 22290000;
  ```

## Download Scripts

The download scripts in the `downloads` directory have also been updated to use this standardized block range when fetching data for comparison.

## Benefits of Standardization

By using the same block range across all platforms:

1. **Fair Comparison**: All platforms are processing the exact same data, ensuring benchmarks are comparable
2. **Predictable Dataset Size**: The fixed block range provides a consistent amount of data to process
3. **Reproducible Results**: Anyone can re-run the tests and get similar results
4. **Simplified Analysis**: Consistent data simplifies comparative analysis between platforms

This standardization is crucial for our benchmarking efforts and ensures that we're truly comparing platform performance rather than differences in data volume or content. 