-- LearnSelf schema validation and Supabase lock investigation helpers
-- Run in Supabase SQL Editor.

-- 1) Quick existence + row count check
SELECT
  n.nspname AS schema_name,
  c.relname AS table_name,
  c.relkind AS relation_type,
  pg_total_relation_size(c.oid) AS total_bytes,
  c.reltuples::bigint AS estimated_rows
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('assignments')
ORDER BY c.relname;

-- 2) Canonical column contract for public.assignments
--    (edit expected values below if your schema intentionally differs)
WITH expected AS (
  SELECT *
  FROM (VALUES
    ('id',            'uuid',                     'NO',  'gen_random_uuid()'),
    ('user_id',       'uuid',                     'NO',  NULL),
    ('name',          'text',                     'YES', NULL),
    ('class_name',    'text',                     'YES', NULL),
    ('assigned_date', 'date',                     'YES', NULL),
    ('due_date',      'date',                     'YES', NULL),
    ('description',   'text',                     'YES', NULL),
    ('difficulty',    'USER-DEFINED',             'YES', NULL),
    ('status',        'USER-DEFINED',             'YES', NULL),
    ('created_at',    'timestamp with time zone', 'YES', 'now()')
  ) AS t(column_name, data_type, is_nullable, default_expr)
),
actual AS (
  SELECT
    c.column_name,
    c.data_type,
    c.is_nullable,
    c.column_default
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'assignments'
)
SELECT
  e.column_name,
  e.data_type              AS expected_data_type,
  a.data_type              AS actual_data_type,
  e.is_nullable            AS expected_nullable,
  a.is_nullable            AS actual_nullable,
  e.default_expr           AS expected_default_contains,
  a.column_default         AS actual_default,
  CASE
    WHEN a.column_name IS NULL THEN 'MISSING COLUMN'
    WHEN e.data_type <> a.data_type THEN 'TYPE MISMATCH'
    WHEN e.is_nullable <> a.is_nullable THEN 'NULLABILITY MISMATCH'
    WHEN e.default_expr IS NOT NULL AND COALESCE(a.column_default, '') NOT ILIKE '%' || e.default_expr || '%' THEN 'DEFAULT MISMATCH'
    ELSE 'OK'
  END AS status
FROM expected e
LEFT JOIN actual a USING (column_name)
UNION ALL
SELECT
  a.column_name,
  NULL,
  a.data_type,
  NULL,
  a.is_nullable,
  NULL,
  a.column_default,
  'EXTRA COLUMN'
FROM actual a
LEFT JOIN expected e USING (column_name)
WHERE e.column_name IS NULL
ORDER BY 1;

-- 3) PK/FK/index visibility
SELECT
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name AS foreign_table,
  ccu.column_name AS foreign_column
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
 AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage ccu
  ON tc.constraint_name = ccu.constraint_name
 AND tc.table_schema = ccu.table_schema
WHERE tc.table_schema = 'public'
  AND tc.table_name = 'assignments'
ORDER BY tc.constraint_type, tc.constraint_name, kcu.ordinal_position;

SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'assignments'
ORDER BY indexname;

-- 4) RLS + policies sanity (important in Supabase)
SELECT
  schemaname,
  tablename,
  rowsecurity,
  forcerowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'assignments';

SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'assignments'
ORDER BY policyname;

-- 5) Trigger/function inventory touching assignments
SELECT
  t.tgname,
  p.proname AS function_name,
  n.nspname AS function_schema,
  pg_get_triggerdef(t.oid, true) AS trigger_def
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_proc p ON p.oid = t.tgfoid
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE c.relname = 'assignments'
  AND NOT t.tgisinternal
ORDER BY t.tgname;

-- 6) Search for advisory lock usage or your lock string in DB code
SELECT
  n.nspname AS schema_name,
  p.proname AS function_name,
  CASE
    WHEN pg_get_functiondef(p.oid) ILIKE '%lock:learnself-auth-v1%' THEN 'mentions lock string'
    WHEN pg_get_functiondef(p.oid) ILIKE '%pg_advisory_lock%' THEN 'uses pg_advisory_lock'
    WHEN pg_get_functiondef(p.oid) ILIKE '%pg_try_advisory_lock%' THEN 'uses pg_try_advisory_lock'
    ELSE 'other'
  END AS match_reason
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE pg_get_functiondef(p.oid) ILIKE '%lock:learnself-auth-v1%'
   OR pg_get_functiondef(p.oid) ILIKE '%pg_advisory_lock%'
   OR pg_get_functiondef(p.oid) ILIKE '%pg_try_advisory_lock%'
ORDER BY 1,2;

-- 7) Active advisory locks (point-in-time)
SELECT
  l.pid,
  a.usename,
  a.application_name,
  a.client_addr,
  a.state,
  a.query_start,
  a.query,
  l.locktype,
  l.mode,
  l.granted,
  l.classid,
  l.objid,
  l.objsubid
FROM pg_locks l
JOIN pg_stat_activity a ON a.pid = l.pid
WHERE l.locktype = 'advisory'
ORDER BY l.granted DESC, a.query_start DESC;
