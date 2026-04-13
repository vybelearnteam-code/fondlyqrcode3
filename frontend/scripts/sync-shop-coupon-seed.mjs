import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const srcTxt = path.join(root, 'data', 'custom_coupon_lines.txt');
const outTs = path.join(root, 'src', 'data', 'shopCouponSeed.ts');

const lines = fs
  .readFileSync(srcTxt, 'utf8')
  .split(/\r?\n/)
  .map((l) => l.trim())
  .filter(Boolean);

const quoted = lines.map((c) => `  '${c.replace(/'/g, "\\'")}',`).join('\n');
const header = `/** Bundled shop coupons — source: \`data/custom_coupon_lines.txt\` (run \`node scripts/sync-shop-coupon-seed.mjs\` after edits). */\n`;

fs.mkdirSync(path.dirname(outTs), { recursive: true });
fs.writeFileSync(
  outTs,
  `${header}export const SHOP_COUPON_SEED: readonly string[] = [\n${quoted}\n] as const;\n`,
);
console.log(`Wrote ${outTs} (${lines.length} codes)`);
