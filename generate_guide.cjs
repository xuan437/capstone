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
        ['  5.1', 'Ballot Page', '6'],
        ['  5.2', 'Confirmation Screen', '7'],
        ['  5.3', 'Student Profile', '7'],
        ['6.', 'Admin Module', '8'],
        ['  6.1', 'Dashboard — Candidates Setup', '8'],
        ['  6.2', 'Voters List', '9'],
        ['  6.3', 'Voter Registration', '10'],
        ['  6.4', 'Partylist Management', '10'],
        ['  6.5', 'Election Settings', '11'],
        ['  6.6', 'Results Dashboard', '11'],
        ['  6.7', 'Download Results', '12'],
        ['  6.8', 'Audit Logs', '12'],
        ['7.', 'Security Features', '13'],
        ['8.', 'Audit Logging Reference', '14'],
        ['9.', 'Database Tables Reference', '15'],
        ['10.', 'Troubleshooting & FAQ', '16'],
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
      h2('6.1  Dashboard — Candidates Setup'),
      body('The main admin landing page. Displays all candidates organized by position.'),
      ...spacer(1),
      h3('Filters'),
      bullet('Status Filter: All / Active / Deactivated'),
      bullet('Partylist Filter: All partylists or a specific one'),
      bullet('Section Filter: All or a specific class section'),
      bullet('Search Bar: search by candidate name'),
      ...spacer(1),
      h3('Candidate Actions (per card)'),
      table2([
        ['View Profile', 'Opens the full Candidate Profile page'],
        ['Edit', 'Opens the Admin Edit Candidate form'],
        ['Deactivate / Reactivate', 'Hides the candidate from student ballot without deleting them'],
        ['Remove Partylist', 'Unlinks the candidate\'s partylist affiliation (logged to audit)'],
      ]),
      ...spacer(1),
      h3('Global Actions'),
      bullet('"+ Add Candidate" button — navigates to the Add Candidate form'),
      ...spacer(1),
      h2('6.2  Voters List'),
      body('Displays all registered student voters with their voting status in real time.'),
      ...spacer(1),
      h3('Filters'),
      bullet('Grade Filter: All / Gr 7 – Gr 12'),
      bullet('Status Filter: All / Voted / Pending'),
      bullet('Search: filter by name or LRN'),
      ...spacer(1),
      h3('Per-Student Actions'),
      table2([
        ['View Profile', 'Opens the full Student Profile page'],
        ['Show Password (Eye icon)', 'Prompts for admin password; reveals the student\'s login password in-table'],
        ['Reset Vote', 'Prompts for admin password; deletes the student\'s vote records and resets has_voted to false'],
      ]),
      ...spacer(1),
      h3('Bulk Actions'),
      table2([
        ['Download Credentials PDF', 'Prompts for admin password; generates a printable PDF of all student LRNs and passwords'],
        ['Refresh', 'Reloads the voter list from Supabase'],
      ]),
      warn('Resetting a vote is irreversible from the student\'s side. Use only when necessary and with proper authorization.'),
      ...spacer(1),
      h2('6.3  Voter Registration'),
      body('Allows administrators to register new student voters individually or in bulk.'),
      ...spacer(1),
      h3('Single Registration'),
      numbered('Fill in: Name, LRN (12 digits), Password, Grade, Section (optional), Age (optional), Mobile Number (optional).'),
      numbered('Upload a student photo (optional; uses a realistic fallback if omitted).'),
      numbered('Click "Register Voter".'),
      ...spacer(1),
      h3('Bulk CSV Import'),
      numbered('Prepare a CSV file with columns: name, id (LRN), password, grade, section, age, mobile_number.'),
      numbered('Click "Import CSV" and select the file.'),
      numbered('Review the preview and click "Confirm Import".'),
      ...spacer(1),
      h2('6.4  Partylist Management'),
      body('Manage political party affiliations for candidates.'),
      ...spacer(1),
      h3('Partylist Actions'),
      table2([
        ['Add Partylist', 'Enter a name, code, colour, and optional description, then save'],
        ['Edit Partylist', 'Update the name, code, colour, or description of an existing partylist'],
        ['Delete Partylist', 'Permanently removes the partylist and unlinks all candidates (logged to audit)'],
        ['View Candidates', 'See all candidates belonging to a partylist in a detail panel'],
        ['Assign Candidate', 'Link an existing candidate to this partylist'],
      ]),
      note('Each partylist is displayed with its colour badge on the candidate cards throughout the system.'),
      ...spacer(1),
      h2('6.5  Election Settings'),
      body('Configure the election countdown timer — the hard cutoff after which student login is blocked.'),
      ...spacer(1),
      h3('Timer Controls'),
      numbered('Click the date-time picker and select the election end date and time.'),
      numbered('Click "Set Timer". The countdown appears on the student login page and ballot.'),
      numbered('To extend or move the deadline, pick a new time and click "Set Timer" again.'),
      numbered('To stop the election immediately, click "Clear Timer" and confirm.'),
      note('Setting or clearing the timer is logged in the audit log as TIMER_UPDATED.'),
      ...spacer(1),
      h2('6.6  Results Dashboard'),
      body('Live vote tallying with graphical bars per position. Accessible to both admins and students (students see it after voting).'),
      ...spacer(1),
      h3('Features'),
      bullet('Position-by-position breakdown with vote counts and percentage bars'),
      bullet('Winner highlighted with a gold crown badge'),
      bullet('Partylist colour indicators next to candidate names'),
      bullet('Voter turnout summary (total voted vs. total registered)'),
      bullet('Refresh button to reload live counts'),
      ...spacer(1),
      h2('6.7  Download Results'),
      body('Export election results for reporting and archiving.'),
      ...spacer(1),
      h3('Export Options'),
      table2([
        ['Download PDF', 'Generates a formatted results report as a PDF file'],
        ['Download CSV', 'Exports a spreadsheet-compatible CSV file with all vote counts'],
        ['Print', 'Opens the browser print dialog with a print-optimized layout'],
      ]),
      ...spacer(1),
      h2('6.8  Audit Logs'),
      body('A chronological record of every significant action performed in the system, including login events, vote resets, credential access, and configuration changes.'),
      ...spacer(1),
      h3('Filters'),
      table2([
        ['Search Bar', 'Free-text search across action name, performed-by, and details fields'],
        ['Category Dropdown', 'Filter by: All Categories, Logins & Sessions, Voter Registration, Candidate Management, Votes & Ballots, Security & Access Key, Election Settings, Resets & Deletions'],
      ]),
      ...spacer(1),
      h3('Metric Cards'),
      body('At the top of the audit logs page, quick-count cards show:'),
      bullet('Total Audit Records'),
      bullet('Login & Sessions count (clickable filter)'),
      bullet('Admin Operations count (clickable filter)'),
      bullet('Voter Activity count (clickable filter)'),
      ...spacer(1),
      h3('Export & Refresh'),
      bullet('"Download CSV" — exports the currently filtered log entries'),
      bullet('"Refresh Log" — reloads logs from Supabase and merges with local backup'),

      // ══════════════════════════════════════════════════════════════════
      //  7. SECURITY
      // ══════════════════════════════════════════════════════════════════
      ...spacer(2),
      h1('7. Security Features'),
      h2('7.1  Login Lockout'),
      body('After 3 consecutive failed student login attempts for the same LRN, the system enforces a 15-second lockout. A SECURITY_LOCKOUT event is logged with the LRN and attempt count.'),
      ...spacer(1),
      h2('7.2  Admin Password Gate'),
      body('Sensitive operations require re-entry of the admin password (admin123) even during an active admin session:'),
      bullet('Revealing a student\'s login password in the Voters List'),
      bullet('Downloading the credentials PDF'),
      bullet('Resetting a student\'s vote status'),
      bullet('Viewing a student\'s cast ballot (Ballot Secrecy) in Student Profile'),
      ...spacer(1),
      note('Each of these operations is individually logged to the audit trail (SECURITY_ACCESS_KEY_REVEALED, SECURITY_CREDENTIALS_EXPORTED, VOTE_STATUS_RESET, etc.).'),
      ...spacer(1),
      h2('7.3  Clipboard Protection'),
      body('Copy-paste is blocked on the LRN and password input fields on the login screen to prevent credential misuse during exam/election periods.'),
      ...spacer(1),
      h2('7.4  One-Vote Enforcement'),
      body('Before submitting a ballot, the system re-queries the database to confirm the student has not already voted. This prevents double voting in case of session tampering.'),
      ...spacer(1),
      h2('7.5  Session Persistence'),
      body('Sessions are stored in localStorage. On reload, the system re-fetches the student\'s current record from Supabase. If the record has been deleted, the session is cleared automatically.'),
      ...spacer(1),
      h2('7.6  Privacy Modal'),
      body('A Privacy Policy modal is shown to every user on their first visit. The user must explicitly agree before accessing the application.'),

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
