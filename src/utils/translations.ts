export interface DropdownTranslations {
  title: string;
  contactSectionTitle: string;
  aboutSectionTitle: string;
  emailLabel: string;
  phoneLabel: string;
  locationLabel: string;
  electionProcess: string;
  votingRules: string;
  privacyPolicy: string;
  termsOfService: string;
  addressValue: string;
  electionProcessTitle: string;
  electionProcessContent: string;
  votingRulesTitle: string;
  votingRulesContent: string;
  privacyPolicyTitle: string;
  privacyPolicyContent: string;
  termsOfServiceTitle: string;
  termsOfServiceContent: string;
  closeButton: string;

  // System-Wide UI & Navigation Translations
  navDashboard: string;
  navVotersList: string;
  navAddCandidate: string;
  navRegisterStudent: string;
  navCountdown: string;
  navAuditLogs: string;
  navLiveResults: string;
  navDownloadPdf: string;
  navVerifyReceipt: string;
  logoutButton: string;
  settingsLabel: string;
  languageLabel: string;
  themeLabel: string;
  searchPlaceholder: string;
  totalVoters: string;
  totalVotesCast: string;
  turnoutLabel: string;

  // Login Page (AuthForm.tsx)
  loginTitle: string;
  studentLoginTab: string;
  adminLoginTab: string;
  lrnLabel: string;
  lrnPlaceholder: string;
  passwordLabel: string;
  passwordPlaceholder: string;
  loginSubmitBtn: string;
  adminAccessTitle: string;
  adminEmailLabel: string;
  adminPasswordLabel: string;

  // Dashboard (AdminSetup.tsx)
  adminDashboardTitle: string;
  adminDashboardSubtitle: string;
  activeCandidatesCard: string;
  enrolledVotersCard: string;
  turnoutPercentageCard: string;
  quickActionsTitle: string;

  // Voters Registry (AdminVotersList.tsx)
  votersRegistryTitle: string;
  votersRegistrySubtitle: string;
  allGradesOption: string;
  allStatusesOption: string;
  votedOnlyOption: string;
  pendingOnlyOption: string;
  tableColLrn: string;
  tableColName: string;
  tableColGradeSection: string;
  tableColStatus: string;
  tableColActions: string;
  votedBadge: string;
  pendingBadge: string;
  viewProfileBtn: string;

  // Student Registration (AdminRegister.tsx)
  registerTitle: string;
  registerSubtitle: string;
  singleStudentTab: string;
  bulkCsvTab: string;
  fullNameLabel: string;
  gradeLevelLabel: string;
  sectionLabel: string;
  ageLabel: string;
  autoGeneratePwdBtn: string;
  submitRegisterBtn: string;
  uploadCsvBtn: string;
  downloadSampleCsvBtn: string;
  confirmBulkImportBtn: string;

  // Add Candidate (AdminAddCandidate.tsx)
  addCandidateTitle: string;
  addCandidateSubtitle: string;
  candidateNameLabel: string;
  candidatePositionLabel: string;
  campaignPlatformLabel: string;
  saveCandidateBtn: string;

  // Election Countdown (AdminElectionSettings.tsx)
  countdownSettingsTitle: string;
  countdownSettingsSubtitle: string;
  setCutoffTimeLabel: string;
  saveTimerBtn: string;

  // Voting Ballot (BallotPage.tsx)
  ballotTitle: string;
  ballotSubtitle: string;
  selectOneInstruction: string;
  progressCompleted: string;
  reviewConfirmBtn: string;
  selectedBadge: string;

  // Vote Confirmation (ConfirmationScreen.tsx)
  voteSubmittedTitle: string;
  voteSubmittedMsg: string;
  downloadReceiptBtn: string;
  backToLoginBtn: string;

  // Results & Certificate (ResultsDashboard.tsx & DownloadResults.tsx)
  liveResultsTitle: string;
  liveResultsSubtitle: string;
  fullStandingsTitle: string;
  filterPositionLabel: string;
  certificateTabBtn: string;
  summaryTabBtn: string;
  exportPdfBtn: string;
  officialCertificateTitle: string;
  republicTitle: string;
}

export type LanguageCode = "en" | "tl" | "ceb";

export const translations: Record<LanguageCode, DropdownTranslations> = {
  en: {
    title: "About & Contact",
    contactSectionTitle: "Contact Info",
    aboutSectionTitle: "About Platform & Policies",
    emailLabel: "Email",
    phoneLabel: "Call",
    locationLabel: "Location",

    electionProcess: "Election Process",
    votingRules: "Official Voting Rules",
    privacyPolicy: "Privacy & Data Policy",
    termsOfService: "Terms of Service",
    addressValue: "Domingo Ledesma Mapa High School",

    electionProcessTitle: "Official SSG Election Process",
    electionProcessContent: "1. Authentication & Identity Verification: Log in using your 12-digit Learner Reference Number (LRN) and assigned access password.\n2. Candidate Platform & Profile Review: Review official candidate details, grade sections, and campaign manifestos for each position.\n3. Position-by-Position Ballot Selection: Select exactly one candidate for each executive and grade representative position.\n4. Submission Lock & Cryptographic Receipt: Confirm your ballot to cryptographically record your vote and generate your unique receipt code (REC-XXXX-XXXX).",

    votingRulesTitle: "Official Voting Rules & Integrity Standards",
    votingRulesContent: "1. Strict One Vote Per Registered Student: Each enrolled student is entitled to exactly one ballot. Duplicate submissions are hard-blocked by system locks.\n2. Irrevocability of Cast Ballots: Once submitted, your ballot is permanently encrypted and recorded. Votes cannot be edited, retrieved, or reset.\n3. Mandatory Credential Confidentiality: Keep your student password strictly confidential. Never share access credentials with other students or unauthorized persons.\n4. Zero Tolerance for Coercion & Fraud: Any attempt to buy votes, force selections, or tamper with system hardware will result in immediate disqualification and disciplinary sanctions.",

    privacyPolicyTitle: "Data Privacy & Voter Secrecy Guarantee",
    privacyPolicyContent: "1. Absolute Voter Anonymity: Your identity is cryptographically decoupled from your specific candidate selections to preserve 100% ballot secrecy.\n2. Essential Data Collection Only: We collect only basic administrative records (LRN, Full Name, Grade Level, and Section) required for voter eligibility verification.\n3. End-to-End Encryption & Security: All election data, password hashes, and receipts are stored using encrypted protocols with row-level security policies.\n4. Immutable Security Audit Trails: Administrative actions and system updates are logged in a tamper-proof audit trail to maintain total operational transparency.",

    termsOfServiceTitle: "Terms of Platform Service & Compliance",
    termsOfServiceContent: "1. Authorized Institutional Use: This voting platform is reserved exclusively for official Domingo Ledesma Mapa High School SSLG elections.\n2. Prohibition of Malicious Actions: Users are strictly forbidden from attempting SQL injections, reverse engineering, script bots, or denial-of-service attacks.\n3. Automated Election Cutoff Compliance: All voting activities automatically cease when the official countdown timer reaches 00:00:00.\n4. DepEd Regulatory Adherence: All electoral proceedings adhere strictly to Department of Education Supreme Secondary Learner Government (SSLG) election guidelines.",

    closeButton: "Close",

    navDashboard: "Dashboard",
    navVotersList: "Voters List",
    navAddCandidate: "Add Candidate",
    navRegisterStudent: "Register Student",
    navCountdown: "Election Countdown",
    navAuditLogs: "Audit Logs",
    navLiveResults: "Live Results",
    navDownloadPdf: "Download PDF",
    navVerifyReceipt: "Verify Ballot Receipt",
    logoutButton: "Logout",
    settingsLabel: "Settings",
    languageLabel: "Language",
    themeLabel: "Theme",
    searchPlaceholder: "Search...",
    totalVoters: "Total Registered Voters",
    totalVotesCast: "Total Votes Cast",
    turnoutLabel: "Voter Turnout",

    // Login Page
    loginTitle: "Student & Admin Voting Portal",
    studentLoginTab: "Student Voter",
    adminLoginTab: "Administrator",
    lrnLabel: "Learner Reference Number (LRN)",
    lrnPlaceholder: "Enter 12-digit LRN (e.g. 109876543210)",
    passwordLabel: "Access Password",
    passwordPlaceholder: "Enter your assigned password",
    loginSubmitBtn: "Log In to Cast Vote",
    adminAccessTitle: "Administrator Portal Login",
    adminEmailLabel: "Admin Email Address",
    adminPasswordLabel: "Admin Security Key",

    // Dashboard
    adminDashboardTitle: "Election Management Dashboard",
    adminDashboardSubtitle: "Real-time overview of voter turnout, registered candidates, and system status.",
    activeCandidatesCard: "Registered Candidates",
    enrolledVotersCard: "Total Enrolled Voters",
    turnoutPercentageCard: "Current Voter Turnout",
    quickActionsTitle: "Quick Management Actions",

    // Voters Registry
    votersRegistryTitle: "Official Student Voters Registry",
    votersRegistrySubtitle: "Manage registered student voters, verify voting status, and reset credentials.",
    allGradesOption: "All Grades",
    allStatusesOption: "All Statuses",
    votedOnlyOption: "Voted Only",
    pendingOnlyOption: "Pending Only",
    tableColLrn: "Learner LRN",
    tableColName: "Student Full Name",
    tableColGradeSection: "Grade & Section",
    tableColStatus: "Voting Status",
    tableColActions: "Actions",
    votedBadge: "Voted",
    pendingBadge: "Pending",
    viewProfileBtn: "View Profile",

    // Student Registration
    registerTitle: "Register Student Voters",
    registerSubtitle: "Add individual student accounts or bulk import entire class rosters via CSV.",
    singleStudentTab: "Single Student",
    bulkCsvTab: "Bulk CSV Import",
    fullNameLabel: "Full Student Name",
    gradeLevelLabel: "Grade Level",
    sectionLabel: "Section",
    ageLabel: "Age",
    autoGeneratePwdBtn: "Auto-Generate",
    submitRegisterBtn: "Submit Student Registration",
    uploadCsvBtn: "Select Roster CSV File",
    downloadSampleCsvBtn: "Download CSV Sample",
    confirmBulkImportBtn: "Confirm & Import All",

    // Add Candidate
    addCandidateTitle: "Candidate Registration",
    addCandidateSubtitle: "Enroll official candidates for the Supreme Secondary Learner Government election.",
    candidateNameLabel: "Candidate Full Name",
    candidatePositionLabel: "Target Position",
    campaignPlatformLabel: "Campaign Platform & Manifesto",
    saveCandidateBtn: "Save Candidate Profile",

    // Election Countdown
    countdownSettingsTitle: "Election Countdown & Cutoff Timer",
    countdownSettingsSubtitle: "Set the official election deadline. Voting automatically locks at cutoff.",
    setCutoffTimeLabel: "Set Election Cutoff Date & Time",
    saveTimerBtn: "Save Cutoff Timer",

    // Voting Ballot
    ballotTitle: "Official Student Election Ballot",
    ballotSubtitle: "Please review candidate profiles and select 1 candidate for each position.",
    selectOneInstruction: "Select one candidate per position",
    progressCompleted: "Completed",
    reviewConfirmBtn: "Submit & Cast Official Ballot",
    selectedBadge: "Selected",

    // Vote Confirmation
    voteSubmittedTitle: "Ballot Successfully Cast!",
    voteSubmittedMsg: "Your vote has been cryptographically recorded in the official election database.",
    downloadReceiptBtn: "Print / Download Digital Receipt",
    backToLoginBtn: "Return to Main Portal",

    // Results & Certificate
    liveResultsTitle: "Real-Time Election Results",
    liveResultsSubtitle: "Live vote tallies and candidate standings across all positions.",
    fullStandingsTitle: "Full Standings by Position",
    filterPositionLabel: "Filter Position",
    certificateTabBtn: "Certificate of Canvass",
    summaryTabBtn: "Summary Report",
    exportPdfBtn: "Export Official PDF",
    officialCertificateTitle: "Official Certificate of Canvass & Declaration of Winners",
    republicTitle: "Republic of the Philippines • Department of Education",
  },
  tl: {
    title: "Tungkol at Kontak",
    contactSectionTitle: "Impormasyon sa Pagkontak",
    aboutSectionTitle: "Impormasyon Ukol sa Halalan",
    emailLabel: "Mag-email",
    phoneLabel: "Tumawag",
    locationLabel: "Lokasyon",

    electionProcess: "Proseso ng Pagboto",
    votingRules: "Mga Alituntunin sa Pagboto",
    privacyPolicy: "Patakaran sa Pribasya at Datos",
    termsOfService: "Mga Tuntunin sa Serbisyo",
    addressValue: "Domingo Ledesma Mapa High School",

    electionProcessTitle: "Opisyal na Proseso ng Pagboto sa SSG",
    electionProcessContent: "1. Pagpapatunay ng Identidad: Mag-log in gamit ang iyong 12-digit Learner Reference Number (LRN) at ibinigay na password.\n2. Pagsusuri sa mga Kandidato: Suriin ang mga profile, seksyon, at platorma ng bawat kandidato para sa iba't ibang posisyon.\n3. Pagpili sa Balota: Pumili ng eksaktong isang kandidato sa bawat posisyon ng ehekutibo at kinatawan ng baitang.\n4. Pagsumite at Pagkuha ng Resibo: Kumpirmahin ang iyong balota upang mai-encrypt ang boto at makakuha ng natatanging receipt code (REC-XXXX-XXXX).",

    votingRulesTitle: "Mga Alituntunin at Patakaran sa Integridad ng Halalan",
    votingRulesContent: "1. Isang Boto Lamang Bawat Mag-aaral: Ang bawat rehistradong mag-aaral ay may karapatan sa iisang boto lamang. Awtomatikong nakaharang ang dobleng pagboto.\n2. Pinal na Ang Boto: Kapag naisumite na, pinal na ang iyong balota at hindi na ito maaaring baguhin, bawiin, o palitan.\n3. Pagpapanatili ng Lihim na Password: Panatilihing lihim ang iyong password at huwag itong ibabahagi sa ibang mag-aaral o kanino man.\n4. Bawal ang Pandaraya at Pamimilit: Ang anumang uri ng pagbili ng boto, pamimilit, o pagtatangkang sirain ang sistema ay papatawan ng mabigat na parusang disiplinaryo.",

    privacyPolicyTitle: "Patakaran sa Pribasya at Pagprotekta sa Datos",
    privacyPolicyContent: "1. Ganap na Lihim na Boto: Ang iyong pangalan ay hiwalay sa iyong mga piniling kandidato upang matiyak ang 100% lihim na pagboto.\n2. Pangunahing Impormasyon Lamang: Kinokolekta lamang ang LRN, Buong Pangalan, Baitang, at Seksyon para sa kumpirmasyon ng pagiging kwalipikado.\n3. Ligtas na Encryption: Ang lahat ng datos, password, at resibo ay naka-encrypt gamit ang modernong pamantayan ng seguridad.\n4. Maayos na Audit Logs: Ang lahat ng aktibidad ng admin at sistema ay naitala sa audit log upang matiyak ang katapatan ng halalan.",

    termsOfServiceTitle: "Mga Tuntunin at Kondisyon sa Paggamit",
    termsOfServiceContent: "1. Eksklusibong Paggamit: Ang portal na ito ay para lamang sa opisyal na halalan ng Domingo Ledesma Mapa High School SSG.\n2. Bawal ang Pagtatangkang Pag-hack: Mahigpit na ipinagbabawal ang paggamit ng automated scripts, SQL injection, o pag-atake sa seguridad ng portal.\n3. Pagsunod sa Cutoff Timer: Awtomatikong magsasara ang sistema ng pagboto kapag pumatak sa 00:00:00 ang opisyal na countdown timer.\n4. Pagsunod sa Alituntunin ng DepEd: Ang buong halalan ay sumusunod sa opisyal na mga alituntunin ng Department of Education para sa SSG.",

    closeButton: "Isara",

    navDashboard: "Dashboard",
    navVotersList: "Talaan ng Botante",
    navAddCandidate: "Magdagdag ng Kandidato",
    navRegisterStudent: "Magrehistro ng Mag-aaral",
    navCountdown: "Orasan ng Halalan",
    navAuditLogs: "Talaan ng Seguridad",
    navLiveResults: "Kasalukuyang Resulta",
    navDownloadPdf: "I-download ang PDF",
    navVerifyReceipt: "Suriin ang Resibo ng Boto",
    logoutButton: "Mag-log out",
    settingsLabel: "Mga Setting",
    languageLabel: "Wika",
    themeLabel: "Tema",
    searchPlaceholder: "Maghanap...",
    totalVoters: "Kabuuan ng Rehistradong Botante",
    totalVotesCast: "Kabuuan ng Naipasang Boto",
    turnoutLabel: "Bahagdan ng Bumoto",

    // Login Page
    loginTitle: "Portal ng Pagboto ng Mag-aaral at Admin",
    studentLoginTab: "Botanteng Mag-aaral",
    adminLoginTab: "Tagapamahala (Admin)",
    lrnLabel: "Learner Reference Number (LRN)",
    lrnPlaceholder: "Ipasok ang 12-digit LRN (hal. 109876543210)",
    passwordLabel: "Password sa Pagboto",
    passwordPlaceholder: "Ipasok ang iyong password",
    loginSubmitBtn: "Mag-log in para Bumoto",
    adminAccessTitle: "Portal ng Tagapamahala (Admin Login)",
    adminEmailLabel: "Email Address ng Admin",
    adminPasswordLabel: "Security Key ng Admin",

    // Dashboard
    adminDashboardTitle: "Dashboard ng Pamamahala ng Halalan",
    adminDashboardSubtitle: "Mabilisang pagtingin sa bahagdan ng bumoto, mga kandidato, at katayuan ng sistema.",
    activeCandidatesCard: "Rehistradong Kandidato",
    enrolledVotersCard: "Kabuuan ng Mag-aaral",
    turnoutPercentageCard: "Kasalukuyang Bumoto",
    quickActionsTitle: "Mabilisang Pamamahala",

    // Voters Registry
    votersRegistryTitle: "Opisyal na Talaan ng mga Botante",
    votersRegistrySubtitle: "Pamahalaan ang mga botante, suriin ang katayuan sa pagboto, at palitan ang password.",
    allGradesOption: "Lahat ng Antas",
    allStatusesOption: "Lahat ng Katayuan",
    votedOnlyOption: "Bumoto Na Lamang",
    pendingOnlyOption: "Hindi Pa Bumoto Lamang",
    tableColLrn: "LRN ng Mag-aaral",
    tableColName: "Buong Pangalan",
    tableColGradeSection: "Baitang at Seksyon",
    tableColStatus: "Katayuan",
    tableColActions: "Mga Aksyon",
    votedBadge: "Bumoto Na",
    pendingBadge: "Hindi Pa",
    viewProfileBtn: "Tingnan ang Profile",

    // Student Registration
    registerTitle: "Magrehistro ng Botanteng Mag-aaral",
    registerSubtitle: "Magdagdag ng indibidwal na mag-aaral o mag-import ng buong klase sa pamamagitan ng CSV.",
    singleStudentTab: "Isang Mag-aaral",
    bulkCsvTab: "Bultuhang CSV Import",
    fullNameLabel: "Buong Pangalan ng Mag-aaral",
    gradeLevelLabel: "Antas ng Baitang",
    sectionLabel: "Seksyon",
    ageLabel: "Edad",
    autoGeneratePwdBtn: "Kumuha ng Password",
    submitRegisterBtn: "Isumite ang Pagpaparehistro",
    uploadCsvBtn: "Pumili ng CSV File",
    downloadSampleCsvBtn: "I-download ang Halimbawang CSV",
    confirmBulkImportBtn: "Kumpirmahin at I-import Lahat",

    // Add Candidate
    addCandidateTitle: "Pagpaparehistro ng Kandidato",
    addCandidateSubtitle: "Magrehistro ng opisyal na kandidato para sa halalan ng Supreme Secondary Learner Government.",
    candidateNameLabel: "Buong Pangalan ng Kandidato",
    candidatePositionLabel: "Posisyong Inaasim",
    campaignPlatformLabel: "Platorma at Layunin",
    saveCandidateBtn: "I-save ang Profile ng Kandidato",

    // Election Countdown
    countdownSettingsTitle: "Orasan at Hangganan ng Halalan",
    countdownSettingsSubtitle: "Itakda ang opisyal na oras ng pagtatapos ng halalan.",
    setCutoffTimeLabel: "Itakda ang Petsa at Oras ng Pagtatapos",
    saveTimerBtn: "I-save ang Orasan",

    // Voting Ballot
    ballotTitle: "Opisyal na Balota ng Halalan",
    ballotSubtitle: "Mangyaring suriin ang mga kandidato at pumili ng 1 kandidato kada posisyon.",
    selectOneInstruction: "Pumili ng isang kandidato sa bawat posisyon",
    progressCompleted: "Kumpleto Na",
    reviewConfirmBtn: "Isumite ang Opisyal na Boto",
    selectedBadge: "Napili Na",

    // Vote Confirmation
    voteSubmittedTitle: "Matagumpay na Naisumite ang Boto!",
    voteSubmittedMsg: "Ang iyong boto ay ligtas at opisyal na naitala sa ating database.",
    downloadReceiptBtn: "I-print / I-download ang Resibo",
    backToLoginBtn: "Bumalik sa Main Portal",

    // Results & Certificate
    liveResultsTitle: "Kasalukuyang Resulta ng Halalan",
    liveResultsSubtitle: "Real-time na bilang ng boto at rankings ng mga kandidato.",
    fullStandingsTitle: "Buong Resulta kada Posisyon",
    filterPositionLabel: "Posisyon",
    certificateTabBtn: "Sertipiko ng Pagpoproseso",
    summaryTabBtn: "Buod ng Resulta",
    exportPdfBtn: "I-export ang Opisyal na PDF",
    officialCertificateTitle: "Opisyal na Sertipiko ng Pagpoproseso at Deklarasyon ng mga Nagwagi",
    republicTitle: "Republika ng Pilipinas • Kagawaran ng Edukasyon",
  },
  ceb: {
    title: "Bahin sa Sistema ug Kontak",
    contactSectionTitle: "Mga Pamaagi sa Pagkontak",
    aboutSectionTitle: "Mahitungod sa Eleksyon",
    emailLabel: "Padad-i og Email",
    phoneLabel: "Tawag o Kontaka",
    locationLabel: "Lokasyon",

    electionProcess: "Pamaagi sa Pagboto",
    votingRules: "Opisyal nga Lagda sa Pagboto",
    privacyPolicy: "Polisiya sa Pribasya ug Datos",
    termsOfService: "Mga Kondisyon sa Serbisyo",
    addressValue: "Domingo Ledesma Mapa High School",

    electionProcessTitle: "Opisyal nga Pamaagi sa Pagboto sa SSG",
    electionProcessContent: "1. Pag-kumpirma sa Identidad: Pag-log in gamit ang imong 12-digit Learner Reference Number (LRN) ug gihatag nga password.\n2. Pagsusi sa mga Kandidato: Basaha ang mga profile, seksyon, ug platorma sa bawat kandidato sa matag posisyon.\n3. Pagpili sa Balota: Pili og usa lang ka kandidato kada posisyon sa ehekutibo ug representante sa grade level.\n4. Pag-submit ug Pagkuha og Resibo: Kumpirmaha ang imong balota aron ma-encrypt ang boto ug makakuha og resibo code (REC-XXXX-XXXX).",

    votingRulesTitle: "Mga Opisyal nga Lagda ug Integridad sa Eleksyon",
    votingRulesContent: "1. Usa Lang Ka Boto Kada Estudyante: Ang matag rehistradong estudyante adunay katungod sa usa lang ka boto. Dili gyud pwede ang magdoble.\n2. Pinal Na Ang Boto: Kung ma-submit na gani, pinal na ang imong boto ug dili na gyud kini mausab o mabawi.\n3. Pagpreserba sa Password: Itago nga sekreto ang imong password ug ayaw kini ipahibalo sa uban.\n4. Bawal Ang Pagpanglimbong ug Pagpamugos: Ang bisan unsang pagsulay sa pagpalit og boto, pagpamugos, o pag-hack sa sistema adunay bug-at nga silot sa eskwelahan.",

    privacyPolicyTitle: "Polisa sa Pribasya ug Proteksyon sa Datos",
    privacyPolicyContent: "1. Sekreto nga Boto: Ang imong pangalan kay separado sa imong mga gipili nga kandidato aron masiguro ang 100% nga sekreto sa pagboto.\n2. Importante Lang Nga Datos: Ang LRN, Tibuok Ngalan, Grade Level, ug Seksyon lang ang ginakolekta alang sa pag-verify sa imong pagkabotante.\n3. Luwas Nga Encryption: Ang tanang datos, password, ug resibo kay gi-encrypt gamit ang pinakabag-ong standard sa seguridad.\n4. Transparent Nga Audit Trail: Ang tanang kalihokan sa admin kay gi-record sa audit log aron masiguro ang katapatan sa eleksyon.",

    termsOfServiceTitle: "Mga Kondisyon sa Paggamit sa Sistema",
    termsOfServiceContent: "1. Paggamit sa Eskwelahan Lang: Kini nga portal kay alang lang sa opisyal nga eleksyon sa Domingo Ledesma Mapa High School SSG.\n2. Bawal Ang Pagsulay sa Pag-hack: Dili gyud gitugotan ang paggamit og scripts, bots, o pagsulay sa pag-guba sa seguridad sa sistema.\n3. Pagsunod sa Cutoff Timer: Awtomatikong magsa-ra ang pagboto inig abot sa 00:00:00 sa opisyal nga countdown timer.\n4. Pagsunod sa Lagda sa DepEd: Ang tanang proseso sa eleksyon kay nagsunod sa opisyal nga mga direktiba sa Department of Education alang sa SSG.",

    closeButton: "Isira",

    navDashboard: "Dashboard",
    navVotersList: "Lista sa mga Botante",
    navAddCandidate: "Magdugang og Kandidato",
    navRegisterStudent: "Magrehistro og Estudyante",
    navCountdown: "Orasan sa Eleksyon",
    navAuditLogs: "Talaan sa Seguridad",
    navLiveResults: "Kasalukuyang Resulta",
    navDownloadPdf: "I-download ang PDF",
    navVerifyReceipt: "Siguroha ang Resibo sa Boto",
    logoutButton: "Mag-log out",
    settingsLabel: "Mga Setting",
    languageLabel: "Pinulongan",
    themeLabel: "Tema",
    searchPlaceholder: "Pangitaa...",
    totalVoters: "Tanan nga Rehistradong Botante",
    totalVotesCast: "Tanan nga Na-submit nga Boto",
    turnoutLabel: "Tubag sa Botante",

    // Login Page
    loginTitle: "Portal sa Pagboto sa Estudyante ug Admin",
    studentLoginTab: "Botanteng Estudyante",
    adminLoginTab: "Administrator",
    lrnLabel: "Learner Reference Number (LRN)",
    lrnPlaceholder: "Ibutang ang 12-digit LRN (e.g. 109876543210)",
    passwordLabel: "Password sa Pagboto",
    passwordPlaceholder: "Ibutang ang imong password",
    loginSubmitBtn: "Mag-log in para Moboto",
    adminAccessTitle: "Portal sa Administrator (Admin Login)",
    adminEmailLabel: "Email Address sa Admin",
    adminPasswordLabel: "Security Key sa Admin",

    // Dashboard
    adminDashboardTitle: "Dashboard sa Pagdumala sa Eleksyon",
    adminDashboardSubtitle: "Dali nga pagtan-aw sa ihap sa nagboto, mga kandidato, ug status sa sistema.",
    activeCandidatesCard: "Rehistradong Kandidato",
    enrolledVotersCard: "Tanan nga Estudyante",
    turnoutPercentageCard: "Karon nga Naka-boto",
    quickActionsTitle: "Dali nga Pagdumala",

    // Voters Registry
    votersRegistryTitle: "Opisyal nga Talaan sa mga Botante",
    votersRegistrySubtitle: "Duma-ala ang mga botante, siguroha ang status sa pagboto, ug bag-oha ang password.",
    allGradesOption: "Tanan nga Grade",
    allStatusesOption: "Tanan nga Status",
    votedOnlyOption: "Naka-boto Na Lang",
    pendingOnlyOption: "Wala Pa Kaboto Lang",
    tableColLrn: "LRN sa Estudyante",
    tableColName: "Tibuok Ngalan",
    tableColGradeSection: "Grade ug Seksyon",
    tableColStatus: "Status",
    tableColActions: "Mga Aksyon",
    votedBadge: "Naka-boto Na",
    pendingBadge: "Wala Pa",
    viewProfileBtn: "Tan-awa ang Profile",

    // Student Registration
    registerTitle: "Magrehistro og Botanteng Estudyante",
    registerSubtitle: "Magdugang og usag-usa nga estudyante o mag-import og tibuok klase pinaagi sa CSV.",
    singleStudentTab: "Usa ka Estudyante",
    bulkCsvTab: "Bulk CSV Import",
    fullNameLabel: "Tibuok Ngalan sa Estudyante",
    gradeLevelLabel: "Grade Level",
    sectionLabel: "Seksyon",
    ageLabel: "Edad",
    autoGeneratePwdBtn: "Auto-Generate",
    submitRegisterBtn: "I-submit ang Pagrehistro",
    uploadCsvBtn: "Pili og CSV File",
    downloadSampleCsvBtn: "I-download ang Sampol nga CSV",
    confirmBulkImportBtn: "Kumpirmaha ug I-import Tanan",

    // Add Candidate
    addCandidateTitle: "Pagparehistro sa Kandidato",
    addCandidateSubtitle: "Magrehistro og opisyal nga kandidato alang sa eleksyon sa Supreme Secondary Learner Government.",
    candidateNameLabel: "Tibuok Ngalan sa Kandidato",
    candidatePositionLabel: "Posisyon",
    campaignPlatformLabel: "Platorma ug Manifesto",
    saveCandidateBtn: "I-save ang Profile sa Kandidato",

    // Election Countdown
    countdownSettingsTitle: "Orasan ug Katapusan sa Eleksyon",
    countdownSettingsSubtitle: "I-set ang opisyal nga oras sa pagtapos sa eleksyon.",
    setCutoffTimeLabel: "I-set ang Petsa ug Oras sa Katapusan",
    saveTimerBtn: "I-save ang Orasan",

    // Voting Ballot
    ballotTitle: "Opisyal nga Balota sa Eleksyon",
    ballotSubtitle: "Palihug tan-awa ang mga kandidato ug pili og 1 ka kandidato kada posisyon.",
    selectOneInstruction: "Pili og usa ka kandidato kada posisyon",
    progressCompleted: "Kumpleto Na",
    reviewConfirmBtn: "I-submit ang Opisyal nga Boto",
    selectedBadge: "Na-pili Na",

    // Vote Confirmation
    voteSubmittedTitle: "Malamposong Na-submit ang Boto!",
    voteSubmittedMsg: "Ang imong boto kay luwas ug opisyal nga napasa sa atong database.",
    downloadReceiptBtn: "I-print / I-download ang Resibo",
    backToLoginBtn: "Babalik sa Main Portal",

    // Results & Certificate
    liveResultsTitle: "Kasalukuyang Resulta sa Eleksyon",
    liveResultsSubtitle: "Real-time nga ihap sa boto ug baruganan sa mga kandidato.",
    fullStandingsTitle: "Tanan nga Boto kada Posisyon",
    filterPositionLabel: "Posisyon",
    certificateTabBtn: "Sertipiko sa Pagproseso",
    summaryTabBtn: "Redyus nga Resulta",
    exportPdfBtn: "I-export ang Opisyal nga PDF",
    officialCertificateTitle: "Opisyal nga Sertipiko sa Pagproseso ug Deklarasyon sa mga Nidaog",
    republicTitle: "Republika sa Pilipinas • Kagawaran sa Edukasyon",
  },
};
