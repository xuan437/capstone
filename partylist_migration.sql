-- Migration: Add Partylists support
-- Run this script in your Supabase SQL Editor.

-- 1. Create 'partylists' table
CREATE TABLE IF NOT EXISTS partylists (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL UNIQUE,
    code TEXT,
    color TEXT DEFAULT '#2563EB',
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add 'partylist' column to candidates table if it doesn't exist
ALTER TABLE candidates 
ADD COLUMN IF NOT EXISTS partylist TEXT;

-- 3. Enable RLS and permissive public policies for partylists
ALTER TABLE partylists ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'partylists' AND policyname = 'Enable read for everyone'
    ) THEN
        CREATE POLICY "Enable read for everyone" ON partylists FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'partylists' AND policyname = 'Enable insert for everyone'
    ) THEN
        CREATE POLICY "Enable insert for everyone" ON partylists FOR INSERT WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'partylists' AND policyname = 'Enable update for everyone'
    ) THEN
        CREATE POLICY "Enable update for everyone" ON partylists FOR UPDATE USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'partylists' AND policyname = 'Enable delete for everyone'
    ) THEN
        CREATE POLICY "Enable delete for everyone" ON partylists FOR DELETE USING (true);
    END IF;
END $$;

-- 4. Seed initial default student partylists if table is empty
INSERT INTO partylists (name, code, color, description)
VALUES 
    ('SANDIGAN', 'SDG', '#2563EB', 'Samahan ng Demokratiko at Makabagong Mag-aaral - Focused on transparent leadership, digital governance, and student empowerment.'),
    ('TAGUMPAY', 'TGP', '#059669', 'Tapat at May Dangal na Pamumuno - Advocating for student welfare, mental health, and inclusive campus programs.'),
    ('ALAB', 'ALB', '#DC2626', 'Alyansa ng Lider-Kabataan para sa Aktibong Bukas - Committed to extracurricular excellence, innovation, and leadership training.')
ON CONFLICT (name) DO NOTHING;

-- 5. Create index for fast name lookup
CREATE INDEX IF NOT EXISTS idx_partylists_name ON partylists(name);
CREATE INDEX IF NOT EXISTS idx_candidates_partylist ON candidates(partylist);
