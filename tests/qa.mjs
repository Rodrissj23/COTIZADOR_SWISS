import fs from 'node:fs';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const read = path => fs.readFileSync(new URL(path, root), 'utf8');
const load = path => vm.runInThisContext(read(path), {filename:path});

let passed = 0;
const failures = [];
function test(name, fn){
  try { fn(); passed++; console.log(`PASS  ${name}`); }
  catch (error) { failures.push(`${name}: ${error.message}`); console.error(`FAIL  ${name}\n      ${error.message}`); }
}
const eq = (actual, expected, label='') => {
  if (actual !== expected) throw new Error(`${label} esperado ${expected}, recibido ${actual}`);
};
const near = (actual, expected, tolerance=0.01, label='') => {
  if (Math.abs(actual-expected) > tolerance) throw new Error(`${label} esperado ${expected}, recibido ${actual}`);
};
const ok = (value, label='condición') => { if (!value) throw new Error(`${label} no se cumplió`); };

// Carga de datos exactamente como lo hace el navegador.
globalThis.window = {};
load('js/data-demo.js');
load('js/tariff-audit-2026-09.js');
load('js/benefits.js');
load('js/quote-engine.js');

const plans = window.SWISS_PLANS;
const tariffs = window.SWISS_ZONE_TARIFFS;
const engine = window.SWISS_ENGINE;
const plan = name => plans.find(p=>p.name===name);
const baseClient = overrides => ({
  name:'QA',dni:'',zone:'AMBA',modality:'Directo',specialDiscount:'none',familyType:'individual',
  age:35,partnerAge:35,children:0,childrenAges:[],receiptContribution:0,...overrides
});
const quote = (planName, overrides={}) => engine.familyQuote(plan(planName),baseClient(overrides));

// Sintaxis de los scripts principales sin ejecutar DOM.
for (const file of ['js/app.js','js/data-demo.js','js/tariff-audit-2026-09.js','js/benefits.js','js/quote-engine.js']) {
  test(`Sintaxis JavaScript ${file}`,()=>{ new vm.Script(read(file),{filename:file}); });
}

test('Hay exactamente 15 planes únicos',()=>{
  eq(plans.length,15,'cantidad de planes');
  eq(new Set(plans.map(p=>p.name)).size,15,'planes únicos');
});

test('Todos los planes tienen resumen técnico',()=>{
  for (const p of plans){
    ok(window.SWISS_PLAN_BENEFITS[p.name],`beneficios ${p.name}`);
    ok(window.SWISS_PLAN_BENEFITS[p.name].highlights.length>=4,`highlights ${p.name}`);
  }
});

test('Las seis regiones comerciales existen',()=>{
  for (const zone of ['AMBA','Buenos Aires Interior / Santa Fe','Córdoba','Patagonia / Salta','Resto del país','Tierra del Fuego']) ok(tariffs[zone],zone);
});

test('S1 y SMG02 solo integran la tabla completa de AMBA',()=>{
  ok(tariffs.AMBA.direct.adult.S1 && tariffs.AMBA.direct.adult.SMG02,'AMBA Directo');
  ok(tariffs.AMBA.obligatory.adult.S1 && tariffs.AMBA.obligatory.adult.SMG02,'AMBA Obligatorio');
  for (const zone of ['Buenos Aires Interior / Santa Fe','Córdoba','Patagonia / Salta','Resto del país','Tierra del Fuego']) {
    ok(!tariffs[zone].direct.adult.S1 && !tariffs[zone].direct.adult.SMG02,`${zone} directo sin S1/SMG02`);
    ok(!tariffs[zone].obligatory.adult.S1 && !tariffs[zone].obligatory.adult.SMG02,`${zone} obligatorio sin S1/SMG02`);
  }
});

// Checkpoints contra las capturas oficiales compartidas.
const checkpoints = [
  ['AMBA','direct','S1','u35',193090],
  ['AMBA','direct','SMG40','46_50',564066],
  ['AMBA','direct','SMG40','56_60',953255],
  ['AMBA','direct','SMG40','o61',1200535],
  ['AMBA','direct','SMG70','o61',2570537],
  ['AMBA','obligatory','S1','46_50',212661],
  ['AMBA','obligatory','SMG30','u35',292125],
  ['Buenos Aires Interior / Santa Fe','direct','S2','u35',208463],
  ['Buenos Aires Interior / Santa Fe','obligatory','SMG30','u35',251217],
  ['Córdoba','direct','S2','u35',181818],
  ['Córdoba','direct','SMG70','o61',1927858],
  ['Córdoba','obligatory','S2','u35',142220],
  ['Patagonia / Salta','direct','S2','u35',242411],
  ['Patagonia / Salta','obligatory','S2','u35',189629],
  ['Resto del país','direct','S2','u35',189079],
  ['Resto del país','obligatory','S2','u35',147931],
  ['Tierra del Fuego','direct','S2','u35',242411],
  ['Tierra del Fuego','obligatory','S2','u35',189629]
];
for (const [zone,kind,planName,band,expected] of checkpoints){
  test(`Tarifa ${zone} ${kind} ${planName} ${band}`,()=>eq(tariffs[zone][kind].adult[planName][band],expected));
}

test('Hijo adicional S1 Obligatorio AMBA corregido a $83.061',()=>eq(tariffs.AMBA.obligatory.additionalChild.S1,83061));

test('Planes parciales coinciden con checkpoints de tabla',()=>{
  eq(window.SWISS_AMBULATORY_TARIFF.adult.AMBU1['20_25'],86333.8);
  eq(window.SWISS_AMBULATORY_TARIFF.adult.AMBU2['20_25'],49204.8);
  eq(window.SWISS_AMBULATORY_TARIFF.adult.INTER1['20_25'],125473.8);
  eq(window.SWISS_AMBULATORY_TARIFF.adult.INTER1.o80,1534905);
  eq(window.SWISS_AMBULATORY_TARIFF.firstChild.AMBU1,74939.2);
});

test('Todas las tarifas adultas estándar son positivas y no decrecen con la edad',()=>{
  const ordered=['u35','36_40','41_45','46_50','51_55','56_60','o61'];
  for (const [zone,sets] of Object.entries(tariffs)){
    if (!['AMBA','Buenos Aires Interior / Santa Fe','Córdoba','Patagonia / Salta','Resto del país','Tierra del Fuego'].includes(zone)) continue;
    for (const [kind,tariff] of Object.entries(sets)){
      for (const [planName,bands] of Object.entries(tariff.adult)){
        let previous=-Infinity;
        for (const key of ordered){
          const value=bands[key];
          ok(Number.isFinite(value)&&value>0,`${zone}/${kind}/${planName}/${key} positivo`);
          ok(value>=previous,`${zone}/${kind}/${planName} no decreciente en ${key}`);
          previous=value;
        }
      }
    }
  }
});

test('Tarifas de hijos son positivas y adicional no supera al primer hijo',()=>{
  for (const [zone,sets] of Object.entries(tariffs)){
    if (!['AMBA','Buenos Aires Interior / Santa Fe','Córdoba','Patagonia / Salta','Resto del país','Tierra del Fuego'].includes(zone)) continue;
    for (const tariff of Object.values(sets)){
      for (const [planName,first] of Object.entries(tariff.firstChild)){
        const additional=tariff.additionalChild[planName];
        ok(first>0,`${zone}/${planName} primer hijo`);
        ok(additional>0,`${zone}/${planName} hijo adicional`);
        ok(additional<=first,`${zone}/${planName} adicional <= primero`);
      }
    }
  }
});

test('Edad 25 recibe 50% y edad 26 deja de recibirlo',()=>{
  eq(engine.discountForMember(25,'Directo','none','AMBA').percent,50);
  eq(engine.discountForMember(26,'Directo','none','AMBA').percent,15);
});

test('Bonificaciones no se acumulan',()=>{
  eq(engine.discountForMember(23,'Monotributo','nordelta_tigre','AMBA').percent,50);
  eq(engine.discountForMember(35,'Monotributo','nordelta_tigre','AMBA').percent,25);
  eq(engine.discountForMember(35,'Directo','nordelta_tigre','AMBA').percent,25);
});

test('Nordelta/Tigre solo se aplica dentro de AMBA',()=>{
  eq(engine.discountForMember(35,'Relación de dependencia','nordelta_tigre','AMBA').percent,25);
  eq(engine.discountForMember(35,'Relación de dependencia','nordelta_tigre','Córdoba').percent,0);
});

test('Desregulado no agrega bonificación automática',()=>eq(engine.discountForMember(35,'Relación de dependencia','none','AMBA').percent,0));

test('Directo y Monotributo usan sus porcentajes definidos',()=>{
  eq(engine.discountForMember(35,'Directo','none','AMBA').percent,15);
  eq(engine.discountForMember(35,'Monotributo','none','AMBA').percent,25);
});

test('Plan parcial no se muestra a los 18/19 y aparece desde los 20',()=>{
  eq(quote('AMBU1',{age:18}).status,'unavailable');
  eq(quote('AMBU1',{age:19}).status,'unavailable');
  eq(quote('AMBU1',{age:20}).status,'ok');
});

test('Rangos estándar: 35/36 y 60/61 saltan a la banda correcta',()=>{
  eq(quote('S2',{age:35}).listPrice,242411);
  eq(quote('S2',{age:36}).listPrice,290883);
  eq(quote('S2',{age:60}).listPrice,567790);
  eq(quote('S2',{age:61}).listPrice,715108);
});

test('Hijos 22-25 usan siempre Hijo Adicional',()=>{
  const q=quote('S2',{familyType:'children',children:1,childrenAges:[23]});
  eq(q.status,'ok');
  eq(q.members[1].tariffRole,'Hijo adicional');
  eq(q.members[1].listPrice,147067);
  eq(q.members[1].percent,50);
});

test('Con hijo 23 seguido de hijo 10, el menor puede usar 1er Hijo',()=>{
  const q=quote('S2',{familyType:'children',children:2,childrenAges:[23,10]});
  eq(q.status,'ok');
  eq(q.members[1].tariffRole,'Hijo adicional');
  eq(q.members[2].tariffRole,'1er hijo');
  eq(q.members[1].listPrice,147067);
  eq(q.members[2].listPrice,204913);
});

test('Segundo hijo 0-21 usa Hijo Adicional',()=>{
  const q=quote('S2',{familyType:'children',children:2,childrenAges:[10,12]});
  eq(q.status,'ok');
  eq(q.members[1].tariffRole,'1er hijo');
  eq(q.members[2].tariffRole,'Hijo adicional');
});

test('Hijo mayor de 25 requiere revisión',()=>eq(quote('S2',{familyType:'children',children:1,childrenAges:[26]}).status,'consult'));

test('Planes parciales con más de un hijo requieren consulta',()=>eq(quote('AMBU1',{age:30,familyType:'children',children:2,childrenAges:[8,10]}).status,'consult'));

test('Un hijo 22-25 en plan parcial requiere consulta por falta de Hijo Adicional',()=>eq(quote('AMBU1',{age:30,familyType:'children',children:1,childrenAges:[23]}).status,'consult'));

test('Cálculo familiar aplica bonificación por integrante',()=>{
  const q=quote('S2',{familyType:'partner_children',age:35,partnerAge:36,children:2,childrenAges:[10,23]});
  eq(q.status,'ok');
  eq(q.members.length,4);
  eq(q.members[0].percent,15);
  eq(q.members[1].percent,15);
  eq(q.members[2].percent,50);
  eq(q.members[3].percent,50);
  near(q.listPrice,q.members.reduce((s,m)=>s+m.listPrice,0),0.01);
  near(q.finalBeforeAportes,q.members.reduce((s,m)=>s+m.finalPrice,0),0.01);
});

test('Desregulado con $20.000 reconstruye base redondeada y aplica aporte después de descuentos',()=>{
  const q=quote('SMG30',{modality:'Relación de dependencia',receiptContribution:20000});
  eq(q.status,'ok');
  eq(q.listPrice,292125);
  eq(q.baseCalculated,666667);
  near(q.aporteComputable,51000.03,0.01);
  near(q.finalPrice,241124.97,0.01);
});

test('Tope de base Desregulado es $4.045.590',()=>{
  const c=engine.contributionForClient(baseClient({modality:'Relación de dependencia',receiptContribution:200000}));
  eq(c.baseContribution,4045590);
  eq(c.capApplied,true);
  near(c.aporteComputable,309487.64,0.01);
});

test('Precio final nunca es negativo',()=>{
  const q=quote('S1',{modality:'Relación de dependencia',receiptContribution:200000});
  eq(q.status,'ok');
  eq(q.finalPrice,0);
});

test('Monotributo no descuenta aporte monetario',()=>{
  const q=quote('SMG30',{modality:'Monotributo',receiptContribution:200000});
  eq(q.status,'ok');
  eq(q.aporteComputable,0);
});

test('Tierra del Fuego respeta que la tabla integral no informa Monotributo',()=>{
  eq(window.getSwissTariff('S2','Monotributo','Tierra del Fuego'),null);
  eq(quote('S2',{zone:'Tierra del Fuego',modality:'Monotributo'}).status,'unavailable');
});

test('Patagonia/Salta y Tierra del Fuego no comparten el mismo objeto de tabla',()=>{
  ok(tariffs['Patagonia / Salta'].direct !== tariffs['Tierra del Fuego'].direct,'tablas direct independientes');
  ok(tariffs['Patagonia / Salta'].obligatory !== tariffs['Tierra del Fuego'].obligatory,'tablas oblig independientes');
});

test('App usa motor auditado, PDF directo y no window.print',()=>{
  const app=read('js/app.js');
  ok(app.includes('window.SWISS_ENGINE'),'motor auditado');
  ok(app.includes('Cotizacion Swiss Medical ('),'nombre PDF');
  ok(!app.includes('window.print('),'sin impresión del navegador');
  ok(app.includes('detailChunks'),'paginación de grupos grandes');
  ok(app.includes('esc ='),'escape HTML');
});

test('Index carga datos, auditoría, beneficios, motor y app en orden',()=>{
  const html=read('index.html');
  const order=['js/data-demo.js','js/tariff-audit-2026-09.js','js/benefits.js','js/quote-engine.js','js/app.js'].map(x=>html.indexOf(x));
  ok(order.every(x=>x>=0),'scripts presentes');
  ok(order.every((x,i)=>i===0||x>order[i-1]),'orden de scripts');
});

test('Tarifarios JavaScript ya no quedan públicos en el middleware de producción',()=>{
  const auth=read('netlify/edge-functions/auth.js');
  ok(!auth.includes("path.startsWith('/js/')"),'JS no público');
  ok(auth.includes("path.startsWith('/auth/')"),'login JS público');
});

test('Responsive básico contempla tablet y mobile',()=>{
  const css=read('css/styles.css')+read('css/final-audit.css');
  ok(css.includes('@media(max-width:1000px)'),'tablet');
  ok(css.includes('@media(max-width:680px)'),'mobile');
  ok(css.includes('.plans-grid{grid-template-columns:1fr}'),'planes en una columna mobile');
});

console.log(`\nResultado: ${passed} PASS, ${failures.length} FAIL`);
if (failures.length){
  console.error('\nFallos:');
  failures.forEach(f=>console.error(`- ${f}`));
  process.exit(1);
}
