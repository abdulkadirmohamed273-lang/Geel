-- Fix Patient Delete Permissions
-- Run this in Supabase SQL Editor if patient deletion is not working

-- 1. Check current RLS status
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'patients';

-- 2. Disable RLS temporarily (if needed for testing)
ALTER TABLE patients DISABLE ROW LEVEL SECURITY;

-- 3. Grant DELETE permission to all roles
GRANT DELETE ON patients TO anon;
GRANT DELETE ON patients TO authenticated;
GRANT DELETE ON patients TO public;

-- 4. If RLS is enabled, create a policy that allows deletion
-- (Uncomment and adjust based on your security needs)

-- Policy for authenticated users to delete patients
-- CREATE POLICY "Allow authenticated users to delete patients"
-- ON patients
-- FOR DELETE
-- TO authenticated
-- USING (true);

-- Policy for anon users to delete patients (if needed)
-- CREATE POLICY "Allow anon users to delete patients"
-- ON patients
-- FOR DELETE
-- TO anon
-- USING (true);

-- 5. Verify permissions
SELECT 
    grantee, 
    privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name = 'patients' AND privilege_type = 'DELETE';

