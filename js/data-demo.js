window.SWISS_PLANS = [
  {name:'AMBU1', family:'Ambulatorios', tag:'Entrada'}, {name:'AMBU2', family:'Ambulatorios', tag:'Ambulatorio'},
  {name:'INTER1', family:'Esenciales', tag:'Internación'}, {name:'S1', family:'Esenciales', tag:'Integral'}, {name:'S2', family:'Esenciales', tag:'Integral'}, {name:'SMG02', family:'Esenciales', tag:'Clásico'},
  {name:'SPORT', family:'Sport', tag:'Activo'}, {name:'SPORT S', family:'Sport', tag:'Activo'}, {name:'SPORT+', family:'Sport', tag:'Activo Plus'},
  {name:'SMG20', family:'SMG', tag:'Integral'}, {name:'SMG30', family:'SMG', tag:'Superior'}, {name:'SMG40', family:'SMG', tag:'Superior'},
  {name:'SMG50', family:'SMG', tag:'Premium'}, {name:'SMG60', family:'SMG', tag:'Premium'}, {name:'SMG70', family:'SMG', tag:'Máxima cobertura'}
];

/* Tarifario de referencia 08/2026. Los importes se calculan por tramo de edad,
   cantidad de adultos, primer hijo e hijos adicionales. */
window.SWISS_TARIFF = {
  source:'Tarifario consolidado · agosto 2026',
  bands:[{max:35,key:'u35'},{max:40,key:'36_40'},{max:45,key:'41_45'},{max:50,key:'46_50'},{max:55,key:'51_55'},{max:60,key:'56_60'},{max:999,key:'o61'}],
  adult:{
    S1:{u35:153440,'36_40':184126,'41_45':193324,'46_50':212651,'51_55':276465,'56_60':359409,o61:452647},
    SMG02:{u35:215817,'36_40':258981,'41_45':271918,'46_50':299214,'51_55':388853,'56_60':528518,o61:636556},
    S2:{u35:189629,'36_40':227544,'41_45':238925,'46_50':262825,'51_55':341693,'56_60':444183,o61:559401},
    'SPORT S':{u35:235601,'36_40':282710,'41_45':296849,'46_50':326544,'51_55':424531,'56_60':551870,o61:695022},
    SMG20:{u35:265147,'36_40':318166,'41_45':334073,'46_50':367492,'51_55':477769,'56_60':621077,o61:782179},
    SMG30:{u35:292125,'36_40':350538,'41_45':368044,'46_50':404877,'51_55':526327,'56_60':684224,o61:861760},
    SPORT:{u35:310221,'36_40':372251,'41_45':390868,'46_50':429968,'51_55':558899,'56_60':726659,o61:915150},
    SMG40:{u35:347121,'36_40':416550,'41_45':437357,'46_50':481126,'51_55':625427,'56_60':813053,o61:1024090},
    'SPORT+':{u35:395720,'36_40':474865,'41_45':498588,'46_50':548484,'51_55':712985,'56_60':926881,o61:1167373},
    SMG50:{u35:413136,'36_40':495771,'41_45':520546,'46_50':572628,'51_55':744402,'56_60':967705,o61:1218744},
    SMG60:{u35:618213,'36_40':741867,'41_45':778976,'46_50':856880,'51_55':1113928,'56_60':1448115,o61:1823731},
    SMG70:{u35:758001,'36_40':909621,'41_45':955096,'46_50':1050563,'51_55':1365751,'56_60':1775472,o61:2236095}
  },
  firstChild:{S1:113554,SMG02:159717,S2:151120,'SPORT S':187757,SMG20:211301,SMG30:245657,SPORT:247223,SMG40:256501,'SPORT+':292412,SMG50:278193,SMG60:299940,SMG70:321689},
  additionalChild:{S1:83601,SMG02:116827,S2:109146,'SPORT S':135607,SMG20:152613,SMG30:159496,SPORT:178557,SMG40:166323,'SPORT+':189607,SMG50:180030,SMG60:193685,SMG70:207395}
};

/* Los planes ambulatorios tienen escalas oficiales propias: 20–25 hasta mayor de 80. */
window.SWISS_AMBULATORY_TARIFF = {
  bands:[{max:25,key:'20_25'},{max:35,key:'26_35'},{max:40,key:'36_40'},{max:45,key:'41_45'},{max:50,key:'46_50'},{max:55,key:'51_55'},{max:60,key:'56_60'},{max:65,key:'61_65'},{max:70,key:'66_70'},{max:75,key:'71_75'},{max:80,key:'76_80'},{max:999,key:'o80'}],
  adult:{
    AMBU1:{'20_25':78130.2,'26_35':92164.2,'36_40':97744.1,'41_45':105149.2,'46_50':114355.3,'51_55':130715.4,'56_60':152210,'61_65':174848.3,'66_70':222518.2,'71_75':255580.4,'76_80':268355.8,o80:281777},
    AMBU2:{'20_25':44529.2,'26_35':51955,'36_40':54910.2,'41_45':58826.2,'46_50':63693.2,'51_55':72348.6,'56_60':83718.7,'61_65':95692.6,'66_70':121173.2,'71_75':138665.6,'76_80':145595.5,o80:152877.8},
    INTER1:{'20_25':113550.9,'26_35':140335.7,'36_40':164360.6,'41_45':172581.7,'46_50':221375.8,'51_55':287784.4,'56_60':374114.2,'61_65':486348.1,'66_70':632249.9,'71_75':821924.5,'76_80':1068503.1,o80:1389054.3}
  },
  firstChild:{AMBU1:67818.3,AMBU2:39079,INTER1:61235.4}
};

/* Directo y Monotributo: tabla individual AMBA. El descuento se calcula aparte,
   nunca se descuenta dos veces sobre el valor de lista. */
window.SWISS_DIRECT_TARIFF = {
  bands:window.SWISS_TARIFF.bands,
  adult:{
    S2:{u35:242411,'36_40':290883,'41_45':305408,'46_50':335979,'51_55':436770,'56_60':567790,o61:715108},
    'SPORT S':{u35:301179,'36_40':361404,'41_45':379450,'46_50':417431,'51_55':542658,'56_60':705443,o61:888478},
    SMG20:{u35:338947,'36_40':406726,'41_45':427034,'46_50':469781,'51_55':610707,'56_60':793909,o61:999897},
    SMG30:{u35:389369,'36_40':467243,'41_45':490618,'46_50':539683,'51_55':701569,'56_60':912047,o61:1148633},
    SPORT:{u35:396569,'36_40':475868,'41_45':499632,'46_50':549642,'51_55':714528,'56_60':928871,o61:1169877},
    SMG40:{u35:406963,'36_40':488379,'41_45':512762,'46_50':564046,'51_55':733273,'56_60':953235,o61:1200335},
    'SPORT+':{u35:463936,'36_40':556751,'41_45':584547,'46_50':643036,'51_55':835933,'56_60':1086712,o61:1368612},
    SMG50:{u35:508509,'36_40':610176,'41_45':640699,'46_50':704755,'51_55':916180,'56_60':1191069,o61:1500103},
    SMG60:{u35:716033,'36_40':859263,'41_45':902247,'46_50':992458,'51_55':1290198,'56_60':1677263,o61:2112303},
    SMG70:{u35:871368,'36_40':1045652,'41_45':1097964,'46_50':1207716,'51_55':1570047,'56_60':2041065,o61:2570535}
  },
  firstChild:{S2:204913,'SPORT S':254593,SMG20:286519,SMG30:333337,SPORT:335228,SMG40:348335,'SPORT+':397101,SMG50:378267,SMG60:408260,SMG70:438193},
  additionalChild:{S2:147067,'SPORT S':182722,SMG20:205638,SMG30:238991,SPORT:240594,SMG40:249501,'SPORT+':284433,SMG50:270460,SMG60:291419,SMG70:312380}
};

window.getSwissListPrice = (planName, age, adults=1, children=0, modality='Directo') => {
  const tariff = window.SWISS_AMBULATORY_TARIFF.adult[planName] ? window.SWISS_AMBULATORY_TARIFF : (['Directo','Monotributo'].includes(modality) ? window.SWISS_DIRECT_TARIFF : window.SWISS_TARIFF);
  const key = tariff.bands.find(b => age <= b.max)?.key;
  const adultPrice = tariff.adult[planName]?.[key];
  if (!adultPrice) return null;
  if (children > 1 && !tariff.additionalChild?.[planName]) return null;
  const additionalPrice = tariff.additionalChild?.[planName] || 0;
  const childPrice = children ? tariff.firstChild[planName] + Math.max(0, children - 1) * additionalPrice : 0;
  return adultPrice * adults + childPrice;
};

window.getSwissDiscount = (age, modality='Directo', zone='AMBA') => {
  const discounts = [];
  if (age < 25) discounts.push(50);
  if (['Nordelta','Tigre'].includes(zone) && age >= 25) discounts.push(25);
  if (modality === 'Monotributo') discounts.push(25);
  if (modality === 'Directo') discounts.push(15);
  return Math.max(0, ...discounts);
};

window.getSwissQuote = (planName, age, adults=1, children=0, modality='Directo', zone='AMBA') => {
  const listPrice = window.getSwissListPrice(planName, age, adults, children, modality);
  if (listPrice == null) return null;
  const discountPercent = window.getSwissDiscount(age, modality, zone);
  const discount = listPrice * discountPercent / 100;
  return {listPrice, discountPercent, discount, finalPrice:listPrice - discount};
};

window.getSwissPrice = (planName, age, adults=1, children=0, modality='Directo', zone='AMBA') =>
  window.getSwissQuote(planName, age, adults, children, modality, zone)?.finalPrice ?? null;

