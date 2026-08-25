import crypto from 'node:crypto';
import fs from 'node:fs';

const root = new URL('../', import.meta.url);
const readBytes = path => fs.readFileSync(new URL(path, root));
const readText = path => fs.readFileSync(new URL(path, root), 'utf8');
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

const expected = {
  'assets/static/swiss-intro-original.pdf': {
    size: 878826,
    hash: '318b82384da6e06ff0b22e0efa638b019705619e24c180398d6914c0a9da9e2b'
  },
  'assets/static/swiss-intro-page1.jpg': {
    size: 300441,
    hash: 'ffbe320a69dafac0cc279a36a23c878f69edc79737bf9a7c79f9647baccb8e94',
    width: 1859,
    height: 2631
  },
  'assets/static/swiss-intro-page2.jpg': {
    size: 427391,
    hash: '24e89babe55ed0addc6e4468e7c79c2bda527b0d09e08862d7d1ab673a855531',
    width: 1860,
    height: 2631
  }
};

function jpegDimensions(bytes) {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new Error('firma JPEG inválida');
  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) { offset += 1; continue; }
    const marker = bytes[offset + 1];
    if (marker === 0xd8 || marker === 0xd9) { offset += 2; continue; }
    const length = bytes.readUInt16BE(offset + 2);
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      return { height: bytes.readUInt16BE(offset + 5), width: bytes.readUInt16BE(offset + 7) };
    }
    offset += 2 + length;
  }
  throw new Error('no se encontraron dimensiones JPEG');
}

let passed = 0;
const failures = [];
function test(name, fn) {
  try { fn(); passed += 1; console.log(`PASS  ${name}`); }
  catch (error) { failures.push(`${name}: ${error.message}`); console.error(`FAIL  ${name}\n      ${error.message}`); }
}

for (const [path, meta] of Object.entries(expected)) {
  test(`${path} conserva exactamente el archivo fuente validado`, () => {
    const bytes = readBytes(path);
    if (bytes.length !== meta.size) throw new Error(`tamaño ${bytes.length}, esperado ${meta.size}`);
    if (sha256(bytes) !== meta.hash) throw new Error('hash SHA-256 distinto del original');
    if (path.endsWith('.pdf')) {
      if (bytes.subarray(0, 4).toString('ascii') !== '%PDF') throw new Error('firma PDF inválida');
      const pages = (bytes.toString('latin1').match(/\/Type\s*\/Page\b/g) || []).length;
      if (pages !== 6) throw new Error(`el PDF fuente debería tener 6 páginas, recibió ${pages}`);
    } else {
      const dimensions = jpegDimensions(bytes);
      if (dimensions.width !== meta.width || dimensions.height !== meta.height) {
        throw new Error(`dimensiones ${dimensions.width}x${dimensions.height}, esperadas ${meta.width}x${meta.height}`);
      }
    }
  });
}

const source = readText('js/pdf-from-preview.js');
test('Preview usa directamente los JPEG originales sin canvas intermedio', () => {
  if (!source.includes("'assets/static/swiss-intro-page1.jpg'")) throw new Error('falta hoja 1 original');
  if (!source.includes("'assets/static/swiss-intro-page2.jpg'")) throw new Error('falta hoja 2 original');
  if (source.includes('rasterAtA4PreviewResolution')) throw new Error('quedó el rasterizado A4 anterior');
  const legacy = fs.readdirSync(new URL('assets/static/', root), { recursive: true })
    .filter(name => String(name).endsWith('.b64'));
  if (legacy.length) throw new Error(`quedan versiones comprimidas o fragmentadas: ${legacy.join(', ')}`);
});
test('PDF final copia las dos páginas del PDF fuente antes de la cotización', () => {
  if (!source.includes("const INTRO_PDF_FILE = 'assets/static/swiss-intro-original.pdf'")) throw new Error('falta PDF fuente');
  if (!source.includes('copyPages(introDoc, [0, 1])')) throw new Error('no se copian directamente las páginas 1 y 2');
  if (!source.includes("querySelectorAll('.quote-page:not(.ref-intro-original)')")) throw new Error('las hojas originales todavía podrían pasar por html2canvas');
  if (source.includes("pdf.addImage(img.src, 'JPEG'")) throw new Error('las hojas originales todavía se insertan como JPEG en jsPDF');
});

console.log(`\nResultado intro original: ${passed} PASS, ${failures.length} FAIL`);
if (failures.length) process.exit(1);
