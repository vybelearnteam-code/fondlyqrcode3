/**
 * Generate shop-style coupons: `FD` + 4 chars from A–Z and 0–9 (same shape as custom_coupon_lines.txt).
 * Usage: node scripts/gen-fd-shop-coupons.mjs [count=250]
 * Writes data/custom_coupon_lines.txt then runs sync-shop-coupon-seed.mjs.
 */
import { randomBytes } from 'node:crypto';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const count = Math.max(1, Math.min(50_000, parseInt(process.argv[2] || '250', 10) || 250));

function randomFdCode() {
  let s = 'FD';
  const buf = randomBytes(4);
  for (let i = 0; i < 4; i++) s += CHARS[buf[i] % 36];
  return s;
}

const set = new Set();
let attempts = 0;
const maxAttempts = Math.max(count * 200, 10_000);
while (set.size < count && attempts < maxAttempts) {
  set.add(randomFdCode());
  attempts++;
}
if (set.size < count) {
  console.error(`Could only generate ${set.size} unique codes (target ${count}).`);
  process.exit(1);
}

const lines = [...set].sort().join('\n') + '\n';
const outTxt = path.join(root, 'data', 'custom_coupon_lines.txt');
fs.writeFileSync(outTxt, lines, 'utf8');
console.log(`Wrote ${set.size} codes to ${path.relative(process.cwd(), outTxt)}`);

execSync('node scripts/sync-shop-coupon-seed.mjs', { cwd: root, stdio: 'inherit' });
