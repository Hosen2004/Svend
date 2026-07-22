/* =============================================================================
   SVEND — PRISER OG FAG  (samme priser som den live demo)
   >>> ÆNDRE PRISER HER <<<  Hver vare har:
       label  = navn kunden ser
       price  = pris i kr
       unit   = enhed (stk/m/m²/time)
       match  = ord Svend genkender i en besked (så han ved hvilken vare der menes)
   ========================================================================== */
const TRADES = {
  vinduespudser: {
    name: "Vinduespudser", firm: "Klart Udsyn Vinduespolering", min: 250, unit: "stk",
    items: [
      { id:"lille", label:"lille vindue",        price:25, unit:"stk", match:["lille","små","toiletvindue"] },
      { id:"std",   label:"standard vindue",     price:35, unit:"stk", match:["vindue","ruder","rude","standard"] },
      { id:"stor",  label:"stort/panorama vindue",price:60, unit:"stk", match:["stort","panorama","stor rude"] },
      { id:"dor",   label:"fransk altandør",     price:55, unit:"stk", match:["altandør","fransk","dør med glas"] },
      { id:"tag",   label:"ovenlys/tagvindue",   price:70, unit:"stk", match:["ovenlys","tagvindue","velux"] },
    ],
  },
  fugemand: {
    name: "Fugemand", firm: "TætFuge ApS", min: 1500, unit: "m",
    items: [
      { id:"bad",  label:"badeværelse (vådrumsfuge)", price:90,  unit:"m", match:["bad","badeværelse","brusekabine","vådrum"] },
      { id:"kok",  label:"køkken",                     price:75,  unit:"m", match:["køkken","bordplade","vask"] },
      { id:"vin",  label:"omkring vinduer",            price:85,  unit:"m", match:["vindue","vinduer","karm"] },
      { id:"beton",label:"dilatationsfuge (beton)",    price:110, unit:"m", match:["beton","dilatation","facade"] },
      { id:"fjern",label:"fjernelse af gammel fuge",   price:40,  unit:"m", match:["gammel fuge","fjern","skift fuge"] },
    ],
  },
  vvs: {
    name: "VVS", firm: "Nordjysk VVS", min: 0, unit: "stk",
    items: [
      { id:"bat", label:"nyt blandingsbatteri",   price:850,  unit:"stk", match:["batteri","blandingsbatteri","armatur"] },
      { id:"toi", label:"nyt toilet monteret",    price:1900, unit:"stk", match:["toilet","wc","kumme","cisterne"] },
      { id:"hane",label:"udskift vandhane",       price:750,  unit:"stk", match:["vandhane","hane","dryp"] },
      { id:"rad", label:"ny radiator",            price:2400, unit:"stk", match:["radiator","varme"] },
      { id:"akut",label:"akut udkald (vandskade)",price:1500, unit:"stk", match:["vandskade","sprunget","fosser","lækage","utæt"] },
    ],
  },
  elektriker: {
    name: "Elektriker", firm: "Strøm & Co.", min: 0, unit: "stk",
    items: [
      { id:"stik",label:"ny stikkontakt",       price:650,  unit:"stk", match:["stikkontakt","stik","kontakt"] },
      { id:"lamp",label:"montering af lampe",    price:550,  unit:"stk", match:["lampe","lys","armatur","pendel"] },
      { id:"tav", label:"eftersyn af eltavle",   price:1200, unit:"stk", match:["tavle","eltavle","gruppe"] },
      { id:"hpfi",label:"skift HPFI-relæ",       price:1400, unit:"stk", match:["hpfi","relæ","sikring","fejlstrøm"] },
      { id:"lad", label:"ladestander (elbil)",   price:6500, unit:"stk", match:["ladestander","lader","elbil","ladeboks"] },
    ],
  },
  tomrer: {
    name: "Tømrer", firm: "Træværk & Sønner", min: 0, unit: "stk",
    items: [
      { id:"dor", label:"montering af indvendig dør", price:1500, unit:"stk", match:["dør","indvendig dør"] },
      { id:"gulv",label:"nyt trægulv",                price:450,  unit:"m²",  match:["gulv","trægulv","parket"] },
      { id:"ter", label:"terrasse",                   price:950,  unit:"m²",  match:["terrasse","altan","træterrasse"] },
      { id:"kok", label:"køkkenopsætning",            price:6000, unit:"stk", match:["køkken","køkkenopsætning"] },
    ],
  },
  maler: {
    name: "Maler", firm: "Pang Farver", min: 1200, unit: "m²",
    items: [
      { id:"vaeg",label:"vægge",         price:85, unit:"m²",  match:["væg","vægge","mal væg"] },
      { id:"loft",label:"loft",          price:95, unit:"m²",  match:["loft"] },
      { id:"trae",label:"træværk/dør",   price:350,unit:"stk", match:["træværk","dør","paneler","karm"] },
      { id:"spar",label:"spartling",     price:60, unit:"m²",  match:["spartling","spartle","fylde"] },
    ],
  },
  murer: {
    name: "Murer", firm: "Sten på Sten", min: 1500, unit: "m²",
    items: [
      { id:"mur", label:"opmuring",     price:1100, unit:"m²", match:["mur","opmuring","mure"] },
      { id:"puds",label:"pudsning",     price:350,  unit:"m²", match:["puds","pudsning"] },
      { id:"fli", label:"fliser (bad)", price:750,  unit:"m²", match:["fliser","flise","klinker"] },
    ],
  },
  kloak: {
    name: "Kloak", firm: "Rent Rør", min: 0, unit: "stk",
    items: [
      { id:"spul",label:"spuling/rensning",   price:1800, unit:"stk", match:["spuling","rens","stoppet","tilstoppet"] },
      { id:"tv",  label:"TV-inspektion",      price:2500, unit:"stk", match:["tv-inspektion","kamera","inspektion"] },
      { id:"akut",label:"akut tilstopning",   price:1900, unit:"stk", match:["akut","haster","kloak løber over","oversvømmelse"] },
    ],
  },
};

module.exports = { TRADES };
