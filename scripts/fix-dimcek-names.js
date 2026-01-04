const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../lib/data/meal_components.json');
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
let fixedCount = 0;
const changes = [];

mealTypes.forEach(type => {
  if (!data[type]) return;
  
  data[type].forEach(meal => {
    // Check if meal uses "Pileći dimcek" or "ham_chicken" as ingredient
    const usesDimcek = meal.components?.some(c => 
      c.displayName?.includes('Pileći dimcek') || 
      c.displayName?.includes('pileći dimcek') ||
      c.food?.toLowerCase() === 'ham_chicken' ||
      c.food?.toLowerCase().includes('chicken ham')
    );
    
    // Check if meal uses actual chicken breast (not dimcek)
    const usesChickenBreast = meal.components?.some(c =>
      c.food?.toLowerCase() === 'chicken_breast' ||
      c.food?.toLowerCase() === 'chicken breast' ||
      c.displayName?.toLowerCase().includes('pileća prsa')
    );
    
    if (usesDimcek && !usesChickenBreast) {
      const oldName = meal.name;
      
      // Replace "piletinom" with "dimcekom" or "pileći dimcek"
      if (meal.name.includes('s piletinom')) {
        meal.name = meal.name.replace('s piletinom', 's dimcekom');
        changes.push({ old: oldName, new: meal.name });
        fixedCount++;
      } else if (meal.name.includes('piletinom')) {
        meal.name = meal.name.replace('piletinom', 'dimcekom');
        changes.push({ old: oldName, new: meal.name });
        fixedCount++;
      }
    }
  });
});

// Save the file
fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

console.log(`\n✅ Popravljeno ${fixedCount} naziva jela\n`);
console.log('Promjene:');
changes.forEach(c => {
  console.log(`  "${c.old}" → "${c.new}"`);
});

// Copy to mobile
const mobilePath = path.join(__dirname, '../mobile/src/data/meal_components.json');
fs.writeFileSync(mobilePath, JSON.stringify(data, null, 2));
console.log('\n✅ Kopirano u mobile/src/data/meal_components.json');


