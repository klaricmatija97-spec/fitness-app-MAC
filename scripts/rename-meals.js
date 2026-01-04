/**
 * Skripta za preimenovanje jela u ljepše nazive
 */

const fs = require('fs');
const path = require('path');

// Mapa starih -> novih naziva
const nameMap = {
  // === SMOOTHIE-JI ===
  "Banana + borovnice + whey + mlijeko 1.2% smoothie": "Proteinski smoothie s borovnicama",
  "Banana + borovnice + whey + voda smoothie (međuobrok)": "Lagani smoothie s borovnicama",
  "Banana + jabuka + whey + mlijeko 1.2% smoothie": "Proteinski smoothie s jabukom",
  "Banana + jabuka + whey + voda smoothie (međuobrok)": "Lagani smoothie s jabukom",
  "Banana + jagode + whey + mlijeko 1.2% smoothie": "Proteinski smoothie s jagodama",
  "Banana + jagode + whey + voda smoothie (međuobrok)": "Lagani smoothie s jagodama",
  "Banana + malo voća (2-3 komada) + whey + voda smoothie (međuobrok)": "Lagani voćni smoothie",
  "Banana + mix voća + whey + mlijeko 1.2% smoothie": "Proteinski smoothie s miješanim voćem",
  "Banana + whey + mlijeko 1.2% smoothie": "Klasični proteinski smoothie",
  "Banana + whey + voda smoothie (međuobrok)": "Lagani proteinski shake",
  "Banana + šumsko voće + whey + mlijeko 1.2% smoothie": "Proteinski smoothie sa šumskim voćem",
  "Banana + šumsko voće + whey + voda smoothie (međuobrok)": "Lagani smoothie sa šumskim voćem",

  // === DORUČAK - JAJA ===
  "Jaja + bjelanjci + pileci dimcek Cekin + rižini krekeri + mlijeko 1.2%": "Proteinski doručak s piletinom i krekerima",
  "Jaja + bjelanjci + pršut + rižini krekeri + mlijeko 1.2%": "Proteinski doručak s pršutom i krekerima",
  "Jaja + bjelanjci + pileci dimcek Cekin + ABC sir + tost + mlijeko 1.2%": "Proteinski doručak s piletinom i sirom",
  "Jaja + bjelanjci + pršut + zrnati sir + tost + mlijeko 1.2%": "Proteinski doručak s pršutom i zrnatim sirom",
  "Jaja + bjelanjci + pileci dimcek Cekin + zrnati sir + tost + mlijeko 1.2%": "Proteinski doručak s piletinom i zrnatim sirom",
  "Jaja + bjelanjci + pršut + ABC sir + tost + mlijeko 1.2%": "Proteinski doručak s pršutom i ABC sirom",
  "Jaja (cijela) + zobene + banana + borovnice + mlijeko 1.2%": "Energetski doručak s jajima i zobenima",
  "Jaja (na oko / po želji) + avokado + tost + mlijeko": "Jaja s avokadom na tostu",
  "Jaja + bjelanjci + zobene + banana + Ledo šumsko voće + mlijeko 1.2%": "Proteinski doručak sa zobenima i šumskim voćem",
  "Jaja + bjelanjci + zobene + banana + ribana jabuka + cimet + mlijeko 1.2%": "Proteinski doručak sa zobenima i jabukom",

  // === DORUČAK - OMLET ===
  "Omlet + pileci dimcek Cekin + tost + mlijeko 1.2%": "Omlet s piletinom na tostu",
  "Omlet + pileci dimcek Cekin + posni sir (hladan) + tost + mlijeko 1.2%": "Omlet s piletinom i posnim sirom",
  "Omlet + pileci dimcek Cekin + zrnati sir (hladan) + tost + mlijeko 1.2%": "Omlet s piletinom i zrnatim sirom",
  "Omlet + pršut + tost + mlijeko 3.2%": "Omlet s pršutom na tostu",
  "Omlet + pršut + mozzarella (hladna na tostu) + tost + mlijeko 3.2%": "Omlet s pršutom i mozzarellom",
  "Omlet + pršut + Gouda sir (topli) + tost + mlijeko 3.2%": "Omlet s pršutom i Gouda sirom",
  "Omlet + zobene + banana + maline + mlijeko 1.2%": "Slatki omlet sa zobenima i malinama",
  "Omlet + pileci dimcek Cekin + zobene + banana + borovnice + mlijeko 1.2%": "Proteinski omlet sa zobenima i voćem",

  // === DORUČAK - KAJGANA ===
  "Kajgana (cijela jaja + malo mlijeka u jajima) + pileci dimcek Cekin + tost": "Kajgana s piletinom na tostu",

  // === DORUČAK - SENDVIČI ===
  "Topli tost sendvič + pileci dimcek Cekin + Gouda sir + mlijeko 1.2%": "Topli sendvič s piletinom i sirom",
  "Tost sendvič + pileci dimcek Cekin + posni sir + rajčica ili zelena salata + mlijeko 1.2%": "Sendvič s piletinom i salatom",
  "Topli tost sendvič + pršut + Gouda sir + mlijeko 3.2%": "Topli sendvič s pršutom i sirom",
  "Topli tost sendvič + pršut + mozzarella + rajčica + pesto + mlijeko 3.2%": "Mediteranski sendvič s pršutom",
  "Topli tost sendvič + pileci dimcek Cekin + ABC namaz + pesto + zelena salata + mlijeko 3.2%": "Sendvič s piletinom i pestom",
  "Tost sendvič (pileci dimcek Cekin + posni sir + salata) + chia puding + banana + borovnice": "Doručak sendvič s chia pudingom",
  "Tost sendvič (pileci dimcek Cekin + ABC namaz + salata) + chia puding + banana + Ledo šumsko voće": "Energetski sendvič s chia pudingom",
  "Tost sendvič (pileci dimcek Cekin + posni sir) + grčki jogurt Spar + banana + ribana jabuka + cimet": "Sendvič s jogurtom i voćem",
  "Tost sendvič (pileci dimcek Cekin + Gouda sir) + grčki jogurt Spar + banana + Ledo šumsko voće": "Bogati doručak s jogurtom i voćem",
  "Tost sendvič (pršut + mozzarella + pesto) + chia puding + banana + kakao": "Talijanski doručak s chia pudingom",

  // === DORUČAK - KREKERI ===
  "Rižini krekeri + posni sir + pileci dimcek Cekin + mlijeko 1.2%": "Lagani doručak s krekerima i piletinom",
  "Rižini krekeri + pršut + posni sir + mlijeko 1.2%": "Lagani doručak s krekerima i pršutom",

  // === DORUČAK - ZOBENE ===
  "Zobene + banana + ribana jabuka + cimet + whey + mlijeko 1.2%": "Proteinske zobene s jabukom i cimetom",
  "Zobene + banana + ribana jabuka + cimet + whey + mlijeko 3.2%": "Energetske zobene s jabukom i cimetom",
  "Zobene + banana + borovnice + whey + mlijeko 1.2%": "Proteinske zobene s borovnicama",
  "Zobene + banana + Ledo šumsko voće + whey + mlijeko 1.2%": "Proteinske zobene sa šumskim voćem",
  "Zobena kaša s bananom (brza)": "Brza zobena kaša s bananom",

  // === DORUČAK - OSTALO ===
  "Chia puding (Kim Kardashian stil) + banana + borovnice + whey + mlijeko 1.2%": "Proteinski chia puding s voćem",
  "Proteinski griz + banana + whey + mlijeko 1.2%": "Proteinski griz s bananom",
  "Čokolino whey Podravka + banana + mlijeko 3.2% u nastavku smoothie": "Čokolino proteinski doručak",
  "Proteinske palačinke s bananom": "Proteinske palačinke",
  "Proteinske palačinke s bananom i voćem": "Proteinske palačinke s voćem",

  // === RUČAK - PILETINA ===
  "pileca prsa Cekin + riža": "Pileća prsa s rižom",
  "pileca prsa Cekin + pire krumpir": "Pileća prsa s pireom",
  "pileca prsa Cekin + restani krumpir": "Pileća prsa s restanim krumpirom",
  "pileca prsa Cekin + zaprženi grah s lukom": "Pileća prsa s grahom",
  "pileca prsa Cekin + krumpir salata": "Pileća prsa s krumpir salatom",
  "pileca prsa Cekin + pečeni šampinjoni": "Pileća prsa s gljivama",
  "pileca prsa Cekin + povrće (brokula, mrkva, miješano)": "Pileća prsa s povrćem",
  "Piletina + batat + brokula": "Piletina s batatom i brokulom",
  "Piletina + heljda + povrće": "Piletina s heljdom i povrćem",
  "Piletina iz air fryera sa salatom": "Hrskava piletina sa salatom",
  "Piletina s grah salatom": "Piletina sa salatom od graha",
  "Piletina s mediteranskim povrćem": "Mediteranska piletina s povrćem",
  "Piletina s pire krumpirom i graškom": "Piletina s pireom i graškom",
  "Piletina s tjesteninom i pestom": "Piletina s tjesteninom i pestom",
  "Piletina sa zrnatim sirom i špinatom": "Piletina sa špinatom i sirom",
  "Piletina tikka masala s rižom": "Tikka masala s rižom",
  "Kremasta riža s piletinom": "Kremasta riža s piletinom",
  "Tortilja s piletinom": "Tortilja s piletinom",
  "Tortilja s piletinom i tex-mex povrćem": "Tex-Mex tortilja s piletinom",
  "Hladna salata od tjestenine i piletine": "Salata od tjestenine s piletinom",
  "Salata s piletinom i avokadom": "Salata s piletinom i avokadom",
  "Gnocchi s vrhnjem i piletinom": "Njoki s piletinom i vrhnjem",

  // === RUČAK - JUNETINA ===
  "Junetina + heljda + salata": "Junetina s heljdom",
  "Junetina s krumpirom i salatom": "Junetina s krumpirom",
  "Junetina s kuhanim krumpirom i salatom": "Junetina s kuhanim krumpirom",
  "Junetina s kuhanim povrćem": "Junetina s povrćem",
  "Juneće pljeskavice + pire krumpir": "Juneće pljeskavice s pireom",
  "Juneće pljeskavice + restani krumpir": "Juneće pljeskavice s restanim krumpirom",
  "Juneći but + riža": "Juneći but s rižom",
  "Juneći odrezak (ramstek) + pečeni krumpir": "Juneći odrezak s pečenim krumpirom",
  "Juneći odrezak s brokulom i rajčicama": "Juneći odrezak s brokulom",
  "Saft od junetine s rižom": "Sočna junetina s rižom",
  "Biftek s pireom i gljivama": "Biftek s pireom i gljivama",
  "Lazanje s govedinom": "Lazanje s mljevenom govedinom",

  // === RUČAK - SVINJETINA ===
  "Svinjski lungić + pečeni krumpir": "Svinjski lungić s pečenim krumpirom",
  "Svinjski lungić + pire krumpir": "Svinjski lungić s pireom",

  // === RUČAK - PURETINA ===
  "Pureća prsa s gljivama i pireom": "Pureća prsa s gljivama",
  "Pureća prsa s krastavcima i krekerima": "Pureća prsa s krekerima",
  "Pureća prsa s kuhanim povrćem": "Pureća prsa s povrćem",
  "Pureća prsa s mladim krumpirom": "Pureća prsa s mladim krumpirom",
  "Mesne okruglice (puretina) u rajčici + riža": "Pureće okruglice u umaku s rižom",
  "Mesne okruglice (puretina) u rajčici + tjestenina": "Pureće okruglice s tjesteninom",

  // === RUČAK - RIBA ===
  "Losos filet + riža": "Losos s rižom",
  "Losos s kuhanim krumpirom i brokulom": "Losos s krumpirom i brokulom",
  "Losos s kuhanim krumpirom i salatom": "Losos s krumpirom i salatom",
  "Losos s kvinojom i šparogama": "Losos s kvinojom i šparogama",
  "Losos s povrćem i heljdom": "Losos s heljdom i povrćem",
  "Losos s tostom i salatom": "Losos na tostu sa salatom",
  "Riža s malo lososa": "Riža s lososom",
  "Tjestenina s lososom, rajčicom i maslinama": "Tjestenina s lososom",
  "Tjestenina s pestom + losos": "Pesto tjestenina s lososom",
  "Brancin + krumpir": "Brancin s krumpirom",
  "Pečeni brancin s mladim krumpirom": "Pečeni brancin s krumpirom",
  "Orada (pećnica) + krumpir": "Pečena orada s krumpirom",
  "Orada (tava) + krumpir": "Orada na tavi s krumpirom",
  "Pečena orada s batatom": "Orada s batatom",
  "Oslić + gratinirani krumpir": "Oslić s gratiniranim krumpirom",
  "Oslić + krumpir salata": "Oslić s krumpir salatom",
  "Oslić u foliji s povrćem": "Oslić u foliji s povrćem",
  "Pastrva + krumpir s češnjakom": "Pastrva s češnjak krumpirom",
  "Pastrva + kuhani krumpir": "Pastrva s kuhanim krumpirom",
  "Lignje + krumpir": "Lignje s krumpirom",
  "Šaran + krumpir salata": "Šaran s krumpir salatom",

  // === RUČAK - TUNA ===
  "Tuna s grahom i rajčicama": "Tuna s grahom",
  "Tuna s rižinim krekerima i kuhanim povrćem": "Tuna s krekerima i povrćem",
  "Tuna s rižinim krekerima": "Tuna s rižinim krekerima",
  "Tuna salata (mediteranska, tuna Eva Podravka) + rižini krekeri ili tost": "Mediteranska tuna salata",
  "Tuna salata s kuhanim jajima": "Tuna salata s jajima",
  "Tortilja s tunom (tuna Eva Podravka, masline, zelena salata u tortilji)": "Tortilja s tunom",
  "Tjestenina s tunom (bolonjez od tune – tuna Eva Podravka)": "Bolonjez od tune",
  "Tjestenina salata s tunom (tuna Eva Podravka, vrhnje, krastavci, masline, kukuruz)": "Tjestenina salata s tunom",
  "Pesto tjestenina s tunom": "Pesto tjestenina s tunom",
  "Ostatak tjestenine s tunom": "Tjestenina s tunom",

  // === RUČAK - TJESTENINA ===
  "Tjestenina s pestom + piletina": "Pesto tjestenina s piletinom",
  "Tjestenina s rajčicom + piletina": "Tjestenina s rajčicom i piletinom",
  "Tjestenina carbonara light": "Light carbonara",

  // === RUČAK - TRADICIONALNO ===
  "Gulaš + pire krumpir": "Gulaš s pireom",
  "Gulaš + tjestenina": "Gulaš s tjesteninom",
  "Gulaš s krumpirom": "Gulaš s krumpirom",
  "Pašticada + njoki": "Pašticada s njokima",
  "Pašticada + pire krumpir": "Pašticada s pireom",
  "Pašticada s njokima": "Pašticada s njokima",
  "Grah s mesom (varivo)": "Grah s mesom",
  "Grah bez mesa": "Grah varivo",
  "Manestra": "Maneštra",

  // === RUČAK - OSTALO ===
  "Riža s povrćem na azijski način": "Azijska riža s povrćem",
  "Rižoto s grahom i kukuruzom": "Rižoto s grahom i kukuruzom",
  "Krumpir pire s umakom i povrćem": "Pire s umakom i povrćem",
  "Pečeni krumpir sa sirom i vrhnjem": "Zapečeni krumpir sa sirom",
  "Pečeni krumpir sa zrnatim sirom": "Pečeni krumpir s cottage sirom",
  "Pizza alternativa": "Zdrava pizza alternativa",
  "Palačinke večera": "Slane palačinke",

  // === MEĐUOBROK / SNACK ===
  "Mix orašastih plodova": "Mix orašastih plodova",
  "Skyr s bananom": "Skyr s bananom",
  "Skyr s borovnicama": "Skyr s borovnicama",
  "Skyr s proteinima, voćem i bademima": "Proteinski skyr s voćem",
  "Grčki jogurt s proteinima i voćem": "Proteinski jogurt s voćem",
  "Grčki jogurt s voćem i bademima": "Grčki jogurt s voćem i bademima",
  "Whey s grčkim jogurtom": "Proteinski jogurt shake",
  "Kikiriki maslac s tostom i bananom": "Toast s kikiriki maslacem i bananom",
  "Rižini kolačići s kikiriki maslacem i bananom": "Rižini kolačići s kikirikijem",
  "Rižini krekersi s avokadom": "Krekeri s avokadom",
  "Sendvič s kikirikijem i džemom": "PB&J sendvič",
  "Zrnati sir s paprikom": "Cottage sir s paprikom",
  "Zrnati sir s rajčicama": "Cottage sir s rajčicama",
  "Pileća salama s krekerima i posnim sirom": "Piletina s krekerima i sirom",
  "Pureća salama s grčkim jogurtom i povrćem": "Puretina s jogurtom i povrćem",

  // === DESERTI / ZDRAVI SLATKIŠI ===
  "Banana bread u sportskoj verziji": "Proteinski banana bread",
  "Zdravi proteinski brownie": "Proteinski brownie",
  "Zdravi proteinski cheesecake": "Proteinski cheesecake",
  "Zdravi proteinski muffini": "Proteinski muffini",
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


