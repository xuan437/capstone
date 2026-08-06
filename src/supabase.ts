import { createClient } from '@supabase/supabase-js';

// Consider moving these to a .env file (e.g., import.meta.env.VITE_SUPABASE_URL)
const supabaseUrl = 'https://kltpvuabtekkcopnfiei.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtsdHB2dWFidGVra2NvcG5maWVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5NTg2ODksImV4cCI6MjEwMTUzNDY4OX0.ct7zK50Qp76zLQ3HQM8bzISJ9G4ZgbAIBLT1OR3uCOE';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Convert a browser File into a Uint8Array for Supabase storage uploads
export async function fileToUint8Array(file: File): Promise<Uint8Array> {
  const buffer = await file.arrayBuffer();
  return new Uint8Array(buffer);
}

// Convert a photo File into binary (Uint8Array)
// Useful if you want to inspect/transform bytes before uploading.
export async function photoToBinary(file: File): Promise<Uint8Array> {
  return fileToUint8Array(file);
}



