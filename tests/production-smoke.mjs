import { chromium } from 'playwright';

const BASE='https://cotizadorswissmedicalgz.netlify.app';
let passed=0;
const failures=[];
const pass=name=>{passed++;console.log(`PASS  ${name}`)};
const fail=(name,error)=>{failures.push(`${name}: ${error.message}`);console.error(`FAIL  ${name}\n      ${error.message}`)};
const assert=(value,message)=>{if(!value)throw new Error(message)};
async function test(name,fn){try{await fn();pass(name)}catch(error){fail(name,error)}}

await test('Producción responde login por HTTPS',async()=>{
  const r=await fetch(`${BASE}/login.html?next=%2F`,{redirect:'manual'});
  assert(r.status===200,`status ${r.status}`);
  assert(r.url.startsWith('https://'),'no respondió por HTTPS');
  const html=await r.text();
  assert(html.includes('id="loginForm"'),'no contiene loginForm');
  assert(html.includes('Swiss Medical · Portal comercial'),'título inesperado');
});

await test('Raíz protegida redirige al login',async()=>{
  const r=await fetch(`${BASE}/`,{redirect:'manual'});
  assert([301,302,303,307,308].includes(r.status),`status ${r.status}`);
  const loc=r.headers.get('location')||'';
  assert(loc.includes('/login.html'),`location ${loc}`);
  assert(loc.includes('next=%2F'),`no conserva next=/ en ${loc}`);
});

await test('index.html queda protegido',async()=>{
  const r=await fetch(`${BASE}/index.html`,{redirect:'manual'});
  assert([301,302,303,307,308].includes(r.status),`status ${r.status}`);
  assert((r.headers.get('location')||'').includes('/login.html'),`location ${r.headers.get('location')}`);
});

await test('Tarifario JS no queda público',async()=>{
  for(const path of ['/js/data-demo.js','/js/tariff-audit-2026-09.js','/js/quote-engine.js','/js/benefits.js']){
    const r=await fetch(`${BASE}${path}`,{redirect:'manual'});
    assert([301,302,303,307,308].includes(r.status),`${path} status ${r.status}`);
    assert((r.headers.get('location')||'').includes('/login.html'),`${path} location ${r.headers.get('location')}`);
  }
});

await test('Recursos necesarios del login siguen públicos',async()=>{
  const css=await fetch(`${BASE}/css/styles.css`,{redirect:'manual'});
  assert(css.status===200,`CSS status ${css.status}`);
  const image=await fetch(`${BASE}/assets/images/login-doctor.jpg`,{redirect:'manual'});
  assert(image.status===200,`imagen status ${image.status}`);
  assert((image.headers.get('content-type')||'').startsWith('image/'),'content-type de imagen inesperado');
  const js=await fetch(`${BASE}/auth/login.js`,{redirect:'manual'});
  assert(js.status===200,`login JS status ${js.status}`);
});

await test('Login inválido devuelve 401 y no crea sesión',async()=>{
  const r=await fetch(`${BASE}/api/login`,{
    method:'POST',redirect:'manual',headers:{'content-type':'application/json'},
    body:JSON.stringify({username:'qa-invalid-user',password:'qa-invalid-password'})
  });
  assert(r.status===401,`status ${r.status}`);
  assert(!(r.headers.get('set-cookie')||'').includes('sm_session='),'creó cookie de sesión inválida');
  const data=await r.json();
  assert(data?.ok===false,'respuesta inválida no informa ok=false');
});

const browser=await chromium.launch({headless:true});
for(const viewport of [{width:1440,height:900,name:'desktop'},{width:390,height:844,name:'mobile'}]){
  await test(`Login ${viewport.name} usable y sin overflow`,async()=>{
    const context=await browser.newContext({viewport:{width:viewport.width,height:viewport.height}});
    const page=await context.newPage();
    const errors=[];
    page.on('pageerror',e=>errors.push(`pageerror: ${e.message}`));
    page.on('console',m=>{if(m.type()==='error')errors.push(`console: ${m.text()}`)});
    await page.goto(`${BASE}/login.html?next=%2F`,{waitUntil:'networkidle'});
    assert(await page.locator('#loginForm').isVisible(),'form no visible');
    const dims=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}));
    assert(dims.scroll<=dims.client+2,`overflow ${JSON.stringify(dims)}`);
    assert(errors.length===0,errors.join(' | '));
    await page.locator('input[name="username"]').fill('qa-invalid-user');
    await page.locator('#password').fill('qa-invalid-password');
    await page.locator('#showPassword').click();
    assert(await page.locator('#password').getAttribute('type')==='text','botón Ver no muestra contraseña');
    await page.locator('#loginForm button[type="submit"]').click();
    await page.locator('#loginError').filter({hasText:'Credenciales incorrectas.'}).waitFor({state:'visible'});
    const cookies=await context.cookies();
    assert(!cookies.some(c=>c.name==='sm_session'),'login inválido dejó sm_session');
    await context.close();
  });
}
await browser.close();

console.log(`\nResultado producción: ${passed} PASS, ${failures.length} FAIL`);
if(failures.length){console.error('\nFallos:');failures.forEach(f=>console.error(`- ${f}`));process.exit(1)}
