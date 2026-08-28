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
const eq = (actual, expected, label='') => { if (actual !== expected) throw new Error(`${label} esperado ${expected}, recibido ${actual}`); };
const near = (actual, expected, tolerance=0.01, label='') => { if (Math.abs(actual-expected) > tolerance) throw new Error(`${label} esperado ${expected}, recibido ${actual}`); };
const ok = (value, label='condición') => { if (!value) throw new Error(`${label} no se cumplió`); };

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

test('Hijo adicional S1 Obligatorio AMBA corregido',()=>eq(tariffs.AMBA.obligatory.additionalChild.S1,83061));

test('Planes parciales coinciden con checkpoints de tabla',()=>{
  eq(window.SWISS_AMBULATORY_TARIFF.adult.AMBU1['20_25'],86333.8);
  eq(window.SWISS_AMBULATORY_TARIFF.adult.AMBU2['20_25'],49204.8);
  eq(window.SWISS_AMBULATORY_TARIFF.adult.INTER1['20_25'],125473.8);
  eq(window.SWISS_AMBULATORY_TARIFF.firstChild.AMBU1,74939.2);
});

test('Tarifas adultas son positivas y no decrecen con la edad',()=>{
  const ordered=['u35','36_40','41_45','46_50','51_55','56_60','o61'];
  for (const [zone,sets] of Object.entries(tariffs)){
    if (!['AMBA','Buenos Aires Interior / Santa Fe','Córdoba','Patagonia / Salta','Resto del país','Tierra del Fuego'].includes(zone)) continue;
    for (const tariff of Object.values(sets)){
      for (const bands of Object.values(tariff.adult)){
        let previous=-Infinity;
        for (const key of ordered){
          const value=bands[key];
          ok(Number.isFinite(value)&&value>0,`${zone}/${key} positivo`);
          ok(value>=previous,`${zone} no decreciente en ${key}`);
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

test('Directo: hasta 25 recibe 50% y desde 26 recibe 15%',()=>{
  eq(engine.discountForMember(25,'Directo','none','AMBA').percent,50);
  eq(engine.discountForMember(26,'Directo','none','AMBA').percent,15);
});

test('Obligatorio: hasta 25 recibe 50% y desde 26 recibe 15%',()=>{
  eq(engine.discountForMember(25,'Relación de dependencia','none','AMBA').percent,50);
  eq(engine.discountForMember(26,'Relación de dependencia','none','AMBA').percent,15);
  eq(engine.displayModality('Relación de dependencia'),'Obligatorio');
});

test('Monotributo no se combina',()=>{
  eq(engine.discountForMember(23,'Monotributo','nordelta_tigre','AMBA').percent,25);
  eq(engine.discountForMember(35,'Monotributo','nordelta_tigre','AMBA').percent,25);
});

test('Campaña territorial aplica 25% en AMBA y fuera de AMBA queda la bonificación base de Obligatorio',()=>{
  eq(engine.discountForMember(35,'Relación de dependencia','nordelta_tigre','AMBA').percent,25);
  eq(engine.discountForMember(35,'Relación de dependencia','nordelta_tigre','Córdoba').percent,15);
});

test('Las campañas muestran vigencia de 12 meses',()=>{
  ok(engine.discountForMember(25,'Directo','none','AMBA').label.includes('12 meses'),'menor 50%');
  ok(engine.discountForMember(35,'Directo','none','AMBA').label.includes('12 meses'),'Directo 15%');
  ok(engine.discountForMember(35,'Monotributo','none','AMBA').label.includes('12 meses'),'Monotributo 25%');
  ok(engine.discountForMember(35,'Relación de dependencia','none','AMBA').label.includes('12 meses'),'Obligatorio 15%');
});

test('Pilar y Escobar usan tarifario AMBA en los alias comerciales',()=>{
  eq(window.getSwissTariff('S2','Directo','Pilar'),window.getSwissTariff('S2','Directo','AMBA'));
  eq(window.getSwissTariff('S2','Directo','Escobar'),window.getSwissTariff('S2','Directo','AMBA'));
  eq(window.getSwissDiscount(35,'Directo','Pilar'),25);
  eq(window.getSwissDiscount(35,'Directo','Escobar'),25);
});

test('Menor puede ingresar solo como titular en plan estándar',()=>{
  const q=quote('S2',{age:6});
  eq(q.status,'ok');
  eq(q.members[0].percent,50);
});

test('Pareja debe tener al menos 18 años',()=>{
  eq(quote('S2',{familyType:'partner',age:35,partnerAge:17}).status,'unavailable');
  eq(quote('S2',{familyType:'partner',age:35,partnerAge:18}).status,'ok');
});

test('Plan parcial no se muestra a los 18/19 y aparece desde los 20',()=>{
  eq(quote('AMBU1',{age:18}).status,'unavailable');
  eq(quote('AMBU1',{age:19}).status,'unavailable');
  eq(quote('AMBU1',{age:20}).status,'ok');
});

test('Hijos 22-25 usan Hijo Adicional y 50%',()=>{
  const q=quote('S2',{familyType:'children',children:1,childrenAges:[23]});
  eq(q.status,'ok');
  eq(q.members[1].tariffRole,'Hijo adicional');
  eq(q.members[1].percent,50);
});

test('Segundo hijo 0-21 usa Hijo Adicional',()=>{
  const q=quote('S2',{familyType:'children',children:2,childrenAges:[10,12]});
  eq(q.status,'ok');
  eq(q.members[1].tariffRole,'1er hijo');
  eq(q.members[2].tariffRole,'Hijo adicional');
});

test('Hijo mayor de 25 requiere revisión',()=>eq(quote('S2',{familyType:'children',children:1,childrenAges:[26]}).status,'consult'));

test('Planes parciales con más de un hijo requieren consulta',()=>eq(quote('AMBU1',{age:30,familyType:'children',children:2,childrenAges:[8,10]}).status,'consult'));

test('Cálculo familiar aplica bonificación por integrante',()=>{
  const q=quote('S2',{familyType:'partner_children',age:35,partnerAge:36,children:2,childrenAges:[10,23]});
  eq(q.status,'ok');
  eq(q.members[0].percent,15);
  eq(q.members[1].percent,15);
  eq(q.members[2].percent,50);
  eq(q.members[3].percent,50);
});

test('Campaña territorial familiar aplica 25% a adultos y 50% a menores',()=>{
  const q=quote('S2',{familyType:'partner_children',age:35,partnerAge:36,children:1,childrenAges:[10],specialDiscount:'nordelta_tigre'});
  eq(q.status,'ok');
  eq(q.members[0].percent,25);
  eq(q.members[1].percent,25);
  eq(q.members[2].percent,50);
});

test('Monotributo familiar aplica 25% también a los menores',()=>{
  const q=quote('S2',{modality:'Monotributo',familyType:'partner_children',age:35,partnerAge:36,children:2,childrenAges:[10,23],specialDiscount:'nordelta_tigre'});
  eq(q.status,'ok');
  for (const member of q.members) eq(member.percent,25,`${member.role} porcentaje`);
  near(q.finalBeforeAportes,q.listPrice*0.75,0.01,'total familiar Monotributo');
});

test('Obligatorio con $20.000 aplica 15% y luego aporte computable',()=>{
  const q=quote('SMG30',{modality:'Relación de dependencia',receiptContribution:20000});
  eq(q.status,'ok');
  eq(q.listPrice,292125);
  eq(q.members[0].percent,15);
  near(q.baseCalculated,666666.6666666666,0.000001);
  near(q.aporteComputable,51000,0.01);
  near(q.finalPrice,197306.25,0.01);
});

test('Tope de base Obligatorio es $4.045.590',()=>{
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

test('Patagonia/Salta y Tierra del Fuego no comparten objeto de tabla',()=>{
  ok(tariffs['Patagonia / Salta'].direct !== tariffs['Tierra del Fuego'].direct,'tablas direct independientes');
  ok(tariffs['Patagonia / Salta'].obligatory !== tariffs['Tierra del Fuego'].obligatory,'tablas oblig independientes');
});

test('Index muestra Obligatorio, alineación DNI y acordeón automático',()=>{
  const html=read('index.html');
  ok(html.includes('<b>Obligatorio</b>'),'etiqueta Obligatorio');
  ok(html.includes('class="field-label">DNI'),'DNI alineado');
  ok(html.includes('<details class="campaign-info">'),'acordeón campañas');
  ok(html.includes('se calculan automáticamente'),'aviso cálculo automático');
  ok(html.includes('css/ui-corrections.css'),'estilos UI');
});

test('App usa motor auditado',()=>{
  const app=read('js/app.js');
  ok(app.includes('window.SWISS_ENGINE'),'motor auditado');
  ok(!app.includes('window.print('),'sin impresión del navegador');
});

test('Index carga datos, auditoría, beneficios, motor y app en orden',()=>{
  const html=read('index.html');
  const order=['js/data-demo.js','js/tariff-audit-2026-09.js','js/benefits.js','js/quote-engine.js','js/app.js'].map(x=>html.indexOf(x));
  ok(order.every(x=>x>=0),'scripts presentes');
  ok(order.every((x,i)=>i===0||x>order[i-1]),'orden de scripts');
});

test('Tarifarios JavaScript ya no quedan públicos en middleware de producción',()=>{
  const auth=read('netlify/edge-functions/auth.js');
  ok(!auth.includes("path.startsWith('/js/')"),'JS no público');
  ok(auth.includes("path.startsWith('/auth/')"),'login JS público');
});

test('Responsive básico contempla tablet y mobile',()=>{
  const css=read('css/styles.css')+read('css/final-audit.css')+read('css/ui-corrections.css');
  ok(css.includes('@media(max-width:1000px)'),'tablet');
  ok(css.includes('@media(max-width:680px)'),'mobile');
});

console.log(`\nResultado: ${passed} PASS, ${failures.length} FAIL`);
if (failures.length){
  console.error('\nFallos:');
  failures.forEach(f=>console.error(`- ${f}`));
  process.exit(1);
}
