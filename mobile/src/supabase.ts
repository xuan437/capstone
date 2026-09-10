import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Candidate, Student, AuditLog } from './types';

const supabaseUrl = 'https://kltpvuabtekkcopnfiei.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtsdHB2dWFidGVra2NvcG5maWVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5NTg2ODksImV4cCI6MjEwMTUzNDY4OX0.ct7zK50Qp76zLQ3HQM8bzISJ9G4ZgbAIBLT1OR3uCOE';

// Robust fetch with 15-second AbortController timeout for mobile connections
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
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: {
    fetch: customFetch,
  },
});

export const logAuditAction = async (action: string, performedBy: string, details: string, target?: string) => {
  try {
    await supabase.from('audit_logs').insert([
      {
        action,
        user_name: performedBy,
        target: target || 'System',
        details,
        created_at: new Date().toISOString(),
      },
    ]);
  } catch (err) {
    console.warn('Audit logging error:', err);
  }
};

export const fetchAuditLogs = async (): Promise<AuditLog[]> => {
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    return (data || []).map(log => ({
      id: String(log.id),
      user_name: log.user_name || log.performed_by || 'System',
      action: log.action || 'Action',
      target: log.target || 'General',
      details: log.details || '',
      created_at: log.created_at,
    }));
  } catch (err) {
    console.warn('Error fetching audit logs:', err);
    return [];
  }
};

export const fetchCandidatesWithVotes = async (): Promise<Candidate[]> => {
  const [candidatesRes, votesRes] = await Promise.all([
    supabase.from('candidates').select('*'),
    supabase.from('votes').select('candidate_id'),
  ]);

  if (candidatesRes.error) throw candidatesRes.error;

  const candidatesData = candidatesRes.data || [];
  const votesData = votesRes.data || [];

  const voteCounts: Record<string, number> = {};
  votesData.forEach(v => {
    if (v.candidate_id) {
      voteCounts[v.candidate_id] = (voteCounts[v.candidate_id] || 0) + 1;
    }
  });

  return candidatesData.map(c => ({
    id: String(c.id),
    name: c.name,
    position: c.position,
    campaign_text: c.campaign_text || c.platform || '',
    platform: c.campaign_text || c.platform || '',
    image_url: c.image_url || c.photo_url || '',
    photo_url: c.image_url || c.photo_url || '',
    grade: c.grade || 'N/A',
    section: c.section || 'N/A',
    age: c.age || 0,
    votes: voteCounts[c.id] || 0,
    vote_count: voteCounts[c.id] || 0,
  }));
};

export const submitVoteTransaction = async (
  studentId: string,
  selectedCandidates: Record<string, string>,
  locationText: string = 'Mobile App Submission'
) => {
  const votedAt = new Date().toISOString();

  // 1. Prepare vote records
  const voteInserts = Object.entries(selectedCandidates).map(([position, candidateId]) => ({
    student_id: studentId,
    candidate_id: candidateId,
    position,
    voted_at: votedAt,
    location: locationText,
  }));

  // 2. Insert into votes table
  const { error: votesErr } = await supabase.from('votes').insert(voteInserts);
  if (votesErr) throw votesErr;

  // 3. Mark student has_voted = true
  const { error: studentErr } = await supabase
    .from('students')
    .update({
      has_voted: true,
      voted_at: votedAt,
      vote_location: locationText,
    })
    .eq('id', studentId);
  if (studentErr) throw studentErr;

  // 4. Generate & Save Receipt
  const receiptCode = `SSLG-VOTE-${studentId}-${Date.now().toString(36).toUpperCase()}`;
  await supabase.from('receipts').insert([
    {
      student_id: studentId,
      receipt_data: JSON.stringify({
        receiptCode,
        votedAt,
        location: locationText,
        selections: selectedCandidates,
      }),
    },
  ]);

  // 5. Audit Log
  await logAuditAction('CAST_VOTE', `Student ${studentId}`, `Ballot submitted for ${Object.keys(selectedCandidates).length} positions`, studentId);

  return receiptCode;
};
