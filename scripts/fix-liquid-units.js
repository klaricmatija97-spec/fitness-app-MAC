const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../lib/data/meal_components.json');
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
let fixedCount = 0;

// Funkcija za pretvorbu grama u ml/dcl
function gramsToVolume(grams) {
  // Za tekućine: 1g ≈ 1ml
  if (grams >= 100) {
    const dcl = grams / 100;
    if (dcl === Math.floor(dcl)) {
      return `${dcl} dcl`;
    } else {
      return `${grams} ml`;
    }
  }
  return `${grams} ml`;
}

// Lista tekućih namirnica
const liquidFoods = [
  'milk', 'mlijeko',
  'egg white', 'egg_white', 'bjelanjci', 'bjelanjak',
  'water', 'voda',
  'greek yogurt', 'greek_yogurt', 'jogurt',
  'skyr'
];

function isLiquid(food, displayName) {
  const lower = (food || '').toLowerCase();
  const displayLower = (displayName || '').toLowerCase();
  
  // Mlijeko
  if (lower.includes('milk') || displayLower.includes('mlijeko')) {
    return true;
  }
  
  // Bjelanjci (ako nisu već u komadima)
  if ((lower.includes('egg_white') || lower.includes('egg white')) && 
      !displayLower.includes('kom')) {
    return true;
  }
  
  return false;
}

mealTypes.forEach(type => {
  if (!data[type]) return;
  
  data[type].forEach(meal => {
    meal.components?.forEach(comp => {
      const food = comp.food || '';
      const displayName = comp.displayName || '';
      const grams = comp.grams || 0;
      
      // Provjeri je li tekućina i treba li ažurirati
      if (isLiquid(food, displayName)) {
        const volume = gramsToVolume(grams);
        
        // Mlijeko
        if (displayName.toLowerCase().includes('mlijeko')) {
          // Zadrži postotak masti ako postoji
          const fatMatch = displayName.match(/(\d+\.?\d*%)/);
          const fatPercent = fatMatch ? ` ${fatMatch[1]}` : '';
          
          // Ako već ima "u jajima" ili slično, samo dodaj volumen
          if (displayName.includes('(')) {
            const newDisplay = displayName.replace(/\(([^)]+)\)/, `(${volume})`);
            if (newDisplay !== displayName) {
              comp.displayName = newDisplay;
              fixedCount++;
              console.log(`  "${displayName}" → "${comp.displayName}"`);
            }
          } else {
            comp.displayName = `Mlijeko${fatPercent} (${volume})`;
            fixedCount++;
            console.log(`  "${displayName}" → "${comp.displayName}"`);
          }
        }
      }
    });
  });
});

// Save the file
fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

console.log(`\n✅ Popravljeno ${fixedCount} prikaza tekućina\n`);

// Copy to mobile
const mobilePath = path.join(__dirname, '../mobile/src/data/meal_components.json');
fs.writeFileSync(mobilePath, JSON.stringify(data, null, 2));
console.log('✅ Kopirano u mobile/src/data/meal_components.json');


