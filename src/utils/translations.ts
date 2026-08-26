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
}

export type LanguageCode = "en" | "tl" | "ceb";

export const translations: Record<LanguageCode, DropdownTranslations> = {
  en: {
    title: "About & Contact",
    contactSectionTitle: "Contact Info",
    aboutSectionTitle: "About",
    emailLabel: "Email",
    phoneLabel: "Call",
    locationLabel: "Location",

    electionProcess: "Election Process",
    votingRules: "Official Voting Rules",
    privacyPolicy: "Privacy & Data Policy",
    termsOfService: "Terms of Service",
    addressValue: "",
    electionProcessTitle: "Election Process",
    electionProcessContent: "1. Log in with your Student ID and password.\n2. Go to the Ballot page and select your preferred candidates.\n3. Verify your selections on the confirmation screen.\n4. Cast your vote and print or download your digital receipt.",
    votingRulesTitle: "Official Voting Rules",
    votingRulesContent: "• One vote per registered student. Multiple submissions are strictly blocked.\n• Once cast, votes are final and cannot be modified or retrieved.\n• Keep your password and login credentials strictly confidential.\n• Any form of coercion or voter manipulation will result in strict disciplinary action.",
    privacyPolicyTitle: "Privacy & Data Policy",
    privacyPolicyContent: "Your student credentials, voting choices, and activity records are encrypted and stored securely. We only collect essential information required to verify your eligibility. No individual voting records are shared with third parties or administrators; all results are aggregated anonymously to preserve absolute secrecy.",
    termsOfServiceTitle: "Terms of Service",
    termsOfServiceContent: "By accessing this voting portal, you agree to use it solely for legitimate voting purposes. You shall not attempt to bypass security, reverse engineer, or exploit any vulnerabilities in this system. Unauthorized access or interference with the electronic electoral process will be subject to academic sanctions and legal penalties.",
    closeButton: "Close",
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
    addressValue: "",
    electionProcessTitle: "Proseso ng Pagboto",
    electionProcessContent: "1. Mag-log in gamit ang iyong Student ID at password.\n2. Pumunta sa pahina ng Balota at piliin ang iyong mga kandidato.\n3. Suriin ang iyong mga napili sa confirmation screen.\n4. Isumite ang iyong boto at i-download o i-print ang iyong digital na resibo.",
    votingRulesTitle: "Mga Patakaran sa Pagboto",
    votingRulesContent: "• Isang boto lamang bawat rehistradong mag-aaral. Hindi puwede ang dobleng pagsusumite.\n• Kapag naipasa na, pinal na ang boto at hindi na maaaring baguhin o bawiin.\n• Panatilihing sikreto ang iyong password at login credentials.\n• Anumang uri ng pamimilit o pandaraya ay may kaukulang parusang disiplinaryo mula sa paaralan.",
    privacyPolicyTitle: "Patakaran sa Privacy at Datos",
    privacyPolicyContent: "Ang iyong impormasyon, piniling kandidato, at aktibidad sa pagboto ay naka-encrypt at ligtas na nakaimbak. Kinokolekta lamang namin ang mga kinakailangang detalye para kumpirmahin ang iyong pagiging kwalipikado. Walang indibidwal na talaan ng boto ang ibabahagi sa iba; ang lahat ng resulta ay pinagsasama nang walang pangalan upang matiyak ang pagiging pribado.",
    termsOfServiceTitle: "Mga Tuntunin sa Serbisyo",
    termsOfServiceContent: "Sa paggamit ng portal na ito, sumasang-ayon ka na gamitin ito para lamang sa lehitimong pagboto. Bawal subukang labagin ang seguridad, baguhin ang sistema, o samantalahin ang anumang kahinaan nito. Ang hindi awtorisadong pag-access o pakikialam sa halalan ay may kaukulang parusa sa ilalim ng regulasyon ng paaralan.",
    closeButton: "Isara",
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
    addressValue: "",
    electionProcessTitle: "Pamaagi sa Pagboto",
    electionProcessContent: "1. Pag-log in gamit ang imong Student ID ug password.\n2. Adto sa pahina sa Balota (Ballot) ug pilia ang imong mga kandidato.\n3. Siguroha ang imong mga gipili sa confirmation screen.\n4. Isumite ang imong boto ug i-download o i-print ang imong digital nga resibo.",
    votingRulesTitle: "Opisyal nga Lagda sa Pagboto",
    votingRulesContent: "• Usa ka boto lang kada rehistradong estudyante. Dili gyud pwede magdoble ang pag-submit.\n• Kung ma-submit na, pinal na ang imong boto ug dili na pwede mausab o mabawi.\n• Ayaw ipasaba o ipanghatag ang imong password ug login credentials.\n• Ang bisan unsang klase sa pagpamugos o pagpanglimbong adunay silot sa disiplina sa eskwelahan.",
    privacyPolicyTitle: "Polisa sa Pribasya ug Proteksyon sa Datos",
    privacyPolicyContent: "Ang imong impormasyon, mga napili nga kandidato, ug kalihokan sa pagboto kay naka-encrypt ug luwas nga gitipigan. Mangolekta lang kami sa mga importanteng detalye aron masiguro nga ikaw rehistradong estudyante. Dili namo i-share ang imong indibidwal nga boto sa bisan kinsa; ang tanang resulta kay isagol nga walay mga ngalan aron mapabilin nga sekreto ang imong boto.",
    termsOfServiceTitle: "Mga Kondisyon sa Paggamit sa Serbisyo",
    termsOfServiceContent: "Pinaagi sa paggamit niini nga portal sa pagboto, miuyon ka nga gamiton lang kini sa saktong pagboto. Gidili ang pagsulay sa pag-hack, pag-usab sa code, o pagpahimulos sa bisan unsang depekto sa sistema. Ang dili awtorisadong pagsulod o pagpang-abala sa eleksyon kay adunay silot sa eskwelahan ug silot sa balaod.",
    closeButton: "Isira",
  },
};
