import{clearSessionCookie,json}from'./_auth.mjs';
export async function handler(){return json(200,{ok:true},clearSessionCookie())}

