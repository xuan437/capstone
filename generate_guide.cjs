// generate_guide.cjs — Generates the Capstone E-Voting System Guide as a .docx
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType, BorderStyle, TableRow, TableCell, Table,
  WidthType, ShadingType, VerticalAlign,
  Header, Footer, PageNumberElement, PageNumber,
  convertInchesToTwip,
} = require('docx');
const fs = require('fs');

// ─── COLOUR PALETTE ────────────────────────────────────────────────────────────
const NAVY   = '1A2B5F';
const INDIGO = '6366F1';
const TEAL   = '0D9488';
const RED    = 'DC2626';
const GREEN  = '16A34A';
const GRAY   = '64748B';
const LTGRAY = 'F1F5F9';
const WHITE  = 'FFFFFF';

// ─── HELPERS ───────────────────────────────────────────────────────────────────
const t = (text, opts = {}) => new TextRun({
  text,
  font: 'Calibri',
  size: (opts.size || 11) * 2,
  bold: opts.bold || false,
  italics: opts.italics || false,
  color: opts.color || '1E293B',
  break: opts.break || 0,
});

const h1 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_1,
  spacing: { before: 400, after: 160 },
  border: { bottom: { color: NAVY, space: 4, size: 6, style: BorderStyle.SINGLE } },
  children: [new TextRun({ text, font: 'Calibri', bold: true, size: 32, color: NAVY, allCaps: true })]
});

const h2 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_2,
  spacing: { before: 300, after: 100 },
  children: [new TextRun({ text, font: 'Calibri', bold: true, size: 26, color: INDIGO })]
});

const h3 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_3,
  spacing: { before: 200, after: 80 },
  children: [new TextRun({ text, font: 'Calibri', bold: true, size: 22, color: TEAL })]
});

const body = (text, opts = {}) => new Paragraph({
  spacing: { before: 60, after: 60 },
  alignment: opts.center ? AlignmentType.CENTER : AlignmentType.LEFT,
  children: [t(text, { size: 11, ...opts })]
});

const note = (text, color = GRAY) => new Paragraph({
  spacing: { before: 60, after: 60 },
  indent: { left: convertInchesToTwip(0.25) },
  children: [
    new TextRun({ text: '  ℹ  ', font: 'Calibri', size: 22, color }),
    new TextRun({ text, font: 'Calibri', size: 20, italics: true, color }),
  ]
});

const warn = (text) => new Paragraph({
  spacing: { before: 60, after: 60 },
  indent: { left: convertInchesToTwip(0.25) },
  shading: { type: ShadingType.SOLID, color: 'FEF3C7' },
  children: [
    new TextRun({ text: '  ⚠  ', font: 'Calibri', size: 22, color: 'D97706' }),
    new TextRun({ text, font: 'Calibri', size: 20, bold: true, color: '92400E' }),
  ]
});

const bullet = (text, level = 0, bold = false) => new Paragraph({
  bullet: { level },
  spacing: { before: 40, after: 40 },
  indent: { left: convertInchesToTwip(0.25 + level * 0.25) },
  children: [t(text, { size: 11, bold })]
});

const numbered = (text, bold = false) => new Paragraph({
  numbering: { reference: 'my-numbering', level: 0 },
  spacing: { before: 40, after: 40 },
  indent: { left: convertInchesToTwip(0.5), hanging: convertInchesToTwip(0.25) },
  children: [t(text, { size: 11, bold })]
});

const spacer = (n = 1) => Array.from({ length: n }, () =>
  new Paragraph({ spacing: { before: 0, after: 0 }, children: [t('')] })
);

const divider = () => new Paragraph({
  spacing: { before: 160, after: 160 },
  border: { top: { color: LTGRAY, size: 4, space: 1, style: BorderStyle.SINGLE } },
  children: []
});

// Two-column table helper
const row2 = (label, value, shade = false) => new TableRow({
  children: [
    new TableCell({
      width: { size: 30, type: WidthType.PERCENTAGE },
      shading: shade ? { type: ShadingType.SOLID, color: LTGRAY } : undefined,
      verticalAlign: VerticalAlign.CENTER,
      children: [new Paragraph({ children: [t(label, { bold: true, size: 10, color: NAVY })] })],
    }),
    new TableCell({
      width: { size: 70, type: WidthType.PERCENTAGE },
      verticalAlign: VerticalAlign.CENTER,
      children: [new Paragraph({ children: [t(value, { size: 10 })] })],
    }),
  ],
});

const table2 = (rows) => new Table({
  width: { size: 100, type: WidthType.PERCENTAGE },
  borders: {
    top: { style: BorderStyle.SINGLE, size: 2, color: INDIGO },
    bottom: { style: BorderStyle.SINGLE, size: 2, color: INDIGO },
    left: { style: BorderStyle.SINGLE, size: 2, color: INDIGO },
    right: { style: BorderStyle.SINGLE, size: 2, color: INDIGO },
    insideH: { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' },
    insideV: { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' },
  },
  rows: rows.map(([l, v], i) => row2(l, v, i % 2 === 0)),
});

// ─── DOCUMENT ─────────────────────────────────────────────────────────────────
const doc = new Document({
  numbering: {
    config: [{
      reference: 'my-numbering',
      levels: [{
        level: 0,
        format: 'decimal',
        text: '%1.',
        alignment: AlignmentType.LEFT,
      }]
    }]
  },
  styles: {
    default: {
      document: { run: { font: 'Calibri', size: 22, color: '1E293B' } },
    },
  },
  sections: [{
    properties: {
      page: {
        margin: {
          top: convertInchesToTwip(1),
          bottom: convertInchesToTwip(1),
          left: convertInchesToTwip(1.25),
          right: convertInchesToTwip(1),
        },
      },
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          border: { bottom: { color: NAVY, size: 4, style: BorderStyle.SINGLE } },
          spacing: { after: 100 },
          children: [
            new TextRun({ text: 'GUSELA E-VOTING SYSTEM  |  System Documentation Guide', font: 'Calibri', size: 18, color: NAVY, bold: true }),
          ]
        })]
      })
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          border: { top: { color: LTGRAY, size: 2, style: BorderStyle.SINGLE } },
          spacing: { before: 80 },
          alignment: AlignmentType.RIGHT,
          children: [
            new TextRun({ text: 'Page ', font: 'Calibri', size: 18, color: GRAY }),
            new PageNumberElement(PageNumber.CURRENT, { font: 'Calibri', size: 18, color: GRAY }),
          ]
        })]
      })
    },
    children: [

      // ══════════════════════════════════════════════════════════════════
      //  COVER
      // ══════════════════════════════════════════════════════════════════
      new Paragraph({
        spacing: { before: 1200, after: 120 },
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: 'GUSELA', font: 'Calibri', size: 80, bold: true, color: NAVY, allCaps: true })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 80 },
        children: [new TextRun({ text: 'General-Use Student Election & Lookup Application', font: 'Calibri', size: 28, color: INDIGO, italics: true })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
        border: { bottom: { color: INDIGO, size: 6, style: BorderStyle.SINGLE } },
        children: [new TextRun({ text: '', font: 'Calibri', size: 22 })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 200, after: 80 },
        children: [new TextRun({ text: 'SYSTEM DOCUMENTATION GUIDE', font: 'Calibri', size: 32, bold: true, allCaps: true, color: NAVY })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 80 },
        children: [new TextRun({ text: 'Version 1.0  |  Academic Year 2026', font: 'Calibri', size: 22, color: GRAY })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 80 },
        children: [new TextRun({ text: 'Capstone Project — Senior High School Student Election System', font: 'Calibri', size: 22, italics: true, color: GRAY })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 80 },
        children: [new TextRun({ text: 'Prepared by: System Developers', font: 'Calibri', size: 22, color: GRAY })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 80 },
        children: [new TextRun({ text: 'Supabase Cloud Database  ·  React + Vite Frontend  ·  Hosted on Vercel', font: 'Calibri', size: 20, color: GRAY, italics: true })]
      }),

      // ══════════════════════════════════════════════════════════════════
      //  TABLE OF CONTENTS (MANUAL)
      // ══════════════════════════════════════════════════════════════════
      ...spacer(3),
      h1('Table of Contents'),
      ...[
        ['1.', 'System Overview', '3'],
        ['2.', 'System Requirements', '4'],
        ['3.', 'User Roles & Access', '4'],
        ['4.', 'Getting Started — Login', '5'],
        ['5.', 'Student Voter Module', '6'],
        ['  5.1', 'Ballot Page & Digital Voting Engine', '6'],
        ['  5.2', 'Cryptographic Digital Seal & Confirmation', '7'],
        ['  5.3', 'Student Profile & Biometrics Suite', '7'],
        ['6.', 'Faculty Admin Module', '8'],
        ['  6.1', 'Candidates List & Management', '8'],
        ['  6.2', 'Register Candidate & Edit Candidate Forms', '9'],
        ['  6.3', 'Candidate Profile Showcase', '9'],
        ['  6.4', 'Students List (Directory & Security Controls)', '10'],
        ['  6.5', 'Register Student (Single Entry & Bulk SheetJS)', '10'],
        ['  6.6', 'Partylist Slate Management', '11'],
        ['  6.7', 'Election Settings & Cutoff Timer', '11'],
        ['  6.8', 'Results & Analytics Dashboard', '12'],
        ['  6.9', 'Audit Logs & Investigation Console', '12'],
        ['  6.10', 'Digital Seal Verification Console', '13'],
        ['7.', 'Core Security & Verification Systems', '13'],
        ['  7.1', 'Face-API.js Biometric Facial Recognition', '13'],
        ['  7.2', 'Campus GPS Geofencing (Haversine Formula)', '14'],
        ['  7.3', 'Cryptographic Digital Seal (SHA-256 Engine)', '14'],
        ['  7.4', 'Dual-Layer Rate Limiting & Admin Password Gate', '14'],
        ['8.', 'Audit Logging Reference', '15'],
        ['9.', 'Database Tables Reference', '16'],
        ['10.', 'Troubleshooting & FAQ', '17'],
      ].map(([num, title, page]) => new Paragraph({
        spacing: { before: 40, after: 40 },
        tabStops: [{ type: 'right', position: convertInchesToTwip(5.5), leader: 'dot' }],
        children: [
          new TextRun({ text: `${num}   ${title}`, font: 'Calibri', size: 22, color: num.startsWith('  ') ? GRAY : NAVY }),
          new TextRun({ text: '\t' + page, font: 'Calibri', size: 22, color: INDIGO }),
        ]
      })),

      // ══════════════════════════════════════════════════════════════════
      //  1. SYSTEM OVERVIEW
      // ══════════════════════════════════════════════════════════════════
      ...spacer(2),
      h1('1. System Overview'),
      body('GUSELA (General-Use Student Election & Lookup Application) is a web-based electronic voting system designed for school-level student government elections. It enables students to cast their votes digitally, while faculty administrators manage the entire election lifecycle — from candidate setup and voter registration to result tabulation and audit trail review.'),
      ...spacer(1),
      h3('Key Features'),
      bullet('Secure two-tab login for Students (LRN + password) and Faculty Admins (email + password)'),
      bullet('Guided, step-by-step digital ballot with position-based candidate selection'),
      bullet('Real-time vote tallying and live results dashboard with bar-chart visualization'),
      bullet('Full candidate management: add, edit, deactivate, partylist assignment'),
      bullet('Voter management: register voters, view profiles, reveal/reset credentials'),
      bullet('Partylist management with colour coding and candidate grouping'),
      bullet('Election countdown timer with automatic cutoff enforcement'),
      bullet('Comprehensive audit log with categorized filtering and CSV export'),
      bullet('Dark / Light theme toggle with responsive layout'),
      bullet('Downloadable results in PDF and CSV format'),
      ...spacer(1),
      h3('Technology Stack'),
      table2([
        ['Frontend Framework', 'React 18 + TypeScript (Vite build tool)'],
        ['Styling', 'Vanilla CSS with CSS custom properties (dark/light modes)'],
        ['Icon Library', 'Lucide React (SVG vector icons)'],
        ['Backend / Database', 'Supabase (PostgreSQL cloud database + real-time API)'],
        ['PDF Generation', 'jsPDF + html2canvas'],
        ['Hosting', 'Vercel (automatic GitHub deployments)'],
        ['Package Manager', 'npm (Node.js v24+)'],
      ]),

      // ══════════════════════════════════════════════════════════════════
      //  2. SYSTEM REQUIREMENTS
      // ══════════════════════════════════════════════════════════════════
      ...spacer(2),
      h1('2. System Requirements'),
      h3('For End Users (Voters & Admins)'),
      table2([
        ['Browser', 'Google Chrome 90+, Firefox 88+, Edge 90+, Safari 14+'],
        ['Internet', 'Stable connection required (Supabase cloud database)'],
        ['Device', 'Desktop, laptop, tablet, or smartphone (responsive layout)'],
        ['Screen Resolution', '1024×768 minimum recommended; mobile-friendly'],
      ]),
      h3('For Developers / Deployment'),
      table2([
        ['Node.js', 'v18 or higher (v24 recommended)'],
        ['npm', 'v9 or higher'],
        ['Supabase Project', 'Active project with tables: students, candidates, votes, partylists, election_settings, audit_logs'],
        ['Environment Variables', 'VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env file'],
      ]),

      // ══════════════════════════════════════════════════════════════════
      //  3. USER ROLES
      // ══════════════════════════════════════════════════════════════════
      ...spacer(2),
      h1('3. User Roles & Access'),
      body('The system supports two distinct user roles with separate login credentials and access scopes:'),
      ...spacer(1),
      h3('Student Voter'),
      table2([
        ['Login Credentials', '12-digit LRN (Learner Reference Number) + assigned password'],
        ['Access Scope', 'Ballot page → vote submission → confirmation screen → results view'],
        ['Can Do', 'Cast vote once, view results after voting, view own profile, view candidate profiles'],
        ['Cannot Do', 'Vote twice, access admin pages, view other students\' passwords, modify any records'],
        ['Session', 'Persists in localStorage; auto-redirects to confirmation if already voted'],
      ]),
      ...spacer(1),
      h3('Faculty Administrator'),
      table2([
        ['Login Credentials', 'admin@gmail.com (or school variants) + admin123'],
        ['Access Scope', 'Full admin panel with all management modules'],
        ['Can Do', 'All student actions + full candidate/voter/partylist/settings/audit management'],
        ['Cannot Do', 'Cast votes on behalf of students'],
        ['Session', 'Persists in localStorage; admin panel auto-restores on page refresh'],
      ]),
      warn('The admin password (admin123) should be changed before production deployment. Store securely; it is hard-coded in src/types.ts.'),

      // ══════════════════════════════════════════════════════════════════
      //  4. LOGIN
      // ══════════════════════════════════════════════════════════════════
      ...spacer(2),
      h1('4. Getting Started — Login'),
      body('Navigate to the system URL. A Privacy Policy modal appears on first visit — read and click "I Agree" to proceed.'),
      ...spacer(1),
      h3('Student Login'),
      numbered('Click the "Student Voter" tab (selected by default).'),
      numbered('Enter your 12-digit LRN in the LRN field.'),
      numbered('Enter your assigned access password.'),
      numbered('Click the "Sign In" button.'),
      numbered('On success, you will be directed to the Ballot Page (or Confirmation if already voted).'),
      ...spacer(1),
      note('Paste is disabled on the LRN and password fields to prevent credential sharing.'),
      note('After 3 consecutive failed attempts, a 15-second lockout is enforced. A SECURITY_LOCKOUT event is written to the audit log.'),
      ...spacer(1),
      h3('Admin / Faculty Login'),
      numbered('Click the "Faculty Admin" tab.'),
      numbered('Enter the admin email: admin@gmail.com'),
      numbered('Enter the admin password: admin123'),
      numbered('Click "Admin Login". The admin dashboard (Candidates Setup) loads immediately.'),
      ...spacer(1),
      h3('Forgot Password (Students)'),
      body('Students can tap "Forgot your access key?" to reveal their registered mobile number. Administrators should contact the student directly and check the Voters List in the admin panel to retrieve or reset the credential.'),

      // ══════════════════════════════════════════════════════════════════
      //  5. STUDENT MODULE
      // ══════════════════════════════════════════════════════════════════
      ...spacer(2),
      h1('5. Student Voter Module'),
      h2('5.1  Ballot Page'),
      body('The Ballot Page is the core voting interface. Candidates are organized by position in scrollable cards. A sticky progress sidebar shows which positions have been filled.'),
      ...spacer(1),
      h3('How to Vote'),
      numbered('Review the election countdown timer at the top of the page.'),
      numbered('Browse candidates per position. Click a candidate card to select them — the card highlights with a checkmark.'),
      numbered('Use the search bar to find a candidate by name.'),
      numbered('Click a candidate\'s name/photo area to view their full Candidate Profile before selecting.'),
      numbered('Once all required positions are filled, the "Review & Submit Ballot" button activates.'),
      numbered('A vote summary modal appears — review all selections carefully.'),
      numbered('Click "Submit Ballot" to confirm. A final confirmation dialog appears.'),
      numbered('On success, you are redirected to the Confirmation Screen.'),
      ...spacer(1),
      note('Each position has a maximum vote limit (e.g., 1 for President, multiple for Representatives). The system enforces these limits automatically.'),
      warn('Once a ballot is submitted it CANNOT be undone by the student. Only an administrator can reset a voter\'s status.'),
      ...spacer(1),
      h2('5.2  Confirmation Screen'),
      body('After a successful vote, the Confirmation Screen is displayed. It shows a congratulations message and the student\'s voting status. The student may click "Logout" to end the session, or "View Results" if results are available.'),
      ...spacer(1),
      h2('5.3  Student Profile'),
      body('Accessible from the admin panel (Voters List → View Profile). The Student Profile shows:'),
      bullet('Student information: name, LRN, grade, section, age, mobile number, photo'),
      bullet('Voting status badge (Voted / Pending) with timestamp and location'),
      bullet('Ballot Secrecy section — requires admin password to view a student\'s cast votes'),
      bullet('Access Passcode section — click the eye icon; admin password prompt appears before the password is revealed'),
      ...spacer(1),
      note('Revealing the access passcode or viewing cast votes triggers a SECURITY_ACCESS_KEY_REVEALED or BALLOT_ACCESS event in the audit log.'),

      // ══════════════════════════════════════════════════════════════════
      //  6. ADMIN MODULE
      // ══════════════════════════════════════════════════════════════════
      ...spacer(2),
      h1('6. Admin Module'),
      body('The admin module is accessible only after faculty login. The left sidebar provides navigation to all admin sections. The search bar in the top header is context-sensitive.'),
      ...spacer(1),
      h2('6.1  Candidates List & Management'),
      body('The main administrative candidate directory. Displays all running candidates categorized under collapsible position accordions (President, Vice-President, Secretary, Treasurer, Auditor, PIO, Representatives).'),
      ...spacer(1),
      h3('Multi-Criteria Filtering & Scoped Search'),
      bullet('Status Filter: All Candidates / Active Only / Deactivated Only'),
      bullet('Partylist Filter: Scoped to specific registered slates or independent'),
      bullet('Section Filter: Scoped to standard Grade 7-12 strands or junior sections'),
      bullet('Candidate Search: Scoped search by candidate first, middle, or last name'),
      ...spacer(1),
      h3('Candidate Card Features & Actions'),
      table2([
        ['Standardized Header', 'Uniformly renders Position • Partylist • Grade & Section (e.g. "Grade 12 - STEM-A")'],
        ['View Profile', 'Navigates to the public Candidate Profile showcase'],
        ['Edit Candidate', 'Navigates to AdminEditCandidate form with full prefilled fields'],
        ['Soft Deactivation', 'Toggles is_active flag in Supabase to instantly hide from voting ballot without losing data'],
        ['Remove Partylist', 'Detaches candidate from slate affiliation and logs ACTION_CANDIDATE_UPDATED in audit trail'],
      ]),
      ...spacer(1),
      h2('6.2  Register Candidate & Edit Candidate Forms'),
      body('Comprehensive forms for creating and updating candidate nominations with standardized layout and validation.'),
      ...spacer(1),
      h3('Key Form Features & Alignment'),
      bullet('3-Box Name Inputs: First Name, Middle Name, Last Name with shared bottom-baseline alignment'),
      bullet('Standardized Position Selector: Predefined SSLG positions with custom position auto-suggestions'),
      bullet('Dependent Section Selector: Selecting Grade 11 or 12 automatically restricts section choices to senior strands (STEM-A, STEM-B, GAS, HUMSS-A, etc.), while Grades 7-10 display section names (Luna, Mabini, Bonifacio, etc.)'),
      bullet('Dual Photo Capture: Upload image file with client-side compression or live snapshot via webcam'),
      bullet('Format Normalization: Automatically runs formatGradeSection() to guarantee unified naming across the platform'),
      ...spacer(1),
      h2('6.3  Candidate Profile Showcase'),
      body('Rich candidate showcase page accessible by both administrators and student voters before voting.'),
      ...spacer(1),
      h3('Showcase Elements'),
      bullet('Candidate Hero Banner: High-resolution profile avatar with official partylist color ribbon and badge'),
      bullet('Standardized Subtitle: Uniform "Position • Partylist • Grade & Section" header'),
      bullet('Advocacies & Platform: Formatted vision statement, platform goals, and past leadership credentials'),
      bullet('Voter Return Button: Safe return link taking student back to their active voting ballot'),
      ...spacer(1),
      h2('6.4  Students List (Directory & Security Controls)'),
      body('The central student voter registry. Displays all registered student voters with real-time voting status and credential controls.'),
      ...spacer(1),
      h3('Directory Features'),
      bullet('Faculty Admin Exclusion: System automatically filters out admin accounts so only student voters appear in the registry'),
      bullet('Duplicate Name Disambiguation: Detects identical names (e.g. two "Ana Reyes") and renders a distinct "Duplicate Name - Verify LRN" badge with Grade/Section tags'),
      bullet('Masked Passcode Security: Passwords are permanently masked as "••••••••" with no plain-text database leakage'),
      ...spacer(1),
      h3('Administrative Actions (Password-Protected)'),
      table2([
        ['View Profile', 'Opens the Student Profile with biometrics suite and GPS audit details'],
        ['Temp Passcode Generator', 'Prompts for faculty password, generates an ephemeral 6-digit passcode for immediate voter login assistance, and logs SECURITY_ACCESS_KEY_REVEALED'],
        ['Reset Vote', 'Prompts for faculty password, safely removes vote records from Supabase, restores has_voted to false, and logs VOTE_STATUS_RESET with justification'],
        ['Export Credentials PDF', 'Generates a secure printable PDF roster of student voters with Grade, Section, and LRN'],
      ]),
      warn('Resetting a vote is irreversible from the student\'s side. Use only when necessary and with proper faculty authorization.'),
      ...spacer(1),
      h2('6.5  Register Student (Single Entry & Bulk SheetJS)'),
      body('Allows administrators to enroll verified student voters into the election registry with automatic validation and photo enrollment.'),
      ...spacer(1),
      h3('Single Student Registration'),
      numbered('Input 3-box name: First Name, Middle Name, Last Name with baseline alignment.'),
      numbered('Input 12-digit Learner Reference Number (LRN) verified against regex ^\\d{12}$.'),
      numbered('Assign Grade Level and Section (dynamic dropdown restricted to school sections).'),
      numbered('Capture Biometric Photo: Upload an image file or take a snapshot via webcam with client-side JPEG compression.'),
      numbered('Click "Register Student". Credentials and biometric reference are committed to Supabase and logged in audit.'),
      ...spacer(1),
      h3('Bulk Spreadsheet Import (SheetJS Engine)'),
      numbered('Prepare an Excel (.xlsx/.xls) or CSV spreadsheet with student columns (first_name, last_name, lrn, grade, section).'),
      numbered('Click "Import CSV / Excel" and select the file. The SheetJS parser validates row formats and highlights invalid rows.'),
      numbered('Preview records and confirm batch insertion into Supabase with duplicate LRN collision detection.'),
      ...spacer(1),
      h2('6.6  Partylist Slate Management'),
      body('Central hub for managing political party slates, accredited emblems, platform goals, and member affiliations.'),
      ...spacer(1),
      h3('Partylist Controls'),
      table2([
        ['Add Partylist', 'Register a new slate with official party name, short code, and custom hex color badge'],
        ['Edit Partylist', 'Update party platform, color badge, or executive description'],
        ['Delete Partylist', 'Permanently removes party slate and gracefully unlinks candidates without deleting candidate records'],
        ['Slate Inspection', 'Inspect all candidates registered under the selected partylist across all positions'],
      ]),
      ...spacer(1),
      h2('6.7  Election Settings & Cutoff Timer'),
      body('Administrative controls for configuring official voting start/end cutoff timestamps and campus parameters.'),
      ...spacer(1),
      h3('Cutoff Timer Controls'),
      numbered('Configure election closing timestamp using the date-time picker.'),
      numbered('Click "Set Timer". The real-time countdown synchronizes to all active client devices.'),
      numbered('Hard Cutoff Enforcement: Once the countdown reaches 00:00:00, student login is automatically locked down.'),
      numbered('To extend voting hours or halt an election, faculty administrators can adjust or clear the timer with password re-authentication.'),
      ...spacer(1),
      h2('6.8  Results & Analytics Dashboard'),
      body('Real-time election tallying and graphical tabulation with position-by-position breakdowns and analytics.'),
      ...spacer(1),
      h3('Dashboard Features'),
      bullet('Live Tabulation: Automatic re-calculation of cast ballots from the votes table in Supabase'),
      bullet('Winner Highlighting: Leading candidate per position marked with a golden winner ribbon'),
      bullet('Voter Turnout Metric: Real-time calculation of (Voted Students / Total Registered Students) * 100%'),
      bullet('Turnout by Grade & Section: Drill-down metrics displaying participation percentages across grade levels'),
      bullet('Export Engine: Download official election certificates as PDF, raw counts as CSV, or print a formatted tally sheet'),
      ...spacer(1),
      h2('6.9  Audit Logs & Investigation Console'),
      body('Cryptographically backed, chronological record of every security and administrative event across the system.'),
      ...spacer(1),
      h3('Audit Inspection Tools'),
      table2([
        ['Scoped Search', 'Filter audit records by actor name, action category, timestamp, or specific target LRN'],
        ['Category Filters', 'Filter by Logins & Sessions, Voter Registration, Candidate Management, Votes & Ballots, Security & Key Access, Election Settings, Resets & Deletions'],
        ['Dual-Layer Architecture', 'Simultaneously persisted in PostgreSQL audit_logs and local offline fallback storage'],
        ['Export CSV', 'Export raw audit trails for faculty oversight and compliance archiving'],
      ]),
      ...spacer(1),
      h2('6.10  Digital Seal Verification Console'),
      body('Dedicated forensic verification console allowing faculty administrators to mathematically prove ballot integrity.'),
      ...spacer(1),
      h3('Verification Workflow'),
      bullet('Paste any student ballot receipt hash or upload receipt data into the console'),
      bullet('The cryptographic engine runs verifyBallotSeal() to recompute SHA-256 hash against Supabase records'),
      bullet('Confirms whether the vote record is untampered, valid, and unaltered since original casting'),

      // ══════════════════════════════════════════════════════════════════
      //  7. SECURITY
      // ══════════════════════════════════════════════════════════════════
      ...spacer(2),
      h1('7. Core Security & Verification Systems'),
      h2('7.1  Face-API.js Biometric Facial Recognition'),
      body('Client-side biometric authentication powered by TensorFlow.js and Face-API.js models (SSD MobileNet V1, 68-Point Face Landmark, Face Recognition Net).'),
      bullet('loadFaceApiModels(): Pre-loads quantized neural network weights from /models directory with indexed caching.'),
      bullet('detectSingleFaceFromVideo(): Samples camera stream, isolates high-confidence bounding box, and computes 128-dimensional biometric floating-point descriptor.'),
      bullet('Euclidean Distance Verification: Compares live descriptor with enrolled reference descriptor. Matches are accepted only if distance < 0.50 threshold.'),
      bullet('No Cloud Biometrics: Descriptors are computed locally in client WebAssembly/WebGL memory; raw video is never transmitted over the network.'),
      ...spacer(1),
      h2('7.2  Campus GPS Geofencing (Haversine Formula)'),
      body('Prevents off-campus voting fraud by validating student geolocation against designated campus boundaries prior to ballot unlocking.'),
      bullet('calculateDistance(): Implements the spherical Earth Haversine formula to calculate true geographic distance in meters.'),
      bullet('Geofence Radius: Standard 500-meter threshold centered around the school campus coordinates.'),
      bullet('Audit Compliance: Coordinates and accuracy metrics are checked and logged without compromising student residential privacy.'),
      ...spacer(1),
      h2('7.3  Cryptographic Digital Seal (SHA-256 Engine)'),
      body('Guarantees post-vote non-repudiation and cryptographic ballot immutability.'),
      bullet('generateDigitalSeal(ballotData): Constructs a canonical JSON payload of student LRN, candidate IDs, position mappings, timestamp, and device fingerprint, then computes a 256-bit SHA-256 cryptographic digest.'),
      bullet('Ballot Receipt: The student receives an official verification hash string and QR-compatible receipt code.'),
      bullet('verifyBallotSeal(): The admin verification console compares the stored digital seal with the recomputed hash over votes in the database to detect any database tampering or unauthorized row manipulation.'),
      ...spacer(1),
      h2('7.4  Dual-Layer Rate Limiting & Admin Password Gate'),
      body('Hardens authentication endpoints against automated brute-force attacks and unauthorized faculty action.'),
      bullet('3-Attempt Lockout: 3 consecutive failed student logins triggers an automatic 15-second lockout timer with SECURITY_LOCKOUT audit logging.'),
      bullet('Clipboard Hijacking Defense: Prevents pasting into LRN and passcode inputs during on-campus supervised polling.'),
      bullet('Admin Password Gate: Sensitive operations (passcode reveal, vote resets, ballot inspection, results export) strictly require re-verifying faculty credentials even during an active admin session.'),
      ...spacer(1),
      h2('7.5  One-Vote Enforcement & Ballot Secrecy Isolation'),
      body('Guarantees democratic fairness while strictly safeguarding student voter anonymity.'),
      bullet('Pre-Submission Double-Check: Directly checks the database has_voted boolean immediately before writing votes.'),
      bullet('Ballot Secrecy Isolation: Ballots are stored with decoupled voter IDs; faculty administrators cannot view a student\'s individual candidate selections without an authorized, audited Ballot Secrecy Override.'),
      ...spacer(1),
      h2('7.6  Privacy Modal & Terms Acceptance'),
      body('A mandatory Data Privacy Notice is rendered upon initial application access, requiring explicit student consent before device camera or location permissions are requested.'),

      // ══════════════════════════════════════════════════════════════════
      //  8. AUDIT LOG REFERENCE
      // ══════════════════════════════════════════════════════════════════
      ...spacer(2),
      h1('8. Audit Logging Reference'),
      body('All events are stored in the Supabase audit_logs table and locally cached in localStorage (up to 250 entries). The table below lists all action codes:'),
      ...spacer(1),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top:     { style: BorderStyle.SINGLE, size: 2, color: NAVY },
          bottom:  { style: BorderStyle.SINGLE, size: 2, color: NAVY },
          left:    { style: BorderStyle.SINGLE, size: 2, color: NAVY },
          right:   { style: BorderStyle.SINGLE, size: 2, color: NAVY },
          insideH: { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' },
          insideV: { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' },
        },
        rows: [
          // Header row
          new TableRow({
            tableHeader: true,
            children: [
              new TableCell({ shading: { type: ShadingType.SOLID, color: NAVY }, children: [new Paragraph({ children: [new TextRun({ text: 'Action Code', font: 'Calibri', bold: true, size: 19, color: WHITE })] })] }),
              new TableCell({ shading: { type: ShadingType.SOLID, color: NAVY }, children: [new Paragraph({ children: [new TextRun({ text: 'Category', font: 'Calibri', bold: true, size: 19, color: WHITE })] })] }),
              new TableCell({ shading: { type: ShadingType.SOLID, color: NAVY }, children: [new Paragraph({ children: [new TextRun({ text: 'Description', font: 'Calibri', bold: true, size: 19, color: WHITE })] })] }),
            ]
          }),
          // Data rows
          ...([
            ['STUDENT_LOGIN', 'Login & Sessions', 'Student successfully logged in'],
            ['STUDENT_LOGIN_FAILED', 'Login & Sessions', 'Failed student login attempt (wrong LRN/password)'],
            ['STUDENT_LOGOUT', 'Login & Sessions', 'Student session ended (logout)'],
            ['ADMIN_LOGIN', 'Login & Sessions', 'Administrator successfully logged in'],
            ['ADMIN_LOGIN_FAILED', 'Login & Sessions', 'Failed admin login attempt'],
            ['ADMIN_LOGOUT', 'Login & Sessions', 'Administrator session ended (logout)'],
            ['SECURITY_LOCKOUT', 'Security & Access Key', '15-second lockout after 3 failed attempts'],
            ['SECURITY_ACCESS_KEY_REVEALED', 'Security & Access Key', 'Admin revealed a student\'s login password'],
            ['SECURITY_ACCESS_KEY_DENIED', 'Security & Access Key', 'Wrong admin password when attempting to reveal key'],
            ['SECURITY_CREDENTIALS_EXPORTED', 'Security & Access Key', 'Credentials PDF downloaded by admin'],
            ['SECURITY_EXPORT_DENIED', 'Security & Access Key', 'Wrong admin password when attempting PDF export'],
            ['VOTE_SUBMITTED', 'Votes & Ballots', 'Student successfully cast their ballot'],
            ['VOTE_STATUS_RESET', 'Resets & Deletions', 'Admin reset a student\'s vote status'],
            ['VOTE_RESET_DENIED', 'Resets & Deletions', 'Wrong admin password when attempting vote reset'],
            ['BALLOT_ACCESS_DENIED', 'Security & Access Key', 'Wrong admin password for ballot secrecy view'],
            ['CANDIDATE_PARTYLIST_REMOVED', 'Resets & Deletions', 'Admin removed a candidate\'s partylist affiliation'],
            ['PARTYLIST_DELETED', 'Resets & Deletions', 'Admin permanently deleted a partylist'],
            ['TIMER_UPDATED', 'Election Settings', 'Admin set or changed the election countdown timer'],
            ['STUDENT_REGISTERED', 'Voter Registration', 'New student voter account registered'],
          ]).map(([code, cat, desc], i) => new TableRow({
            children: [
              new TableCell({ shading: i % 2 === 0 ? { type: ShadingType.SOLID, color: LTGRAY } : undefined, children: [new Paragraph({ children: [new TextRun({ text: code, font: 'Courier New', size: 17, bold: true, color: INDIGO })] })] }),
              new TableCell({ shading: i % 2 === 0 ? { type: ShadingType.SOLID, color: LTGRAY } : undefined, children: [new Paragraph({ children: [new TextRun({ text: cat, font: 'Calibri', size: 18, color: TEAL })] })] }),
              new TableCell({ shading: i % 2 === 0 ? { type: ShadingType.SOLID, color: LTGRAY } : undefined, children: [new Paragraph({ children: [new TextRun({ text: desc, font: 'Calibri', size: 18 })] })] }),
            ]
          }))
        ]
      }),

      // ══════════════════════════════════════════════════════════════════
      //  9. DATABASE TABLES
      // ══════════════════════════════════════════════════════════════════
      ...spacer(2),
      h1('9. Database Tables Reference'),
      h3('students'),
      table2([
        ['id', 'TEXT (PK) — 12-digit LRN'],
        ['name', 'TEXT — Full name'],
        ['password', 'TEXT — Login password'],
        ['grade', 'TEXT — Grade level'],
        ['section', 'TEXT (nullable) — Class section'],
        ['age', 'INT (nullable)'],
        ['mobile_number', 'TEXT (nullable)'],
        ['has_voted', 'BOOLEAN — Whether the student has cast a ballot'],
        ['voted_at', 'TIMESTAMPTZ (nullable) — Timestamp of vote submission'],
        ['vote_location', 'TEXT (nullable) — Voting location string'],
        ['photo_url', 'TEXT (nullable) — URL to student photo'],
      ]),
      ...spacer(1),
      h3('candidates'),
      table2([
        ['id', 'UUID (PK)'],
        ['name', 'TEXT — Candidate full name'],
        ['position', 'TEXT — e.g. President, Secretary'],
        ['image_url', 'TEXT (nullable) — Candidate photo URL'],
        ['campaign_text', 'TEXT (nullable) — Bio / platform; prefixed with [DEACTIVATED] when disabled'],
        ['age', 'INT (nullable)'],
        ['section', 'TEXT (nullable)'],
        ['partylist', 'TEXT (nullable) — Partylist name'],
        ['votes', 'INT (computed/cached, nullable)'],
      ]),
      ...spacer(1),
      h3('votes'),
      table2([
        ['id', 'UUID (PK)'],
        ['student_id', 'TEXT (FK → students.id)'],
        ['candidate_id', 'UUID (FK → candidates.id)'],
        ['position', 'TEXT'],
        ['created_at', 'TIMESTAMPTZ'],
      ]),
      ...spacer(1),
      h3('partylists'),
      table2([
        ['id', 'UUID (PK)'],
        ['name', 'TEXT'],
        ['code', 'TEXT (nullable) — Short abbreviation'],
        ['color', 'TEXT (nullable) — Hex colour code'],
        ['description', 'TEXT (nullable)'],
        ['created_at', 'TIMESTAMPTZ'],
      ]),
      ...spacer(1),
      h3('election_settings'),
      table2([
        ['id', 'INT (PK = 1, single-row table)'],
        ['end_time', 'TIMESTAMPTZ (nullable) — Election cutoff datetime'],
      ]),
      ...spacer(1),
      h3('audit_logs'),
      table2([
        ['id', 'BIGINT (PK, auto-generated)'],
        ['action', 'TEXT — Action code (see Section 8)'],
        ['performed_by', 'TEXT — Actor name (Admin, student name, System, Unauthenticated)'],
        ['details', 'TEXT (nullable) — Human-readable description'],
        ['created_at', 'TIMESTAMPTZ — Timestamp of event'],
      ]),

      // ══════════════════════════════════════════════════════════════════
      //  10. TROUBLESHOOTING
      // ══════════════════════════════════════════════════════════════════
      ...spacer(2),
      h1('10. Troubleshooting & FAQ'),
      ...spacer(1),
      h3('Q: A student says their LRN / password is wrong but they were registered.'),
      body('→ Log in as admin → Voters List → find the student → click the eye icon to reveal their password. Confirm with admin password. Provide the correct credentials to the student.'),
      ...spacer(1),
      h3('Q: A student accidentally voted for the wrong candidate.'),
      body('→ Log in as admin → Voters List → find the student → click "Reset Vote" → confirm with admin password. The student\'s ballot is deleted and their status is reset to "Pending". They can log in again and re-vote.'),
      warn('Vote resets should be used sparingly and with proper authorization. All resets are recorded in the audit log.'),
      ...spacer(1),
      h3('Q: The election timer shows "Election Ended" but voting should still be open.'),
      body('→ Admin → Election Settings → pick the correct new cutoff time → click "Set Timer". The countdown updates immediately for all connected clients.'),
      ...spacer(1),
      h3('Q: A candidate does not appear on the student ballot.'),
      body('→ Check Admin → Candidates Setup → confirm the candidate\'s status is "Active" (not "Deactivated"). Click "Reactivate" if needed.'),
      ...spacer(1),
      h3('Q: The audit log shows entries logged by "System" — is that normal?'),
      body('→ Yes. Actions performed automatically (e.g., lockout enforcement) are attributed to "System". Unauthenticated entries come from failed login attempts before any user was identified.'),
      ...spacer(1),
      h3('Q: Results are not updating in real time.'),
      body('→ Click the "Refresh" button on the Results Dashboard. GUSELA does not use real-time subscriptions for results — data is fetched on demand or page load.'),
      ...spacer(1),
      h3('Q: The application loads with "Loading System..." and never resolves.'),
      body('→ Check your internet connection. The app requires access to the Supabase endpoint. If offline, the app cannot authenticate. Verify the Supabase project is active and environment variables are correctly set.'),
      ...spacer(1),
      h3('Q: I need to export all audit logs but only some appear.'),
      body('→ The "Download CSV" button exports only the currently filtered view. To export everything, reset all filters (set Category to "All Categories" and clear the search bar) then download.'),
      ...spacer(1),
      divider(),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 200, after: 80 },
        children: [new TextRun({ text: 'End of GUSELA System Documentation Guide', font: 'Calibri', size: 20, color: GRAY, italics: true })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 40 },
        children: [new TextRun({ text: 'Version 1.0  ·  October 2026  ·  Capstone Project', font: 'Calibri', size: 18, color: LTGRAY })]
      }),
    ]
  }]
});

// ─── WRITE FILE ───────────────────────────────────────────────────────────────
Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync('GUSELA_System_Guide.docx', buf);
  console.log('✅  GUSELA_System_Guide.docx created successfully!');
}).catch(err => {
  console.error('❌  Error generating docx:', err);
  process.exit(1);
});
