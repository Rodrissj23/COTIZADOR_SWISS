import { chromium } from 'playwright';
import fs from 'node:fs';
import { PDFDocument } from 'pdf-lib';

const BASE = process.env.QA_BASE_URL || 'http://127.0.0.1:4173';
const JSPDF_LOCAL = new URL('../node_modules/jspdf/dist/jspdf.umd.min.js', import.meta.url).pathname;
const PDFLIB_LOCAL = new URL('../node_modules/pdf-lib/dist/pdf-lib.min.js', import.meta.url).pathname;
const HTML2CANVAS_LOCAL = new URL('../node_modules/html2canvas/dist/html2canvas.min.js', import.meta.url).pathname;
let passed = 0;
const failures = [];

function assert(value,message){if(!value)throw new Error(message)}
async function test(name,fn){try{await fn();passed++;console.log(`PASS  ${name}`)}catch(error){failures.push(`${name}: ${error.message}`);console.error(`FAIL  ${name}\n      ${error.message}`)}}
const browser = await chromium.launch({headless:true});

async function newPage(viewport={width:1440,height:1000}){
  const context=await browser.newContext({viewport,acceptDownloads:true});
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(`pageerror: ${e.message}`));
  page.on('console',msg=>{if(msg.type()==='error')errors.push(`console: ${msg.text()}`)});
  await page.route('https://fonts.googleapis.com/**',route=>route.fulfill({body:'',contentType:'text/css'}));
  await page.route('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js',route=>route.fulfill({path:HTML2CANVAS_LOCAL,contentType:'application/javascript'}));
  await page.route('https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js',route=>route.fulfill({path:JSPDF_LOCAL,contentType:'application/javascript'}));
  await page.route('https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js',route=>route.fulfill({path:PDFLIB_LOCAL,contentType:'application/javascript'}));
  return {context,page,errors};
}
async function openIndex(page){await page.goto(`${BASE}/index.html`,{waitUntil:'networkidle'});await page.locator('#clientName').fill('QA Cliente')}
async function chooseModality(page,text){await page.locator('.choice',{hasText:text}).click()}
async function submit(page){await page.locator('#quoteForm button[type="submit"]').click();await page.locator('#resultados').waitFor({state:'visible'})}
async function card(page,name){return page.locator('.plan-card').filter({has:page.locator(`[data-plan="${name}"]`)}).first()}

await test('Desktop carga sin errores JS y muestra 15 planes Directo AMBA',async()=>{const {context,page,errors}=await newPage();await openIndex(page);await submit(page);assert(await page.locator('.plan-card').count()===15,'esperaba 15 tarjetas');assert(errors.length===0,errors.join(' | '));await context.close()});
await test('SMG30 Directo AMBA edad 35 muestra $330.963,65',async()=>{const {context,page}=await newPage();await openIndex(page);await submit(page);const c=await card(page,'SMG30');assert((await c.textContent()).includes('330.963,65'),`precio inesperado: ${await c.textContent()}`);await context.close()});
await test('Desregulado $20.000 deja SMG30 en $241.125',async()=>{const {context,page}=await newPage();await openIndex(page);await chooseModality(page,'Desregulado');await page.locator('#receiptContribution').fill('20000');await submit(page);const c=await card(page,'SMG30');assert((await c.textContent()).includes('241.125'),`precio inesperado: ${await c.textContent()}`);await context.close()});
await test('Planes parciales se ocultan a los 18 y aparecen desde los 20',async()=>{const {context,page}=await newPage();await openIndex(page);await page.locator('#age').fill('18');await submit(page);assert(await page.locator('[data-plan="AMBU1"]').count()===0,'AMBU1 no debería aparecer a los 18');await page.locator('[data-scroll="#cotizador"]').last().click();await page.locator('#age').fill('20');await submit(page);assert(await page.locator('[data-plan="AMBU1"]').count()===1,'AMBU1 debería aparecer a los 20');await context.close()});
await test('Nordelta/Tigre desaparece al salir de AMBA',async()=>{const {context,page}=await newPage();await openIndex(page);assert(!(await page.locator('#specialDiscountWrap').getAttribute('hidden')),'beneficio debería estar visible en AMBA');await page.locator('#zone').selectOption({label:'Córdoba'});assert(await page.locator('#specialDiscountWrap').getAttribute('hidden')!==null,'beneficio debería ocultarse fuera de AMBA');assert(await page.locator('#specialDiscount').inputValue()==='none','beneficio debería resetearse');await context.close()});
await test('Cambiar datos invalida el plan seleccionado',async()=>{const {context,page}=await newPage();await openIndex(page);await submit(page);const c=await card(page,'SMG30');await c.locator('[data-plan]').click();assert(await page.locator('#selectedBar').isVisible(),'barra de selección debería estar visible');await page.locator('#age').fill('36');assert(!(await page.locator('#selectedBar').isVisible()),'barra debería ocultarse al modificar datos');await context.close()});

await test('Familia grande pagina el detalle por integrante sin resumen de cobertura sintético',async()=>{
  const {context,page}=await newPage();await openIndex(page);await page.locator('#familyType').selectOption('children');await page.locator('#children').fill('7');
  const inputs=page.locator('.child-age');assert(await inputs.count()===7,'debería crear 7 campos de edad');for(let i=0;i<7;i++)await inputs.nth(i).fill(String(5+i));
  await submit(page);const c=await card(page,'S2');await c.locator('[data-plan]').click();await page.locator('#openQuote').click();await page.locator('#quoteDialog').waitFor({state:'visible'});await page.waitForTimeout(20);
  assert(await page.locator('#quotePages .quote-page').count()===5,'7 hijos deberían generar 5 páginas de propuesta');const economic=page.locator('#quotePages .ref-family-detail');assert(await economic.count()===2,'detalle por integrante debería ocupar 2 páginas');const text=(await economic.allTextContents()).join(' ');for(let i=1;i<=7;i++)assert(text.includes(`Hijo ${i}`),`falta Hijo ${i} en la propuesta`);assert(await page.locator('.ref-technical').count()===0,'no debe existir resumen de cobertura reconstruido');await context.close();
});

for (const scenario of [
  {name:'Titular + pareja',type:'partner',partnerAge:38},
  {name:'Titular + hijo',type:'children',children:[10]},
  {name:'Titular + pareja + hijo',type:'partner_children',partnerAge:38,children:[10]}
]) {
  await test(`${scenario.name} conserva orden y detalle familiar`,async()=>{
    const {context,page,errors}=await newPage();await openIndex(page);await page.locator('#familyType').selectOption(scenario.type);
    if (scenario.partnerAge) await page.locator('#partnerAge').fill(String(scenario.partnerAge));
    if (scenario.children) {
      await page.locator('#children').fill(String(scenario.children.length));
      const inputs=page.locator('.child-age');for(let i=0;i<scenario.children.length;i++)await inputs.nth(i).fill(String(scenario.children[i]));
    }
    await submit(page);const c=await card(page,'S2');await c.locator('[data-plan]').click();await page.locator('#openQuote').click();await page.locator('#quoteDialog').waitFor({state:'visible'});
    await page.waitForFunction(()=>document.querySelectorAll('img[data-original-intro]').length===2&&[...document.querySelectorAll('img[data-original-intro]')].every(img=>img.complete&&img.naturalWidth>1800));
    assert(await page.locator('#quotePages .quote-page').count()===4,`${scenario.name} debería tener 4 páginas de propuesta`);
    assert(await page.locator('#quotePages .quote-page').nth(0).getAttribute('class').then(v=>v.includes('ref-intro-original--1')),'hoja 1 fuera de orden');
    assert(await page.locator('#quotePages .quote-page').nth(1).getAttribute('class').then(v=>v.includes('ref-intro-original--2')),'hoja 2 fuera de orden');
    assert(await page.locator('#quotePages .quote-page').nth(2).getAttribute('class').then(v=>v.includes('ref-summary')),'cotización fuera de orden');
    assert(await page.locator('#quotePages .quote-page').nth(3).getAttribute('class').then(v=>v.includes('ref-family-detail')),'detalle familiar fuera de orden');
    assert(errors.length===0,errors.join(' | '));await context.close();
  });
}

await test('Cotización individual usa 3 páginas y el alcance oficial exacto se adjunta aparte',async()=>{
  const {context,page}=await newPage();await openIndex(page);await submit(page);const c=await card(page,'SMG30');await c.locator('[data-plan]').click();await page.locator('#openQuote').click();await page.waitForTimeout(20);
  assert(await page.locator('#quotePages .quote-page').count()===3,'la propuesta individual debería tener 3 páginas');assert(await page.locator('.ref-cover').count()===1,'falta portada original');assert(await page.locator('.ref-network').count()===1,'falta página institucional original');assert(await page.locator('.ref-cover img[data-original-intro="1"]').count()===1,'la hoja 1 debe usar la portada original');assert(await page.locator('.ref-network img[data-original-intro="2"]').count()===1,'la hoja 2 debe usar la institucional original');assert(await page.locator('.ref-summary-svg').count()===1,'falta hoja económica SVG');assert(await page.locator('.ref-technical').count()===0,'no debe incluirse una hoja técnica resumida');assert((await page.locator('.dialog-toolbar small').textContent()).includes('alcance oficial exacto incluido en la descarga'),'el toolbar debe aclarar el alcance oficial exacto');await context.close();
});

await test('Todos los planes usan propuesta base sin cobertura sintetizada',async()=>{
  const {context,page}=await newPage();await openIndex(page);await submit(page);
  for(const name of ['S1','S2','SMG02','SMG20','SMG30','SMG40','SMG50','SMG60','SMG70','SPORT S','SPORT','SPORT+','AMBU1','AMBU2','INTER1']){
    const c=await card(page,name);assert(await c.count()===1,`no se encontró ${name}`);await c.locator('[data-plan]').click();await page.locator('#openQuote').click();await page.waitForTimeout(10);assert(await page.locator('#quotePages .quote-page').count()===3,`${name} debería tener 3 páginas comerciales base`);assert(await page.locator('.ref-technical').count()===0,`${name} no debe incluir resumen de cobertura reconstruido`);await page.locator('#closeQuote').click();
  }
  await context.close();
});

await test('Hojas originales ocupan A4 sin recorte, deformación ni pérdida de resolución',async()=>{const {context,page}=await newPage();await openIndex(page);await submit(page);const c=await card(page,'SMG30');await c.locator('[data-plan]').click();await page.locator('#openQuote').click();await page.waitForFunction(()=>[...document.querySelectorAll('img[data-original-intro]')].length===2&&[...document.querySelectorAll('img[data-original-intro]')].every(img=>img.complete&&img.naturalWidth>1800));const images=page.locator('img[data-original-intro]');const expected=[[1859,2631],[1860,2631]];for(let i=0;i<2;i++){const img=images.nth(i);const natural=await img.evaluate(node=>({w:node.naturalWidth,h:node.naturalHeight,fit:getComputedStyle(node).objectFit}));assert(natural.w===expected[i][0]&&natural.h===expected[i][1],`hoja ${i+1} perdió resolución: ${JSON.stringify(natural)}`);assert(natural.fit==='contain',`hoja ${i+1} puede recortarse o deformarse: ${natural.fit}`);const pageBox=await img.locator('xpath=..').boundingBox();const imgBox=await img.boundingBox();assert(pageBox&&imgBox&&Math.abs(pageBox.width-imgBox.width)<1&&Math.abs(pageBox.height-imgBox.height)<1,`hoja ${i+1} no ocupa A4`);}await context.close()});
await test('Hoja económica mantiene todos los renglones y valores dentro del SVG',async()=>{const {context,page}=await newPage();await openIndex(page);await submit(page);const c=await card(page,'SMG30');await c.locator('[data-plan]').click();await page.locator('#openQuote').click();const svg=page.locator('.ref-summary-svg');assert(await svg.isVisible(),'SVG económico no visible');const text=await svg.textContent();for(const label of ['Grupo familiar','Zona','Valor detalle','Fliar a cargo','Aportes a descontar','Descuento promocional','Descuento multiproducto','IVA','Total'])assert(text.includes(label),`falta renglón ${label}`);const box=await svg.boundingBox();assert(box&&Math.round(box.width)===794&&Math.round(box.height)===1123,`dimensiones inesperadas ${JSON.stringify(box)}`);await context.close()});
await test('Hoja económica Desregulado refleja aporte y total exactos',async()=>{const {context,page}=await newPage();await openIndex(page);await chooseModality(page,'Desregulado');await page.locator('#receiptContribution').fill('20000');await submit(page);const c=await card(page,'SMG30');await c.locator('[data-plan]').click();await page.locator('#openQuote').click();const text=await page.locator('.ref-summary-svg').textContent();assert(text.includes('51.000'),`aporte no visible: ${text}`);assert(text.includes('241.125'),`total no visible: ${text}`);await context.close()});
await test('Descarga PDF conserva páginas 1 y 2 originales byte a byte y el alcance exacto',async()=>{const {context,page,errors}=await newPage();await openIndex(page);await submit(page);const c=await card(page,'SMG30');await c.locator('[data-plan]').click();await page.locator('#openQuote').click();const downloadPromise=page.waitForEvent('download',{timeout:90000});await page.locator('#printQuote').click();const download=await downloadPromise;assert(download.suggestedFilename()==='Cotizacion Swiss Medical (QA Cliente).pdf',`nombre recibido: ${download.suggestedFilename()}`);const path=await download.path();assert(path&&fs.statSync(path).size>800000,`PDF demasiado pequeño: ${path?fs.statSync(path).size:0}`);const finalBytes=fs.readFileSync(path);const intro1=fs.readFileSync(new URL('../assets/static/swiss-intro-page1.jpg',import.meta.url));const intro2=fs.readFileSync(new URL('../assets/static/swiss-intro-page2.jpg',import.meta.url));assert(finalBytes.indexOf(intro1)>=0,'la hoja 1 original fue recomprimida o reemplazada');assert(finalBytes.indexOf(intro2)>=0,'la hoja 2 original fue recomprimida o reemplazada');const finalDoc=await PDFDocument.load(finalBytes);const coverageBytes=fs.readFileSync(new URL('../assets/coverage/SMG30 08_2026.pdf',import.meta.url));const coverageDoc=await PDFDocument.load(coverageBytes);assert(finalDoc.getPageCount()===3+coverageDoc.getPageCount(),`orden/cantidad final inesperada: ${finalDoc.getPageCount()}`);assert(errors.length===0,errors.join(' | '));await context.close()});
await test('Monotributo y zona Interior muestran importes auditados',async()=>{const {context,page}=await newPage();await openIndex(page);await chooseModality(page,'Monotributo');await submit(page);let c=await card(page,'SMG30');assert((await c.textContent()).includes('292.026,75'),`Monotributo inesperado: ${await c.textContent()}`);await page.locator('[data-scroll="#cotizador"]').last().click();await page.locator('#zone').selectOption({label:'Buenos Aires Interior / Santa Fe'});await chooseModality(page,'Directo');await submit(page);c=await card(page,'S2');assert((await c.textContent()).includes('177.193,55'),`Interior inesperado: ${await c.textContent()}`);await context.close()});
await test('Tierra del Fuego + Monotributo no ofrece planes integrales sin tabla',async()=>{const {context,page}=await newPage();await openIndex(page);await page.locator('#zone').selectOption({label:'Tierra del Fuego'});await chooseModality(page,'Monotributo');await submit(page);const names=await page.locator('.plan-card [data-plan]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-plan')));assert(names.every(name=>['AMBU1','AMBU2','INTER1'].includes(name)),`planes inesperados: ${names.join(', ')}`);assert(names.length===3,`esperaba 3 parciales, recibí ${names.length}`);await context.close()});
await test('Mobile 390px no tiene overflow horizontal en la página principal',async()=>{const {context,page,errors}=await newPage({width:390,height:844});await openIndex(page);await submit(page);const dimensions=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}));assert(dimensions.scroll<=dimensions.client+2,`overflow horizontal: ${JSON.stringify(dimensions)}`);assert(await page.locator('.plan-card').first().isVisible(),'tarjeta mobile no visible');assert(errors.length===0,errors.join(' | '));await context.close()});
await test('Preview mobile cabe en viewport y mantiene controles accesibles',async()=>{const {context,page}=await newPage({width:390,height:844});await openIndex(page);await submit(page);const c=await card(page,'S2');await c.locator('[data-plan]').click();await page.locator('#openQuote').click();const dialog=page.locator('#quoteDialog');assert(await dialog.isVisible(),'modal no visible');const box=await page.locator('#quotePages .quote-page').first().boundingBox();assert(box&&box.width<=390,`preview excede viewport: ${box?.width}`);assert(await page.locator('#printQuote').isVisible(),'botón PDF no visible');assert(await page.locator('#closeQuote').isVisible(),'botón cerrar no visible');await context.close()});
await test('Logo vectorial oficial visible y sin overflow en portal desktop y mobile',async()=>{for(const viewport of [{width:1440,height:900},{width:390,height:844}]){const {context,page,errors}=await newPage(viewport);await page.goto(`${BASE}/login.html`,{waitUntil:'networkidle'});const d=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}));assert(d.scroll<=d.client+2,`login overflow ${viewport.width}px: ${JSON.stringify(d)}`);assert(await page.locator('#loginForm').isVisible(),'form login no visible');const loginLogo=page.locator('.login-brand .brand--official img');assert(await loginLogo.isVisible(),'logo oficial no visible en login');assert(await loginLogo.evaluate(img=>img.complete&&img.naturalWidth===166&&img.naturalHeight===56),'logo SVG oficial del login no cargó con su geometría fuente');assert(await loginLogo.evaluate(img=>getComputedStyle(img.closest('.brand--login')).backgroundColor==='rgba(0, 0, 0, 0)'),'el logo del login no debe quedar dentro de una caja blanca');await page.goto(`${BASE}/index.html`,{waitUntil:'networkidle'});const headerLogo=page.locator('.site-header .brand--official img');assert(await headerLogo.isVisible(),'logo oficial no visible en encabezado');assert(await headerLogo.evaluate(img=>img.complete&&img.naturalWidth===166&&img.naturalHeight===56),'logo SVG oficial del encabezado no cargó con su geometría fuente');assert(errors.length===0,errors.join(' | '));await context.close()}});

await browser.close();
console.log(`\nResultado navegador: ${passed} PASS, ${failures.length} FAIL`);
if(failures.length){console.error('\nFallos:');failures.forEach(f=>console.error(`- ${f}`));process.exit(1)}
