/**
 * Skripta za automatsko popravljanje svih recepata u meal_components.json
 * 
 * Popravlja:
 * 1. Uklanja ponavljajuće savjete (💡 SAVJETI...)
 * 2. Ispravlja numeraciju koraka (1,2,3,5,7,9 -> 1,2,3,4,5,6)
 * 3. Skraćuje opise i usklađuje ih s ciljem
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../lib/data/meal_components.json');
const content = fs.readFileSync(filePath, 'utf8');
const data = JSON.parse(content);

let fixedCount = 0;
let tipsRemovedCount = 0;
let numerationFixedCount = 0;

// Kraći opisi po tipu jela
const SHORT_DESCRIPTIONS = {
  // Doručak - jaja
  eggs_lose: "Proteinski doručak s jajima - idealno za održavanje mišićne mase uz deficit kalorija.",
  eggs_maintain: "Uravnotežen doručak s jajima - savršen balans proteina i ugljikohidrata za energičan dan.",
  eggs_gain: "Kalorijski bogat doručak s jajima - odličan za dobivanje mišićne mase.",
  
  // Doručak - omlet
  omelet: "Proteinski omlet - brz i hranjiv doručak bogat proteinima.",
  
  // Doručak - sendvič/tost
  sandwich_lose: "Lagan i hranjiv sendvič - savršen za početak dana uz kontrolu kalorija.",
  sandwich_maintain: "Uravnotežen sendvič - dobar izvor proteina i složenih ugljikohidrata.",
  sandwich_gain: "Bogat sendvič - odličan za unos kalorija i proteina za rast mišića.",
  
  // Doručak - zobene
  oatmeal: "Proteinske zobene s voćem - zdrav doručak bogat vlaknima i proteinima.",
  
  // Doručak - smoothie
  smoothie: "Osvježavajući proteinski smoothie - brz i ukusan način za unos proteina.",
  
  // Doručak - palačinke
  pancakes: "Proteinske palačinke - slatki doručak s dodatkom proteina.",
  
  // Ručak/Večera - piletina
  chicken_rice: "Klasična kombinacija piletine i riže - odličan izvor proteina i ugljikohidrata.",
  chicken_potato: "Pileća prsa s krumpirom - hranjiv obrok za oporavak nakon treninga.",
  chicken_pasta: "Piletina s tjesteninom - energetski bogat obrok idealan za aktivne dane.",
  chicken_salad: "Salata s piletinom - lagan i osvježavajući obrok bogat proteinima.",
  
  // Ručak/Večera - junetina
  beef: "Sočna junetina - izvrstan izvor željeza i kvalitetnih proteina.",
  beef_steak: "Juneći odrezak - premium izvor proteina za ljubitelje mesa.",
  
  // Ručak/Večera - riba
  fish_general: "Zdrav riblji obrok - bogat omega-3 masnim kiselinama i proteinima.",
  salmon: "Losos s prilogom - odličan izvor omega-3 masnih kiselina i proteina.",
  tuna: "Obrok s tunom - visok protein uz niske kalorije.",
  
  // Ručak/Večera - tjestenina
  pasta_general: "Tjestenina s proteinima - energetski bogat obrok za aktivne dane.",
  
  // Ručak/Večera - tradicionalno
  traditional: "Tradicionalno jelo - domaći okus uz optimalan unos nutrijenata.",
  
  // Užina/Snack
  snack_protein: "Proteinska užina - idealno za održavanje razine proteina između obroka.",
  snack_fruit: "Voćna užina s proteinima - zdravi šećeri i proteini za energiju.",
  snack_nuts: "Energetska užina - zdrave masti i proteini za dugotrajnu sitost.",
};

/**
 * Ukloni ponavljajuće savjete iz preparationTip
 */
function removeTips(tip) {
  if (!tip) return tip;
  
  // Ukloni sve varijante savjeta
  const patterns = [
    /\n\n💡 SAVJETI:[\s\S]*$/,
    /\n\n\n💡 SAVJETI:[\s\S]*$/,
    /💡 SAVJETI:[\s\S]*$/,
    /\n\nVAŽNO: Koristi sprej ulje[\s\S]*$/,
  ];
  
  let cleaned = tip;
  for (const pattern of patterns) {
    cleaned = cleaned.replace(pattern, '');
  }
  
  // Ukloni "VAŽNO:" korake ako su o sprej ulju
  cleaned = cleaned.replace(/\n\n\d+\. VAŽNO: Koristi sprej ulje[^\n]*/g, '');
  
  // Ukloni prazne korake o mlijeku ako nisu relevantni
  cleaned = cleaned.replace(/\n\n\d+\. Mlijeko popij uz doručak[^\n]*/g, '');
  
  return cleaned.trim();
}

/**
 * Ispravi numeraciju koraka u preparationTip
 */
function fixNumeration(tip) {
  if (!tip) return tip;
  
  // Pronađi sve korake
  const lines = tip.split('\n\n');
  let stepNumber = 1;
  
  const fixedLines = lines.map(line => {
    // Provjeri da li linija počinje s brojem i točkom
    const match = line.match(/^(\d+)\.\s/);
    if (match) {
      // Zamijeni s ispravnim brojem
      const fixed = line.replace(/^\d+\.\s/, `${stepNumber}. `);
      stepNumber++;
      return fixed;
    }
    return line;
  });
  
  return fixedLines.join('\n\n');
}

/**
 * Generiraj kratak opis za jelo
 */
function generateShortDescription(meal, mealType) {
  const name = meal.name.toLowerCase();
  const suitableFor = meal.suitableFor || [];
  const isLose = suitableFor.includes('lose');
  const isGain = suitableFor.includes('gain');
  
  // Doručak
  if (mealType === 'breakfast') {
    if (name.includes('jaja') || name.includes('omlet') || name.includes('kajgana')) {
      if (name.includes('omlet')) return SHORT_DESCRIPTIONS.omelet;
      if (isLose) return SHORT_DESCRIPTIONS.eggs_lose;
      if (isGain) return SHORT_DESCRIPTIONS.eggs_gain;
      return SHORT_DESCRIPTIONS.eggs_maintain;
    }
    if (name.includes('tost') || name.includes('sendvič') || name.includes('krekeri')) {
      if (isLose) return SHORT_DESCRIPTIONS.sandwich_lose;
      if (isGain) return SHORT_DESCRIPTIONS.sandwich_gain;
      return SHORT_DESCRIPTIONS.sandwich_maintain;
    }
    if (name.includes('zobene') || name.includes('kaša')) {
      return SHORT_DESCRIPTIONS.oatmeal;
    }
    if (name.includes('smoothie') || name.includes('shake')) {
      return SHORT_DESCRIPTIONS.smoothie;
    }
    if (name.includes('palačinke')) {
      return SHORT_DESCRIPTIONS.pancakes;
    }
  }
  
  // Ručak/Večera
  if (mealType === 'lunch' || mealType === 'dinner') {
    if (name.includes('pilet') || name.includes('pureć')) {
      if (name.includes('riž')) return SHORT_DESCRIPTIONS.chicken_rice;
      if (name.includes('krumpir') || name.includes('pire')) return SHORT_DESCRIPTIONS.chicken_potato;
      if (name.includes('tjestenin') || name.includes('pasta')) return SHORT_DESCRIPTIONS.chicken_pasta;
      if (name.includes('salat')) return SHORT_DESCRIPTIONS.chicken_salad;
      return SHORT_DESCRIPTIONS.chicken_rice;
    }
    if (name.includes('junet') || name.includes('govedina') || name.includes('biftek')) {
      if (name.includes('odrezak') || name.includes('biftek')) return SHORT_DESCRIPTIONS.beef_steak;
      return SHORT_DESCRIPTIONS.beef;
    }
    if (name.includes('losos') || name.includes('salmon')) {
      return SHORT_DESCRIPTIONS.salmon;
    }
    if (name.includes('tuna')) {
      return SHORT_DESCRIPTIONS.tuna;
    }
    if (name.includes('riba') || name.includes('oslić') || name.includes('brancin') || name.includes('orada') || name.includes('šaran') || name.includes('pastrva')) {
      return SHORT_DESCRIPTIONS.fish_general;
    }
    if (name.includes('tjestenin') || name.includes('pasta') || name.includes('carbonara') || name.includes('bolonjez')) {
      return SHORT_DESCRIPTIONS.pasta_general;
    }
    if (name.includes('gulaš') || name.includes('pašticada') || name.includes('grah') || name.includes('maneštra')) {
      return SHORT_DESCRIPTIONS.traditional;
    }
  }
  
  // Užina
  if (mealType === 'snack') {
    if (name.includes('jogurt') || name.includes('skyr') || name.includes('whey') || name.includes('protein')) {
      return SHORT_DESCRIPTIONS.snack_protein;
    }
    if (name.includes('voće') || name.includes('banana') || name.includes('jabuk')) {
      return SHORT_DESCRIPTIONS.snack_fruit;
    }
    if (name.includes('orašast') || name.includes('badem') || name.includes('orah') || name.includes('kikiriki')) {
      return SHORT_DESCRIPTIONS.snack_nuts;
    }
    return SHORT_DESCRIPTIONS.snack_protein;
  }
  
  return null; // Ne mijenjaj ako ne možemo odrediti
}

// Procesiraj sve kategorije
const categories = ['breakfast', 'lunch', 'dinner', 'snack'];

for (const category of categories) {
  if (!data[category]) continue;
  
  for (const meal of data[category]) {
    let changed = false;
    
    // 1. Ukloni ponavljajuće savjete
    if (meal.preparationTip) {
      const originalTip = meal.preparationTip;
      const cleanedTip = removeTips(meal.preparationTip);
      if (cleanedTip !== originalTip) {
        meal.preparationTip = cleanedTip;
        tipsRemovedCount++;
        changed = true;
      }
    }
    
    // 2. Ispravi numeraciju koraka
    if (meal.preparationTip) {
      const originalTip = meal.preparationTip;
      const fixedTip = fixNumeration(meal.preparationTip);
      if (fixedTip !== originalTip) {
        meal.preparationTip = fixedTip;
        numerationFixedCount++;
        changed = true;
      }
    }
    
    // 3. Skrati opis ako je predugačak (> 200 znakova)
    if (meal.description && meal.description.length > 200) {
      const shortDesc = generateShortDescription(meal, category);
      if (shortDesc) {
        meal.description = shortDesc;
        changed = true;
      }
    }
    
    if (changed) {
      fixedCount++;
    }
  }
}

// Spremi ažuriranu datoteku
fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');

console.log(`\n✅ Popravljeno ${fixedCount} recepata`);
console.log(`   - Uklonjeni savjeti: ${tipsRemovedCount}`);
console.log(`   - Ispravljena numeracija: ${numerationFixedCount}`);

// Kopiraj u mobile folder
const mobilePath = path.join(__dirname, '../mobile/src/data/meal_components.json');
fs.writeFileSync(mobilePath, JSON.stringify(data, null, 2), 'utf8');
console.log('✅ Kopirano u mobile/src/data/meal_components.json');

