import { createHash } from 'node:crypto';
import fs from 'node:fs';
import vm from 'node:vm';
const root = new URL('../', import.meta.url);
const read = path => fs.readFileSync(new URL(path, root), 'utf8');
const load = path => vm.runInThisContext(read(path), {filename:path});
const eq=(a,e,l='')=>{if(a!==e)throw new Error(`${l} esperado ${e}, recibido ${a}`)};
const near=(a,e,t=.01,l='')=>{if(Math.abs(a-e)>t)throw new Error(`${l} esperado ${e}, recibido ${a}`)};
const ok=(v,l='condición')=>{if(!v)throw new Error(`${l} no se cumplió`)};

globalThis.window={};
for(const file of ['js/data-demo.js','js/tariff-nov26-update.js','js/benefits.js','js/quote-engine.js']) load(file);
const engine=window.SWISS_ENGINE;
const plan=n=>window.SWISS_PLANS.find(p=>p.name===n);
const client=o=>({name:'QA',dni:'',zone:'AMBA',modality:'Directo',specialDiscount:'none',familyType:'individual',age:35,partnerAge:35,children:0,childrenAges:[],receiptContribution:0,...o});
const quote=(p,o={})=>engine.familyQuote(plan(p),client(o));

for(const file of ['js/app.js','js/data-demo.js','js/tariff-nov26-update.js','js/benefits.js','js/quote-engine.js']) new vm.Script(read(file),{filename:file});
eq(window.SWISS_PLANS.length,12,'12 planes');
eq(new Set(window.SWISS_PLANS.map(p=>p.name)).size,12,'planes únicos');
for(const zone of ['AMBA','Buenos Aires Interior / Santa Fe','Córdoba','Patagonia / Salta','Resto del país','Tierra del Fuego']) ok(window.SWISS_ZONE_TARIFFS[zone],zone);

// Bonificaciones y modalidades.
eq(engine.discountForMember(25,'Directo','none','AMBA').percent,50,'Directo menor');
eq(engine.discountForMember(26,'Directo','none','AMBA').percent,15,'Directo adulto');
eq(engine.discountForMember(25,'Relación de dependencia','none','AMBA').percent,50,'Obligatorio menor');
eq(engine.discountForMember(26,'Relación de dependencia','none','AMBA').percent,15,'Obligatorio adulto');
eq(engine.discountForMember(23,'Monotributo','nordelta_tigre','AMBA').percent,25,'Monotributo no combinable');
eq(engine.discountForMember(35,'Relación de dependencia','nordelta_tigre','AMBA').percent,25,'territorial AMBA');
eq(engine.discountForMember(35,'Relación de dependencia','nordelta_tigre','Córdoba').percent,15,'territorial fuera AMBA');
eq(engine.displayModality('Relación de dependencia'),'Obligatorio','nombre modalidad');

// Composición familiar.
eq(quote('S2',{age:6}).status,'ok','menor solo');
eq(quote('S2',{familyType:'partner',age:35,partnerAge:17}).status,'unavailable','pareja menor 18');
eq(quote('S2',{familyType:'partner',age:35,partnerAge:18}).status,'ok','pareja 18');
eq(quote('S2',{familyType:'children',children:1,childrenAges:[23]}).members[1].tariffRole,'Hijo adicional','hijo 23 adicional');
let q=quote('S2',{familyType:'children',children:2,childrenAges:[10,12]});
eq(q.members[1].tariffRole,'1er hijo','primer hijo');
eq(q.members[2].tariffRole,'Hijo adicional','segundo hijo adicional');
eq(quote('S2',{familyType:'children',children:1,childrenAges:[26]}).status,'consult','hijo >25');

q=quote('S2',{familyType:'partner_children',age:35,partnerAge:36,children:1,childrenAges:[10],specialDiscount:'nordelta_tigre'});
eq(q.members[0].percent,25,'territorial titular');eq(q.members[1].percent,25,'territorial pareja');eq(q.members[2].percent,50,'territorial hijo');
q=quote('S2',{modality:'Monotributo',familyType:'partner_children',age:35,partnerAge:36,children:1,childrenAges:[10]});
for(const m of q.members) eq(m.percent,25,`mono ${m.role}`);

// Aporte vigente: sin el tope viejo de $4.045.590.
let c=engine.contributionForClient(client({modality:'Relación de dependencia',receiptContribution:200000}));
near(c.baseCalculated,6666666.666666667,.000001,'base calculada');
near(c.baseContribution,6666666.666666667,.000001,'base sin tope viejo');
eq(c.capApplied,false,'sin tope viejo');
near(c.aporteComputable,510000,.01,'aporte computable alto');
c=engine.contributionForClient(client({modality:'Directo',receiptContribution:200000}));eq(c.aporteComputable,0,'Directo no descuenta aporte');
c=engine.contributionForClient(client({modality:'Monotributo',receiptContribution:200000}));eq(c.aporteComputable,0,'Monotributo no descuenta aporte');

// Final nunca negativo.
q=quote('S1',{modality:'Relación de dependencia',receiptContribution:200000});eq(q.finalPrice,0,'final mínimo 0');

// Tablas separadas y disponibilidad.
for (const name of ['AMBU1', 'AMBU2', 'INTER1']) {
  eq(plan(name), undefined, `${name} retirado del catálogo`);
  eq(engine.familyQuote({name}, client()).status, 'unavailable', `${name} sin cotización`);
}
ok(window.SWISS_ZONE_TARIFFS['Patagonia / Salta']!==window.SWISS_ZONE_TARIFFS['Tierra del Fuego'],'zonas objetos separados');
eq(window.getSwissTariff('S2','Monotributo','Tierra del Fuego'),null,'TDF sin Monotributo integral');
eq(window.getSwissTariff('S2','Directo','Pilar'),window.getSwissTariff('S2','Directo','AMBA'),'Pilar alias AMBA');
eq(window.getSwissDiscount(35,'Directo','Pilar'),25,'Pilar territorial');

const regions = [
  'AMBA', 'Buenos Aires Interior / Santa Fe', 'Córdoba',
  'Patagonia / Salta', 'Resto del país', 'Tierra del Fuego'
];
const officialPrices = {};
let amountCount = 0;
for (const zone of regions) {
  officialPrices[zone] = {};
  for (const [kind, modality] of [['direct', 'Directo'], ['obligatory', 'Relación de dependencia']]) {
    const rows = officialPrices[zone][kind] = {};
    const tariff = window.SWISS_ZONE_TARIFFS[zone][kind];
    for (const name of Object.keys(tariff.adult)) {
      const result = quote(name, {
        zone, modality, age: 35, familyType: 'children', children: 2, childrenAges: [5, 8]
      });
      eq(result.status, 'ok', `${zone}/${modality}/${name}`);
      rows[name] = [35, 40, 45, 50, 55, 60, 61].map(age => quote(name, {zone, modality, age}).listPrice);
      rows[name].push(result.members[1].listPrice, result.members[2].listPrice);
      amountCount += rows[name].length;
    }
  }
}
eq(amountCount, 1116, 'cantidad de importes Nov26');
// Huella de las seis listas oficiales, verificadas con dos extractores PDF.
const digest = createHash('sha256').update(JSON.stringify(officialPrices)).digest('hex');
eq(digest, '46e1146786c0cf9668433b94c400db9a8497c7a520f12bde048de1a1b5d4f472', 'importes Nov26');
for (const [alias, region] of [
  ['Nordelta', 'AMBA'], ['Tigre', 'AMBA'], ['Pilar', 'AMBA'],
  ['Escobar', 'AMBA'], ['Santa Fe', 'Buenos Aires Interior / Santa Fe'],
  ['Interior del país', 'Resto del país']
]) {
  eq(window.SWISS_ZONE_TARIFFS[alias], window.SWISS_ZONE_TARIFFS[region], `tarifario de ${alias}`);
}
eq(quote('S2', {modality:'Monotributo'}).listPrice, 257499, 'Monotributo usa Directo con IVA');
eq(quote('S2', {modality:'Monotributo'}).finalPrice, 193124.25, 'Monotributo aplica el 25%');

console.log('PASS  Lógica comercial Swiss Medical y 1.116 importes Nov26 verificados');
