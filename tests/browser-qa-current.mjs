import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const sourcePath = path.join(here, 'browser-qa.mjs');
let source = fs.readFileSync(sourcePath, 'utf8');

const replacements = [
  ["SMG30 Directo AMBA edad 35 muestra $330.963,65", "SMG30 Directo AMBA edad 35 muestra $338.244,75"],
  ["330.963,65", "338.244,75"],
  ["Desregulado $20.000 deja SMG30 en $241.125", "Obligatorio $20.000 deja SMG30 en $202.769,20"],
  ["Hoja económica Desregulado refleja aporte y total exactos", "Hoja económica Obligatorio refleja aporte y total exactos"],
  ["chooseModality(page,'Desregulado')", "chooseModality(page,'Obligatorio')"],
  ["241.125", "202.769,20"],
  ["assert(form.includes('15% por 12 meses'),'falta vigencia Directo');assert(form.includes('25% por 12 meses'),'falta vigencia Monotributo');assert(form.includes('formularios 184 y 152 de ARCA'),'faltan formularios ARCA');", "assert(form.includes('Campañas vigentes por 12 meses'),'falta vigencia de campañas');assert(form.includes('15% de bonificación'),'falta bonificación Directo');assert(form.includes('reciben un 25%'),'falta bonificación Monotributo');assert(form.includes('formularios 184 y 152 de ARCA'),'faltan formularios ARCA');assert(form.includes('se calculan y aplican automáticamente'),'falta aclaración de cálculo automático');"],
  ["292.026,75", "298.451,25"],
  ["177.193,55", "181.091,65"]
];

for (const [from, to] of replacements) {
  if (!source.includes(from)) throw new Error(`No se encontró patrón QA para actualizar: ${from}`);
  source = source.split(from).join(to);
}

const tempPath = path.join(here, '.browser-qa-current.generated.mjs');
fs.writeFileSync(tempPath, source);
try {
  await import(`${pathToFileURL(tempPath).href}?v=${Date.now()}`);
} finally {
  fs.rmSync(tempPath, { force:true });
}
