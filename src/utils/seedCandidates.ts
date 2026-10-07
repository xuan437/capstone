import { supabase } from "../supabase";
import { Candidate } from "../types";
import { logAuditAction } from "./auditLogger";

export const SAMPLE_CANDIDATES: Partial<Candidate>[] = [
  {
    id: "cand-pres-1",
    name: "Maria Sofia Santos",
    position: "President",
    section: "Grade 12 - GAS",
    age: 17,
    partylist: "SANDIGAN",
    campaign_text: "Empowering Student Voice through Digital Governance, Campus Sustainability, and Transparent Leadership for all DLMHS Learners.",
    image_url: "https://randomuser.me/api/portraits/women/23.jpg",
  },
  {
    id: "cand-pres-2",
    name: "Ethan James Reyes",
    position: "President",
    section: "Grade 12 - TVL",
    age: 18,
    partylist: "TAGUMPAY",
    campaign_text: "Transparent Leadership, Financial Accountability, and Enhanced Student Welfare & Academic Support Services.",
    image_url: "https://randomuser.me/api/portraits/men/1.jpg",
  },
  {
    id: "cand-vp-1",
    name: "Samantha Grace Cruz",
    position: "Vice President",
    section: "Grade 11 - TechPro",
    age: 17,
    partylist: "SANDIGAN",
    campaign_text: "Fostering Student Innovation, Campus Mental Health Advocacy, and Sports & Arts Development Programs.",
    image_url: "https://randomuser.me/api/portraits/women/27.jpg",
  },
  {
    id: "cand-vp-2",
    name: "Joshua Gabriel Del Rosario",
    position: "Vice President",
    section: "Grade 11 - ACADS",
    age: 16,
    partylist: "TAGUMPAY",
    campaign_text: "Strengthening Student Clubs, Leadership Training, and Interactive Learning Workshops across all grade levels.",
    image_url: "https://randomuser.me/api/portraits/men/33.jpg",
  },
  {
    id: "cand-sec-1",
    name: "Angelica Mae Mendoza",
    position: "Secretary",
    section: "Grade 11 - TechPro",
    age: 16,
    partylist: "SANDIGAN",
    campaign_text: "Accurate Meeting Documentation, Open Student Records, and Timely Digital Announcement Updates.",
    image_url: "https://randomuser.me/api/portraits/women/5.jpg",
  },
  {
    id: "cand-sec-2",
    name: "Gabriel Alonzo Torralba",
    position: "Secretary",
    section: "Grade 12 - GAS",
    age: 17,
    partylist: "ALAB",
    campaign_text: "Streamlined Communication Channels, Prompt Student Inquiries Response, and Organized Archiving.",
    image_url: "https://randomuser.me/api/portraits/men/25.jpg",
  },
  {
    id: "cand-treas-1",
    name: "Bea Beatrice Lim",
    position: "Treasurer",
    section: "Grade 11 - ACADS",
    age: 16,
    partylist: "SANDIGAN",
    campaign_text: "Transparent Financial Accountability, Strict Budget Auditing, and Financial Support for Student Events.",
    image_url: "https://randomuser.me/api/portraits/women/7.jpg",
  },
  {
    id: "cand-treas-2",
    name: "Marcus Alexander Tan",
    position: "Treasurer",
    section: "Grade 12 - TVL",
    age: 17,
    partylist: "TAGUMPAY",
    campaign_text: "Open Budget Reporting, Fair Resource Allocation, and Project Grants for Student Organizations.",
    image_url: "https://randomuser.me/api/portraits/men/41.jpg",
  },
  {
    id: "cand-pio-1",
    name: "Chloe Isabel Garcia",
    position: "PIO",
    section: "Grade 10 - Timowain",
    age: 16,
    partylist: "ALAB",
    campaign_text: "Dynamic Social Media Information Drives, School Bulletin Graphics, and Real-Time Event Broadcasts.",
    image_url: "https://randomuser.me/api/portraits/women/9.jpg",
  },
  {
    id: "cand-pio-2",
    name: "Daniel Jose Fernandez",
    position: "PIO",
    section: "Grade 10 - Ambot",
    age: 16,
    partylist: "SANDIGAN",
    campaign_text: "Clear Campus Updates, Student Suggestion Inbox, and Weekly Gazette Highlights.",
    image_url: "https://randomuser.me/api/portraits/men/17.jpg",
  },
  {
    id: "cand-pub-1",
    name: "Julian Kyle Bautista",
    position: "Public Officer",
    section: "Grade 10 - Timowain",
    age: 16,
    partylist: "TAGUMPAY",
    campaign_text: "Ensuring Peace, Order, Safety Protocols, and Orderly School Assembly Procedures.",
    image_url: "https://randomuser.me/api/portraits/men/7.jpg",
  },
  {
    id: "cand-pub-2",
    name: "Sofia Elaine Villanueva",
    position: "Public Officer",
    section: "Grade 10 - Ambot",
    age: 15,
    partylist: "ALAB",
    campaign_text: "Campus Discipline with Compassion, Peaceful Conflict Resolution, and Student Safety Advocacy.",
    image_url: "https://randomuser.me/api/portraits/women/13.jpg",
  },
  {
    id: "cand-gr8-1",
    name: "Lucas Matthew Valenzuela",
    position: "Gr 8 Representative",
    section: "Grade 8 - Sapa",
    age: 14,
    partylist: "SANDIGAN",
    campaign_text: "Dedicated Representation for Grade 8 Learners, Class Feedback Listening, and Academic Tutoring Circles.",
    image_url: "https://randomuser.me/api/portraits/men/39.jpg",
  },
  {
    id: "cand-gr9-1",
    name: "Patricia Nicole Navarro",
    position: "Gr 9 Representative",
    section: "Grade 9 - Libaton",
    age: 15,
    partylist: "TAGUMPAY",
    campaign_text: "Active Grade 9 Student Representation, Orientation Mentorship, and Student Rights Defense.",
    image_url: "https://randomuser.me/api/portraits/women/25.jpg",
  },
  {
    id: "cand-gr10-1",
    name: "Kenneth Roy Castelo",
    position: "Gr 10 Representative",
    section: "Grade 10 - Timowain",
    age: 16,
    partylist: "SANDIGAN",
    campaign_text: "Promoting Grade 10 Readiness, Moving-Up Ceremony Support, and Peer Academic Collaboration.",
    image_url: "https://randomuser.me/api/portraits/men/37.jpg",
  },
  {
    id: "cand-gr11-1",
    name: "Alyssa Faith Mercado",
    position: "Gr 11 Representative",
    section: "Grade 11 - TechPro",
    age: 17,
    partylist: "ALAB",
    campaign_text: "Senior High Track Integration, Work Immersion Guidance, and Tech Skills Development Workshops.",
    image_url: "https://randomuser.me/api/portraits/women/1.jpg",
  },
  {
    id: "cand-gr12-1",
    name: "Benjamin Mark Soriano",
    position: "Gr 12 Representative",
    section: "Grade 12 - GAS",
    age: 18,
    partylist: "TAGUMPAY",
    campaign_text: "Graduating Class Representation, College Entrance Exam Reviews, and Graduation Committee Coordination.",
    image_url: "https://randomuser.me/api/portraits/men/3.jpg",
  },
];

export async function seedSampleCandidatesIfEmpty(): Promise<number> {
  try {
    const { data: existing, error } = await supabase.from("candidates").select("id");
    if (!error && existing && existing.length > 0) {
      return existing.length;
    }

    // Try upserting sample candidates with partylist
    const { error: upsertErr } = await supabase.from("candidates").upsert(SAMPLE_CANDIDATES);
    if (upsertErr) {
      // Fallback without partylist in case remote column is not yet migrated
      const candidatesWithoutPartylist = SAMPLE_CANDIDATES.map(({ partylist: _, ...rest }) => rest);
      const fallbackRes = await supabase.from("candidates").upsert(candidatesWithoutPartylist);
      if (fallbackRes.error) {
        console.warn("Supabase candidates seed fallback error:", fallbackRes.error.message);
      }
    }

    await logAuditAction("SAMPLE_CANDIDATES_SEEDED", "System", `Seeded ${SAMPLE_CANDIDATES.length} official sample candidates`);
    return SAMPLE_CANDIDATES.length;
  } catch (err) {
    console.error("Error seeding sample candidates:", err);
    return 0;
  }
}
