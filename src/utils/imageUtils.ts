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
  if (base64OrUrl.startsWith("data:") || base64OrUrl.startsWith("http")) {
    return base64OrUrl;
  }
  return `data:image/jpeg;base64,${base64OrUrl}`;
}
