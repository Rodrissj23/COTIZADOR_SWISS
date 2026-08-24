const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];
const state = {client:{name:'Nueva cotización',dni:'',zone:'AMBA',modality:'Directo',adults:1,age:35,children:0}, family:'Todos', plan:null};
const money = value => {
  if (value == null) return 'Consultar';
  const cents = Math.abs(value % 1) > 0.00001;
  return new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',minimumFractionDigits:cents?2:0,maximumFractionDigits:cents?2:0}).format(value);
};
const quoteFor = plan => window.getSwissQuote(plan.name,state.client.age,state.client.adults,state.client.children,state.client.modality);
const priceFor = plan => quoteFor(plan)?.finalPrice ?? null;

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
  const families=['Todos',...new Set(window.SWISS_PLANS.map(p=>p.family))];
  $('#planFilters').innerHTML=families.map(f=>`<button class="filter ${f===state.family?'active':''}" data-family="${f}">${f}</button>`).join('');
  $$('.filter').forEach(b=>b.addEventListener('click',()=>{state.family=b.dataset.family;renderFilters();renderPlans()}));
}
function renderPlans(){
  const plans=window.SWISS_PLANS.filter(p=>state.family==='Todos'||p.family===state.family);
  $('#plansGrid').innerHTML=plans.map((p,i)=>{const quote=quoteFor(p),price=quote?.finalPrice;const detail=quote ? (quote.discountPercent?`${quote.discountPercent}% de bonificación aplicada`:'Sin bonificación aplicable'):'Requiere validación comercial';return `<article class="plan-card ${p.name==='SMG30'?'featured':''}"><div class="plan-top"><h3>${p.name}</h3><span class="tag">${p.tag}</span></div><p class="plan-family">Familia ${p.family}</p><div class="plan-price"><small>Valor mensual final</small><strong>${money(price)}</strong><small>${detail}</small></div><button class="button ${p.name==='SMG30'?'button--white':'button--red'}" data-plan="${p.name}">${price==null?'Consultar':'Elegir plan'} <span>→</span></button></article>`}).join('');
  $$('[data-plan]').forEach(b=>b.addEventListener('click',()=>selectPlan(b.dataset.plan)));
}
function selectPlan(name){state.plan=window.SWISS_PLANS.find(p=>p.name===name);const quote=quoteFor(state.plan),price=quote?.finalPrice;$('#selectedName').textContent=name;$('.selected-price strong').textContent=money(price);$('.selected-price small').textContent=price==null?'Requiere validación comercial':quote.discountPercent?`${quote.discountPercent}% de bonificación aplicada`:'Valor mensual por composición';$('#selectedBar').hidden=false;$('#selectedBar').scrollIntoView({behavior:'smooth',block:'end'});}

$('#quoteForm').addEventListener('submit',e=>{e.preventDefault();syncCase();renderFilters();renderPlans();$('#resultados').hidden=false;$('#resultados').scrollIntoView({behavior:'smooth'});});
$('#logoutButton').addEventListener('click',async()=>{try{await fetch('/api/logout',{method:'POST'})}finally{location.href='login.html'}});

function brand(white=false){return `<div class="brand ${white?'brand--white':''}"><span class="brand-mark"><i></i><i></i><i></i><i></i></span><span><strong>SWISS MEDICAL</strong><small>MEDICINA PRIVADA</small></span></div>`}
function footer(page){return `<div class="quote-footer"><span>Propuesta comercial orientativa · Sujeta a condiciones de contratación</span><span>${page} / 4 · Grupo Zeroka</span></div>`}
function buildQuote(){
  const c=state.client,p=state.plan||window.SWISS_PLANS[9],quote=quoteFor(p),price=quote?.finalPrice;
  $('#quotePages').innerHTML=`
  <section class="quote-page quote-cover"><div class="quote-circle"></div><div class="quote-logo">${brand(true)}</div><div class="quote-cover-copy"><p>PROPUESTA PERSONALIZADA</p><h1>Hola, ${c.name.split(' ')[0]}.<br>Tu salud merece una buena decisión.</h1><p>Preparamos una propuesta para acompañarte en cada etapa.</p></div><div class="cover-card"><div><small>PLAN ELEGIDO</small><strong>${p.name}</strong><span>${c.adults} adulto${c.adults>1?'s':''}${c.children?` · ${c.children} menor${c.children>1?'es':''}`:''}</span></div><div><small>VALOR MENSUAL FINAL</small><strong>${money(price)}</strong><span>${quote?.discountPercent?`${quote.discountPercent}% de bonificación sobre ${money(quote.listPrice)}`:price==null?'Sujeto a validación comercial':'Valor según tramo y composición'}</span></div></div></section>
  <section class="quote-page quote-network"><div class="network-photo"><img src="assets/images/login-doctor.jpg" alt="Atención personalizada Swiss Medical"></div><div class="network-copy"><p class="eyebrow">UNA RED PARA CUIDARTE</p><h2>Más cerca cuando lo necesitás.</h2><p>Una red preparada para acompañar cada decisión de salud, con atención y respaldo en todo el país.</p><div class="quote-metrics quote-metrics--editorial"><div class="metric"><strong>+100 mil</strong><span>profesionales</span></div><div class="metric"><strong>+4.000</strong><span>clínicas y centros</span></div><div class="metric"><strong>19</strong><span>centros médicos propios</span></div><div class="metric"><strong>11</strong><span>sanatorios propios</span></div></div></div><div class="network-note"><b>Tu cartilla, según tu plan y tu zona.</b><span>La disponibilidad de prestadores se confirma al momento de la contratación.</span></div>${footer(2)}</section>
  <section class="quote-page quote-benefits"><aside class="benefits-aside"><p>PLAN ELEGIDO</p><strong>${p.name}</strong><span>Una propuesta pensada para tu momento.</span><div class="benefits-aside-mark">SM</div><small>Los alcances y condiciones se validan con la cartilla vigente.</small></aside><div class="benefits-main"><p class="eyebrow">BENEFICIOS DESTACADOS</p><h2>Lo esencial, a simple vista.</h2><p class="benefits-intro">Estos son los aspectos que te ayudan a entender la propuesta. La cartilla completa detalla condiciones y alcances por prestación.</p><div class="benefit-grid"><article><span>01</span><h3>Atención médica</h3><p>Consultas y profesionales de acuerdo con la cartilla del plan.</p></article><article><span>02</span><h3>Urgencias</h3><p>Asistencia ante situaciones que requieren atención inmediata.</p></article><article><span>03</span><h3>Diagnóstico</h3><p>Estudios y prácticas según las condiciones de cobertura.</p></article><article><span>04</span><h3>Internación</h3><p>Prestaciones hospitalarias definidas para el plan elegido.</p></article></div><div class="benefits-callout"><span>i</span><p><b>Información importante.</b> Copagos, topes, reintegros y autorizaciones se confirman en la cartilla y las condiciones comerciales vigentes de ${p.name}.</p></div></div>${footer(3)}</section>
  <section class="quote-page quote-close"><div class="close-shape one"></div><div class="close-shape two"></div><div style="z-index:1">${brand(true)}<h2>Estamos para acompañarte.</h2><p>Tu asesor comercial puede ayudarte con el próximo paso.</p><small>Propuesta preparada por Grupo Zeroka</small></div>${footer(4)}</section>`;
}
$('#openQuote').addEventListener('click',()=>{buildQuote();$('#quoteDialog').showModal()});
$('#closeQuote').addEventListener('click',()=>$('#quoteDialog').close());
$('#printQuote').addEventListener('click',()=>window.print());
$('#quoteDialog').addEventListener('click',e=>{if(e.target===$('#quoteDialog'))$('#quoteDialog').close()});
renderFilters();renderPlans();

