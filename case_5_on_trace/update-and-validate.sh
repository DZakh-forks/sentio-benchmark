#!/bin/bash

# Script to update schema files across platforms and validate consistency

echo "==== CASE 5 SCHEMA STANDARDIZATION ===="
echo

# Track overall success
OVERALL_SUCCESS=true

# Update schema files
echo "Updating schema files across platforms..."

# Check if any files need chmod
chmod +x update-and-validate.sh

# Navigate to downloads directory and update dependencies
echo "Installing dependencies in downloads directory..."
cd downloads
npm install
echo "Dependencies installed successfully."

# Run fetch and validation scripts
echo "Fetching data from all platforms (this may take some time)..."
npm run fetch-all || OVERALL_SUCCESS=false
echo

# Run validation
echo "Validating schema consistency..."
npm run validate || OVERALL_SUCCESS=false

# Print final status
echo
if [ "$OVERALL_SUCCESS" = true ]; then
  echo "Success! All schema files have been updated and validated."
  exit 0
else
  echo "Warning: Some steps failed. Review the output for details."
  exit 1
fi 