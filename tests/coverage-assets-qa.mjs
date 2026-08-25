import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const dir = path.resolve(here, '../assets/coverage');
const expected = {
  'AMBU1 08_2026.pdf': [137893, 'e9c7f0c0addc46a98854a871d96ca3eb8756c6e11bcf11c7f8e71b8afc4bff21'],
  'AMBU2 08_2026.pdf': [136374, '03fca60271d8f92449c8b47b1cdfa5ae3072395b500d873193393c8f42b7c4d6'],
  'INTER1 08_2026.pdf': [139561, '6004aa368b2abf55b70c80cb1cb735d646e432e7a49040563e3407eafc6d7bf1'],
  'S1 08_2026.pdf': [280480, '7306e353b9030e59f279beccfdbd628675cd1bb43149bb30a65063387de623ed'],
  'S2 08_2026.pdf': [280466, '55e6da6e7b82731e7c3ed696d7756d7af9d7559feb07718c82b77fca0ccd440a'],
  'SMG02 08_2026.pdf': [277692, '662b37599ac5814d7cce3412607520af21d816490a0f06f6bef3f55c1e9156e3'],
  'SMG20 08_2026.pdf': [279441, '6637f9b964c4cd2b76f7cba284a014f7e68873abb128469e27d2282bcad9383f'],
  'SMG30 08_2026.pdf': [418540, '87d995e32e39f79ff6cdc520f84a1aaae68c9d05279fdde8dcbe8dfdbc85957a'],
  'SMG40 08_2026.pdf': [418625, 'ffcada7f6caf692843333dcbcd4a0b716cdcc2cb8dc31e29f885cf09b9eb4b22'],
  'SMG50 08_2026.pdf': [419156, 'c98af0ae91579362335e215a47386e96aaafabc22c58b331c5699bc02717011e'],
  'SMG60 08_2026.pdf': [419677, '7d0f8ab9918ec5a57e2fc9a800eb805f3e9d5fb78cb04e2f44ddac81b84c91a8'],
  'SMG70 08_2026.pdf': [419148, '696dcbe42cab85659426b5dccbd52f77a9a274aefb8b95e2ec9b720b22ce3be1'],
  'SPORT 08_2026.pdf': [419511, 'eae5bd3f16c031dc8cff0022e427f40a2de8c670f7376cf7a64184598214cc14'],
  'SPORT+ 08_2026.pdf': [422570, '81a216ea1d0eb5123dc9f59e24fad2e709cd5446dd2ae4999f15f3a593b6e04a'],
  'SPORT-S 08_2026.pdf': [419031, '1bed96778be0317760a38dd4a5292fb48c101ab50aeecbd108112098c6db21e7']
};

const failures = [];
const files = fs.readdirSync(dir).filter(name => name.endsWith('.pdf')).sort();
const expectedFiles = Object.keys(expected).sort();

for (const name of expectedFiles) if (!files.includes(name)) failures.push(`${name}: faltante`);
for (const name of files) if (!expected[name]) failures.push(`${name}: archivo inesperado`);

for (const name of expectedFiles.filter(name => files.includes(name))) {
  const bytes = fs.readFileSync(path.join(dir, name));
  const [expectedSize, expectedHash] = expected[name];
  const hash = crypto.createHash('sha256').update(bytes).digest('hex');
  const ok = bytes.length === expectedSize && hash === expectedHash && bytes.subarray(0, 4).toString('ascii') === '%PDF';
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  if (!ok) failures.push(`${name}: no coincide byte a byte con el PDF oficial`);
}

const legacy = fs.readdirSync(dir).filter(name => name.endsWith('.pdf.b64'));
if (legacy.length) failures.push(`quedan sustitutos base64 antiguos: ${legacy.join(', ')}`);

console.log(`\nResultado alcances oficiales: ${expectedFiles.length - failures.length}/${expectedFiles.length} PASS`);
if (failures.length) {
  console.error('Fallos:', failures.join(', '));
  process.exit(1);
}
