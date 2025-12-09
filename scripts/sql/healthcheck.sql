-- Analytics Healthcheck Script
-- Verifies that all required views exist in the public schema.
-- Run this in the Supabase SQL editor to check view availability.

WITH wanted(obj, kind) AS (
  VALUES
    ('hp_base','view'),
    ('hp_summary_windows','view'),
    ('hp_return_rate_windows','view'),
    ('hp_by_period_windows','view'),
    ('hp_by_destination_windows','view'),
    ('hp_frequent_flyers_windows','view'),
    ('hp_longest_windows','view')
),
existing AS (
  SELECT c.relname::text AS obj,
         CASE c.relkind WHEN 'v' THEN 'view' WHEN 'r' THEN 'table' ELSE c.relkind::text END AS kind
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public'
)
SELECT w.obj AS object, w.kind, (e.obj IS NOT NULL) AS exists
FROM wanted w LEFT JOIN existing e ON e.obj=w.obj
ORDER BY object;
