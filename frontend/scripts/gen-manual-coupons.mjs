import { randomBytes } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const set = new Set();
while (set.size < 200) {
  set.add('FND' + randomBytes(6).toString('hex').toUpperCase());
}
const lines = [...set].sort().join('\n') + '\n';
writeFileSync(join(root, 'data', 'generated_manual_200_coupons.txt'), lines, 'utf8');
console.log('Wrote data/generated_manual_200_coupons.txt');
