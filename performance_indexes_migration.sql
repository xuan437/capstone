-- ============================================================
-- Supabase Migration: Database Performance Indexes
-- Run this in your Supabase SQL Editor for ultra-fast query execution
-- ============================================================

-- Create indexes on students table for fast sorting and grade filtering
CREATE INDEX IF NOT EXISTS idx_students_name ON students(name);
CREATE INDEX IF NOT EXISTS idx_students_grade ON students(grade);
