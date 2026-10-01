-- Migration: Remove automatic password hashing trigger and function from students table
-- Run this in your Supabase SQL Editor to store student passwords as plain text.

-- 1. Drop trigger if it exists
DROP TRIGGER IF EXISTS trigger_hash_student_password ON students;

-- 2. Drop hashing helper functions if they exist
DROP FUNCTION IF EXISTS hash_student_password();
DROP FUNCTION IF EXISTS verify_student_login(TEXT, TEXT);

-- 3. Reset all existing hashed passwords (starting with '$2a$') to plain text '123456'
UPDATE students 
SET password = '123456' 
WHERE password LIKE '$2a$%';
