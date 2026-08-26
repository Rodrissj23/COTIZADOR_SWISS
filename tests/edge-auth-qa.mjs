import { createSession,sessionCookie } from '../netlify/functions/_auth.mjs';
import auth from '../netlify/edge-functions/auth.js';

const assert=(value,message)=>{if(!value)throw new Error(message)};
const secret='qa-secret-very-long';
globalThis.Netlify={env:{get:key=>key==='SESSION_SECRET'?secret:null}};

async function run(path,{cookie}={}){
  const headers=new Headers();
  if(cookie)headers.set('cookie',cookie);
  const request=new Request(`https://qa.example${path}`,{headers});
  let nextCalls=0;
  const context={next:async()=>{nextCalls++;return new Response('OK',{status:200,headers:{'X-QA':'next'}})}};
  const response=await auth(request,context);
  return {response,nextCalls};
}

let result=await run('/assets/coverage/SMG30%2008_2026.pdf');
assert(result.response.status===302,'alcance oficial sin sesión debería redirigir');
assert(result.nextCalls===0,'alcance protegido no debería llegar al origen sin sesión');
assert((result.response.headers.get('location')||'').includes('/login.html'),'redirect debería apuntar al login');

result=await run('/assets/images/login-doctor.jpg');
assert(result.response.status===200&&result.nextCalls===1,'imagen del login debe ser pública');

result=await run('/assets/images/swiss-medical-logo.svg');
assert(result.response.status===200&&result.nextCalls===1,'logo oficial del login debe ser público');

const token=createSession(secret);
const cookie=sessionCookie(token).split(';')[0];
result=await run('/assets/coverage/SMG30%2008_2026.pdf',{cookie});
assert(result.response.status===200&&result.nextCalls===1,'sesión válida debería habilitar alcance oficial');
assert(result.response.headers.get('cache-control')==='private, no-store','respuesta protegida debe deshabilitar caché compartida');

result=await run('/index.html',{cookie:'sm_session=v1.1.invalid'});
assert(result.response.status===302&&result.nextCalls===0,'sesión inválida debería redirigir');

console.log('PASS  Edge auth: assets protegidos, login público, sesión válida e inválida');
