import { chromium } from 'playwright';

const BASE = process.env.QA_BASE_URL || 'http://127.0.0.1:4173';
let passed = 0;
const failures = [];

function assert(value, message){ if(!value) throw new Error(message); }
async function test(name, fn){
  try { await fn(); passed++; console.log(`PASS  ${name}`); }
  catch(error){ failures.push(`${name}: ${error.message}`); console.error(`FAIL  ${name}\n      ${error.message}`); }
}

const browser = await chromium.launch({ headless:true });

async function newPage(viewport={width:1280,height:900}){
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  await page.goto(`${BASE}/index.html`, { waitUntil:'networkidle' });
  return { context, page };
}

async function prepareSelectedPlan(page, name='SMG30'){
  await page.locator('#clientName').fill('QA Interacción');
  await page.locator('#quoteForm button[type="submit"]').click();
  await page.locator('#resultados').waitFor({ state:'visible' });
  const card = page.locator('.plan-card').filter({has:page.locator('h3',{hasText:name})}).first();
  await card.locator('[data-plan]').click();
  await page.locator('#selectedBar').waitFor({ state:'visible' });
}

await test('El formulario bloquea titular menor de 18', async()=>{
  const {context,page}=await newPage();
  await page.locator('#age').fill('17');
  await page.locator('#quoteForm button[type="submit"]').click();
  assert(!(await page.locator('#resultados').isVisible()), 'no debería cotizar con titular menor de 18');
  const valid = await page.locator('#age').evaluate(el=>el.checkValidity());
  assert(valid===false, 'el campo edad debería ser inválido');
  await context.close();
});

await test('Desregulado exige aporte informado', async()=>{
  const {context,page}=await newPage();
  await page.locator('.choice',{hasText:'Desregulado'}).click();
  assert(await page.locator('#receiptContribution').getAttribute('required')!==null, 'aporte debería ser obligatorio');
  await page.locator('#receiptContribution').fill('');
  await page.locator('#quoteForm button[type="submit"]').click();
  assert(!(await page.locator('#resultados').isVisible()), 'no debería cotizar sin aporte en Desregulado');
  await context.close();
});

await test('Modal abre, cierra y vuelve a abrir sin perder plan', async()=>{
  const {context,page}=await newPage();
  await prepareSelectedPlan(page);
  await page.locator('#openQuote').click();
  assert(await page.locator('#quoteDialog').evaluate(el=>el.open), 'modal debería abrir');
  await page.locator('#closeQuote').click();
  assert(!(await page.locator('#quoteDialog').evaluate(el=>el.open)), 'modal debería cerrar');
  await page.locator('#openQuote').click();
  assert(await page.locator('#quoteDialog').evaluate(el=>el.open), 'modal debería reabrir');
  await context.close();
});

await test('Escape cierra el modal nativo', async()=>{
  const {context,page}=await newPage();
  await prepareSelectedPlan(page,'S2');
  await page.locator('#openQuote').click();
  await page.keyboard.press('Escape');
  assert(!(await page.locator('#quoteDialog').evaluate(el=>el.open)), 'Escape debería cerrar el modal');
  await context.close();
});

await test('Modificar datos después de seleccionar obliga a elegir plan nuevamente', async()=>{
  const {context,page}=await newPage();
  await prepareSelectedPlan(page);
  await page.locator('#zone').selectOption({label:'Córdoba'});
  assert(!(await page.locator('#selectedBar').isVisible()), 'barra seleccionada debería ocultarse');
  await page.locator('#openQuote').click({force:true});
  assert(!(await page.locator('#quoteDialog').evaluate(el=>el.open)), 'no debería abrir propuesta con selección invalidada');
  await context.close();
});

await browser.close();
console.log(`\nResultado interacción: ${passed} PASS, ${failures.length} FAIL`);
if(failures.length){
  console.error('\nFallos:');
  failures.forEach(f=>console.error(`- ${f}`));
  process.exit(1);
}
