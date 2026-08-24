const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];

const state = {
  client:{
    name:'Nueva cotización',dni:'',zone:'AMBA',modality:'Directo',specialDiscount:'none',
    familyType:'individual',age:35,partnerAge:35,children:0
  },
  family:'Todos',
  plan:null
};

const money = value => {
  if (value == null) return 'Consultar';
  const cents = Math.abs(value % 1) > 0.00001;
  return new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',minimumFractionDigits:cents?2:0,maximumFractionDigits:cents?2:0}).format(value);
};

const PLAN_LABELS = {
  'SPORT S':'Sport,S',
  'SPORT':'Sport',
  'SPORT+':'Sport +'
};
const displayPlanName = name => PLAN_LABELS[name] || name;

const hasPartner = familyType => ['partner','partner_children'].includes(familyType);
const hasChildren = familyType => ['children','partner_children'].includes(familyType);

function getTariffFor(planName, modality, zone){
  // Tierra del Fuego: Monotributo usa la misma base que Directo y aplica 25% individual.
  const effectiveModality = zone === 'Tierra del Fuego' && modality === 'Monotributo' ? 'Directo' : modality;
  return window.getSwissTariff(planName,effectiveModality,zone);
}

function discountForMember(age, role, modality, specialDiscount){
  const candidates = [];
  if (age <= 25) candidates.push({percent:50,label:'Hasta 25 años'});
  if (specialDiscount === 'nordelta_tigre' && age >= 25) candidates.push({percent:25,label:'Beneficio Nordelta/Tigre'});
  if (modality === 'Monotributo') candidates.push({percent:25,label:'Monotributo'});
  if (modality === 'Directo') candidates.push({percent:15,label:'Directo'});
  if (!candidates.length) return {percent:0,label:'Sin bonificación'};
  return candidates.reduce((best,current)=>current.percent>best.percent?current:best,candidates[0]);
}

function adultListPrice(tariff, planName, age){
  // AMBU1, AMBU2 e INTER1 comienzan comercialmente desde los 20 años.
  if (tariff === window.SWISS_AMBULATORY_TARIFF && age < 20) return null;
  const key = tariff?.bands.find(b => age <= b.max)?.key;
  return key ? tariff?.adult?.[planName]?.[key] ?? null : null;
}

function familyQuote(plan){
  const c = state.client;
  const tariff = getTariffFor(plan.name,c.modality,c.zone);
  if (!tariff || !tariff.adult?.[plan.name]) return {status:'unavailable'};

  const members = [];
  const titularList = adultListPrice(tariff,plan.name,c.age);
  if (titularList == null) return {status:'unavailable'};
  members.push({role:'Titular',age:c.age,listPrice:titularList,...discountForMember(c.age,'Titular',c.modality,c.specialDiscount)});

  if (hasPartner(c.familyType)){
    const partnerList = adultListPrice(tariff,plan.name,c.partnerAge);
    if (partnerList == null) return {status:'unavailable'};
    members.push({role:'Pareja',age:c.partnerAge,listPrice:partnerList,...discountForMember(c.partnerAge,'Pareja',c.modality,c.specialDiscount)});
  }

  if (hasChildren(c.familyType)){
    if (!tariff.firstChild || tariff.firstChild[plan.name] == null) return {status:'unavailable'};
    const isPartial = ['AMBU1','AMBU2','INTER1'].includes(plan.name);
    if (isPartial && c.children > 1) return {status:'consult',reason:'Para este plan, más de un hijo requiere confirmación comercial.'};

    for (let i=0;i<c.children;i++){
      const listPrice = i===0 ? tariff.firstChild[plan.name] : tariff.additionalChild?.[plan.name];
      if (listPrice == null) return {status:'consult',reason:'La tabla no informa tarifa para hijo adicional.'};
      // Los hijos admitidos son hasta 21 años y reciben la bonificación del 50% por edad.
      const childDiscount = discountForMember(21,'Hijo',c.modality,c.specialDiscount);
      members.push({role:i===0?'1er hijo':`Hijo adicional ${i}`,age:null,listPrice,...childDiscount});
    }
  }

  const detailed = members.map(member=>{
    const discount = member.listPrice * member.percent / 100;
    return {...member,discount,finalPrice:member.listPrice-discount};
  });
  const listPrice = detailed.reduce((sum,m)=>sum+m.listPrice,0);
  const discount = detailed.reduce((sum,m)=>sum+m.discount,0);
  const finalPrice = detailed.reduce((sum,m)=>sum+m.finalPrice,0);
  return {status:'ok',members:detailed,listPrice,discount,finalPrice};
}

const quoteFor = plan => familyQuote(plan);
const priceFor = plan => {
  const quote=quoteFor(plan);
  return quote.status==='ok' ? quote.finalPrice : null;
};

$$('[data-scroll]').forEach(button => button.addEventListener('click', () => $(button.dataset.scroll)?.scrollIntoView({behavior:'smooth'})));
$$('.choice').forEach(choice => choice.addEventListener('click', () => {
  $$('.choice').forEach(c=>c.classList.remove('active'));
  choice.classList.add('active');
}));

function initials(name){return name.trim().split(/\s+/).slice(0,2).map(x=>x[0]?.toUpperCase()).join('')||'SM'}

function updateCompositionFields(){
  const familyType=$('#familyType').value;
  $('#partnerAgeWrap').hidden=!hasPartner(familyType);
  $('#childrenWrap').hidden=!hasChildren(familyType);
}

function compositionLabel(c){
  if (c.familyType==='individual') return `Titular · ${c.age} años`;
  if (c.familyType==='partner') return `Titular ${c.age} · Pareja ${c.partnerAge}`;
  if (c.familyType==='children') return `Titular ${c.age} · ${c.children} hijo${c.children>1?'s':''}`;
  return `Titular ${c.age} · Pareja ${c.partnerAge} · ${c.children} hijo${c.children>1?'s':''}`;
}

function syncCase(){
  updateCompositionFields();
  const name=$('#clientName').value.trim()||'Nueva cotización';
  const familyType=$('#familyType').value;
  const age=Number($('#age').value);
  const partnerAge=hasPartner(familyType)?Number($('#partnerAge').value):0;
  const children=hasChildren(familyType)?Number($('#children').value):0;
  const zone=$('#zone').value;
  const modality=$('input[name="modality"]:checked').value;
  const specialDiscount=$('#specialDiscount').value;
  state.client={name,dni:$('#clientDni').value.trim(),zone,modality,specialDiscount,familyType,age,partnerAge,children};
  $('#caseName').textContent=name;
  $('#caseInitials').textContent=initials(name);
  $('#caseComposition').textContent=compositionLabel(state.client);
  $('#caseMode').textContent=`${modality} · ${zone}${specialDiscount==='nordelta_tigre'?' · Beneficio Nordelta/Tigre':''}`;
}

['input','change'].forEach(event=>$('#quoteForm').addEventListener(event,syncCase));
$('#familyType').addEventListener('change',updateCompositionFields);

function renderFilters(){
  const families=['Todos',...new Set(window.SWISS_PLANS.map(p=>p.family))];
  $('#planFilters').innerHTML=families.map(f=>`<button class="filter ${f===state.family?'active':''}" data-family="${f}">${f}</button>`).join('');
  $$('.filter').forEach(b=>b.addEventListener('click',()=>{state.family=b.dataset.family;renderFilters();renderPlans()}));
}

function renderPlans(){
  const familyPlans=window.SWISS_PLANS.filter(p=>state.family==='Todos'||p.family===state.family);
  const plans=familyPlans.map(p=>({plan:p,quote:quoteFor(p)})).filter(x=>x.quote.status!=='unavailable');

  $('#plansGrid').innerHTML=plans.map(({plan:p,quote})=>{
    const isOk=quote.status==='ok';
    const price=isOk?quote.finalPrice:null;
    const detail=isOk
      ? (quote.discount>0?`Lista ${money(quote.listPrice)} · ahorro ${money(quote.discount)}`:'Sin bonificación aplicable')
      : quote.reason;
    return `<article class="plan-card ${p.name==='SMG30'?'featured':''}">
      <div class="plan-top"><h3>${displayPlanName(p.name)}</h3><span class="tag">${p.tag}</span></div>
      <p class="plan-family">Familia ${p.family}</p>
      <div class="plan-price"><small>${isOk?'Valor mensual final':'Validación necesaria'}</small><strong>${isOk?money(price):'Consultar'}</strong><small>${detail}</small></div>
      <button class="button ${p.name==='SMG30'?'button--white':'button--red'}" data-plan="${p.name}">${isOk?'Elegir plan':'Consultar'} <span>→</span></button>
    </article>`;
  }).join('');

  $$('[data-plan]').forEach(b=>b.addEventListener('click',()=>selectPlan(b.dataset.plan)));
}

function selectedSummary(quote){
  if (quote.status!=='ok') return quote.reason || 'Requiere validación comercial';
  return quote.discount>0 ? `Lista ${money(quote.listPrice)} · bonificaciones ${money(quote.discount)}` : 'Valor mensual sin bonificación';
}

function selectPlan(name){
  state.plan=window.SWISS_PLANS.find(p=>p.name===name);
  const quote=quoteFor(state.plan);
  $('#selectedName').textContent=displayPlanName(name);
  $('.selected-price strong').textContent=quote.status==='ok'?money(quote.finalPrice):'Consultar';
  $('.selected-price small').textContent=selectedSummary(quote);
  $('#selectedBar').hidden=false;
  $('#selectedBar').scrollIntoView({behavior:'smooth',block:'end'});
}

$('#quoteForm').addEventListener('submit',e=>{
  e.preventDefault();
  syncCase();
  renderFilters();
  renderPlans();
  $('#resultados').hidden=false;
  $('#resultados').scrollIntoView({behavior:'smooth'});
});

$('#logoutButton').addEventListener('click',async()=>{try{await fetch('/api/logout',{method:'POST'})}finally{location.href='login.html'}});

function brand(white=false){return `<div class="brand ${white?'brand--white':''}"><span class="brand-mark"><i></i><i></i><i></i><i></i></span><span><strong>SWISS MEDICAL</strong><small>MEDICINA PRIVADA</small></span></div>`}
function footer(page){return `<div class="quote-footer"><span>Propuesta comercial · valores según tarifario vigente</span><span>${page} / 4 · Grupo Zeroka</span></div>`}

function memberBreakdown(quote){
  if (quote.status!=='ok') return `<p>${quote.reason||'Requiere validación comercial.'}</p>`;
  return quote.members.map(m=>`<div class="coverage-row"><span><b>${m.role}${m.age!=null?` · ${m.age} años`:''}</b><br><small>Lista ${money(m.listPrice)} · ${m.percent}% ${m.label}</small></span><span>${money(m.finalPrice)}</span></div>`).join('');
}

function buildQuote(){
  const c=state.client,p=state.plan||window.SWISS_PLANS[9],quote=quoteFor(p);
  const price=quote.status==='ok'?quote.finalPrice:null;
  const list=quote.status==='ok'?quote.listPrice:null;
  const discount=quote.status==='ok'?quote.discount:null;
  const discountText=quote.status==='ok' && discount>0 ? `Bonificaciones aplicadas: ${money(discount)}` : quote.status==='ok' ? 'Sin bonificaciones aplicables' : 'Sujeto a validación comercial';
  $('#quotePages').innerHTML=`
  <section class="quote-page quote-cover"><div class="quote-circle"></div><div class="quote-logo">${brand(true)}</div><div class="quote-cover-copy"><p>PROPUESTA PERSONALIZADA</p><h1>Hola, ${c.name.split(' ')[0]}.<br>Tu salud merece una buena decisión.</h1><p>Preparamos una propuesta para acompañarte en cada etapa.</p></div><div class="cover-card"><div><small>PLAN ELEGIDO</small><strong>${displayPlanName(p.name)}</strong><span>${compositionLabel(c)}</span></div><div><small>VALOR MENSUAL FINAL</small><strong>${money(price)}</strong><span>${quote.status==='ok'?`Lista ${money(list)} · ${discountText}`:'Sujeto a validación comercial'}</span></div></div></section>
  <section class="quote-page quote-network"><div class="network-photo"><img src="assets/images/login-doctor.jpg" alt="Atención personalizada Swiss Medical"></div><div class="network-copy"><p class="eyebrow">UNA RED PARA CUIDARTE</p><h2>Más cerca cuando lo necesitás.</h2><p>Una red preparada para acompañar cada decisión de salud, con atención y respaldo en todo el país.</p><div class="quote-metrics quote-metrics--editorial"><div class="metric"><strong>+100 mil</strong><span>profesionales</span></div><div class="metric"><strong>+4.000</strong><span>clínicas y centros</span></div><div class="metric"><strong>19</strong><span>centros médicos propios</span></div><div class="metric"><strong>11</strong><span>sanatorios propios</span></div></div></div><div class="network-note"><b>Tu cartilla, según tu plan y tu zona.</b><span>La disponibilidad de prestadores se confirma al momento de la contratación.</span></div>${footer(2)}</section>
  <section class="quote-page quote-benefits"><aside class="benefits-aside"><p>PLAN ELEGIDO</p><strong>${displayPlanName(p.name)}</strong><span>Una propuesta pensada para tu momento.</span><div class="benefits-aside-mark">SM</div><small>Los alcances y condiciones se validan con la cartilla vigente.</small></aside><div class="benefits-main"><p class="eyebrow">DETALLE DE LA COTIZACIÓN</p><h2>Precio claro, integrante por integrante.</h2><p class="benefits-intro">Cada persona se calcula con su tramo de edad y la mejor bonificación que le corresponda. Las bonificaciones no se acumulan sobre una misma persona.</p><div class="coverage-list">${memberBreakdown(quote)}</div>${quote.status==='ok'?`<div class="benefits-callout"><span>$</span><p><b>Resumen:</b> valor de lista ${money(list)} · bonificaciones ${money(discount)} · <b>final ${money(price)}</b>.</p></div>`:''}</div>${footer(3)}</section>
  <section class="quote-page quote-close"><div class="close-shape one"></div><div class="close-shape two"></div><div style="z-index:1">${brand(true)}<h2>Estamos para acompañarte.</h2><p>Tu asesor comercial puede ayudarte con el próximo paso.</p><small>Propuesta preparada por Grupo Zeroka</small></div>${footer(4)}</section>`;
}

$('#openQuote').addEventListener('click',()=>{buildQuote();$('#quoteDialog').showModal()});
$('#closeQuote').addEventListener('click',()=>$('#quoteDialog').close());
$('#printQuote').addEventListener('click',()=>window.print());
$('#quoteDialog').addEventListener('click',e=>{if(e.target===$('#quoteDialog'))$('#quoteDialog').close()});

updateCompositionFields();
renderFilters();
renderPlans();
