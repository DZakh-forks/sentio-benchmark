# Uniswap V2 Swap Trace Data Collector

This project collects Uniswap V2 swap trace data using HyperSync.

## Prerequisites

- Node.js (v16+)
- npm

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Fetch trace data:
   ```bash
   npm run fetch
   ```

## Details

The script connects to the HyperSync API to retrieve traces from the Uniswap V2 Router contract. It:

1. Identifies traces that call the `swapExactTokensForTokens` function
2. Decodes the input data to extract swap parameters:
   - Token addresses
   - Input and output amounts
   - Recipient addresses
3. Records all swap details
4. Saves the data in both JSON and Parquet formats in the `data` directory

## Output

The data is saved to:
- `data/envio-case5-swap-data.json` (JSON format)
- `data/envio-case5-swap-data.parquet` (Parquet format) 