import { supabase } from "../supabase";
import { Candidate } from "../types";
import { logAuditAction } from "./auditLogger";

export const SAMPLE_CANDIDATES: Partial<Candidate>[] = [
  {
    id: "cand-pres-1",
    name: "Maria Sofia Santos",
    position: "President",
    section: "Grade 12 - STEM-A",
    age: 17,
    campaign_text: "Empowering Student Voice through Digital Governance, Campus Sustainability, and Transparent Leadership for all DLMHS Learners.",
    image_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=MariaSantos",
  },
  {
    id: "cand-pres-2",
    name: "Ethan James Reyes",
    position: "President",
    section: "Grade 12 - ABM-B",
    age: 18,
    campaign_text: "Transparent Leadership, Financial Accountability, and Enhanced Student Welfare & Academic Support Services.",
    image_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=EthanReyes",
  },
  {
    id: "cand-vp-1",
    name: "Samantha Grace Cruz",
    position: "Vice President",
    section: "Grade 11 - STEM-B",
    age: 17,
    campaign_text: "Fostering Student Innovation, Campus Mental Health Advocacy, and Sports & Arts Development Programs.",
    image_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=SamanthaCruz",
  },
  {
    id: "cand-vp-2",
    name: "Joshua Gabriel Del Rosario",
    position: "Vice President",
    section: "Grade 11 - HUMSS-A",
    age: 16,
    campaign_text: "Strengthening Student Clubs, Leadership Training, and Interactive Learning Workshops across all grade levels.",
    image_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=JoshuaDelRosario",
  },
  {
    id: "cand-sec-1",
    name: "Angelica Mae Mendoza",
    position: "Secretary",
    section: "Grade 11 - STEM-A",
    age: 16,
    campaign_text: "Accurate Meeting Documentation, Open Student Records, and Timely Digital Announcement Updates.",
    image_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=AngelicaMendoza",
  },
  {
    id: "cand-sec-2",
    name: "Gabriel Alonzo Torralba",
    position: "Secretary",
    section: "Grade 11 - GAS-A",
    age: 17,
    campaign_text: "Streamlined Communication Channels, Prompt Student Inquiries Response, and Organized Archiving.",
    image_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=GabrielTorralba",
  },
  {
    id: "cand-treas-1",
    name: "Bea Beatrice Lim",
    position: "Treasurer",
    section: "Grade 11 - ABM-A",
    age: 16,
    campaign_text: "Transparent Financial Accountability, Strict Budget Auditing, and Financial Support for Student Events.",
    image_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=BeaLim",
  },
  {
    id: "cand-treas-2",
    name: "Marcus Alexander Tan",
    position: "Treasurer",
    section: "Grade 11 - ABM-B",
    age: 17,
    campaign_text: "Open Budget Reporting, Fair Resource Allocation, and Project Grants for Student Organizations.",
    image_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=MarcusTan",
  },
  {
    id: "cand-pio-1",
    name: "Chloe Isabel Garcia",
    position: "PIO",
    section: "Grade 10 - Sampaguita",
    age: 16,
    campaign_text: "Dynamic Social Media Information Drives, School Bulletin Graphics, and Real-Time Event Broadcasts.",
    image_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=ChloeGarcia",
  },
  {
    id: "cand-pio-2",
    name: "Daniel Jose Fernandez",
    position: "PIO",
    section: "Grade 10 - Narra",
    age: 15,
    campaign_text: "Interactive Campus Newsletters, Visual Infographics, and Accessible Information Outlets.",
    image_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=DanielFernandez",
  },
  {
    id: "cand-po-1",
    name: "Rafael Emilio Ramos",
    position: "Public Officer",
    section: "Grade 10 - Kamagong",
    age: 15,
    campaign_text: "Community Outreach Relations, Campus Cleanliness & Safety Campaigns, and Student Discipline Advocacy.",
    image_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=RafaelRamos",
  },
  {
    id: "cand-po-2",
    name: "Hannah Marie Aquino",
    position: "Public Officer",
    section: "Grade 10 - Yakal",
    age: 16,
    campaign_text: "Peer Support Counseling, Anti-Bullying Initiatives, and Inclusive School Event Planning.",
    image_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=HannahAquino",
  },
  {
    id: "cand-gr8-1",
    name: "Lucas Joaquin Valenzuela",
    position: "Gr 8 Representative",
    section: "Grade 8 - Molave",
    age: 14,
    campaign_text: "Dedicated Representation for Grade 8 Learners, Class Feedback Listening, and Academic Tutoring Circles.",
    image_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=LucasValenzuela",
  },
  {
    id: "cand-gr9-1",
    name: "Patricia Nicole Navarro",
    position: "Gr 9 Representative",
    section: "Grade 9 - Banaba",
    age: 15,
    campaign_text: "Active Grade 9 Student Representation, Orientation Mentorship, and Student Rights Defense.",
    image_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=PatriciaNavarro",
  },
  {
    id: "cand-gr10-1",
    name: "Kenneth Roy Castelo",
    position: "Gr 10 Representative",
    section: "Grade 10 - Acacia",
    age: 16,
    campaign_text: "Promoting Grade 10 Readiness, Moving-Up Ceremony Support, and Peer Academic Collaboration.",
    image_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=KennethCastelo",
  },
  {
    id: "cand-gr11-1",
    name: "Alyssa Faith Mercado",
    position: "Gr 11 Representative",
    section: "Grade 11 - TVL-ICT",
    age: 17,
    campaign_text: "Senior High Track Integration, Work Immersion Guidance, and Tech Skills Development Workshops.",
    image_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=AlyssaMercado",
  },
  {
    id: "cand-gr12-1",
    name: "Benjamin Mark Soriano",
    position: "Gr 12 Representative",
    section: "Grade 12 - HUMSS-B",
    age: 18,
    campaign_text: "Graduating Class Representation, College Entrance Exam Reviews, and Graduation Committee Coordination.",
    image_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=BenjaminSoriano",
  },
];

export async function seedSampleCandidatesIfEmpty(): Promise<number> {
  try {
    const { data: existing, error } = await supabase.from("candidates").select("id");
    if (!error && existing && existing.length > 0) {
      return existing.length;
    }

    // Seed sample candidates
    const { error: upsertErr } = await supabase.from("candidates").upsert(SAMPLE_CANDIDATES);
    if (upsertErr) {
      console.warn("Supabase candidates seed notice:", upsertErr.message);
    } else {
      await logAuditAction("SAMPLE_CANDIDATES_SEEDED", "System", `Seeded ${SAMPLE_CANDIDATES.length} official sample candidates`);
    }
    return SAMPLE_CANDIDATES.length;
  } catch (err) {
    console.error("Error seeding sample candidates:", err);
    return 0;
  }
}
