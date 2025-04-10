
PGPASSWORD="YRKZwZHCsTgVvFThgvynDcxiemFwxAPs" psql -h maglev.proxy.rlwy.net -p 48580 -U postgres -d railway


\dt "4e9e047f-0601-4497-b364-8369ad14d401".*


SET search_path TO "4e9e047f-0601-4497-b364-8369ad14d401";
SELECT COUNT(*) FROM lbtc_transfer;