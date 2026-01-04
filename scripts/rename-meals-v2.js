/**
 * Skripta za skraćivanje naziva jela - zadržava glavne namirnice
 */

const fs = require('fs');
const path = require('path');

// Mapa starih -> novih naziva (skraćeni, ali zadržavaju glavne namirnice)
const nameMap = {
  // === SMOOTHIE-JI ===
  "Banana + borovnice + whey + mlijeko 1.2% smoothie": "Smoothie s bananom i borovnicama",
  "Banana + borovnice + whey + voda smoothie (međuobrok)": "Smoothie s bananom i borovnicama",
  "Banana + jabuka + whey + mlijeko 1.2% smoothie": "Smoothie s bananom i jabukom",
  "Banana + jabuka + whey + voda smoothie (međuobrok)": "Smoothie s bananom i jabukom",
  "Banana + jagode + whey + mlijeko 1.2% smoothie": "Smoothie s bananom i jagodama",
  "Banana + jagode + whey + voda smoothie (međuobrok)": "Smoothie s bananom i jagodama",
  "Banana + malo voća (2-3 komada) + whey + voda smoothie (međuobrok)": "Smoothie s bananom i voćem",
  "Banana + mix voća + whey + mlijeko 1.2% smoothie": "Smoothie s bananom i miješanim voćem",
  "Banana + whey + mlijeko 1.2% smoothie": "Banana smoothie s wheyem",
  "Banana + whey + voda smoothie (međuobrok)": "Banana smoothie s wheyem",
  "Banana + šumsko voće + whey + mlijeko 1.2% smoothie": "Smoothie s bananom i šumskim voćem",
  "Banana + šumsko voće + whey + voda smoothie (međuobrok)": "Smoothie s bananom i šumskim voćem",
  "Klasični proteinski smoothie": "Banana smoothie s wheyem",
  "Proteinski smoothie sa šumskim voćem": "Smoothie s bananom i šumskim voćem",
  "Proteinski smoothie s jagodama": "Smoothie s bananom i jagodama",
  "Proteinski smoothie s borovnicama": "Smoothie s bananom i borovnicama",
  "Proteinski smoothie s jabukom": "Smoothie s bananom i jabukom",
  "Proteinski smoothie s miješanim voćem": "Smoothie s bananom i miješanim voćem",
  "Lagani proteinski shake": "Banana smoothie s wheyem",
  "Lagani smoothie sa šumskim voćem": "Smoothie s bananom i šumskim voćem",
  "Lagani smoothie s jagodama": "Smoothie s bananom i jagodama",
  "Lagani smoothie s borovnicama": "Smoothie s bananom i borovnicama",
  "Lagani smoothie s jabukom": "Smoothie s bananom i jabukom",
  "Lagani voćni smoothie": "Smoothie s bananom i voćem",

  // === DORUČAK - JAJA ===
  "Proteinski doručak s piletinom i krekerima": "Jaja s piletinom i krekerima",
  "Proteinski doručak s pršutom i krekerima": "Jaja s pršutom i krekerima",
  "Proteinski doručak s piletinom i sirom": "Jaja s piletinom i sirom na tostu",
  "Proteinski doručak s pršutom i zrnatim sirom": "Jaja s pršutom i zrnatim sirom",
  "Proteinski doručak s piletinom i zrnatim sirom": "Jaja s piletinom i zrnatim sirom",
  "Proteinski doručak s pršutom i ABC sirom": "Jaja s pršutom i ABC sirom",
  "Energetski doručak s jajima i zobenima": "Jaja sa zobenima i voćem",
  "Jaja s avokadom na tostu": "Jaja s avokadom na tostu",
  "Proteinski doručak sa zobenima i šumskim voćem": "Jaja sa zobenima i šumskim voćem",
  "Proteinski doručak sa zobenima i jabukom": "Jaja sa zobenima i jabukom",

  // === DORUČAK - OMLET ===
  "Omlet s piletinom na tostu": "Omlet s piletinom na tostu",
  "Omlet s piletinom i posnim sirom": "Omlet s piletinom i posnim sirom",
  "Omlet s piletinom i zrnatim sirom": "Omlet s piletinom i zrnatim sirom",
  "Omlet s pršutom na tostu": "Omlet s pršutom na tostu",
  "Omlet s pršutom i mozzarellom": "Omlet s pršutom i mozzarellom",
  "Omlet s pršutom i Gouda sirom": "Omlet s pršutom i Gouda sirom",
  "Slatki omlet sa zobenima i malinama": "Omlet sa zobenima i malinama",
  "Proteinski omlet sa zobenima i voćem": "Omlet s piletinom, zobenima i voćem",

  // === DORUČAK - KAJGANA ===
  "Kajgana s piletinom na tostu": "Kajgana s piletinom na tostu",

  // === DORUČAK - SENDVIČI ===
  "Topli sendvič s piletinom i sirom": "Tost s piletinom i Gouda sirom",
  "Sendvič s piletinom i salatom": "Tost s piletinom, sirom i salatom",
  "Topli sendvič s pršutom i sirom": "Tost s pršutom i Gouda sirom",
  "Mediteranski sendvič s pršutom": "Tost s pršutom, mozzarellom i pestom",
  "Sendvič s piletinom i pestom": "Tost s piletinom i pestom",
  "Doručak sendvič s chia pudingom": "Tost s piletinom i chia puding",
  "Energetski sendvič s chia pudingom": "Tost s piletinom i chia puding s voćem",
  "Sendvič s jogurtom i voćem": "Tost s piletinom i grčki jogurt s voćem",
  "Bogati doručak s jogurtom i voćem": "Tost s piletinom i grčki jogurt s voćem",
  "Talijanski doručak s chia pudingom": "Tost s pršutom i chia puding",

  // === DORUČAK - KREKERI ===
  "Lagani doručak s krekerima i piletinom": "Rižini krekeri s piletinom i sirom",
  "Lagani doručak s krekerima i pršutom": "Rižini krekeri s pršutom i sirom",

  // === DORUČAK - ZOBENE ===
  "Proteinske zobene s jabukom i cimetom": "Zobene s jabukom, cimetom i wheyem",
  "Energetske zobene s jabukom i cimetom": "Zobene s jabukom, cimetom i wheyem",
  "Proteinske zobene s borovnicama": "Zobene s bananom, borovnicama i wheyem",
  "Proteinske zobene sa šumskim voćem": "Zobene s bananom, šumskim voćem i wheyem",
  "Brza zobena kaša s bananom": "Zobena kaša s bananom",

  // === DORUČAK - OSTALO ===
  "Proteinski chia puding s voćem": "Chia puding s bananom i borovnicama",
  "Proteinski griz s bananom": "Griz s bananom i wheyem",
  "Čokolino proteinski doručak": "Čokolino s bananom i wheyem",
  "Proteinske palačinke": "Palačinke s bananom i wheyem",
  "Proteinske palačinke s voćem": "Palačinke s bananom i voćem",

  // === RUČAK - PILETINA ===
  "Pileća prsa s rižom": "Pileća prsa s rižom",
  "Pileća prsa s pireom": "Pileća prsa s pire krumpirom",
  "Pileća prsa s restanim krumpirom": "Pileća prsa s restanim krumpirom",
  "Pileća prsa s grahom": "Pileća prsa s grahom",
  "Pileća prsa s krumpir salatom": "Pileća prsa s krumpir salatom",
  "Pileća prsa s gljivama": "Pileća prsa s gljivama",
  "Pileća prsa s povrćem": "Pileća prsa s povrćem",
  "Piletina s batatom i brokulom": "Piletina s batatom i brokulom",
  "Piletina s heljdom i povrćem": "Piletina s heljdom i povrćem",
  "Hrskava piletina sa salatom": "Piletina iz air fryera sa salatom",
  "Piletina sa salatom od graha": "Piletina s grah salatom",
  "Mediteranska piletina s povrćem": "Piletina s mediteranskim povrćem",
  "Piletina s pireom i graškom": "Piletina s pire krumpirom i graškom",
  "Piletina s tjesteninom i pestom": "Piletina s tjesteninom i pestom",
  "Piletina sa špinatom i sirom": "Piletina sa zrnatim sirom i špinatom",
  "Tikka masala s rižom": "Piletina tikka masala s rižom",
  "Kremasta riža s piletinom": "Kremasta riža s piletinom",
  "Tortilja s piletinom": "Tortilja s piletinom",
  "Tex-Mex tortilja s piletinom": "Tortilja s piletinom i povrćem",
  "Salata od tjestenine s piletinom": "Tjestenina salata s piletinom",
  "Salata s piletinom i avokadom": "Salata s piletinom i avokadom",
  "Njoki s piletinom i vrhnjem": "Njoki s piletinom i vrhnjem",

  // === RUČAK - JUNETINA ===
  "Junetina s heljdom": "Junetina s heljdom i salatom",
  "Junetina s krumpirom": "Junetina s krumpirom i salatom",
  "Junetina s kuhanim krumpirom": "Junetina s kuhanim krumpirom",
  "Junetina s povrćem": "Junetina s kuhanim povrćem",
  "Juneće pljeskavice s pireom": "Juneće pljeskavice s pire krumpirom",
  "Juneće pljeskavice s restanim krumpirom": "Juneće pljeskavice s restanim krumpirom",
  "Juneći but s rižom": "Juneći but s rižom",
  "Juneći odrezak s pečenim krumpirom": "Juneći odrezak s pečenim krumpirom",
  "Juneći odrezak s brokulom": "Juneći odrezak s brokulom i rajčicama",
  "Sočna junetina s rižom": "Saft od junetine s rižom",
  "Biftek s pireom i gljivama": "Biftek s pire krumpirom i gljivama",
  "Lazanje s mljevenom govedinom": "Lazanje s govedinom",

  // === RUČAK - SVINJETINA ===
  "Svinjski lungić s pečenim krumpirom": "Svinjski lungić s pečenim krumpirom",
  "Svinjski lungić s pireom": "Svinjski lungić s pire krumpirom",

  // === RUČAK - PURETINA ===
  "Pureća prsa s gljivama": "Pureća prsa s gljivama i pireom",
  "Pureća prsa s krekerima": "Pureća prsa s krekerima i krastavcima",
  "Pureća prsa s povrćem": "Pureća prsa s kuhanim povrćem",
  "Pureća prsa s mladim krumpirom": "Pureća prsa s mladim krumpirom",
  "Pureće okruglice u umaku s rižom": "Pureće okruglice u rajčici s rižom",
  "Pureće okruglice s tjesteninom": "Pureće okruglice u rajčici s tjesteninom",

  // === RUČAK - RIBA ===
  "Losos s rižom": "Losos s rižom",
  "Losos s krumpirom i brokulom": "Losos s krumpirom i brokulom",
  "Losos s krumpirom i salatom": "Losos s krumpirom i salatom",
  "Losos s kvinojom i šparogama": "Losos s kvinojom i šparogama",
  "Losos s heljdom i povrćem": "Losos s heljdom i povrćem",
  "Losos na tostu sa salatom": "Losos s tostom i salatom",
  "Riža s lososom": "Riža s lososom",
  "Tjestenina s lososom": "Tjestenina s lososom i rajčicom",
  "Pesto tjestenina s lososom": "Tjestenina s pestom i lososom",
  "Brancin s krumpirom": "Brancin s krumpirom",
  "Pečeni brancin s krumpirom": "Pečeni brancin s mladim krumpirom",
  "Pečena orada s krumpirom": "Orada iz pećnice s krumpirom",
  "Orada na tavi s krumpirom": "Orada na tavi s krumpirom",
  "Orada s batatom": "Pečena orada s batatom",
  "Oslić s gratiniranim krumpirom": "Oslić s gratiniranim krumpirom",
  "Oslić s krumpir salatom": "Oslić s krumpir salatom",
  "Oslić u foliji s povrćem": "Oslić u foliji s povrćem",
  "Pastrva s češnjak krumpirom": "Pastrva s krumpirom i češnjakom",
  "Pastrva s kuhanim krumpirom": "Pastrva s kuhanim krumpirom",
  "Lignje s krumpirom": "Lignje s krumpirom",
  "Šaran s krumpir salatom": "Šaran s krumpir salatom",

  // === RUČAK - TUNA ===
  "Tuna s grahom": "Tuna s grahom i rajčicama",
  "Tuna s krekerima i povrćem": "Tuna s rižinim krekerima i povrćem",
  "Tuna s rižinim krekerima": "Tuna s rižinim krekerima",
  "Mediteranska tuna salata": "Tuna salata s krekerima",
  "Tuna salata s jajima": "Tuna salata s kuhanim jajima",
  "Tortilja s tunom": "Tortilja s tunom i salatom",
  "Bolonjez od tune": "Tjestenina bolonjez s tunom",
  "Tjestenina salata s tunom": "Tjestenina salata s tunom",
  "Pesto tjestenina s tunom": "Tjestenina s pestom i tunom",
  "Tjestenina s tunom": "Tjestenina s tunom",

  // === RUČAK - TJESTENINA ===
  "Pesto tjestenina s piletinom": "Tjestenina s pestom i piletinom",
  "Tjestenina s rajčicom i piletinom": "Tjestenina s rajčicom i piletinom",
  "Light carbonara": "Tjestenina carbonara light",

  // === RUČAK - TRADICIONALNO ===
  "Gulaš s pireom": "Gulaš s pire krumpirom",
  "Gulaš s tjesteninom": "Gulaš s tjesteninom",
  "Gulaš s krumpirom": "Gulaš s krumpirom",
  "Pašticada s njokima": "Pašticada s njokima",
  "Pašticada s pireom": "Pašticada s pire krumpirom",
  "Grah s mesom": "Grah s mesom",
  "Grah varivo": "Grah varivo",
  "Maneštra": "Maneštra",

  // === RUČAK - OSTALO ===
  "Azijska riža s povrćem": "Riža s povrćem na azijski način",
  "Rižoto s grahom i kukuruzom": "Rižoto s grahom i kukuruzom",
  "Pire s umakom i povrćem": "Pire krumpir s umakom i povrćem",
  "Zapečeni krumpir sa sirom": "Pečeni krumpir sa sirom i vrhnjem",
  "Pečeni krumpir s cottage sirom": "Pečeni krumpir sa zrnatim sirom",
  "Zdrava pizza alternativa": "Zdrava pizza alternativa",
  "Slane palačinke": "Palačinke za večeru",

  // === MEĐUOBROK / SNACK ===
  "Mix orašastih plodova": "Mix orašastih plodova",
  "Skyr s bananom": "Skyr s bananom",
  "Skyr s borovnicama": "Skyr s borovnicama",
  "Proteinski skyr s voćem": "Skyr s voćem i bademima",
  "Proteinski jogurt s voćem": "Grčki jogurt s voćem",
  "Grčki jogurt s voćem i bademima": "Grčki jogurt s voćem i bademima",
  "Proteinski jogurt shake": "Whey s grčkim jogurtom",
  "Toast s kikiriki maslacem i bananom": "Tost s kikiriki maslacem i bananom",
  "Rižini kolačići s kikirikijem": "Rižini kolačići s kikiriki maslacem",
  "Krekeri s avokadom": "Rižini krekeri s avokadom",
  "PB&J sendvič": "Sendvič s kikirikijem i džemom",
  "Cottage sir s paprikom": "Zrnati sir s paprikom",
  "Cottage sir s rajčicama": "Zrnati sir s rajčicama",
  "Piletina s krekerima i sirom": "Pileća prsa s krekerima i sirom",
  "Puretina s jogurtom i povrćem": "Pureća prsa s jogurtom i povrćem",

  // === DESERTI / ZDRAVI SLATKIŠI ===
  "Proteinski banana bread": "Banana bread s wheyem",
  "Proteinski brownie": "Brownie s wheyem",
  "Proteinski cheesecake": "Cheesecake s wheyem i voćem",
  "Proteinski muffini": "Muffini s wheyem",
};

// Učitaj meal_components.json
const filePath = path.join(__dirname, '../lib/data/meal_components.json');
let content = fs.readFileSync(filePath, 'utf8');
let data = JSON.parse(content);

let changedCount = 0;

// Rekurzivno prođi kroz sve kategorije
function processCategory(items) {
  if (!Array.isArray(items)) return;
  
  for (const item of items) {
    if (item.name && nameMap[item.name]) {
      console.log(`✅ "${item.name}" → "${nameMap[item.name]}"`);
      item.name = nameMap[item.name];
      changedCount++;
    }
  }
}

// Procesiraj sve kategorije
if (data.breakfast) processCategory(data.breakfast);
if (data.lunch) processCategory(data.lunch);
if (data.dinner) processCategory(data.dinner);
if (data.snack) processCategory(data.snack);

// Spremi ažuriranu datoteku
fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');

console.log(`\n✅ Ukupno promijenjeno: ${changedCount} naziva jela`);

// Kopiraj u mobile folder
const mobilePath = path.join(__dirname, '../mobile/src/data/meal_components.json');
fs.writeFileSync(mobilePath, JSON.stringify(data, null, 2), 'utf8');
console.log('✅ Kopirano u mobile/src/data/meal_components.json');


