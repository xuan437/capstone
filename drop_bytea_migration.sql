-- ============================================================
-- Supabase Migration: Drop BYTEA Binary Conversions for Images
-- Run this in your Supabase SQL Editor to ensure all photo columns are standard TEXT
-- ============================================================

-- 1. Safely convert 'photo_url' column in 'students' table to TEXT if currently BYTEA
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'students' 
          AND column_name = 'photo_url' 
          AND data_type = 'bytea'
    ) THEN
        ALTER TABLE students ALTER COLUMN photo_url TYPE TEXT USING encode(photo_url, 'escape');
        RAISE NOTICE 'Converted students.photo_url from BYTEA to TEXT';
    END IF;
END $$;

-- 2. Safely convert 'image_url' column in 'candidates' table to TEXT if currently BYTEA
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'candidates' 
          AND column_name = 'image_url' 
          AND data_type = 'bytea'
    ) THEN
        ALTER TABLE candidates ALTER COLUMN image_url TYPE TEXT USING encode(image_url, 'escape');
        RAISE NOTICE 'Converted candidates.image_url from BYTEA to TEXT';
    END IF;
END $$;

-- 3. Guarantee that photo_url and image_url columns exist as standard TEXT
ALTER TABLE students ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS image_url TEXT;
