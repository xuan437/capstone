/**
 * Script to update all student LRNs to the format 120550140001, 120550140002, ...
 * Since student_id in votes/receipts is a FK, we handle updates carefully.
 */
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://kltpvuabtekkcopnfiei.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtsdHB2dWFidGVra2NvcG5maWVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5NTg2ODksImV4cCI6MjEwMTUzNDY4OX0.ct7zK50Qp76zLQ3HQM8bzISJ9G4ZgbAIBLT1OR3uCOE';
const supabase = createClient(supabaseUrl, supabaseKey);

const LRN_PREFIX = '120550140';  // 9 digits prefix, then 3 digit sequence = 12 digits total

async function main() {
  // 1. Fetch all students ordered by created_at to assign sequential LRNs
  const { data: students, error: fetchErr } = await supabase
    .from('students')
    .select('id, name, created_at')
    .order('created_at', { ascending: true });

  if (fetchErr) {
    console.error('Error fetching students:', fetchErr.message);
    return;
  }

  console.log(`Found ${students.length} students`);

  // 2. For each student, compute new LRN and update
  for (let i = 0; i < students.length; i++) {
    const student = students[i];
    const seq = String(i + 1).padStart(3, '0');
    const newLrn = LRN_PREFIX + seq; // e.g. 120550140001

    if (student.id === newLrn) {
      console.log(`[SKIP] ${student.name}: already ${newLrn}`);
      continue;
    }

    console.log(`Updating ${student.name}: ${student.id} -> ${newLrn}`);

    // Step A: Insert duplicate student row with new ID
    const { data: fullStudent, error: fetchFullErr } = await supabase
      .from('students')
      .select('*')
      .eq('id', student.id)
      .single();

    if (fetchFullErr) {
      console.error(`  Error fetching full data for ${student.name}:`, fetchFullErr.message);
      continue;
    }

    const newStudent = { ...fullStudent, id: newLrn };

    const { error: insertErr } = await supabase
      .from('students')
      .insert(newStudent);

    if (insertErr) {
      // Check if it's a conflict (newLrn already exists)
      if (insertErr.code === '23505') {
        console.warn(`  Conflict: ${newLrn} already exists, skipping insert`);
      } else {
        console.error(`  Error inserting ${newLrn}:`, insertErr.message);
        continue;
      }
    }

    // Step B: Update votes to point to new student ID
    const { error: votesErr } = await supabase
      .from('votes')
      .update({ student_id: newLrn })
      .eq('student_id', student.id);

    if (votesErr) {
      console.error(`  Error updating votes for ${student.name}:`, votesErr.message);
    }

    // Step C: Update receipts to point to new student ID
    const { error: receiptsErr } = await supabase
      .from('receipts')
      .update({ student_id: newLrn })
      .eq('student_id', student.id);

    if (receiptsErr) {
      console.error(`  Error updating receipts for ${student.name}:`, receiptsErr.message);
    }

    // Step D: Delete old student row
    const { error: deleteErr } = await supabase
      .from('students')
      .delete()
      .eq('id', student.id);

    if (deleteErr) {
      console.error(`  Error deleting old student ${student.id}:`, deleteErr.message);
    } else {
      console.log(`  Done: ${student.name} -> ${newLrn}`);
    }
  }

  console.log('\nLRN update complete!');

  // Verify
  const { data: verify, error: verErr } = await supabase
    .from('students')
    .select('id, name')
    .order('id', { ascending: true })
    .limit(10);

  if (!verErr) {
    console.log('\nFirst 10 students after update:');
    verify.forEach(s => console.log(`  ${s.id}: ${s.name}`));
  }
}

main().catch(console.error);
