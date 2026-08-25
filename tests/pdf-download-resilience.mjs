import fs from 'node:fs';

const source = fs.readFileSync(new URL('../js/pdf-from-preview.js', import.meta.url), 'utf8');
const expectedCoverageMap = {
  AMBU1: 'AMBU1 08_2026.pdf', AMBU2: 'AMBU2 08_2026.pdf', INTER1: 'INTER1 08_2026.pdf',
  S1: 'S1 08_2026.pdf', S2: 'S2 08_2026.pdf', SMG02: 'SMG02 08_2026.pdf',
  SMG20: 'SMG20 08_2026.pdf', SMG30: 'SMG30 08_2026.pdf', SMG40: 'SMG40 08_2026.pdf',
  SMG50: 'SMG50 08_2026.pdf', SMG60: 'SMG60 08_2026.pdf', SMG70: 'SMG70 08_2026.pdf',
  SPORT: 'SPORT 08_2026.pdf', 'SPORT+': 'SPORT+ 08_2026.pdf', 'SPORT S': 'SPORT-S 08_2026.pdf'
};

const checks = [
  ['los 15 planes están mapeados a su alcance oficial exacto', Object.entries(expectedCoverageMap).every(([plan, file]) => source.includes(`'${plan}': '${file}'`))],
  ['no quedan referencias a assets base64 o gzip temporales', !source.includes('.pdf.b64') && !source.includes('.pdf.gz.b64')],
  ['alcance faltante bloquea la descarga en vez de inventar fallback', source.includes('if (!response.ok) throw new Error(`No se pudo cargar el alcance oficial de ${planName}.`);')],
  ['alcance vacío o dañado bloquea la descarga', source.includes('bytes.length < 100000') && source.includes('está vacío o dañado')],
  ['merge final siempre incorpora cobertura oficial', !source.includes('if (!coverageBytes) return proposalBytes;') && source.includes('const coverageDoc = await PDFDocument.load(coverageBytes);')],
  ['hojas 1 y 2 se copian directamente desde el PDF original', source.includes("const INTRO_PDF_FILE = 'assets/static/swiss-intro-original.pdf'") && source.includes('copyPages(introDoc, [0, 1])')],
  ['hojas originales quedan fuera de html2canvas', source.includes("querySelectorAll('.quote-page:not(.ref-intro-original)')") && !source.includes("pdf.addImage(img.src, 'JPEG'")],
  ['preview informa alcance oficial exacto', source.includes('alcance oficial exacto incluido en la descarga')],
  ['descarga mantiene nombre comercial', source.includes('Cotizacion Swiss Medical (')]
];

const failures = checks.filter(([,ok])=>!ok).map(([name])=>name);
for (const [name,ok] of checks) console.log(`${ok?'PASS':'FAIL'}  ${name}`);

console.log(`\nResultado PDF oficial: ${checks.length-failures.length} PASS, ${failures.length} FAIL`);
if (failures.length) process.exit(1);
