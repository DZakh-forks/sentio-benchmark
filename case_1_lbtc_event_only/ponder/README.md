# Connect to the database
PGPASSWORD="IaYFUoJeDdJXgiTXXXOZmaNkjjXjkBZJ" psql -h shinkansen.proxy.rlwy.net -p 29835 -U postgres -d railway

# Once connected, set the search path to include the Ponder schema
SET search_path TO "dd7eb67f-c91a-4359-a6a7-fc1fdf31c305";


# Count records in the lbtc_transfer table
SELECT COUNT(*) FROM lbtc_transfer where block_number<= 22210921;

# View some sample data
SELECT * FROM lbtc_transfer LIMIT 10;