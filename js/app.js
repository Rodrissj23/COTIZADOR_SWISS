const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];

const TARIFF_LABEL = 'Septiembre 2026';
const QUOTE_VALIDITY_HOURS = 72;
const ENGINE = window.SWISS_ENGINE;
if (!ENGINE) throw new Error('No se pudo cargar el motor de cotización Swiss Medical.');
const {DESREGULADO,displayModality,hasPartner,hasChildren,familyQuote} = ENGINE;

const state = {
  client:{
    name:'Nueva cotización',dni:'',zone:'AMBA',modality:'Directo',specialDiscount:'none',
    familyType:'individual',age:35,partnerAge:35,children:0,childrenAges:[],receiptContribution:0
  },
  family:'Todos',
  plan:null
};

const money = value => {
  if (value == null || Number.isNaN(Number(value))) return 'Consultar';
  const rounded = Math.round(Number(value) * 100) / 100;
  const cents = Math.abs(rounded % 1) > 0.00001;
  return new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',minimumFractionDigits:cents?2:0,maximumFractionDigits:cents?2:0}).format(rounded);
};
const PLAN_LABELS = {'SPORT S':'Sport,S','SPORT':'Sport','SPORT+':'Sport +'};
const displayPlanName = name => PLAN_LABELS[name] || name;
const esc = value => String(value ?? '').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
const chunk = (items,size) => Array.from({length:Math.ceil(items.length/size)},(_,i)=>items.slice(i*size,(i+1)*size));

const quoteFor = plan => familyQuote(plan,state.client);

function initials(name){return name.trim().split(/\s+/).slice(0,2).map(x=>x[0]?.toUpperCase()).join('')||'SM'}

function renderChildAgeFields(count){
  const wrap = $('#childrenAgeFields');
  if (!wrap) return;
  const previous = $$('.child-age',wrap).map(input=>Number(input.value));
  wrap.innerHTML = Array.from({length:count},(_,i)=>{
    const fallback=Math.min(21,10+i);
    const value=Number.isFinite(previous[i])?Math.min(25,Math.max(0,previous[i])):fallback;
    return `<label>Edad hijo ${i+1}<input class="child-age" type="number" min="0" max="25" value="${value}" required></label>`;
  }).join('');
}

function updateCompositionFields(){
  const familyType=$('#familyType').value;
  const childrenEnabled=hasChildren(familyType);
  $('#partnerAgeWrap').hidden=!hasPartner(familyType);
  $('#childrenWrap').hidden=!childrenEnabled;
  $('#childrenAgesWrap').hidden=!childrenEnabled;
  const count=childrenEnabled?Math.max(1,Math.floor(Number($('#children').value)||1)):0;
  if (childrenEnabled && $$('.child-age',$('#childrenAgeFields')).length!==count) renderChildAgeFields(count);
}

function syncChoiceState(){
  $$('.choice').forEach(choice=>choice.classList.toggle('active',Boolean($('input',choice)?.checked)));
}

function updateCommercialFields(){
  const zone=$('#zone').value;
  const modality=$('input[name="modality"]:checked')?.value || 'Directo';
  const territorial=$('#specialDiscount');
  const territorialWrap=$('#specialDiscountWrap');
  const receiptWrap=$('#receiptContributionWrap');
  const receiptInput=$('#receiptContribution');

  if (territorialWrap) territorialWrap.hidden=zone!=='AMBA';
  if (zone!=='AMBA' && territorial) territorial.value='none';
  if (receiptWrap) receiptWrap.hidden=modality!==DESREGULADO;
  if (receiptInput) receiptInput.required=modality===DESREGULADO;
  syncChoiceState();
}

function compositionLabel(c){
  if (c.familyType==='individual') return `Titular · ${c.age} años`;
  if (c.familyType==='partner') return `Titular ${c.age} · Pareja ${c.partnerAge}`;
  const childText=c.childrenAges?.length?c.childrenAges.map((age,i)=>`H${i+1} ${age}`).join(' · '):`${c.children} hijo${c.children!==1?'s':''}`;
  if (c.familyType==='children') return `Titular ${c.age} · ${childText}`;
  return `Titular ${c.age} · Pareja ${c.partnerAge} · ${childText}`;
}

function syncCase(){
  updateCompositionFields();
  updateCommercialFields();
  const familyType=$('#familyType').value;
  const children=hasChildren(familyType)?Math.max(1,Math.floor(Number($('#children').value)||1)):0;
  const childrenAges=hasChildren(familyType)?$$('.child-age',$('#childrenAgeFields')).slice(0,children).map(input=>Number(input.value)):[];
  const modality=$('input[name="modality"]:checked')?.value || 'Directo';
  const zone=$('#zone').value;
  const specialDiscount=zone==='AMBA'?$('#specialDiscount').value:'none';
  state.client={
    name:$('#clientName').value.trim()||'Nueva cotización',
    dni:$('#clientDni').value.trim(),zone,modality,specialDiscount,familyType,
    age:Number($('#age').value),partnerAge:hasPartner(familyType)?Number($('#partnerAge').value):0,
    children,childrenAges,
    receiptContribution:modality===DESREGULADO?Math.max(0,Number($('#receiptContribution').value)||0):0
  };
  $('#caseName').textContent=state.client.name;
  $('#caseInitials').textContent=initials(state.client.name);
  $('#caseComposition').textContent=compositionLabel(state.client);
  $('#caseMode').textContent=`${displayModality(modality)} · ${zone}${specialDiscount==='nordelta_tigre'?' · Campaña Tigre/Pilar/Escobar':''}`;
}

function invalidateSelectedPlan(){
  if (!state.plan) return;
  state.plan=null;
  $('#selectedBar').hidden=true;
}

$$('[data-scroll]').forEach(button => button.addEventListener('click', () => $(button.dataset.scroll)?.scrollIntoView({behavior:'smooth'})));
$$('.choice').forEach(choice => choice.addEventListener('click', () => {
  const radio=$('input',choice);
  if(radio) radio.checked=true;
  syncChoiceState();
}));

$('#quoteForm').addEventListener('input',()=>{syncCase();invalidateSelectedPlan();});
$('#quoteForm').addEventListener('change',()=>{syncCase();invalidateSelectedPlan();});
$('#familyType').addEventListener('change',updateCompositionFields);
$('#children').addEventListener('input',()=>renderChildAgeFields(Math.max(1,Math.floor(Number($('#children').value)||1))));

function renderFilters(){
  const families=['Todos',...new Set(window.SWISS_PLANS.map(p=>p.family))];
  $('#planFilters').innerHTML=families.map(f=>`<button class="filter ${f===state.family?'active':''}" data-family="${esc(f)}">${esc(f)}</button>`).join('');
  $$('.filter').forEach(b=>b.addEventListener('click',()=>{state.family=b.dataset.family;renderFilters();renderPlans()}));
}

function quoteSummary(quote){
  if (quote.status!=='ok') return quote.reason || 'Requiere validación comercial';
  const parts=[`Lista ${money(quote.listPrice)}`];
  if (quote.discount>0) parts.push(`bonificaciones ${money(quote.discount)}`);
  if (quote.aporteComputable>0) parts.push(`aportes ${money(quote.aporteComputable)}`);
  return parts.join(' · ');
}

function renderPlans(){
  const familyPlans=window.SWISS_PLANS.filter(p=>state.family==='Todos'||p.family===state.family);
  const plans=familyPlans.map(p=>({plan:p,quote:quoteFor(p)})).filter(x=>x.quote.status!=='unavailable');
  if (!plans.length){
    $('#plansGrid').innerHTML='<div class="empty-state"><b>No hay planes disponibles para esta combinación.</b><span>Revisá zona, modalidad y edades del grupo.</span></div>';
    return;
  }

  $('#plansGrid').innerHTML=plans.map(({plan:p,quote})=>{
    const isOk=quote.status==='ok';
    return `<article class="plan-card">
      <div class="plan-top"><h3>${esc(displayPlanName(p.name))}</h3><span class="tag">${esc(p.tag)}</span></div>
      <p class="plan-family">Familia ${esc(p.family)}</p>
      <div class="plan-price"><small>${isOk?'Valor mensual final':'Validación necesaria'}</small><strong>${isOk?money(quote.finalPrice):'Consultar'}</strong><small>${esc(isOk?quoteSummary(quote):quote.reason)}</small></div>
      <button class="button button--red" ${isOk?`data-plan="${esc(p.name)}"`:'disabled'}>${isOk?'Elegir plan':'Requiere consulta'} <span>→</span></button>
    </article>`;
  }).join('');
  $$('[data-plan]').forEach(b=>b.addEventListener('click',()=>selectPlan(b.dataset.plan)));
}

function selectPlan(name){
  const plan=window.SWISS_PLANS.find(p=>p.name===name);
  const quote=quoteFor(plan);
  if (!plan || quote.status!=='ok') return;
  state.plan=plan;
  $('#selectedName').textContent=displayPlanName(name);
  $('.selected-price strong').textContent=money(quote.finalPrice);
  $('.selected-price small').textContent=quoteSummary(quote);
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
function footer(page,total){return `<div class="quote-footer"><span>Tarifario ${TARIFF_LABEL} · propuesta válida por ${QUOTE_VALIDITY_HOURS} hs</span><span>${page} / ${total} · Grupo Zeroka</span></div>`}

function memberRows(members){
  return members.map(m=>`<div class="coverage-row"><span><b>${esc(m.role)} · ${m.age} años</b><br><small>${m.tariffRole?`${esc(m.tariffRole)} · `:''}Lista ${money(m.listPrice)} · ${m.percent}% ${esc(m.label)}</small></span><span>${money(m.finalPrice)}</span></div>`).join('');
}

function benefitsHtml(planName){
  const benefit=window.SWISS_PLAN_BENEFITS?.[planName];
  if (!benefit) return '<p>Detalle técnico sujeto a documentación vigente de Swiss Medical.</p>';
  return `<div class="technical-head"><span>${esc(benefit.system)}</span><span>${esc(benefit.line)}</span><span>Fuente ${esc(benefit.source)}</span></div><div class="technical-grid">${benefit.highlights.map((item,i)=>`<article><b>${String(i+1).padStart(2,'0')}</b><p>${esc(item)}</p></article>`).join('')}</div>`;
}

function quoteDates(){
  const issued=new Date();
  const valid=new Date(issued.getTime()+QUOTE_VALIDITY_HOURS*60*60*1000);
  const fmt=d=>new Intl.DateTimeFormat('es-AR',{dateStyle:'short',timeStyle:'short'}).format(d);
  return {issued:fmt(issued),valid:fmt(valid)};
}

function buildQuote(){
  if (!state.plan) return;
  const c=state.client,p=state.plan,quote=quoteFor(p),dates=quoteDates();
  if (quote.status!=='ok') return;
  const detailChunks=chunk(quote.members,6);
  const total=4+detailChunks.length;
  const clientMeta=[c.dni?`DNI ${c.dni}`:null,c.zone,displayModality(c.modality)].filter(Boolean).join(' · ');
  const firstName=esc(c.name.split(/\s+/)[0]||c.name);
  const pages=[];

  pages.push(`<section class="quote-page quote-cover"><div class="quote-circle"></div><div class="quote-logo">${brand(true)}</div><div class="quote-cover-copy"><p>PROPUESTA PERSONALIZADA · ${TARIFF_LABEL.toUpperCase()}</p><h1>Hola, ${firstName}.<br>Tu salud merece una buena decisión.</h1><p>${esc(clientMeta)}</p><p class="quote-validity">Emitida ${esc(dates.issued)} · válida hasta ${esc(dates.valid)}</p></div><div class="cover-card"><div><small>PLAN ELEGIDO</small><strong>${esc(displayPlanName(p.name))}</strong><span>${esc(compositionLabel(c))}</span></div><div><small>VALOR MENSUAL FINAL</small><strong>${money(quote.finalPrice)}</strong><span>${esc(quoteSummary(quote))}</span></div></div>${footer(1,total)}</section>`);

  pages.push(`<section class="quote-page quote-network"><div class="network-photo"><img src="assets/images/login-doctor.jpg" alt="Atención personalizada Swiss Medical"></div><div class="network-copy"><p class="eyebrow">UNA RED PARA CUIDARTE</p><h2>Más cerca cuando lo necesitás.</h2><p>La propuesta combina el plan seleccionado con la cartilla y condiciones vigentes para la zona informada.</p><div class="quote-metrics quote-metrics--editorial"><div class="metric"><strong>Cartilla</strong><span>según plan y zona</span></div><div class="metric"><strong>Atención</strong><span>ambulatoria e internación según alcance</span></div><div class="metric"><strong>Respaldo</strong><span>Swiss Medical</span></div><div class="metric"><strong>Asesoría</strong><span>Grupo Zeroka</span></div></div></div><div class="network-note"><b>La disponibilidad de prestadores se confirma al momento de la contratación.</b><span>Los alcances médicos se rigen por la documentación oficial vigente del plan.</span></div>${footer(2,total)}</section>`);

  detailChunks.forEach((members,pageIndex)=>{
    const isLast=pageIndex===detailChunks.length-1;
    const pageNo=3+pageIndex;
    pages.push(`<section class="quote-page quote-benefits"><aside class="benefits-aside"><p>PLAN ELEGIDO</p><strong>${esc(displayPlanName(p.name))}</strong><span>${esc(clientMeta)}</span><div class="benefits-aside-mark">SM</div><small>Valores según tarifario ${TARIFF_LABEL}.</small></aside><div class="benefits-main"><p class="eyebrow">${pageIndex?'DETALLE ECONÓMICO · CONTINUACIÓN':'DETALLE ECONÓMICO'}</p><h2>Precio claro, integrante por integrante.</h2><p class="benefits-intro">Cada integrante utiliza su tarifa correspondiente y una sola bonificación: siempre la mayor aplicable.</p><div class="coverage-list">${memberRows(members)}${isLast&&quote.aporteComputable>0?`<div class="coverage-row coverage-row--aporte"><span><b>Aportes computables</b><br><small>Descuento aplicado por recibo de sueldo</small></span><span>− ${money(quote.aporteComputable)}</span></div>`:''}</div>${isLast?`<div class="benefits-callout"><span>$</span><p><b>Resumen:</b> lista ${money(quote.listPrice)} · bonificaciones ${money(quote.discount)}${quote.aporteComputable>0?` · aportes ${money(quote.aporteComputable)}`:''} · <b>final ${money(quote.finalPrice)}</b>.</p></div>`:''}</div>${footer(pageNo,total)}</section>`);
  });

  const technicalPage=3+detailChunks.length;
  pages.push(`<section class="quote-page quote-technical"><div class="technical-page-inner"><p class="eyebrow">ALCANCE DEL PLAN</p><h2>${esc(displayPlanName(p.name))}</h2><p class="technical-intro">Resumen comercial de las prestaciones más relevantes. Los topes, cargos, reintegros, exclusiones y condiciones completas se rigen por la documentación oficial de Swiss Medical.</p>${benefitsHtml(p.name)}</div>${footer(technicalPage,total)}</section>`);
  pages.push(`<section class="quote-page quote-close"><div class="close-shape one"></div><div class="close-shape two"></div><div style="z-index:1">${brand(true)}<h2>Estamos para acompañarte.</h2><p>Esta propuesta es válida por ${QUOTE_VALIDITY_HOURS} horas desde su emisión.</p><small>Propuesta preparada por Grupo Zeroka · Tarifario ${TARIFF_LABEL}</small></div>${footer(total,total)}</section>`);
  $('#quotePages').innerHTML=pages.join('');
  $('.dialog-toolbar small').textContent=`${total} páginas · detalle económico y técnico`;
}

$('#openQuote').addEventListener('click',()=>{if(!state.plan)return;buildQuote();$('#quoteDialog').showModal()});
$('#closeQuote').addEventListener('click',()=>$('#quoteDialog').close());
$('#quoteDialog').addEventListener('click',e=>{if(e.target===$('#quoteDialog'))$('#quoteDialog').close()});

function pdfText(doc,text,x,y,maxWidth,size=10,style='normal'){
  doc.setFont('helvetica',style);doc.setFontSize(size);const lines=doc.splitTextToSize(String(text),maxWidth);doc.text(lines,x,y);return y+lines.length*(size*0.42+1.2);
}
function pdfHeader(doc,title,subtitle){
  doc.setFillColor(215,25,32);doc.rect(0,0,210,31,'F');doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.setFontSize(20);doc.text(title,16,16);doc.setFontSize(9);doc.text(subtitle,16,24);doc.setTextColor(33,25,26);
}
function pdfFooter(doc,page,total,dark=false){
  doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(...(dark?[240,207,209]:[119,109,110]));
  doc.text(`Tarifario ${TARIFF_LABEL} · válida ${QUOTE_VALIDITY_HOURS} hs`,16,289);doc.text(`${page} / ${total} · Grupo Zeroka`,166,289);doc.setTextColor(33,25,26);
}

function addEconomicPdfPage(doc,members,quote,p,c,page,total,isContinuation,isLast){
  pdfHeader(doc,'Detalle económico',`${displayPlanName(p.name)} · ${TARIFF_LABEL}${isContinuation?' · continuación':''}`);
  let y=47;
  members.forEach(m=>{
    doc.setDrawColor(231,221,221);doc.line(16,y+4,194,y+4);
    y=pdfText(doc,`${m.role} · ${m.age} años`,16,y+11,80,11,'bold');
    pdfText(doc,`${money(m.listPrice)} lista · ${m.percent}% ${m.label}`,16,y+2,115,9);
    doc.setFont('helvetica','bold');doc.setFontSize(11);doc.text(money(m.finalPrice),194,y-8,{align:'right'});
    y+=14;
  });
  if(isLast && quote.aporteComputable>0){
    doc.setDrawColor(231,221,221);doc.line(16,y,194,y);y=pdfText(doc,'Aportes computables',16,y+10,110,11,'bold');
    doc.setFont('helvetica','bold');doc.setFontSize(11);doc.text(`- ${money(quote.aporteComputable)}`,194,y-5,{align:'right'});y+=8;
  }
  if(isLast){
    doc.setFillColor(247,245,244);doc.roundedRect(16,225,178,37,5,5,'F');
    pdfText(doc,`Lista: ${money(quote.listPrice)} · Bonificaciones: ${money(quote.discount)}${quote.aporteComputable>0?` · Aportes: ${money(quote.aporteComputable)}`:''}`,22,239,165,9);
    pdfText(doc,`TOTAL FINAL: ${money(quote.finalPrice)}`,22,252,165,16,'bold');
  }
  pdfFooter(doc,page,total);
}

function downloadQuotePDF(){
  if (!state.plan) return;
  const quote=quoteFor(state.plan);if(quote.status!=='ok')return;
  const JsPDF=window.jspdf?.jsPDF;
  if(!JsPDF){alert('No se pudo cargar el generador de PDF. Recargá la página e intentá nuevamente.');return;}
  const doc=new JsPDF({unit:'mm',format:'a4'}),c=state.client,p=state.plan,dates=quoteDates(),benefit=window.SWISS_PLAN_BENEFITS?.[p.name];
  const detailChunks=chunk(quote.members,6);
  const total=4+detailChunks.length;
  const addPage=()=>doc.addPage('a4','portrait');

  pdfHeader(doc,'SWISS MEDICAL','PROPUESTA PERSONALIZADA');
  let y=51;y=pdfText(doc,`Hola, ${c.name.split(/\s+/)[0]||c.name}.`,16,y,178,27,'bold');y+=5;
  y=pdfText(doc,`Plan ${displayPlanName(p.name)}`,16,y,178,17,'bold');
  y=pdfText(doc,compositionLabel(c),16,y+5,178,11);y=pdfText(doc,`${c.dni?`DNI ${c.dni} · `:''}${c.zone} · ${displayModality(c.modality)}`,16,y+2,178,10);
  doc.setFillColor(247,245,244);doc.roundedRect(16,y+10,178,48,5,5,'F');pdfText(doc,'VALOR MENSUAL FINAL',25,y+24,150,9,'bold');pdfText(doc,money(quote.finalPrice),25,y+38,150,24,'bold');pdfText(doc,quoteSummary(quote),25,y+50,150,9);
  pdfText(doc,`Emitida: ${dates.issued}`,16,244,178,9);pdfText(doc,`Válida hasta: ${dates.valid}`,16,251,178,9,'bold');pdfFooter(doc,1,total);

  addPage();pdfHeader(doc,'Una red para cuidarte',`Plan ${displayPlanName(p.name)} · ${c.zone}`);y=49;
  y=pdfText(doc,'La cartilla y la disponibilidad de prestadores dependen del plan y de la zona seleccionada.',16,y,178,14,'bold');
  y=pdfText(doc,'Swiss Medical acompaña la propuesta con atención y cobertura de acuerdo con el alcance médico del plan contratado.',16,y+8,178,11);
  ['Cartilla según plan y zona','Atención ambulatoria según alcance','Internación según alcance','Asesoría comercial de Grupo Zeroka'].forEach((t,i)=>{doc.setDrawColor(231,221,221);doc.roundedRect(16,105+i*28,178,20,4,4);pdfText(doc,t,22,118+i*28,165,11,'bold')});
  pdfText(doc,'La disponibilidad de prestadores y las condiciones finales se confirman al momento de la contratación.',16,235,178,9);pdfFooter(doc,2,total);

  detailChunks.forEach((members,index)=>{
    addPage();
    addEconomicPdfPage(doc,members,quote,p,c,3+index,total,index>0,index===detailChunks.length-1);
  });

  const technicalPage=3+detailChunks.length;
  addPage();pdfHeader(doc,displayPlanName(p.name),benefit?`${benefit.system} · ${benefit.line} · Fuente ${benefit.source}`:'Alcance técnico');y=45;
  y=pdfText(doc,'Resumen comercial de prestaciones destacadas',16,y,178,16,'bold');
  y=pdfText(doc,'Los topes, cargos, reintegros, exclusiones y condiciones completas se rigen por la documentación oficial vigente de Swiss Medical.',16,y+4,178,9);
  (benefit?.highlights||['Consultar documentación oficial del plan.']).forEach(item=>{if(y>266)return;doc.setFillColor(249,230,229);doc.circle(20,y+7,3,'F');y=pdfText(doc,item,28,y+10,160,10);y+=6;});pdfFooter(doc,technicalPage,total);

  addPage();doc.setFillColor(109,13,22);doc.rect(0,0,210,297,'F');doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.setFontSize(25);doc.text('SWISS MEDICAL',105,95,{align:'center'});doc.setFontSize(30);doc.text('Estamos para',105,139,{align:'center'});doc.text('acompañarte.',105,153,{align:'center'});doc.setFont('helvetica','normal');doc.setFontSize(12);doc.text(`Propuesta válida por ${QUOTE_VALIDITY_HOURS} horas`,105,178,{align:'center'});doc.setFontSize(9);doc.text(`Grupo Zeroka · Tarifario ${TARIFF_LABEL}`,105,244,{align:'center'});pdfFooter(doc,total,total,true);

  const safeName=(c.name||'Cliente').replace(/[\\/:*?"<>|]/g,'').trim()||'Cliente';
  doc.save(`Cotizacion Swiss Medical (${safeName}).pdf`);
}
$('#printQuote').addEventListener('click',downloadQuotePDF);

updateCompositionFields();
updateCommercialFields();
syncCase();
renderFilters();
renderPlans();
