-- ============================================================
-- Supabase Migration: Automatic Password Hashing & Verification
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Enable pgcrypto Extension for bcrypt hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Trigger function to automatically hash student password on insert or update
CREATE OR REPLACE FUNCTION hash_student_password()
RETURNS TRIGGER AS $$
BEGIN
    -- Hash password using bcrypt if it is not already hashed
    IF NEW.password IS NOT NULL AND NEW.password !~ '^\$2[aby]\$' THEN
        NEW.password := crypt(NEW.password, gen_salt('bf', 10));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Attach trigger to students table
DROP TRIGGER IF EXISTS trigger_hash_student_password ON students;
CREATE TRIGGER trigger_hash_student_password
BEFORE INSERT OR UPDATE OF password ON students
FOR EACH ROW
EXECUTE FUNCTION hash_student_password();

-- 4. RPC Function to safely verify student login against hashed or plain text passwords
CREATE OR REPLACE FUNCTION verify_student_login(student_lrn TEXT, input_password TEXT)
RETURNS SETOF students AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM students
    WHERE id = student_lrn
      AND (
        password = crypt(input_password, password)
        OR password = input_password
      );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Automatically hash any existing plaintext passwords in the database
UPDATE students 
SET password = password 
WHERE password IS NOT NULL AND password !~ '^\$2[aby]\$';
