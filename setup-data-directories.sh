#!/bin/bash

# Script to create and prepare data directories for indexer-benchmark
# This helps users prepare the repository after cloning

# Create all required data directories
echo "Creating data directories..."
mkdir -p case_1_lbtc_event_only/data
mkdir -p case_2_lbtc_full/data
mkdir -p case_3_ethereum_block/data
mkdir -p case_4_on_transaction/data
mkdir -p case_5_on_trace/data

# Create .gitkeep files to maintain directory structure
echo "Adding .gitkeep files..."
touch case_1_lbtc_event_only/data/.gitkeep
touch case_2_lbtc_full/data/.gitkeep
touch case_3_ethereum_block/data/.gitkeep
touch case_4_on_transaction/data/.gitkeep
touch case_5_on_trace/data/.gitkeep

echo ""
echo "Data directories have been created successfully!"
echo "Please download data files from Google Drive and place them in the appropriate directories."
echo "See DATA.md for more information on which files are needed." 