import fs from 'node:fs';

const source = fs.readFileSync(new URL('../js/pdf-from-preview.js', import.meta.url), 'utf8');
const checks = [
  ['404 de alcance oficial usa fallback', source.includes('if (response.status === 404) return null;')],
  ['archivo de alcance inválido usa fallback', source.includes("encoded.length < 100 || !encoded.startsWith('JVBER')") && source.includes('looksLikePdf(bytes) ? bytes : null')],
  ['sin alcance oficial conserva propuesta', source.includes('if (!coverageBytes) return proposalBytes;')],
  ['preview no promete siempre anexo oficial', source.includes('cuando está disponible')],
  ['descarga mantiene nombre comercial', source.includes('Cotizacion Swiss Medical (')]
];

const failures = checks.filter(([,ok])=>!ok).map(([name])=>name);
for (const [name,ok] of checks) console.log(`${ok?'PASS':'FAIL'}  ${name}`);

console.log(`\nResultado PDF fallback: ${checks.length-failures.length} PASS, ${failures.length} FAIL`);
if (failures.length) process.exit(1);
