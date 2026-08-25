import fs from 'node:fs';
import { safeEqual,createSession,sessionCookie,clearSessionCookie } from '../netlify/functions/_auth.mjs';
import { handler as login } from '../netlify/functions/login.mjs';
import { handler as logout } from '../netlify/functions/logout.mjs';

const assert=(value,message)=>{if(!value)throw new Error(message)};
const before=Math.floor(Date.now()/1000);
assert(safeEqual('abc','abc'),'safeEqual debería aceptar valores iguales');
assert(!safeEqual('abc','abd'),'safeEqual debería rechazar valores distintos');
const token=createSession('qa-secret-very-long');
const parts=token.split('.');
assert(parts.length===3&&parts[0]==='v1','formato de sesión inválido');
const expires=Number(parts[1]);
assert(expires>=before+28795&&expires<=before+28805,'TTL de sesión no es 8 horas');
const cookie=sessionCookie(token);
for(const flag of ['HttpOnly','Secure','SameSite=Strict','Max-Age=28800'])assert(cookie.includes(flag),`falta ${flag} en cookie`);
assert(clearSessionCookie().includes('Max-Age=0'),'logout no invalida cookie');

process.env.AUTH_USER='qa-user';
process.env.AUTH_PASSWORD='qa-pass';
process.env.SESSION_SECRET='qa-secret-very-long';
let response=await login({httpMethod:'POST',body:JSON.stringify({username:'qa-user',password:'qa-pass'})});
assert(response.statusCode===200,'login correcto no devolvió 200');
assert(response.headers['Set-Cookie']?.includes('sm_session='),'login correcto no creó cookie');
response=await login({httpMethod:'POST',body:JSON.stringify({username:'qa-user',password:'wrong'})});
assert(response.statusCode===401,'credenciales incorrectas no devolvieron 401');
response=await login({httpMethod:'GET'});
assert(response.statusCode===405,'método inválido de login no devolvió 405');
response=await logout({httpMethod:'POST'});
assert(response.statusCode===200&&response.headers['Set-Cookie']?.includes('Max-Age=0'),'logout POST no limpió sesión');
response=await logout({httpMethod:'GET'});
assert(response.statusCode===405,'logout GET debería devolver 405');

const edge=fs.readFileSync(new URL('../netlify/edge-functions/auth.js',import.meta.url),'utf8');
assert(!edge.includes("path.startsWith('/assets/')"),'assets completos no deben ser públicos');
assert(edge.includes("'/assets/images/login-doctor.jpg'"),'imagen necesaria del login debe seguir pública');
assert(edge.includes("path.startsWith('/css/')"),'CSS del login debe seguir público');
console.log('PASS  Autenticación: HMAC, TTL 8h, flags de cookie, métodos y protección de assets');
