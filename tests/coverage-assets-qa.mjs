import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const dir = path.resolve(here, '../assets/coverage');
const expected = [
  'AMBU1 08_2026.pdf.b64',
  'AMBU2 08_2026.pdf.b64',
  'INTER1 08_2026.pdf.b64',
  'S1 08_2026.pdf.b64',
  'S2 08_2026.pdf.b64',
  'SMG02 08_2026.pdf.b64',
  'SMG20 08_2026.pdf.b64',
  'SMG30 08_2026.pdf.b64',
  'SMG40 08_2026.pdf.b64',
  'SMG50 08_2026.pdf.b64',
  'SMG60 08_2026.pdf.b64',
  'SMG70 08_2026.pdf.b64',
  'SPORT 08_2026.pdf.b64',
  'SPORT+ 08_2026.pdf.b64',
  'SPORT-S 08_2026.pdf.b64'
];
const failures = [];
const files = fs.readdirSync(dir).filter(name => name.endsWith('.pdf.b64')).sort();

for (const name of expected) {
  if (!files.includes(name)) failures.push(`${name}: faltante`);
}
for (const name of files) {
  if (!expected.includes(name)) failures.push(`${name}: archivo inesperado`);
}

for (const name of expected.filter(name => files.includes(name))) {
  let ok = false;
  try {
    const raw = fs.readFileSync(path.join(dir, name), 'utf8').replace(/\s+/g, '');
    if (raw.length < 100 || !raw.startsWith('JVBER')) throw new Error('base64 inválido');
    const bytes = Buffer.from(raw, 'base64');
    ok = bytes.length > 4 && bytes.subarray(0, 4).toString('ascii') === '%PDF';
  } catch {
    ok = false;
  }
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  if (!ok) failures.push(`${name}: PDF inválido`);
}

console.log(`\nResultado alcances: ${expected.length - failures.length}/${expected.length} PASS`);
if (failures.length) {
  console.error('Fallos:', failures.join(', '));
  process.exit(1);
}
