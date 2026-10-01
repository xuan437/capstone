-- Migration script to remove Grade 7 Representative for candidate positions and rename Sgt. At Arms to Public Officer in Supabase.
-- Run this script in your Supabase SQL Editor.

-- 1. Remove Grade 7 Representative candidates from the candidates table
DELETE FROM candidates 
WHERE position = 'Gr 7 Representative' 
   OR position = 'Grade 7 Representative';

-- 2. Remove any votes cast for Grade 7 Representative from the votes table
DELETE FROM votes 
WHERE position = 'Gr 7 Representative' 
   OR position = 'Grade 7 Representative';

-- 3. Update position name from Sgt. At Arms to Public Officer in the candidates table
UPDATE candidates 
SET position = 'Public Officer' 
WHERE position = 'Sgt. At Arms' 
   OR position = 'Sgt. at Arms' 
   OR position = 'Sergeant at Arms';

-- 4. Update position name from Sgt. At Arms to Public Officer in the votes table
UPDATE votes 
SET position = 'Public Officer' 
WHERE position = 'Sgt. At Arms' 
   OR position = 'Sgt. at Arms' 
   OR position = 'Sergeant at Arms';
