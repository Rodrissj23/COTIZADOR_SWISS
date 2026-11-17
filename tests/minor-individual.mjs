import fs from 'node:fs';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const read = path => fs.readFileSync(new URL(path, root), 'utf8');
const load = path => vm.runInThisContext(read(path), {filename:path});

const eq = (actual, expected, label='') => {
  if (actual !== expected) throw new Error(`${label} esperado ${expected}, recibido ${actual}`);
};
const near = (actual, expected, tolerance=0.01, label='') => {
  if (Math.abs(actual-expected) > tolerance) throw new Error(`${label} esperado ${expected}, recibido ${actual}`);
};

globalThis.window = {};
load('js/data-demo.js');
load('js/tariff-nov26-update.js');
load('js/quote-engine.js');

const plan = window.SWISS_PLANS.find(p => p.name === 'S2');
const client = {
  name:'QA menor', dni:'', zone:'AMBA', modality:'Directo', specialDiscount:'none',
  familyType:'individual', age:6, partnerAge:0, children:0, childrenAges:[], receiptContribution:0
};
const quote = window.SWISS_ENGINE.familyQuote(plan, client);

eq(quote.status, 'ok', 'titular menor individual');
eq(quote.members.length, 1, 'cantidad integrantes');
eq(quote.members[0].age, 6, 'edad titular');
eq(quote.members[0].percent, 50, 'bonificación menor');
eq(quote.members[0].listPrice, 257499, 'banda inicial S2 AMBA Directo Nov26');
near(quote.members[0].finalPrice, 128749.5, 0.01, 'valor final con 50%');

const partnerClient = {...client, familyType:'partner', age:35, partnerAge:17};
eq(window.SWISS_ENGINE.familyQuote(plan, partnerClient).status, 'unavailable', 'pareja menor de 18 sigue bloqueada');

console.log('PASS  Titular menor individual usa 50% con tarifa Nov26 y mantiene restricciones de tabla');
