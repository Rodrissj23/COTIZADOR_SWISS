import fs from 'node:fs';

const source = fs.readFileSync(new URL('../js/pdf-from-preview.js', import.meta.url), 'utf8');
const expectedFiles = [
  'AMBU1 08_2026.pdf.b64','AMBU2 08_2026.pdf.b64','INTER1 08_2026.pdf.b64','S1 08_2026.pdf.b64','S2 08_2026.pdf.b64',
  'SMG02 08_2026.pdf.b64','SMG20 08_2026.pdf.b64','SMG30 08_2026.pdf.b64','SMG40 08_2026.pdf.b64','SMG50 08_2026.pdf.b64',
  'SMG60 08_2026.pdf.b64','SMG70 08_2026.pdf.b64','SPORT 08_2026.pdf.b64','SPORT+ 08_2026.pdf.b64','SPORT-S 08_2026.pdf.b64'
];

const checks = [
  ['los 15 alcances oficiales están mapeados al asset exacto', expectedFiles.every(file => source.includes(`'${file}'`))],
  ['no quedan referencias a assets gzip temporales', !source.includes('.pdf.gz.b64')],
  ['alcance faltante bloquea la descarga en vez de inventar fallback', source.includes('if (!response.ok) throw new Error(`No se pudo cargar el alcance oficial de ${planName}.`);')],
  ['alcance vacío o dañado bloquea la descarga', source.includes('encoded.length < 100') && source.includes('firma PDF inválida') && source.includes('está dañado')],
  ['merge final siempre incorpora cobertura oficial', !source.includes('if (!coverageBytes) return proposalBytes;') && source.includes('const coverageDoc = await PDFDocument.load(coverageBytes);')],
  ['preview informa alcance oficial exacto', source.includes('alcance oficial exacto incluido en la descarga')],
  ['descarga mantiene nombre comercial', source.includes('Cotizacion Swiss Medical (')]
];

const failures = checks.filter(([,ok])=>!ok).map(([name])=>name);
for (const [name,ok] of checks) console.log(`${ok?'PASS':'FAIL'}  ${name}`);

console.log(`\nResultado PDF oficial: ${checks.length-failures.length} PASS, ${failures.length} FAIL`);
if (failures.length) process.exit(1);
