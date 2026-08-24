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
  bands:[{max:35,key:'u35'},{max:40,key:'36_40'},{max:45,key:'41_45'},{max:50,key:'46_50'},{max:55,key:'51_55'},{max:60,key:'56_60'},{max:999,key:'o61'}],
  adult:{
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
  firstChild:{S2:151120,'SPORT S':187757,SMG20:211301,SMG30:245657,SPORT:247223,SMG40:256501,'SPORT+':292412,SMG50:278193,SMG60:299940,SMG70:321689},
  additionalChild:{S2:109146,'SPORT S':135607,SMG20:152613,SMG30:159496,SPORT:178557,SMG40:166323,'SPORT+':189607,SMG50:180030,SMG60:193685,SMG70:207395}
};

window.getSwissPrice = (planName, age, adults=1, children=0) => {
  const key = window.SWISS_TARIFF.bands.find(b => age <= b.max)?.key;
  const adultPrice = window.SWISS_TARIFF.adult[planName]?.[key];
  if (!adultPrice) return null;
  const childPrice = children ? window.SWISS_TARIFF.firstChild[planName] + Math.max(0, children - 1) * window.SWISS_TARIFF.additionalChild[planName] : 0;
  return adultPrice * adults + childPrice;
};

