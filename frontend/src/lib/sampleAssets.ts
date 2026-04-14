/** Sample wheel segment image (round ~28px in UI); replace in Admin → Rewards if needed. */
export const SAMPLE_WHEEL_IMAGE_URL =
  'https://drive.google.com/uc?export=view&id=1CTWgVfuoyOCnBlm6KfAcHXHqZFhvWXhk';

/** Remove "20%" / "%" style marketing from titles shown on spin + reward screens. */
export function stripPercentMarketingTitle(title: string): string {
  return title
    .replace(/\b\d{1,3}\s*%/gi, '')
    .replace(/%/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/^\s+|\s+$/g, '');
}
