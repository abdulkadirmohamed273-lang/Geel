-- TEST QUERIES FOR PHARMACY STOCK
-- Run these queries in Supabase SQL Editor to test if everything is working

-- Test 1: Check if table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'pharmacy_stock'
) AS table_exists;

-- Test 2: Check all columns in the table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'pharmacy_stock'
ORDER BY ordinal_position;

-- Test 3: Count total items
SELECT COUNT(*) as total_items FROM pharmacy_stock;

-- Test 4: Show all items with their details
SELECT 
    id,
    medication_name,
    generic_name,
    category,
    quantity,
    unit,
    unit_price,
    status,
    CASE 
        WHEN image_url IS NOT NULL AND image_url != '' THEN 'Has Image'
        ELSE 'No Image'
    END as image_status,
    created_date
FROM pharmacy_stock
ORDER BY id DESC;

-- Test 5: Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'pharmacy_stock';

-- Test 6: Try to insert a test item
INSERT INTO pharmacy_stock (
    medication_name,
    generic_name,
    category,
    quantity,
    unit,
    unit_price,
    reorder_level,
    notes,
    created_by
) VALUES (
    'Test Medication',
    'Test Generic',
    'Test Category',
    100,
    'tablets',
    5.00,
    10,
    'This is a test item - you can delete it',
    1
)
RETURNING *;

-- Test 7: Verify the test item was added
SELECT * FROM pharmacy_stock 
WHERE medication_name = 'Test Medication'
ORDER BY created_date DESC 
LIMIT 1;

-- Test 8: Delete the test item (run this after verifying it was added)
-- DELETE FROM pharmacy_stock WHERE medication_name = 'Test Medication';

-- EXPECTED RESULTS:
-- Test 1: Should return 'true' if table exists
-- Test 2: Should show all columns including 'image_url'
-- Test 3: Should show count of items in table
-- Test 4: Should list all items with image status
-- Test 5: Should show RLS policies (should have at least one policy)
-- Test 6: Should successfully insert and return the new item
-- Test 7: Should show the test item that was just added
-- Test 8: Uncomment and run to clean up test data

-- If any test fails, there's an issue with the database setup
-- Run FIX_PHARMACY_STOCK_TABLE.sql to fix issues

