-- SQL Migration: Seed Realistic Sample Candidates for SSG Elections
INSERT INTO candidates (id, name, position, section, age, campaign_text, image_url)
VALUES
  (
    'cand-pres-1',
    'Maria Sofia Santos',
    'President',
    'Grade 12 - STEM-A',
    17,
    'Empowering Student Voice through Digital Governance, Campus Sustainability, and Transparent Leadership for all DLMHS Learners.',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=MariaSantos'
  ),
  (
    'cand-pres-2',
    'Ethan James Reyes',
    'President',
    'Grade 12 - ABM-B',
    18,
    'Transparent Leadership, Financial Accountability, and Enhanced Student Welfare & Academic Support Services.',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=EthanReyes'
  ),
  (
    'cand-vp-1',
    'Samantha Grace Cruz',
    'Vice President',
    'Grade 11 - STEM-B',
    17,
    'Fostering Student Innovation, Campus Mental Health Advocacy, and Sports & Arts Development Programs.',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=SamanthaCruz'
  ),
  (
    'cand-vp-2',
    'Joshua Gabriel Del Rosario',
    'Vice President',
    'Grade 11 - HUMSS-A',
    16,
    'Strengthening Student Clubs, Leadership Training, and Interactive Learning Workshops across all grade levels.',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=JoshuaDelRosario'
  ),
  (
    'cand-sec-1',
    'Angelica Mae Mendoza',
    'Secretary',
    'Grade 11 - STEM-A',
    16,
    'Accurate Meeting Documentation, Open Student Records, and Timely Digital Announcement Updates.',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=AngelicaMendoza'
  ),
  (
    'cand-sec-2',
    'Gabriel Alonzo Torralba',
    'Secretary',
    'Grade 11 - GAS-A',
    17,
    'Streamlined Communication Channels, Prompt Student Inquiries Response, and Organized Archiving.',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=GabrielTorralba'
  ),
  (
    'cand-treas-1',
    'Bea Beatrice Lim',
    'Treasurer',
    'Grade 11 - ABM-A',
    16,
    'Transparent Financial Accountability, Strict Budget Auditing, and Financial Support for Student Events.',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=BeaLim'
  ),
  (
    'cand-treas-2',
    'Marcus Alexander Tan',
    'Treasurer',
    'Grade 11 - ABM-B',
    17,
    'Open Budget Reporting, Fair Resource Allocation, and Project Grants for Student Organizations.',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=MarcusTan'
  ),
  (
    'cand-pio-1',
    'Chloe Isabel Garcia',
    'PIO',
    'Grade 10 - Sampaguita',
    16,
    'Dynamic Social Media Information Drives, School Bulletin Graphics, and Real-Time Event Broadcasts.',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=ChloeGarcia'
  ),
  (
    'cand-pio-2',
    'Daniel Jose Fernandez',
    'PIO',
    'Grade 10 - Narra',
    15,
    'Interactive Campus Newsletters, Visual Infographics, and Accessible Information Outlets.',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=DanielFernandez'
  ),
  (
    'cand-po-1',
    'Rafael Emilio Ramos',
    'Public Officer',
    'Grade 10 - Kamagong',
    15,
    'Community Outreach Relations, Campus Cleanliness & Safety Campaigns, and Student Discipline Advocacy.',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=RafaelRamos'
  ),
  (
    'cand-po-2',
    'Hannah Marie Aquino',
    'Public Officer',
    'Grade 10 - Yakal',
    16,
    'Peer Support Counseling, Anti-Bullying Initiatives, and Inclusive School Event Planning.',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=HannahAquino'
  ),
  (
    'cand-gr8-1',
    'Lucas Joaquin Valenzuela',
    'Gr 8 Representative',
    'Grade 8 - Molave',
    14,
    'Dedicated Representation for Grade 8 Learners, Class Feedback Listening, and Academic Tutoring Circles.',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=LucasValenzuela'
  ),
  (
    'cand-gr9-1',
    'Patricia Nicole Navarro',
    'Gr 9 Representative',
    'Grade 9 - Banaba',
    15,
    'Active Grade 9 Student Representation, Orientation Mentorship, and Student Rights Defense.',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=PatriciaNavarro'
  ),
  (
    'cand-gr10-1',
    'Kenneth Roy Castelo',
    'Gr 10 Representative',
    'Grade 10 - Acacia',
    16,
    'Promoting Grade 10 Readiness, Moving-Up Ceremony Support, and Peer Academic Collaboration.',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=KennethCastelo'
  ),
  (
    'cand-gr11-1',
    'Alyssa Faith Mercado',
    'Gr 11 Representative',
    'Grade 11 - TVL-ICT',
    17,
    'Senior High Track Integration, Work Immersion Guidance, and Tech Skills Development Workshops.',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=AlyssaMercado'
  ),
  (
    'cand-gr12-1',
    'Benjamin Mark Soriano',
    'Gr 12 Representative',
    'Grade 12 - HUMSS-B',
    18,
    'Graduating Class Representation, College Entrance Exam Reviews, and Graduation Committee Coordination.',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=BenjaminSoriano'
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  position = EXCLUDED.position,
  section = EXCLUDED.section,
  age = EXCLUDED.age,
  campaign_text = EXCLUDED.campaign_text,
  image_url = EXCLUDED.image_url;
