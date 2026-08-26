(() => {
  const refBrand = (white=false) => `
    <div class="ref-brand ${white?'ref-brand--white':''}" aria-label="Swiss Medical">
      <span class="ref-brand-mark"><i></i><i></i><i></i><i></i></span>
      <span class="ref-brand-copy"><strong>SWISS</strong><strong>MEDICAL</strong></span>
    </div>`;

  const moneyOrZero = value => money(Number(value) || 0);

  function familyCharge(quote){
    if (!quote?.members?.length || quote.members.length < 2) return 0;
    return quote.members.slice(1).reduce((sum,member)=>sum + (Number(member.listPrice)||0),0);
  }

  function detailValue(quote){
    return Number(quote?.members?.[0]?.listPrice) || Number(quote?.listPrice) || 0;
  }

  function promoText(quote){
    const percents=[...new Set((quote.members||[]).map(m=>Number(m.percent)||0).filter(Boolean))];
    if (!quote.discount) return moneyOrZero(0);
    if (percents.length===1) return `${percents[0]}% - ${money(quote.discount)}`;
    return `- ${money(quote.discount)}`;
  }

  function familyDetailPage(plan,quote,members,index,total){
    return `<section class="quote-page ref-page ref-family-detail">
      <div class="ref-family-head"><span>Detalle por integrante</span><b>${esc(displayPlanName(plan.name))}</b></div>
      <div class="ref-family-table-head"><span>Integrante</span><span>Valor de lista</span><span>Bonificación</span><span>Valor final</span></div>
      <div class="ref-family-table">
        ${members.map(m=>`<div class="ref-family-row"><span><b>${esc(m.role)}</b><small>${m.age} años${m.tariffRole?` · ${esc(m.tariffRole)}`:''}</small></span><span>${money(m.listPrice)}</span><span>${m.percent?`${m.percent}% · ${esc(m.label)}`:'Sin bonificación'}</span><strong>${money(m.finalPrice)}</strong></div>`).join('')}
      </div>
      ${index===total-1&&quote.aporteComputable>0?`<div class="ref-family-aporte"><span>Aportes computables</span><b>− ${money(quote.aporteComputable)}</b></div>`:''}
      ${index===total-1?`<div class="ref-family-total"><span>Total mensual final</span><strong>${money(quote.finalPrice)}</strong></div>`:''}
      <div class="ref-family-foot">Valores calculados con el tarifario ${esc(TARIFF_LABEL)}.</div>
    </section>`;
  }

  function summaryFamilyText(c,quote){
    if(quote.members.length===1) return `Titular ${quote.members[0].age}`;
    const partner=quote.members.find(m=>/pareja/i.test(m.role));
    const childCount=quote.members.filter(m=>/^Hijo/i.test(m.role)).length;
    const parts=[`Titular ${quote.members[0].age}`];
    if(partner) parts.push(`Pareja ${partner.age}`);
    if(childCount) parts.push(`${childCount} hijo${childCount===1?'':'s'}`);
    return parts.join(' · ');
  }

  function summaryPage(c,p,quote){
    const rows=[
      ['Grupo familiar',summaryFamilyText(c,quote),''],
      ['Zona',c.zone,''],
      ['Valor detalle',money(detailValue(quote)),''],
      ['Fliar a cargo',money(familyCharge(quote)),''],
      ['Aportes a descontar',quote.aporteComputable>0?`- ${money(quote.aporteComputable)}`:moneyOrZero(0),''],
      ['Descuento promocional',promoText(quote),quote.discount>0?'Campaña comercial aplicada por 12 meses':''],
      ['Descuento multiproducto',moneyOrZero(0),''],
      ['IVA','Incluido','']
    ];
    let y=323;
    const rowSvg=rows.map(([label,value,note])=>{
      const labelH=32,valueH=note?45:35;
      const valueSize=value.length>34?18:value.length>24?20:24;
      const block=`<rect x="120" y="${y}" width="574" height="${labelH}" fill="#c6b5b5"/><text x="407" y="${y+23}" text-anchor="middle" font-size="24" font-weight="700" fill="#403940">${esc(label)}</text><rect x="120" y="${y+labelH}" width="574" height="${valueH}" fill="#efe0df"/><text x="407" y="${y+labelH+(note?27:25)}" text-anchor="middle" font-size="${valueSize}" font-weight="400" fill="#403940">${esc(value)}</text>${note?`<text x="407" y="${y+labelH+40}" text-anchor="middle" font-size="10.5" fill="#403940">${esc(note)}</text>`:''}`;
      y+=labelH+valueH;
      return block;
    }).join('');
    const totalY=y;
    return `<section class="quote-page ref-page ref-summary ref-summary--svg"><svg class="ref-summary-svg" viewBox="0 0 794 1123" xmlns="http://www.w3.org/2000/svg">
      <rect width="794" height="1123" fill="#c61f20"/>
      <circle cx="10" cy="130" r="140" fill="#ee231c" opacity=".55"/><circle cx="760" cy="140" r="160" fill="#991b21" opacity=".48"/><circle cx="760" cy="665" r="150" fill="#9f1c22" opacity=".45"/><circle cx="70" cy="905" r="150" fill="#e4231c" opacity=".38"/>
      <path d="M58 40H734V996Q734 1083 647 1083H58Z" fill="#efe0df"/>
      <path d="M58 40H588V111Q588 151 548 151H58Z" fill="#db221d"/>
      <text x="132" y="109" font-size="30" font-weight="400" fill="#fff">| Nueva</text><text x="264" y="109" font-size="31" font-weight="700" fill="#fff">COTIZACIÓN</text>
      <text x="407" y="225" text-anchor="middle" font-size="20" fill="#403940">PLAN</text><text x="407" y="294" text-anchor="middle" font-size="56" font-weight="700" fill="#403940">${esc(displayPlanName(p.name))}</text>
      ${rowSvg}
      <rect x="120" y="${totalY}" width="574" height="36" fill="#ee2118"/><text x="407" y="${totalY+26}" text-anchor="middle" font-size="25" font-weight="700" fill="#fff">Total</text>
      <rect x="120" y="${totalY+36}" width="574" height="48" fill="#efe0df"/><text x="407" y="${totalY+70}" text-anchor="middle" font-size="31" font-weight="700" fill="#403940">${esc(money(quote.finalPrice))}</text>
      <text x="120" y="${totalY+112}" font-size="11.5" fill="#50484d"><tspan x="120">*Los datos exhibidos en el siguiente reporte son una aproximación de los valores finales y pueden variar</tspan><tspan x="120" dy="14">por ajustes de precios o dependiendo de la fidelidad de los datos brindados al cotizador.</tspan><tspan x="120" dy="17">*Precios correspondientes al tarifario ${esc(TARIFF_LABEL)} · propuesta válida por ${QUOTE_VALIDITY_HOURS} hs.</tspan></text>
      <g transform="translate(304 1020)"><g fill="#e0003b"><rect x="0" y="0" width="20" height="20"/><rect x="27" y="0" width="20" height="20"/><rect x="0" y="27" width="20" height="20"/><rect x="27" y="27" width="20" height="20"/></g><text x="61" y="20" font-size="23" fill="#5e555b">SWISS</text><text x="61" y="47" font-size="27" fill="#5e555b">MEDICAL</text></g>
    </svg></section>`;
  }

  buildQuote = function(){
    if (!state.plan) return;
    const c=state.client,p=state.plan,quote=quoteFor(p);
    if (quote.status!=='ok') return;

    const familyPages=quote.members.length>1?chunk(quote.members,7):[];
    const total=3+familyPages.length;
    const pages=[];

    pages.push(`<section class="quote-page ref-page ref-cover"><div class="ref-pattern"></div><div class="ref-cover-panel"><div class="ref-cover-copy"><h1>Hola,<br>¿cómo<br>estás hoy?</h1><h2>Te acercamos tu cotización.</h2></div><div class="ref-cover-logo">${refBrand(true)}</div></div></section>`);
    pages.push(`<section class="quote-page ref-page ref-network ref-network--image"><img src="assets/images/swiss-network-original.jpg" alt="Hoy contamos con Swiss Medical"></section>`);
    pages.push(summaryPage(c,p,quote));
    familyPages.forEach((members,index)=>pages.push(familyDetailPage(p,quote,members,index,familyPages.length)));
    $('#quotePages').innerHTML=pages.join('');
    $('.dialog-toolbar small').textContent=`${total} páginas · formato Swiss Medical`;
  };
})();
