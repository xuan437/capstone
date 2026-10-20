# GUSELA E-Voting System — System Guide & Function Reference
**General-Use Student Election & Lookup Application (SSLG Election System)**  
*Version 2.0 | Academic Year 2026 | Capstone Project Documentation*

---

## Table of Contents
1. [System Architecture & Overview](#1-system-architecture--overview)
2. [User Roles, Authentication & Security](#2-user-roles-authentication--security)
3. [Student Voter Module](#3-student-voter-module)
   - 3.1 [Login & Rate-Limiting](#31-login--rate-limiting)
   - 3.2 [Biometric Face Verification (Face-API.js)](#32-biometric-face-verification-face-apijs)
   - 3.3 [Campus GPS Geofencing](#33-campus-gps-geofencing)
   - 3.4 [Digital Ballot & Selection Rules](#34-digital-ballot--selection-rules)
   - 3.5 [Cryptographic Digital Seal & Ballot Receipt](#35-cryptographic-digital-seal--ballot-receipt)
   - 3.6 [Confirmation Screen](#36-confirmation-screen)
4. [Faculty Administrator Module](#4-faculty-administrator-module)
   - 4.1 [Candidates List (Roster Management)](#41-candidates-list-roster-management)
   - 4.2 [Register Candidate & Edit Candidate](#42-register-candidate--edit-candidate)
   - 4.3 [Candidate Profile Showcase](#43-candidate-profile-showcase)
   - 4.4 [Students List (Registry & Credentials Management)](#44-students-list-registry--credentials-management)
   - 4.5 [Register Student (Single Entry & Bulk CSV/Excel)](#45-register-student-single-entry--bulk-csvexcel)
   - 4.6 [Student Profile & Ballot Secrecy Verification](#46-student-profile--ballot-secrecy-verification)
   - 4.7 [Partylist Slate Management](#47-partylist-slate-management)
   - 4.8 [Election Timer Settings & Automatic Cutoff](#48-election-timer-settings--automatic-cutoff)
   - 4.9 [Results Dashboard & Analytics](#49-results-dashboard--analytics)
   - 4.10 [Audit Logs & Compliance Trail](#410-audit-logs--compliance-trail)
   - 4.11 [Digital Seal & Ballot Integrity Console](#411-digital-seal--ballot-integrity-console)
5. [Core Utilities & Functions Reference](#5-core-utilities--functions-reference)
   - 5.1 [sectionConstants.ts](#51-sectionconstantsts)
   - 5.2 [auditLogger.ts](#52-auditloggerts)
   - 5.3 [digitalSeal.ts](#53-digitalsealts)
   - 5.4 [faceApi.ts](#54-faceapits)
   - 5.5 [geofencing.ts & locationCapture.ts](#55-geofencingts--locationcapturets)
   - 5.6 [imageUtils.ts](#56-imageutilsts)
   - 5.7 [candidateUtils.ts & partylistUtils.ts](#57-candidateutilsts--partylistutilsts)
6. [Database Schema Reference](#6-database-schema-reference)
7. [Troubleshooting & Administrator FAQ](#7-troubleshooting--administrator-faq)

---

## 1. System Architecture & Overview

GUSELA is an enterprise-grade digital voting solution designed specifically for Supreme Secondary Learner Government (SSLG) elections. It combines digital ballot casting with biometric verification, GPS geofencing, and SHA-256 cryptographic validation.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CLIENT APPLICATION (VITE + REACT)               │
│                                                                        │
│   Student Voter Experience                Faculty Admin Console        │
│   ├── Login (LRN + Password)              ├── Candidates List          │
│   ├── Face-API Biometrics                 ├── Register/Edit Candidate  │
│   ├── Geofence Validation                 ├── Students List            │
│   ├── Position-Based Ballot               ├── Register Student (CSV)   │
│   └── SHA-256 Ballot Receipt              ├── Audit Trail & Seals      │
└──────────────────┬───────────────────────────────────┬─────────────────┘
                   │ HTTPS / Web Crypto API            │ Realtime REST
                   ▼                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        SUPABASE CLOUD DATABASE                         │
│   • students         • candidates         • votes                      │
│   • partylists       • election_settings  • audit_logs                 │
└────────────────────────────────────────────────────────────────────────┘
```

- **Frontend Framework**: React 18 with TypeScript running on Vite.
- **Styling**: Vanilla CSS utilizing custom design tokens for light and dark themes.
- **Backend / Database**: Supabase PostgreSQL database with Row-Level Security (RLS) support.
- **Biometrics Engine**: Client-side Face-API.js running TensorFlow models directly inside the browser.
- **Document Generation**: jsPDF + html2canvas for PDF export; SheetJS (`xlsx`) for class roster processing.

---

## 2. User Roles, Authentication & Security

The system implements strict Role-Based Access Control (RBAC):

| Dimension | Student Voter | Faculty Administrator |
| :--- | :--- | :--- |
| **Identifier** | 12-digit Learner Reference Number (LRN) | Email (`admin@gmail.com`) |
| **Credential** | Temporary 6-character alphanumeric passcode | Faculty administrative password |
| **Access Scope** | Ballot $\rightarrow$ Review $\rightarrow$ Receipt $\rightarrow$ Results | Complete console management suite |
| **Voting Rights** | Exactly 1 vote submission | Administrative observation only |
| **Brute Force Protection** | 3-attempt lockout (15s cooldown) | Authentication gate on critical actions |
| **Clipboard Protection** | Paste blocked on login fields | Sensitive data masked by default |

---

## 3. Student Voter Module

### 3.1 Login & Rate-Limiting
- **Component**: [`src/pages/AuthForm.tsx`](file:///c:/Users/ejeis/.gemini/antigravity-ide/scratch/capstone/src/pages/AuthForm.tsx)
- **Functionality**:
  - The login interface features two dedicated tabs: **Student Voter** and **Faculty Admin**.
  - Validates LRN syntax (exactly 12 numeric digits: `/^\d{12}$/`).
  - Blocks paste actions (`onPaste={(e) => e.preventDefault()}`) to prevent credential leakage.
  - Enforces a 15-second lockout upon 3 consecutive failed attempts, writing a `SECURITY_LOCKOUT` entry to the audit log.
  - Automatically redirects already-voted students directly to the Confirmation screen.

### 3.2 Biometric Face Verification (Face-API.js)
- **Components**: [`FaceCaptureModal.tsx`](file:///c:/Users/ejeis/.gemini/antigravity-ide/scratch/capstone/src/components/biometrics/FaceCaptureModal.tsx), [`FaceVerificationModal.tsx`](file:///c:/Users/ejeis/.gemini/antigravity-ide/scratch/capstone/src/components/biometrics/FaceVerificationModal.tsx)
- **Utilities**: [`src/utils/faceApi.ts`](file:///c:/Users/ejeis/.gemini/antigravity-ide/scratch/capstone/src/utils/faceApi.ts)
- **Functions Explained**:
  - `loadFaceApiModels()`: Downloads pre-trained lightweight models (`tinyFaceDetector`, `faceLandmark68Net`, `faceRecognitionNet`) from the public directory.
  - `detectSingleFaceFromVideo(video)`: Captures video frames from the user's camera, identifying face bounding boxes and 68 landmarks in real time.
  - `drawBiometricOverlay(canvas, detection)`: Draws a high-tech reticle guide around the student's face on the HTML5 canvas.
  - `verifyBiometricMatch(refImg, testImg)`: Calculates the 128-dimensional Euclidean distance between facial descriptors. Matches with distance $< 0.50$ indicate a confirmed biometric match.

### 3.3 Campus GPS Geofencing
- **Utilities**: [`src/utils/geofencing.ts`](file:///c:/Users/ejeis/.gemini/antigravity-ide/scratch/capstone/src/utils/geofencing.ts), [`src/utils/locationCapture.ts`](file:///c:/Users/ejeis/.gemini/antigravity-ide/scratch/capstone/src/utils/locationCapture.ts)
- **Functions Explained**:
  - `calculateDistance(lat1, lon1, lat2, lon2)`: Computes the spherical distance between the voter's device and the campus using the Haversine formula:
    $$d = 2R \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta\phi}{2}\right) + \cos\phi_1\cos\phi_2\sin^2\left(\frac{\Delta\lambda}{2}\right)}\right)$$
  - `checkGeofence(coords)`: Compares distance against school coordinates (`CAMPUS_LAT`, `CAMPUS_LNG`) and authorized radius (500 meters).
  - `captureVoterLocation()`: Retrieves high-accuracy GPS coordinates via `navigator.geolocation.getCurrentPosition`.

### 3.4 Digital Ballot & Selection Rules
- **Component**: [`src/pages/BallotPage.tsx`](file:///c:/Users/ejeis/.gemini/antigravity-ide/scratch/capstone/src/pages/BallotPage.tsx)
- **Functions Explained**:
  - Positions are loaded from `POSITIONS` constants in standard election order.
  - Voters click candidate cards to toggle selection. Selection states are capped per position:
    - Executive positions (President, VP, Secretary, Treasurer, Auditor, PIO, Peace Officer): max 1 selection.
    - Grade Representatives: restricted to candidate cards corresponding to the voter's registered grade level.
  - **Deactivated Candidates**: Automatically filtered out so deactivated candidates cannot receive votes.
  - **Live Validation**: The "Review & Submit Ballot" button activates only after all required positions have been filled.

### 3.5 Cryptographic Digital Seal & Ballot Receipt
- **Utilities**: [`src/utils/digitalSeal.ts`](file:///c:/Users/ejeis/.gemini/antigravity-ide/scratch/capstone/src/utils/digitalSeal.ts), [`src/utils/receiptVerifier.ts`](file:///c:/Users/ejeis/.gemini/antigravity-ide/scratch/capstone/src/utils/receiptVerifier.ts)
- **Functions Explained**:
  - `generateDigitalSeal(ballotData)`: Hashes candidate IDs, voter ID, timestamp, and salt using `crypto.subtle.digest("SHA-256")`.
  - Produces a unique 64-character hexadecimal seal (`e.g. 9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08`).
  - Generates a compact ballot receipt code displayed on the confirmation modal.
  - Allows independent verification of vote inclusion without exposing the voter's specific choices.

### 3.6 Confirmation Screen
- **Component**: [`src/pages/ConfirmationScreen.tsx`](file:///c:/Users/ejeis/.gemini/antigravity-ide/scratch/capstone/src/pages/ConfirmationScreen.tsx)
- **Functionality**:
  - Displays official DepEd/SSLG certification of vote submission.
  - Shows timestamp, location seal, and digital receipt.
  - Provides a "Download Receipt" option and a link to view live Results if the election allows early viewer turnout.

---

## 4. Faculty Administrator Module

### 4.1 Candidates List (Roster Management)
- **Component**: [`src/pages/AdminSetup.tsx`](file:///c:/Users/ejeis/.gemini/antigravity-ide/scratch/capstone/src/pages/AdminSetup.tsx)
- **Functions Explained**:
  - Organizes candidates by position in collapsible accordions with candidate count badges.
  - **Filters**: Multi-criteria filtering by Section, Partylist, and Status (`All`, `Active`, `Deactivated`).
  - **Scoped Top Search**: Synchronized with the header search bar to filter by name, section, partylist, or platform text.
  - **Deactivation/Reactivation (`handleToggleDeactivate`)**: Prefixes campaign bio with `[DEACTIVATED]` to disable candidates without deleting historical vote tallies.
  - **Independent Slate Detachment (`handleRemoveCandidatePartylist`)**: Clears party affiliation, converting candidate to Independent.

### 4.2 Register Candidate & Edit Candidate
- **Components**: [`AdminAddCandidate.tsx`](file:///c:/Users/ejeis/.gemini/antigravity-ide/scratch/capstone/src/pages/AdminAddCandidate.tsx), [`AdminEditCandidate.tsx`](file:///c:/Users/ejeis/.gemini/antigravity-ide/scratch/capstone/src/pages/AdminEditCandidate.tsx)
- **Functions Explained**:
  - **3-Box Structured Name**: Split inputs for `Last Name *`, `First Name *`, and `Middle Name (Opt)` with live combined preview.
  - **Position Auto-Suggestion**: Selecting a grade-level position (e.g. "Grade 9 Representative") automatically selects `Grade 9` and its default section.
  - **Dependent Section Dropdown**: Selecting a Grade Level dynamically filters available sections via `getSectionsForGrade(grade)`.
  - **Section Normalization**: Saves sections in standard format via `formatGradeSection(grade, section)` (e.g. `Grade 12 - STEM-A`).
  - **Dual Photo Capture**: Allows uploading a high-resolution image file or snapping a live portrait via `FaceCaptureModal`.
  - **Age Validation**: Numeric constraint enforcing $10 \le \text{age} \le 25$.

### 4.3 Candidate Profile Showcase
- **Component**: [`src/components/CandidateProfileCard.tsx`](file:///c:/Users/ejeis/.gemini/antigravity-ide/scratch/capstone/src/components/CandidateProfileCard.tsx)
- **Standardized Card Pattern**:
  $$\text{Position} \bullet \text{Partylist} \bullet \text{Grade \& Section}$$
  *(e.g., `President • TAGUMPAY • Grade 12 - STEM-A`)*
- Features candidate initials monogram, party tag badge, cleaned advocacy text with keyword highlighting, and quick admin action triggers.

### 4.4 Students List (Registry & Credentials Management)
- **Component**: [`src/pages/AdminVotersList.tsx`](file:///c:/Users/ejeis/.gemini/antigravity-ide/scratch/capstone/src/pages/AdminVotersList.tsx)
- **Functions Explained**:
  - **Admin Account Exclusion**: Automatically filters out administrative records (`admin`, `admin@gmail.com`, `isAdmin: true`) from voter tables and stat cards so counts reflect only real student voters.
  - **Duplicate Name Disambiguation**: When students share the same name (such as two "Ana Reyes"), a `Grade & Section` badge is displayed next to their name in table rows and search results.
  - **Secure Passcode Generator (`handleResetPasscodeSubmit`)**: Plaintext passwords are never displayed. Clicking "Reset" prompts for admin credentials, generates a new random 6-character passcode, updates the database, logs the event, and displays a copy modal.
  - **Vote Status Reset (`handleResetVoteSubmit`)**: Requires faculty admin authentication and confirmation to erase records from the `votes` table and reset `has_voted: false`.
  - **Credential PDF Export (`downloadPDF`)**: Generates an official, printable multi-page roster of student access keys using `html2canvas` and `jsPDF`.

### 4.5 Register Student (Single Entry & Bulk CSV/Excel)
- **Component**: [`src/pages/AdminRegister.tsx`](file:///c:/Users/ejeis/.gemini/antigravity-ide/scratch/capstone/src/pages/AdminRegister.tsx)
- **Functions Explained**:
  - **Single Registration**:
    - Split 3-box name with bottom baseline alignment.
    - 12-digit LRN syntax validation (`/^\d{12}$/`) and duplicate checking against Supabase before submission.
    - Dependent Grade $\rightarrow$ Section selection.
    - Automatic passcode generator button.
    - Live webcam photo capture with AI portrait detection (`Face-API`).
  - **Bulk Import (`handleBulkFileUpload`)**:
    - Supports `.xlsx`, `.xls`, and `.csv` spreadsheets via SheetJS.
    - Validates column headers (`lrn`, `name`, `grade`, `section`, `age`).
    - Detects in-file duplicate LRNs and pre-existing database entries.
    - Automatically assigns random 6-character passcodes to all valid rows.

### 4.6 Student Profile & Ballot Secrecy Verification
- **Component**: [`src/pages/StudentProfile.tsx`](file:///c:/Users/ejeis/.gemini/antigravity-ide/scratch/capstone/src/pages/StudentProfile.tsx)
- **Functions Explained**:
  - Displays enrolled portrait, status pill, LRN, and formatted section.
  - **Biometric Test Suite**: Allows faculty to run a live test match against the student's reference photo.
  - **Geofence Audit**: Shows GPS coordinates captured at the time of vote casting.
  - **Ballot Secrecy Gate**: Cast votes remain encrypted/hidden. Unlocking requires entering the faculty admin password, which is recorded in the audit log under `BALLOT_ACCESS`.

### 4.7 Partylist Slate Management
- **Component**: [`src/pages/AdminPartylists.tsx`](file:///c:/Users/ejeis/.gemini/antigravity-ide/scratch/capstone/src/pages/AdminPartylists.tsx)
- **Functions Explained**:
  - Add, edit, and delete political party organizations.
  - Custom color hex picker and slate code (e.g. `SANDIGAN`, `TAGUMPAY`).
  - Grouped roster panel showing all candidates running under each slate.

### 4.8 Election Timer Settings & Automatic Cutoff
- **Component**: [`src/pages/AdminElectionSettings.tsx`](file:///c:/Users/ejeis/.gemini/antigravity-ide/scratch/capstone/src/pages/AdminElectionSettings.tsx)
- **Functions Explained**:
  - Configures the election deadline datetime in the `election_settings` table.
  - Countdown timers across the client automatically reflect the remaining time.
  - Once expired, student login and ballot submission are blocked with an "Election Closed" banner.

### 4.9 Results Dashboard & Analytics
- **Components**: [`ResultsDashboard.tsx`](file:///c:/Users/ejeis/.gemini/antigravity-ide/scratch/capstone/src/pages/ResultsDashboard.tsx), [`DownloadResults.tsx`](file:///c:/Users/ejeis/.gemini/antigravity-ide/scratch/capstone/src/pages/DownloadResults.tsx)
- **Functions Explained**:
  - Real-time vote tabulation per candidate and position.
  - Calculates percentage bars and turnout rates ($\text{Turnout} = \frac{\text{Voted}}{\text{Registered}} \times 100\%$).
  - Highlights winners with gold crown badges.
  - Exports official certified results as PDF, CSV, or formatted print layouts.

### 4.10 Audit Logs & Compliance Trail
- **Component**: [`src/pages/AdminAuditLogs.tsx`](file:///c:/Users/ejeis/.gemini/antigravity-ide/scratch/capstone/src/pages/AdminAuditLogs.tsx)
- **Functions Explained**:
  - Records all critical operations into the `audit_logs` table.
  - Dual-layer storage: Supabase PostgreSQL + local cache backup.
  - Filters by category (Logins, Registration, Ballots, Resets, Security).
  - One-click CSV export of compliance records.

### 4.11 Digital Seal & Ballot Integrity Console
- **Component**: [`src/pages/AdminDigitalSeal.tsx`](file:///c:/Users/ejeis/.gemini/antigravity-ide/scratch/capstone/src/pages/AdminDigitalSeal.tsx)
- **Functions Explained**:
  - Validates overall database ballot integrity.
  - Calculates cumulative system cryptographic hashes.
  - Verifies that vote records have not been tampered with or modified directly in the database.

---

## 5. Core Utilities & Functions Reference

### 5.1 sectionConstants.ts
| Function / Constant | Purpose |
| :--- | :--- |
| `formatGradeSection(grade, section)` | Converts any variation into standard `"Grade X - Section"` format *(e.g. `Grade 12 - STEM-A`, `Grade 7 - Lopez`)*. |
| `normalizeStrand(strand)` | Normalizes Senior High strands to uppercase (`STEM` $\rightarrow$ `STEM-A`, `TVL`, `GAS`, `HUMSS`, `TECHPRO`, `ACADS`). |
| `getSectionsForGrade(gradeKey)` | Returns an array of authorized section names for a given grade level (`G7`–`G12`). |
| `FIXED_GRADE_LEVELS` | Constant list of official grades (`G7` to `G12`) with human-readable labels. |

### 5.2 auditLogger.ts
| Function | Purpose |
| :--- | :--- |
| `logAuditAction(action, user, details)` | Writes a structured event record to the Supabase `audit_logs` table and mirrors it in `localStorage`. |

### 5.3 digitalSeal.ts
| Function | Purpose |
| :--- | :--- |
| `generateDigitalSeal(data)` | Computes a SHA-256 cryptographic digest of ballot selections, timestamp, and voter ID. |
| `verifyBallotSeal(seal, data)` | Re-hashes ballot parameters to confirm mathematical consistency. |

### 5.4 faceApi.ts
| Function | Purpose |
| :--- | :--- |
| `loadFaceApiModels()` | Asynchronously fetches neural network weights for face detection and feature extraction. |
| `detectSingleFaceFromVideo(video)` | Detects face position and 68 landmark coordinates from an HTML5 video stream. |
| `computeFaceDescriptor(image)` | Generates a 128-float facial representation vector for identification. |

### 5.5 geofencing.ts & locationCapture.ts
| Function | Purpose |
| :--- | :--- |
| `checkGeofence(coords)` | Determines if voter device coordinates fall within the authorized campus boundary. |
| `captureVoterLocation()` | Invokes browser Geolocation API to retrieve high-accuracy coordinates. |

### 5.6 imageUtils.ts
| Function | Purpose |
| :--- | :--- |
| `fileToBase64(file)` | Converts an image file to a base64 Data URL string for preview and storage. |
| `getCandidatePhoto(url, name, id)` | Returns uploaded image, or a realistic portrait fallback based on gender name tokens. |
| `getStudentPhoto(url, name, id)` | Returns student enrolled portrait or deterministic high-resolution portrait fallback. |

### 5.7 candidateUtils.ts & partylistUtils.ts
| Function | Purpose |
| :--- | :--- |
| `isCandidateDeactivated(cand)` | Checks if candidate campaign text starts with `[DEACTIVATED]`. |
| `getCleanCampaignText(text)` | Strips the `[DEACTIVATED]` prefix to return the public platform text. |
| `fetchPartyLists()` | Retrieves active political party records from Supabase. |
| `getPartyListBadgeDetails(name, list)`| Returns styling details (color, background, border, abbreviation) for a partylist. |

---

## 6. Database Schema Reference

```sql
-- 1. Students Table
CREATE TABLE students (
  id TEXT PRIMARY KEY,             -- 12-digit Learner Reference Number (LRN)
  name TEXT NOT NULL,              -- Full Name
  password TEXT NOT NULL,          -- Access Passcode
  grade TEXT NOT NULL,             -- Grade level (e.g. G7, G12)
  section TEXT,                    -- Section name (e.g. Lopez, STEM-A)
  age INT,                         -- Student age (10-25)
  mobile_number TEXT,              -- Contact number
  photo_url TEXT,                  -- Base64 or remote URL for biometric portrait
  has_voted BOOLEAN DEFAULT FALSE, -- Vote participation flag
  voted_at TIMESTAMPTZ,            -- Timestamp of ballot submission
  vote_location TEXT               -- GPS coordinates and location description
);

-- 2. Candidates Table
CREATE TABLE candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,              -- Candidate full name
  position TEXT NOT NULL,          -- Executive or Representative position
  partylist TEXT,                  -- Slate affiliation (null = Independent)
  image_url TEXT,                  -- Candidate portrait
  campaign_text TEXT,              -- Advocacy and platform statement
  age INT,                         -- Candidate age
  section TEXT                     -- Standardized Grade & Section
);

-- 3. Votes Table
CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
  candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
  position TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Partylists Table
CREATE TABLE partylists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  code TEXT,
  color TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Election Settings Table
CREATE TABLE election_settings (
  id INT PRIMARY KEY DEFAULT 1,
  end_time TIMESTAMPTZ             -- Election cutoff deadline
);

-- 6. Audit Logs Table
CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY,
  action TEXT NOT NULL,            -- Action code (e.g. VOTE_SUBMITTED)
  performed_by TEXT NOT NULL,      -- Actor (Admin, student name, System)
  details TEXT,                    -- Detailed event narrative
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 7. Troubleshooting & Administrator FAQ

**Q: Why are Admin accounts excluded from the Students List?**  
A: Admin accounts are reserved for faculty management. Counting them as student voters would skew total registration numbers and voter turnout percentages.

**Q: A student forgot their passcode. How is it reset?**  
A: Go to **Students List**, locate the student, and click the **Reset** button in the Passcode column. Enter the faculty administrative password to generate a new 6-character temporary passcode and copy it to the clipboard.

**Q: How do we resolve two students with the same name?**  
A: The system displays a Grade and Section badge next to the student's name in table rows and search results, and their 12-digit LRN uniquely identifies them in the database.

**Q: Can a student vote outside campus grounds?**  
A: If Geofencing is enabled, students outside the school's authorized 500-meter GPS perimeter will be prevented from submitting their ballot.

**Q: How do we deactivate a candidate without losing their vote history?**  
A: On the **Candidates List**, click the power toggle button on the candidate's card. This marks them as `[DEACTIVATED]`, hiding them from future ballots while preserving any previously cast votes.
