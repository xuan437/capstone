/**
 * Official Fixed Sections Configuration for SSLG Election
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
  G11: ["TechPro", "ACADS"],
  G12: ["GAS", "TVL"],
  "Grade 7": ["Lopez", "Ebora"],
  "Grade 8": ["Sapa", "Bautista"],
  "Grade 9": ["Libaton", "Fuentes"],
  "Grade 10": ["Timowain", "Ambot"],
  "Grade 11": ["TechPro", "ACADS"],
  "Grade 12": ["GAS", "TVL"],
};

export const ALL_CANDIDATE_SECTIONS: SectionDefinition[] = [
  // Grade 7
  { grade: "Grade 7", gradeCode: "G7", section: "Lopez", fullLabel: "Gr. 7 - Lopez", value: "Grade 7 - Lopez" },
  { grade: "Grade 7", gradeCode: "G7", section: "Ebora", fullLabel: "Gr. 7 - Ebora", value: "Grade 7 - Ebora" },

  // Grade 8
  { grade: "Grade 8", gradeCode: "G8", section: "Sapa", fullLabel: "Gr. 8 - Sapa", value: "Grade 8 - Sapa" },
  { grade: "Grade 8", gradeCode: "G8", section: "Bautista", fullLabel: "Gr. 8 - Bautista", value: "Grade 8 - Bautista" },

  // Grade 9
  { grade: "Grade 9", gradeCode: "G9", section: "Libaton", fullLabel: "Gr. 9 - Libaton", value: "Grade 9 - Libaton" },
  { grade: "Grade 9", gradeCode: "G9", section: "Fuentes", fullLabel: "Gr. 9 - Fuentes", value: "Grade 9 - Fuentes" },

  // Grade 10
  { grade: "Grade 10", gradeCode: "G10", section: "Timowain", fullLabel: "Gr. 10 - Timowain", value: "Grade 10 - Timowain" },
  { grade: "Grade 10", gradeCode: "G10", section: "Ambot", fullLabel: "Gr. 10 - Ambot", value: "Grade 10 - Ambot" },

  // Grade 11
  { grade: "Grade 11", gradeCode: "G11", section: "TechPro", fullLabel: "Gr. 11 - TechPro", value: "Grade 11 - TechPro" },
  { grade: "Grade 11", gradeCode: "G11", section: "ACADS", fullLabel: "Gr. 11 - ACADS", value: "Grade 11 - ACADS" },

  // Grade 12
  { grade: "Grade 12", gradeCode: "G12", section: "GAS", fullLabel: "Gr. 12 - GAS", value: "Grade 12 - GAS" },
  { grade: "Grade 12", gradeCode: "G12", section: "TVL", fullLabel: "Gr. 12 - TVL", value: "Grade 12 - TVL" },
];

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
  "TechPro",
  "ACADS",
  "GAS",
  "TVL",
];
