const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];
const state = {client:{name:'Nueva cotización',dni:'',zone:'AMBA',modality:'Directo',adults:1,age:35,children:0}, family:'Todos', plan:null};

$$('[data-scroll]').forEach(button => button.addEventListener('click', () => $(button.dataset.scroll)?.scrollIntoView({behavior:'smooth'})));
$$('.choice').forEach(choice => choice.addEventListener('click', () => { $$('.choice').forEach(c=>c.classList.remove('active')); choice.classList.add('active'); }));

function initials(name){return name.trim().split(/\s+/).slice(0,2).map(x=>x[0]?.toUpperCase()).join('')||'SM'}
function syncCase(){
  const name=$('#clientName').value.trim()||'Nueva cotización', adults=Number($('#adults').value), age=Number($('#age').value), children=Number($('#children').value), zone=$('#zone').value, modality=$('input[name="modality"]:checked').value;
  state.client={name,dni:$('#clientDni').value.trim(),zone,modality,adults,age,children};
  $('#caseName').textContent=name; $('#caseInitials').textContent=initials(name);
  $('#caseComposition').textContent=`${adults} adulto${adults>1?'s':''}${children?` · ${children} menor${children>1?'es':''}`:''} · ${age} años`;
  $('#caseMode').textContent=`${modality} · ${zone}`;
}
['input','change'].forEach(event=>$('#quoteForm').addEventListener(event,syncCase));

function renderFilters(){
  const families=['Todos',...new Set(SWISS_PLANS.map(p=>p.family))];
  $('#planFilters').innerHTML=families.map(f=>`<button class="filter ${f===state.family?'active':''}" data-family="${f}">${f}</button>`).join('');
  $$('.filter').forEach(b=>b.addEventListener('click',()=>{state.family=b.dataset.family;renderFilters();renderPlans()}));
}
function renderPlans(){
  const plans=SWISS_PLANS.filter(p=>state.family==='Todos'||p.family===state.family);
  $('#plansGrid').innerHTML=plans.map((p,i)=>`<article class="plan-card ${p.name==='SMG30'?'featured':''}"><div class="plan-top"><h3>${p.name}</h3><span class="tag">${p.tag}</span></div><p class="plan-family">Familia ${p.family}</p><div class="plan-price"><small>Valor mensual</small><strong>A calcular</strong><small>Se completa con tarifario oficial</small></div><button class="button ${p.name==='SMG30'?'button--white':'button--red'}" data-plan="${p.name}">Elegir plan <span>→</span></button></article>`).join('');
  $$('[data-plan]').forEach(b=>b.addEventListener('click',()=>selectPlan(b.dataset.plan)));
}
function selectPlan(name){state.plan=SWISS_PLANS.find(p=>p.name===name);$('#selectedName').textContent=name;$('#selectedBar').hidden=false;$('#selectedBar').scrollIntoView({behavior:'smooth',block:'end'});}

$('#quoteForm').addEventListener('submit',e=>{e.preventDefault();syncCase();renderFilters();renderPlans();$('#resultados').hidden=false;$('#resultados').scrollIntoView({behavior:'smooth'});});
$('#logoutButton').addEventListener('click',async()=>{try{await fetch('/api/logout',{method:'POST'})}finally{location.href='login.html'}});

function brand(white=false){return `<div class="brand ${white?'brand--white':''}"><span class="brand-mark"><i></i><i></i><i></i><i></i></span><span><strong>SWISS MEDICAL</strong><small>MEDICINA PRIVADA</small></span></div>`}
function footer(page){return `<div class="quote-footer"><span>Propuesta comercial orientativa · Sujeta a condiciones de contratación</span><span>${page} / 4 · Grupo Zeroka</span></div>`}
function buildQuote(){
  const c=state.client,p=state.plan||SWISS_PLANS[9];
  $('#quotePages').innerHTML=`
  <section class="quote-page quote-cover"><div class="quote-circle"></div><div class="quote-logo">${brand(true)}</div><div class="quote-cover-copy"><p>PROPUESTA PERSONALIZADA</p><h1>Hola, ${c.name.split(' ')[0]}.<br>Tu salud merece una buena decisión.</h1><p>Preparamos una propuesta para acompañarte en cada etapa.</p></div><div class="cover-card"><div><small>PLAN ELEGIDO</small><strong>${p.name}</strong><span>${c.adults} adulto${c.adults>1?'s':''}${c.children?` · ${c.children} menor${c.children>1?'es':''}`:''}</span></div><div><small>VALOR MENSUAL</small><strong>A calcular</strong><span>Tarifario oficial pendiente</span></div></div></section>
  <section class="quote-page"><div class="quote-content"><p class="eyebrow">UNA RED PARA CUIDARTE</p><h2>Respaldo en todo el país.</h2><div class="quote-metrics"><div class="metric"><strong>+100 mil</strong><span>profesionales</span></div><div class="metric"><strong>+4.000</strong><span>clínicas y centros</span></div><div class="metric"><strong>19</strong><span>centros médicos propios</span></div><div class="metric"><strong>11</strong><span>sanatorios propios</span></div></div><div class="notice" style="margin-top:35px"><span>+</span><p>La cartilla y disponibilidad de prestadores dependen del plan y la zona seleccionados.</p></div></div>${footer(2)}</section>
  <section class="quote-page"><div class="quote-content"><p class="eyebrow">TU PLAN · ${p.name}</p><h2>Lo importante, explicado simple.</h2><div class="coverage-list"><div class="coverage-row"><span>Consultas médicas</span><span>Según cartilla</span></div><div class="coverage-row"><span>Internación</span><span>Según plan</span></div><div class="coverage-row"><span>Urgencias y emergencias</span><span>Incluidas</span></div><div class="coverage-row"><span>Estudios y diagnóstico</span><span>Según plan</span></div><div class="coverage-row"><span>Salud mental</span><span>Según plan</span></div><div class="coverage-row"><span>Odontología</span><span>Según plan</span></div></div><div class="notice"><span>i</span><p><b>Contenido en preparación.</b> Esta sección se completará con los beneficios exactos de la cartilla correspondiente, sin resumir condiciones relevantes.</p></div></div>${footer(3)}</section>
  <section class="quote-page quote-close"><div class="close-shape one"></div><div class="close-shape two"></div><div style="z-index:1">${brand(true)}<h2>Estamos para acompañarte.</h2><p>Tu asesor comercial puede ayudarte con el próximo paso.</p><small>Propuesta preparada por Grupo Zeroka</small></div>${footer(4)}</section>`;
}
$('#openQuote').addEventListener('click',()=>{buildQuote();$('#quoteDialog').showModal()});
$('#closeQuote').addEventListener('click',()=>$('#quoteDialog').close());
$('#printQuote').addEventListener('click',()=>window.print());
$('#quoteDialog').addEventListener('click',e=>{if(e.target===$('#quoteDialog'))$('#quoteDialog').close()});
renderFilters();renderPlans();

