-- =========================================================================
-- Supabase Migration: Remove Automatic Password Hashing For Students
-- Run this script in your Supabase SQL Editor (Dashboard -> SQL Editor)
-- to ensure student passwords remain in plain text.
-- =========================================================================

-- 1. Drop the automatic hashing trigger from the students table
DROP TRIGGER IF EXISTS trigger_hash_student_password ON students;

-- 2. Drop the hashing and verification functions
DROP FUNCTION IF EXISTS hash_student_password() CASCADE;
DROP FUNCTION IF EXISTS verify_student_login(TEXT, TEXT) CASCADE;

-- 3. Reset any existing bcrypt-hashed passwords to plain text '123456'
UPDATE students 
SET password = '123456' 
WHERE password LIKE '$2a$%' 
   OR password LIKE '$2b$%' 
   OR password LIKE '$2y$%'
   OR password LIKE '$2$%';

-- 4. Verification Check: List all students to confirm plain-text passwords
SELECT id, name, grade, section, password 
FROM students 
ORDER BY id ASC 
LIMIT 20;
