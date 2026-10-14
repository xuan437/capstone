/**
 * Script to:
 * 1. Set all student ages to a random value between 16 and 20
 * 2. Rename section "Sampaguita" -> "Bautista" for all matching students
 */
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = "https://kltpvuabtekkcopnfiei.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtsdHB2dWFidGVra2NvcG5maWVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5NTg2ODksImV4cCI6MjEwMTUzNDY4OX0.ct7zK50Qp76zLQ3HQM8bzISJ9G4ZgbAIBLT1OR3uCOE";
const supabase = createClient(supabaseUrl, supabaseKey);

function randomAge() {
  return Math.floor(Math.random() * 5) + 16; // 16-20
}

async function main() {
  const { data: students, error: fetchErr } = await supabase
    .from("students")
    .select("id, name, age, section");

  if (fetchErr) {
    console.error("Error fetching students:", fetchErr.message);
    process.exit(1);
  }

  console.log(`Found ${students.length} students.\n`);
  let ageOk = 0, secOk = 0;

  for (const s of students) {
    const updates = { age: randomAge() };

    if (s.section && /sampaguita/i.test(s.section)) {
      updates.section = s.section.replace(/sampaguita/gi, "Bautista");
      console.log(`  [SECTION] ${s.name}: "${s.section}" -> "${updates.section}"`);
      secOk++;
    }

    const { error: e } = await supabase
      .from("students")
      .update(updates)
      .eq("id", s.id);

    if (e) {
      console.error(`  [ERROR] ${s.name}:`, e.message);
    } else {
      console.log(`  [OK] ${s.name} | age -> ${updates.age}${updates.section ? " | section -> " + updates.section : ""}`);
      ageOk++;
    }
  }

  console.log(`\n=== Done ===`);
  console.log(`Ages updated  : ${ageOk}`);
  console.log(`Sections fixed: ${secOk} (Sampaguita -> Bautista)`);
}

main().catch(console.error);
