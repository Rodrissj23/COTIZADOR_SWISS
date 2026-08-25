import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE = process.env.QA_BASE_URL || 'http://127.0.0.1:4173';
const JSPDF_LOCAL = new URL('../node_modules/jspdf/dist/jspdf.umd.min.js', import.meta.url).pathname;
let passed = 0;
const failures = [];

function assert(value,message){if(!value)throw new Error(message)}
async function test(name,fn){
  try{await fn();passed++;console.log(`PASS  ${name}`)}
  catch(error){failures.push(`${name}: ${error.message}`);console.error(`FAIL  ${name}\n      ${error.message}`)}
}

const browser = await chromium.launch({headless:true});

async function newPage(viewport={width:1440,height:1000}){
  const context=await browser.newContext({viewport,acceptDownloads:true});
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(`pageerror: ${e.message}`));
  page.on('console',msg=>{if(msg.type()==='error')errors.push(`console: ${msg.text()}`)});
  await page.route('https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js',route=>route.fulfill({path:JSPDF_LOCAL,contentType:'application/javascript'}));
  return {context,page,errors};
}

async function openIndex(page){
  await page.goto(`${BASE}/index.html`,{waitUntil:'networkidle'});
  await page.locator('#clientName').fill('QA Cliente');
}

async function chooseModality(page,text){
  await page.locator('.choice',{hasText:text}).click();
}

async function submit(page){
  await page.locator('#quoteForm button[type="submit"]').click();
  await page.locator('#resultados').waitFor({state:'visible'});
}

async function card(page,name){
  return page.locator('.plan-card').filter({has:page.locator('h3',{hasText:name})}).first();
}

await test('Desktop carga sin errores JS y muestra 15 planes Directo AMBA',async()=>{
  const {context,page,errors}=await newPage();
  await openIndex(page);await submit(page);
  assert(await page.locator('.plan-card').count()===15,'esperaba 15 tarjetas');
  assert(errors.length===0,errors.join(' | '));
  await context.close();
});

await test('SMG30 Directo AMBA edad 35 muestra $330.963,65',async()=>{
  const {context,page}=await newPage();
  await openIndex(page);await submit(page);
  const c=await card(page,'SMG30');
  assert((await c.textContent()).includes('330.963,65'),`precio inesperado: ${await c.textContent()}`);
  await context.close();
});

await test('Desregulado $20.000 deja SMG30 en $241.124,97',async()=>{
  const {context,page}=await newPage();
  await openIndex(page);
  await chooseModality(page,'Desregulado');
  await page.locator('#receiptContribution').fill('20000');
  await submit(page);
  const c=await card(page,'SMG30');
  assert((await c.textContent()).includes('241.124,97'),`precio inesperado: ${await c.textContent()}`);
  await context.close();
});

await test('Planes parciales se ocultan a los 18 y aparecen desde los 20',async()=>{
  const {context,page}=await newPage();
  await openIndex(page);
  await page.locator('#age').fill('18');await submit(page);
  assert(await page.locator('.plan-card h3',{hasText:'AMBU1'}).count()===0,'AMBU1 no debería aparecer a los 18');
  await page.locator('[data-scroll="#cotizador"]').last().click();
  await page.locator('#age').fill('20');await submit(page);
  assert(await page.locator('.plan-card h3',{hasText:'AMBU1'}).count()===1,'AMBU1 debería aparecer a los 20');
  await context.close();
});

await test('Nordelta/Tigre desaparece al salir de AMBA',async()=>{
  const {context,page}=await newPage();
  await openIndex(page);
  assert(!(await page.locator('#specialDiscountWrap').getAttribute('hidden')),'beneficio debería estar visible en AMBA');
  await page.locator('#zone').selectOption({label:'Córdoba'});
  assert(await page.locator('#specialDiscountWrap').getAttribute('hidden')!==null,'beneficio debería ocultarse fuera de AMBA');
  assert(await page.locator('#specialDiscount').inputValue()==='none','beneficio debería resetearse');
  await context.close();
});

await test('Cambiar datos invalida el plan seleccionado',async()=>{
  const {context,page}=await newPage();
  await openIndex(page);await submit(page);
  const c=await card(page,'SMG30');await c.locator('[data-plan]').click();
  assert(await page.locator('#selectedBar').isVisible(),'barra de selección debería estar visible');
  await page.locator('#age').fill('36');
  assert(!(await page.locator('#selectedBar').isVisible()),'barra debería ocultarse al modificar datos');
  await context.close();
});

await test('Familia grande pagina el detalle por integrante y no pierde integrantes',async()=>{
  const {context,page}=await newPage();
  await openIndex(page);
  await page.locator('#familyType').selectOption('children');
  await page.locator('#children').fill('7');
  const inputs=page.locator('.child-age');
  assert(await inputs.count()===7,'debería crear 7 campos de edad');
  for(let i=0;i<7;i++)await inputs.nth(i).fill(String(5+i));
  await submit(page);
  const c=await card(page,'S2');await c.locator('[data-plan]').click();
  await page.locator('#openQuote').click();
  await page.locator('#quoteDialog').waitFor({state:'visible'});
  assert(await page.locator('#quotePages .quote-page').count()===6,'7 hijos deberían generar 6 páginas totales');
  const economic=page.locator('#quotePages .ref-family-detail');
  assert(await economic.count()===2,'detalle por integrante debería ocupar 2 páginas');
  const text=(await economic.allTextContents()).join(' ');
  for(let i=1;i<=7;i++)assert(text.includes(`Hijo ${i}`),`falta Hijo ${i} en la propuesta`);
  await context.close();
});

await test('Cotización individual usa 4 páginas base y una sola hoja técnica',async()=>{
  const {context,page}=await newPage();
  await openIndex(page);await submit(page);
  const c=await card(page,'SMG30');await c.locator('[data-plan]').click();
  await page.locator('#openQuote').click();
  assert(await page.locator('#quotePages .quote-page').count()===4,'la propuesta individual debería tener 4 páginas');
  assert(await page.locator('.ref-cover').count()===1,'falta portada de referencia');
  assert(await page.locator('.ref-network').count()===1,'falta página institucional');
  assert(await page.locator('.ref-network img[src="assets/images/swiss-network-reference.svg"]').count()===1,'la institucional debe usar la maqueta fija de referencia');
  assert(await page.locator('.ref-summary').count()===1,'falta detalle económico');
  assert(await page.locator('.ref-technical').count()===1,'el alcance debe concentrarse en una sola página');
  await context.close();
});

await test('Campos de cotización quedan centrados dentro de cada renglón',async()=>{
  const {context,page}=await newPage();
  await openIndex(page);await submit(page);
  const c=await card(page,'SMG30');await c.locator('[data-plan]').click();
  await page.locator('#openQuote').click();
  const styles=await page.locator('.ref-summary-pair').first().evaluate(el=>{
    const label=getComputedStyle(el.querySelector('b'));
    const value=getComputedStyle(el.querySelector(':scope > span'));
    return {labelDisplay:label.display,labelAlign:label.alignItems,labelJustify:label.justifyContent,valueDisplay:value.display,valueAlign:value.alignItems,valueJustify:value.justifyContent};
  });
  assert(styles.labelDisplay==='flex'&&styles.labelAlign==='center'&&styles.labelJustify==='center',`label desalineado: ${JSON.stringify(styles)}`);
  assert(styles.valueDisplay==='flex'&&styles.valueAlign==='center'&&styles.valueJustify==='center',`valor desalineado: ${JSON.stringify(styles)}`);
  await context.close();
});

await test('Descarga PDF directa con nombre correcto y contenido no vacío',async()=>{
  const {context,page,errors}=await newPage();
  await openIndex(page);await submit(page);
  const c=await card(page,'SMG30');await c.locator('[data-plan]').click();
  await page.locator('#openQuote').click();
  const downloadPromise=page.waitForEvent('download');
  await page.locator('#printQuote').click();
  const download=await downloadPromise;
  assert(download.suggestedFilename()==='Cotizacion Swiss Medical (QA Cliente).pdf',`nombre recibido: ${download.suggestedFilename()}`);
  const path=await download.path();
  assert(path && fs.statSync(path).size>10000,`PDF demasiado pequeño: ${path?fs.statSync(path).size:0}`);
  assert(errors.length===0,errors.join(' | '));
  await context.close();
});

await test('Tierra del Fuego + Monotributo no ofrece planes integrales sin tabla',async()=>{
  const {context,page}=await newPage();
  await openIndex(page);
  await page.locator('#zone').selectOption({label:'Tierra del Fuego'});
  await chooseModality(page,'Monotributo');
  await submit(page);
  const names=await page.locator('.plan-card h3').allTextContents();
  assert(names.every(name=>['AMBU1','AMBU2','INTER1'].includes(name.trim())),`planes inesperados: ${names.join(', ')}`);
  assert(names.length===3,`esperaba 3 parciales, recibí ${names.length}`);
  await context.close();
});

await test('Mobile 390px no tiene overflow horizontal en la página principal',async()=>{
  const {context,page,errors}=await newPage({width:390,height:844});
  await openIndex(page);await submit(page);
  const dimensions=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}));
  assert(dimensions.scroll<=dimensions.client+2,`overflow horizontal: ${JSON.stringify(dimensions)}`);
  assert(await page.locator('.plan-card').first().isVisible(),'tarjeta mobile no visible');
  assert(errors.length===0,errors.join(' | '));
  await context.close();
});

await test('Preview mobile cabe en viewport y mantiene controles accesibles',async()=>{
  const {context,page}=await newPage({width:390,height:844});
  await openIndex(page);await submit(page);
  const c=await card(page,'S2');await c.locator('[data-plan]').click();
  await page.locator('#openQuote').click();
  const dialog=page.locator('#quoteDialog');
  assert(await dialog.isVisible(),'modal no visible');
  const box=await page.locator('#quotePages .quote-page').first().boundingBox();
  assert(box && box.width<=390,`preview excede viewport: ${box?.width}`);
  assert(await page.locator('#printQuote').isVisible(),'botón PDF no visible');
  assert(await page.locator('#closeQuote').isVisible(),'botón cerrar no visible');
  await context.close();
});

await test('Login desktop y mobile no generan overflow horizontal',async()=>{
  for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
    const {context,page,errors}=await newPage(viewport);
    await page.goto(`${BASE}/login.html`,{waitUntil:'networkidle'});
    const d=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}));
    assert(d.scroll<=d.client+2,`login overflow ${viewport.width}px: ${JSON.stringify(d)}`);
    assert(await page.locator('#loginForm').isVisible(),'form login no visible');
    assert(errors.length===0,errors.join(' | '));
    await context.close();
  }
});

await browser.close();
console.log(`\nResultado navegador: ${passed} PASS, ${failures.length} FAIL`);
if(failures.length){
  console.error('\nFallos:');failures.forEach(f=>console.error(`- ${f}`));process.exit(1);
}
