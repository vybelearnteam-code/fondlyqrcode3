import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const raw = readFileSync(join(root, 'data', 'custom_coupon_lines.txt'), 'utf8');
const lines = raw
  .trim()
  .split(/\r?\n/)
  .map((l) => l.trim().toUpperCase())
  .filter(Boolean);
const uniq = [...new Set(lines)];
const linesOut = uniq.join('\n') + '\n';
const out = join(root, 'data', 'generated_coupon_batch.txt');
writeFileSync(out, linesOut, 'utf8');
console.log(`Wrote ${out} (${uniq.length} unique codes) — import via Admin "Sync campaign list" or POST /api/coupon-codes/bulk`);
