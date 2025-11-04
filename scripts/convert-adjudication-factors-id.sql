-- Convert announcement_id column from bigint to integer in adjudication_factors table
-- WARNING: This will fail if any announcement_id values exceed the integer range (2,147,483,647)

-- First, check if there are any values that would be out of range for integer
-- Run this first to verify:
SELECT COUNT(*) 
FROM diario_republica.adjudication_factors 
WHERE announcement_id > 2147483647 OR announcement_id < -2147483648;

-- If the above returns 0, you can proceed with the conversion:

-- Step 1: Drop the index if it exists
DROP INDEX IF EXISTS diario_republica.idx_adjudication_factors_announcement_id;

-- Step 2: Convert the column type from bigint to integer
ALTER TABLE diario_republica.adjudication_factors 
ALTER COLUMN announcement_id TYPE INTEGER USING announcement_id::integer;

-- Step 3: Recreate the index
CREATE INDEX idx_adjudication_factors_announcement_id 
ON diario_republica.adjudication_factors(announcement_id);

-- Verify the change
SELECT column_name, data_type, udt_name 
FROM information_schema.columns 
WHERE table_schema = 'diario_republica' 
  AND table_name = 'adjudication_factors' 
  AND column_name = 'announcement_id';

