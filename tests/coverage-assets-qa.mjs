import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const dir = path.resolve(here, '../assets/coverage');
const files = fs.readdirSync(dir).filter(name=>name.endsWith('.pdf.b64'));
const failures = [];

if (!files.length) failures.push('no hay alcances oficiales cargados');

for (const name of files) {
  const raw = fs.readFileSync(path.join(dir,name),'utf8').replace(/\s+/g,'');
  let ok = raw.length >= 100 && raw.startsWith('JVBER');
  if (ok) {
    try {
      const bytes = Buffer.from(raw,'base64');
      ok = bytes.length > 4 && bytes.subarray(0,4).toString('ascii') === '%PDF';
    } catch {
      ok = false;
    }
  }
  console.log(`${ok?'PASS':'FAIL'}  ${name}`);
  if (!ok) failures.push(name);
}

console.log(`\nResultado alcances: ${files.length-failures.length} PASS, ${failures.length} FAIL`);
if (failures.length) process.exit(1);
