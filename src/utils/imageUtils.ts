/**
 * Convert a File object directly to a displayable Data URL string.
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(reader.result as string);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Return a displayable image URL directly.
 */
export function base64ToImageUrl(base64OrUrl: string | null | undefined): string | null {
  if (!base64OrUrl) return null;
  const cleaned = base64OrUrl.trim();
  if (!cleaned) return null;
  if (cleaned.startsWith("data:") || cleaned.startsWith("http")) {
    return cleaned;
  }
  return `data:image/jpeg;base64,${cleaned}`;
}

const FEMALE_NAME_TOKENS = new Set([
  "maria", "sofia", "samantha", "angelica", "bea", "beatrice", "chloe", "elaine",
  "patricia", "nicole", "alyssa", "faith", "glea", "greatchen", "bing", "evelyn",
  "hannah", "trisha", "claire", "bianca", "ana", "kristine", "jasmine", "camille",
  "cherry", "julia", "mary", "rose", "grace", "joy", "ma.", "elizabeth", "sarah",
  "kathryn", "jane", "liza", "kim", "catherine", "andrea", "denise", "karen"
]);

/**
 * Check whether a person's name likely corresponds to a female student.
 */
export function isLikelyFemale(name?: string): boolean {
  if (!name) return false;
  const tokens = name.toLowerCase().split(/[\s,.-]+/);
  return tokens.some((token) => FEMALE_NAME_TOKENS.has(token));
}

/**
 * Deterministically compute a numeric hash for stable photo assignment.
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Returns a high-definition, realistic photographic portrait for a student or candidate.
 * Guarantees a realistic human headshot instead of cartoon avatars or initials.
 */
export function getRealisticFallbackPhoto(name?: string, id?: string): string {
  const seedKey = `${name || "student"}_${id || ""}`;
  const hash = hashString(seedKey);
  const female = isLikelyFemale(name);

  // RandomUser portraits range 1 to 90
  const index = (hash % 85) + 1;

  if (female) {
    return `https://randomuser.me/api/portraits/women/${index}.jpg`;
  } else {
    return `https://randomuser.me/api/portraits/men/${index}.jpg`;
  }
}

/**
 * Get the realistic photo for a student voter.
 * Respects uploaded base64/custom photos, ignores broken or cartoon avatars,
 * and defaults to high-quality realistic photographic portraits.
 */
export function getStudentPhoto(
  photoUrl: string | null | undefined,
  name?: string,
  id?: string
): string {
  const url = base64ToImageUrl(photoUrl);
  if (url && !url.includes("dicebear") && !url.includes("ui-avatars")) {
    return url;
  }
  return getRealisticFallbackPhoto(name, id);
}

/**
 * Get the realistic photo for a candidate.
 * Respects uploaded base64/custom photos, ignores broken or cartoon avatars,
 * and defaults to high-quality realistic photographic portraits.
 */
export function getCandidatePhoto(
  imageUrl: string | null | undefined,
  name?: string,
  id?: string
): string {
  const url = base64ToImageUrl(imageUrl);
  if (url && !url.includes("dicebear") && !url.includes("ui-avatars")) {
    return url;
  }
  return getRealisticFallbackPhoto(name, id);
}
