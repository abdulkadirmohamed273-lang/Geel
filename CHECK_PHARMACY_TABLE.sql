-- Quick check to see what's wrong with pharmacy_stock table
-- Copy and run this in Supabase SQL Editor

-- 1. Check if table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'pharmacy_stock'
) AS table_exists;

-- 2. Check what columns exist
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'pharmacy_stock'
ORDER BY ordinal_position;

-- 3. Check RLS status and policies
SELECT 
    schemaname, 
    tablename, 
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'pharmacy_stock';

-- 4. List all RLS policies
SELECT 
    policyname,
    permissive,
    roles,
    cmd as command,
    qual as using_expression,
    with_check as check_expression
FROM pg_policies
WHERE tablename = 'pharmacy_stock';

-- 5. Try a simple insert to see the exact error
-- (This will fail, but shows the exact error message)
INSERT INTO pharmacy_stock (
    medication_name,
    quantity
) VALUES (
    'Test Item',
    10
);

-- EXPECTED ISSUES:
-- - Table doesn't exist = Run CREATE_PHARMACY_STOCK_TABLE.sql
-- - No columns shown = Table doesn't exist
-- - RLS enabled but no policies = Run FIX_PHARMACY_STOCK_TABLE.sql
-- - Insert fails with specific error = That's the issue to fix

