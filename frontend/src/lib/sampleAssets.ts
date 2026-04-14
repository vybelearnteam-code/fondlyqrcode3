/** Sample wheel segment image (round ~28px in UI); replace in Admin → Rewards if needed. */
export const SAMPLE_WHEEL_IMAGE_URL =
  'https://drive.google.com/uc?export=view&id=1CTWgVfuoyOCnBlm6KfAcHXHqZFhvWXhk';

/** Raw share link (for humans) for the same sample image above. */
export const SAMPLE_WHEEL_IMAGE_SHARE_URL =
  'https://drive.google.com/file/d/1CTWgVfuoyOCnBlm6KfAcHXHqZFhvWXhk/view?usp=drive_link';

function extractGoogleDriveId(raw: string): string | null {
  const text = raw.trim();
  const byFilePath = text.match(/drive\.google\.com\/file\/d\/([^/]+)/i);
  if (byFilePath?.[1]) return byFilePath[1];
  const byQuery = text.match(/[?&]id=([A-Za-z0-9_-]+)/);
  if (byQuery?.[1]) return byQuery[1];
  return null;
}

/** Convert Google Drive share/preview links to a direct image URL when possible. */
export function normalizeWheelImageUrl(raw: string): string {
  const text = raw.trim();
  if (!text) return '';
  const id = extractGoogleDriveId(text);
  if (!id) return text;
  return `https://drive.google.com/uc?export=view&id=${id}`;
}

/** Remove "20%" / "%" style marketing from titles shown on spin + reward screens. */
export function stripPercentMarketingTitle(title: string): string {
  return title
    .replace(/\b\d{1,3}\s*%/gi, '')
    .replace(/%/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/^\s+|\s+$/g, '');
}
