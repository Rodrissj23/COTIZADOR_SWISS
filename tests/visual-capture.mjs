import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE=process.env.QA_BASE_URL||'http://127.0.0.1:4173';
const JSPDF_LOCAL=new URL('../node_modules/jspdf/dist/jspdf.umd.min.js',import.meta.url).pathname;
const PDFLIB_LOCAL=new URL('../node_modules/pdf-lib/dist/pdf-lib.min.js',import.meta.url).pathname;
const HTML2CANVAS_LOCAL=new URL('../node_modules/html2canvas/dist/html2canvas.min.js',import.meta.url).pathname;
const OUT='qa-artifacts';
fs.mkdirSync(OUT,{recursive:true});
const browser=await chromium.launch({headless:true});

async function setup(viewport){
  const context=await browser.newContext({viewport,acceptDownloads:true});
  const page=await context.newPage();
  await page.route('https://fonts.googleapis.com/**',route=>route.fulfill({body:'',contentType:'text/css'}));
  await page.route('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js',route=>route.fulfill({path:HTML2CANVAS_LOCAL,contentType:'application/javascript'}));
  await page.route('https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js',route=>route.fulfill({path:JSPDF_LOCAL,contentType:'application/javascript'}));
  await page.route('https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js',route=>route.fulfill({path:PDFLIB_LOCAL,contentType:'application/javascript'}));
  await page.goto(`${BASE}/index.html`,{waitUntil:'networkidle'});
  await page.locator('#clientName').fill('QA Visual');
  return {context,page};
}
async function submit(page){await page.locator('#quoteForm button[type="submit"]').click();await page.locator('#resultados').waitFor({state:'visible'})}
async function choose(page,name){const card=page.locator('.plan-card').filter({has:page.locator('h3',{hasText:name})}).first();await card.locator('[data-plan]').click()}

{
  const {context,page}=await setup({width:1440,height:1000});
  await submit(page);
  await page.screenshot({path:`${OUT}/desktop-results.png`,fullPage:true});
  await choose(page,'SMG30');
  await page.locator('#openQuote').click();
  await page.locator('#quoteDialog').screenshot({path:`${OUT}/desktop-quote-preview.png`});
  const downloadPromise=page.waitForEvent('download');
  await page.locator('#printQuote').click();
  const download=await downloadPromise;
  await download.saveAs(`${OUT}/Cotizacion Swiss Medical (QA Visual).pdf`);
  await context.close();
}

{
  const {context,page}=await setup({width:390,height:844});
  await submit(page);
  await page.screenshot({path:`${OUT}/mobile-results.png`,fullPage:true});
  await choose(page,'S2');
  await page.locator('#openQuote').click();
  await page.locator('#quoteDialog').screenshot({path:`${OUT}/mobile-quote-preview.png`});
  await context.close();
}

{
  const context=await browser.newContext({viewport:{width:1440,height:900}});
  const page=await context.newPage();
  await page.goto(`${BASE}/login.html`,{waitUntil:'networkidle'});
  await page.screenshot({path:`${OUT}/desktop-login.png`,fullPage:true});
  await context.close();
}

{
  const context=await browser.newContext({viewport:{width:390,height:844}});
  const page=await context.newPage();
  await page.goto(`${BASE}/login.html`,{waitUntil:'networkidle'});
  await page.screenshot({path:`${OUT}/mobile-login.png`,fullPage:true});
  await context.close();
}

await browser.close();
console.log(`Visual artifacts written to ${OUT}`);
