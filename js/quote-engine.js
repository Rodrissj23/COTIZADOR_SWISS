(() => {
  const DESREGULADO = 'Relación de dependencia';
  const CONTRIBUTION_BASE_CAP = 4045590;
  const PARTIAL_PLANS = new Set(['AMBU1','AMBU2','INTER1']);

  const roundMoney = value => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
  const hasPartner = familyType => ['partner','partner_children'].includes(familyType);
  const hasChildren = familyType => ['children','partner_children'].includes(familyType);
  const isPartialPlan = name => PARTIAL_PLANS.has(name);
  const displayModality = modality => modality === DESREGULADO ? 'Desregulado' : modality;

  function getTariffFor(planName, modality, zone){
    return window.getSwissTariff?.(planName, modality, zone) ?? null;
  }

  function discountForMember(age, modality, specialDiscount='none', zone='AMBA'){
    const candidates = [];
    const numericAge = Number(age);
    if (Number.isFinite(numericAge) && numericAge <= 25) candidates.push({percent:50,label:'Hasta 25 años'});
    if (specialDiscount === 'nordelta_tigre' && zone === 'AMBA') candidates.push({percent:25,label:'Beneficio Nordelta/Tigre'});
    if (modality === 'Monotributo') candidates.push({percent:25,label:'Monotributo'});
    if (modality === 'Directo') candidates.push({percent:15,label:'Directo'});
    if (!candidates.length) return {percent:0,label:'Sin bonificación'};
    return candidates.reduce((best,current)=>current.percent>best.percent?current:best,candidates[0]);
  }

  function adultListPrice(tariff, planName, age){
    const numericAge = Number(age);
    if (!Number.isFinite(numericAge)) return null;
    if (tariff === window.SWISS_AMBULATORY_TARIFF && numericAge < 20) return null;
    const key = tariff?.bands?.find(b => numericAge <= b.max)?.key;
    return key ? tariff?.adult?.[planName]?.[key] ?? null : null;
  }

  function contributionForClient(client){
    if (client.modality !== DESREGULADO) {
      return {receiptContribution:0,baseCalculated:0,baseContribution:0,capApplied:false,aporteComputable:0};
    }
    const receiptContribution = Math.max(0, Number(client.receiptContribution) || 0);
    const baseCalculated = Math.round(receiptContribution * 100 / 3);
    const baseContribution = Math.min(baseCalculated, CONTRIBUTION_BASE_CAP);
    const capApplied = baseCalculated > CONTRIBUTION_BASE_CAP;
    const aporteComputable = roundMoney(baseContribution * 0.09 * 0.85);
    return {receiptContribution,baseCalculated,baseContribution,capApplied,aporteComputable};
  }

  function familyQuote(plan, client){
    if (!plan?.name || !client) return {status:'unavailable'};
    const tariff = getTariffFor(plan.name, client.modality, client.zone);
    if (!tariff || !tariff.adult?.[plan.name]) return {status:'unavailable'};

    const members = [];
    const titularList = adultListPrice(tariff, plan.name, client.age);
    if (titularList == null) return {status:'unavailable'};
    members.push({
      role:'Titular', age:Number(client.age), listPrice:titularList,
      ...discountForMember(client.age,client.modality,client.specialDiscount,client.zone)
    });

    if (hasPartner(client.familyType)){
      const partnerList = adultListPrice(tariff, plan.name, client.partnerAge);
      if (partnerList == null) return {status:'unavailable'};
      members.push({
        role:'Pareja', age:Number(client.partnerAge), listPrice:partnerList,
        ...discountForMember(client.partnerAge,client.modality,client.specialDiscount,client.zone)
      });
    }

    if (hasChildren(client.familyType)){
      const count = Math.max(0, Number(client.children) || 0);
      const ages = Array.isArray(client.childrenAges) ? client.childrenAges.slice(0,count).map(Number) : [];
      if (count < 1 || ages.length !== count || ages.some(age => !Number.isFinite(age) || age < 0 || age > 25)) {
        return {status:'consult',reason:'Revisá la edad de cada hijo. Se admiten edades de 0 a 25 años.'};
      }
      if (!tariff.firstChild || tariff.firstChild[plan.name] == null) return {status:'unavailable'};
      if (isPartialPlan(plan.name) && count > 1) {
        return {status:'consult',reason:'Para este plan, más de un hijo requiere confirmación comercial.'};
      }

      let firstChildTariffUsed = false;
      for (let index=0; index<ages.length; index++){
        const childAge = ages[index];
        const mustUseAdditional = childAge >= 22 || firstChildTariffUsed;
        const listPrice = mustUseAdditional ? tariff.additionalChild?.[plan.name] : tariff.firstChild?.[plan.name];
        if (!mustUseAdditional) firstChildTariffUsed = true;
        if (listPrice == null) {
          return {status:'consult',reason:'La tabla no informa tarifa de hijo adicional para este plan.'};
        }
        members.push({
          role:`Hijo ${index+1}`, age:childAge, listPrice,
          ...discountForMember(childAge,client.modality,client.specialDiscount,client.zone),
          tariffRole:mustUseAdditional?'Hijo adicional':'1er hijo'
        });
      }
    }

    const detailed = members.map(member=>{
      const discount = roundMoney(member.listPrice * member.percent / 100);
      return {...member,discount,finalPrice:roundMoney(member.listPrice-discount)};
    });
    const listPrice = roundMoney(detailed.reduce((sum,m)=>sum+m.listPrice,0));
    const discount = roundMoney(detailed.reduce((sum,m)=>sum+m.discount,0));
    const finalBeforeAportes = roundMoney(detailed.reduce((sum,m)=>sum+m.finalPrice,0));
    const contribution = contributionForClient(client);
    const finalPrice = roundMoney(Math.max(0,finalBeforeAportes-contribution.aporteComputable));

    return {status:'ok',members:detailed,listPrice,discount,finalBeforeAportes,finalPrice,...contribution};
  }

  window.SWISS_ENGINE = Object.freeze({
    DESREGULADO,
    CONTRIBUTION_BASE_CAP,
    roundMoney,
    hasPartner,
    hasChildren,
    isPartialPlan,
    displayModality,
    getTariffFor,
    discountForMember,
    adultListPrice,
    contributionForClient,
    familyQuote
  });
})();
