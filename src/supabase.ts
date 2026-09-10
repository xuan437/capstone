import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kltpvuabtekkcopnfiei.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtsdHB2dWFidGVra2NvcG5maWVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5NTg2ODksImV4cCI6MjEwMTUzNDY4OX0.ct7zK50Qp76zLQ3HQM8bzISJ9G4ZgbAIBLT1OR3uCOE';

// Robust fetch with 15-second AbortController timeout for slow 2G/3G connections
const customFetch = (url: RequestInfo | URL, options?: RequestInit) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  return fetch(url, {
    ...options,
    signal: options?.signal || controller.signal,
  }).finally(() => clearTimeout(timeoutId));
};

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    fetch: customFetch,
  },
});




