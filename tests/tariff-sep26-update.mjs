import fs from 'node:fs';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const read = path => fs.readFileSync(new URL(path, root), 'utf8');
const load = path => vm.runInThisContext(read(path), {filename:path});
const eq = (actual, expected, label='') => { if (actual !== expected) throw new Error(`${label} esperado ${expected}, recibido ${actual}`); };
const near = (actual, expected, tolerance=0.01, label='') => { if (Math.abs(actual-expected) > tolerance) throw new Error(`${label} esperado ${expected}, recibido ${actual}`); };
const ok = (value, label='condición') => { if (!value) throw new Error(`${label} no se cumplió`); };

// Carga exactamente en el mismo orden que index.html.
globalThis.window = {};
load('js/data-demo.js');
load('js/tariff-audit-2026-09.js');

const partialSnapshot = JSON.stringify(window.SWISS_AMBULATORY_TARIFF);
const before = JSON.parse(JSON.stringify(window.SWISS_ZONE_TARIFFS));
load('js/tariff-sep26-update.js');
load('js/quote-engine.js');

const after = window.SWISS_ZONE_TARIFFS;
const meta = window.SWISS_SEP26_TARIFF_UPDATE;
const targetPlans = new Set(meta.targetPlans);
let checked = 0;

for (const zone of meta.zones) {
  for (const kind of ['direct','obligatory']) {
    for (const [planName,bands] of Object.entries(before[zone][kind].adult)) {
      if (!targetPlans.has(planName)) continue;
      for (const [band,oldValue] of Object.entries(bands)) {
        if (!(Number(oldValue) > 0)) continue;
        eq(after[zone][kind].adult[planName][band], Math.round(oldValue * 1.022), `${zone}/${kind}/${planName}/${band}`);
        checked++;
      }
    }
    for (const mapName of ['firstChild','additionalChild']) {
      for (const [planName,oldValue] of Object.entries(before[zone][kind][mapName] || {})) {
        if (!targetPlans.has(planName) || !(Number(oldValue) > 0)) continue;
        eq(after[zone][kind][mapName][planName], Math.round(oldValue * 1.022), `${zone}/${kind}/${mapName}/${planName}`);
        checked++;
      }
    }
  }
}

eq(meta.rate,1.022,'aumento Sep26');
eq(checked,1116,'valores verificados');
eq(meta.updatedValues,1116,'valores actualizados');
eq(meta.expectedUpdatedValues,1116,'conteo esperado');
eq(JSON.stringify(window.SWISS_AMBULATORY_TARIFF),partialSnapshot,'AMBU1/AMBU2/INTER1 sin cambios');

// Checkpoints tomados directamente de los bloques Directos / Derivación Directa del Excel Sep26.
const checkpoints = [
  ['AMBA','direct','S1','u35',197338],
  ['AMBA','direct','SMG20','36_40',415674],
  ['AMBA','direct','SMG40','46_50',576475],
  ['AMBA','direct','SMG70','o61',2627089],
  ['AMBA','obligatory','S1','46_50',217340],
  ['AMBA','obligatory','SMG30','u35',298552],
  ['Buenos Aires Interior / Santa Fe','direct','S2','u35',213049],
  ['Buenos Aires Interior / Santa Fe','obligatory','SMG30','u35',256744],
  ['Córdoba','direct','S2','u35',185818],
  ['Córdoba','direct','SMG70','o61',1970271],
  ['Córdoba','obligatory','S2','u35',145349],
  ['Patagonia / Salta','direct','S2','u35',247744],
  ['Patagonia / Salta','obligatory','S2','u35',193801],
  ['Tierra del Fuego','direct','S2','u35',247744],
  ['Tierra del Fuego','obligatory','S2','u35',193801],
  ['Resto del país','direct','S2','u35',193239],
  ['Resto del país','obligatory','S2','u35',151185]
];
for (const [zone,kind,plan,band,expected] of checkpoints) {
  eq(after[zone][kind].adult[plan][band], expected, `checkpoint ${zone}/${kind}/${plan}/${band}`);
}

eq(after.AMBA.direct.firstChild.SMG20,292822,'AMBA Directo primer hijo SMG20');
eq(after.AMBA.direct.additionalChild.SMG20,210162,'AMBA Directo hijo adicional SMG20');
eq(after.AMBA.obligatory.firstChild.SMG20,215950,'AMBA Obligatorio primer hijo SMG20');
eq(after.AMBA.obligatory.additionalChild.SMG20,155970,'AMBA Obligatorio hijo adicional SMG20');

// Simulaciones funcionales después de la actualización.
const engine = window.SWISS_ENGINE;
const plan = name => window.SWISS_PLANS.find(p => p.name === name);
const client = overrides => ({name:'QA',dni:'',zone:'AMBA',modality:'Directo',specialDiscount:'none',familyType:'individual',age:35,partnerAge:35,children:0,childrenAges:[],receiptContribution:0,...overrides});

let q = engine.familyQuote(plan('SMG20'),client({age:39}));
eq(q.status,'ok','SMG20 Directo AMBA');
eq(q.listPrice,415674,'lista SMG20 39');
near(q.finalPrice,353322.9,0.01,'final Directo 15%');

q = engine.familyQuote(plan('S2'),client({age:6}));
eq(q.status,'ok','menor solo');
eq(q.listPrice,247744,'S2 menor banda inicial Sep26');
near(q.finalPrice,123872,0.01,'menor 50%');

q = engine.familyQuote(plan('SMG20'),client({modality:'Relación de dependencia',age:39,receiptContribution:20000}));
eq(q.status,'ok','SMG20 Obligatorio');
eq(q.listPrice,325166,'lista Obligatorio SMG20 39');
near(q.aporteComputable,51000,0.01,'aporte computable mantiene lógica vigente');
near(q.finalPrice,225391.1,0.01,'final Obligatorio con aporte');

q = engine.familyQuote(plan('SMG20'),client({modality:'Monotributo',age:39}));
eq(q.status,'ok','SMG20 Monotributo');
eq(q.listPrice,415674,'Monotributo usa lista voluntaria');
near(q.finalPrice,311755.5,0.01,'Monotributo 25%');

ok(window.getSwissTariff('SMG20','Directo','AMBA').adult.SMG20.u35 === 346404,'helper Directo actualizado');
ok(window.getSwissTariff('SMG20','Relación de dependencia','AMBA').adult.SMG20.u35 === 270980,'helper Obligatorio actualizado');

console.log(`PASS  Tarifarios Sep26: ${checked} importes validados + simulaciones funcionales OK`);
