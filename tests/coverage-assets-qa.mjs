import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const dir = path.resolve(here, '../assets/coverage');
const expected = [
  'AMBU1','AMBU2','INTER1','S1','S2',
  'SMG02','SMG20','SMG30','SMG40','SMG50',
  'SMG60','SMG70','SPORT','SPORT+','SPORT-S'
];
const failures = [];

function findAsset(plan) {
  const plain = `${plan} 08_2026.pdf.b64`;
  const gz = `${plan} 08_2026.pdf.gz.b64`;
  if (fs.existsSync(path.join(dir, plain))) return plain;
  if (fs.existsSync(path.join(dir, gz))) return gz;
  return null;
}

for (const plan of expected) {
  const name = findAsset(plan);
  if (!name) {
    console.log(`FAIL  ${plan}: archivo faltante`);
    failures.push(`${plan}: faltante`);
    continue;
  }

  let ok = false;
  try {
    const raw = fs.readFileSync(path.join(dir,name),'utf8').replace(/\s+/g,'');
    if (raw.length < 100) throw new Error('base64 demasiado corto');
    let bytes = Buffer.from(raw,'base64');
    if (name.endsWith('.gz.b64')) bytes = zlib.gunzipSync(bytes);
    ok = bytes.length > 4 && bytes.subarray(0,4).toString('ascii') === '%PDF';
  } catch {
    ok = false;
  }
  console.log(`${ok?'PASS':'FAIL'}  ${name}`);
  if (!ok) failures.push(name);
}

console.log(`\nResultado alcances: ${expected.length-failures.length}/${expected.length} PASS`);
if (failures.length) {
  console.error('Fallos:', failures.join(', '));
  process.exit(1);
}
