/**
 * Official Fixed Sections & Grade Configuration for SSLG Election
 * Both Candidates and Voters are restricted to these official sections per grade level.
 */

export interface SectionDefinition {
  grade: string;
  gradeCode: string;
  section: string;
  fullLabel: string;
  value: string;
}

export const FIXED_GRADE_LEVELS = [
  { code: "G7", label: "Grade 7", num: 7 },
  { code: "G8", label: "Grade 8", num: 8 },
  { code: "G9", label: "Grade 9", num: 9 },
  { code: "G10", label: "Grade 10", num: 10 },
  { code: "G11", label: "Grade 11", num: 11 },
  { code: "G12", label: "Grade 12", num: 12 },
] as const;

export const FIXED_SECTIONS_BY_GRADE: Record<string, string[]> = {
  G7: ["Lopez", "Ebora"],
  G8: ["Sapa", "Bautista"],
  G9: ["Libaton", "Fuentes"],
  G10: ["Timowain", "Ambot"],
  G11: ["TECHPRO", "ACADS", "STEM-A", "HUMSS"],
  G12: ["GAS", "TVL", "STEM-A", "HUMSS", "Luna"],
  "Grade 7": ["Lopez", "Ebora"],
  "Grade 8": ["Sapa", "Bautista"],
  "Grade 9": ["Libaton", "Fuentes"],
  "Grade 10": ["Timowain", "Ambot"],
  "Grade 11": ["TECHPRO", "ACADS", "STEM-A", "HUMSS"],
  "Grade 12": ["GAS", "TVL", "STEM-A", "HUMSS", "Luna"],
};

export const ALL_CANDIDATE_SECTIONS: SectionDefinition[] = [
  // Grade 7
  { grade: "Grade 7", gradeCode: "G7", section: "Lopez", fullLabel: "Grade 7 - Lopez", value: "Grade 7 - Lopez" },
  { grade: "Grade 7", gradeCode: "G7", section: "Ebora", fullLabel: "Grade 7 - Ebora", value: "Grade 7 - Ebora" },

  // Grade 8
  { grade: "Grade 8", gradeCode: "G8", section: "Sapa", fullLabel: "Grade 8 - Sapa", value: "Grade 8 - Sapa" },
  { grade: "Grade 8", gradeCode: "G8", section: "Bautista", fullLabel: "Grade 8 - Bautista", value: "Grade 8 - Bautista" },

  // Grade 9
  { grade: "Grade 9", gradeCode: "G9", section: "Libaton", fullLabel: "Grade 9 - Libaton", value: "Grade 9 - Libaton" },
  { grade: "Grade 9", gradeCode: "G9", section: "Fuentes", fullLabel: "Grade 9 - Fuentes", value: "Grade 9 - Fuentes" },

  // Grade 10
  { grade: "Grade 10", gradeCode: "G10", section: "Timowain", fullLabel: "Grade 10 - Timowain", value: "Grade 10 - Timowain" },
  { grade: "Grade 10", gradeCode: "G10", section: "Ambot", fullLabel: "Grade 10 - Ambot", value: "Grade 10 - Ambot" },

  // Grade 11
  { grade: "Grade 11", gradeCode: "G11", section: "TECHPRO", fullLabel: "Grade 11 - TECHPRO", value: "Grade 11 - TECHPRO" },
  { grade: "Grade 11", gradeCode: "G11", section: "ACADS", fullLabel: "Grade 11 - ACADS", value: "Grade 11 - ACADS" },
  { grade: "Grade 11", gradeCode: "G11", section: "STEM-A", fullLabel: "Grade 11 - STEM-A", value: "Grade 11 - STEM-A" },
  { grade: "Grade 11", gradeCode: "G11", section: "HUMSS", fullLabel: "Grade 11 - HUMSS", value: "Grade 11 - HUMSS" },

  // Grade 12
  { grade: "Grade 12", gradeCode: "G12", section: "GAS", fullLabel: "Grade 12 - GAS", value: "Grade 12 - GAS" },
  { grade: "Grade 12", gradeCode: "G12", section: "TVL", fullLabel: "Grade 12 - TVL", value: "Grade 12 - TVL" },
  { grade: "Grade 12", gradeCode: "G12", section: "STEM-A", fullLabel: "Grade 12 - STEM-A", value: "Grade 12 - STEM-A" },
  { grade: "Grade 12", gradeCode: "G12", section: "HUMSS", fullLabel: "Grade 12 - HUMSS", value: "Grade 12 - HUMSS" },
  { grade: "Grade 12", gradeCode: "G12", section: "Luna", fullLabel: "Grade 12 - Luna", value: "Grade 12 - Luna" },
];

/**
 * Standardize strand codes to UPPERCASE (e.g. Stem -> STEM, humss -> HUMSS)
 */
export function normalizeStrand(strandOrSection: string): string {
  if (!strandOrSection) return "";
  const trimmed = strandOrSection.trim();
  const upper = trimmed.toUpperCase();
  
  if (upper === "STEM" || upper === "STEM-A") return "STEM-A";
  if (upper === "GAS") return "GAS";
  if (upper === "TVL") return "TVL";
  if (upper === "HUMSS") return "HUMSS";
  if (upper === "TECHPRO") return "TECHPRO";
  if (upper === "ACADS") return "ACADS";

  return trimmed;
}

/**
 * Formats any combination of grade and section into the uniform:
 * "Grade X - Section" format (e.g. "Grade 12 - STEM-A", "Grade 7 - Lopez")
 */
export function formatGradeSection(grade?: string, section?: string): string {
  const g = (grade || "").trim();
  const s = normalizeStrand((section || "").trim());

  // If section already contains "Grade X - Section" or "Gr. X - Section"
  if (s.includes(" - ")) {
    const parts = s.split(" - ");
    const gradePart = parts[0].trim();
    const secPart = normalizeStrand(parts[1].trim());
    const numMatch = gradePart.match(/\d+/);
    if (numMatch) {
      return `Grade ${numMatch[0]} - ${secPart}`;
    }
    return `${gradePart} - ${secPart}`;
  }

  // Determine grade number
  let gradeNum: string | null = null;
  const numMatch = g.match(/\d+/);
  if (numMatch) {
    gradeNum = numMatch[0];
  } else {
    // Check if section contains a grade hint
    const sMatch = s.match(/\b(G|Grade\s*)(\d+)\b/i);
    if (sMatch) {
      gradeNum = sMatch[2];
    }
  }

  if (gradeNum && s) {
    return `Grade ${gradeNum} - ${s}`;
  }
  if (gradeNum) {
    return `Grade ${gradeNum}`;
  }
  if (s) {
    return s;
  }
  return "Grade & Section N/A";
}

/**
 * Returns list of allowed section names for a given grade string (e.g. "G7", "Grade 7", "7")
 */
export function getSectionsForGrade(gradeKey: string): string[] {
  if (!gradeKey) return [];
  const normalized = gradeKey.trim().toUpperCase();
  
  if (FIXED_SECTIONS_BY_GRADE[normalized]) {
    return FIXED_SECTIONS_BY_GRADE[normalized];
  }

  // Handle "G7", "GRADE 7", "7"
  const numMatch = normalized.match(/\d+/);
  if (numMatch) {
    const num = numMatch[0];
    const key = `G${num}`;
    if (FIXED_SECTIONS_BY_GRADE[key]) {
      return FIXED_SECTIONS_BY_GRADE[key];
    }
  }

  return [];
}

/**
 * Returns all sections as a flat array of unique section names
 */
export const ALL_UNIQUE_SECTIONS = [
  "Lopez",
  "Ebora",
  "Sapa",
  "Bautista",
  "Libaton",
  "Fuentes",
  "Timowain",
  "Ambot",
  "TECHPRO",
  "ACADS",
  "STEM-A",
  "HUMSS",
  "GAS",
  "TVL",
  "Luna",
];
