/**
 * Skripta za ažuriranje foods-database.ts s USDA podacima
 * 
 * Koristi CSV datoteke iz /data/usda/
 */

import * as fs from 'fs';
import * as path from 'path';

// Nutrient IDs
const NUTRIENT_IDS = {
  PROTEIN: '1003',
  FAT: '1004', 
  CARBS: '1005',
  CALORIES: '1008',
};

// Mapiranje naših namirnica na USDA fdc_id
// Pronađeno ručno iz foundation_food podataka
const FOOD_TO_USDA: Record<string, { fdc_id: string; name: string }> = {
  'chicken_breast': { fdc_id: '331960', name: 'Chicken, breast, skinless, boneless, cooked' },
  'beef': { fdc_id: '746760', name: 'Beef, ground, 85% lean' },
  'salmon': { fdc_id: '175167', name: 'Salmon, Atlantic, cooked' },
  'tuna': { fdc_id: '175159', name: 'Tuna, light, canned in water' },
  'egg': { fdc_id: '748967', name: 'Egg, whole, cooked' },
  'oats': { fdc_id: '173904', name: 'Oats, regular, dry' },
  'rice': { fdc_id: '746778', name: 'Rice, white, cooked' },
  'pasta': { fdc_id: '746770', name: 'Pasta, cooked' },
  'potato': { fdc_id: '170438', name: 'Potatoes, boiled' },
  'banana': { fdc_id: '173944', name: 'Bananas, raw' },
  'milk': { fdc_id: '746776', name: 'Milk, whole' },
  'greek_yogurt': { fdc_id: '170903', name: 'Yogurt, Greek, plain' },
  'avocado': { fdc_id: '171705', name: 'Avocados, raw' },
  'peanut_butter': { fdc_id: '172470', name: 'Peanut butter' },
  'almonds': { fdc_id: '170567', name: 'Almonds' },
  'olive_oil': { fdc_id: '171413', name: 'Olive oil' },
  'broccoli': { fdc_id: '170379', name: 'Broccoli, cooked' },
  'spinach': { fdc_id: '168462', name: 'Spinach, raw' },
  'sweet_potato': { fdc_id: '168482', name: 'Sweet potato, cooked' },
  'cottage_cheese': { fdc_id: '173417', name: 'Cottage cheese, lowfat' },
  'whey': { fdc_id: '173178', name: 'Whey protein isolate' },
};

interface NutrientData {
  protein: number;
  carbs: number;
  fat: number;
  calories: number;
}

function parseCSV(filePath: string): string[][] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  return lines.map(line => {
    // Simple CSV parsing (handles quoted fields)
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  });
}

function getNutrients(foodNutrientData: string[][], fdcId: string): NutrientData {
  const nutrients: NutrientData = { protein: 0, carbs: 0, fat: 0, calories: 0 };
  
  for (const row of foodNutrientData) {
    if (row[1] === fdcId) {
      const nutrientId = row[2];
      const amount = parseFloat(row[3]) || 0;
      
      switch (nutrientId) {
        case NUTRIENT_IDS.PROTEIN:
          nutrients.protein = Math.round(amount * 10) / 10;
          break;
        case NUTRIENT_IDS.CARBS:
          nutrients.carbs = Math.round(amount * 10) / 10;
          break;
        case NUTRIENT_IDS.FAT:
          nutrients.fat = Math.round(amount * 10) / 10;
          break;
        case NUTRIENT_IDS.CALORIES:
          nutrients.calories = Math.round(amount);
          break;
      }
    }
  }
  
  return nutrients;
}

async function main() {
  const usdaDir = path.join(__dirname, '..', 'data', 'usda');
  
  console.log('📂 Učitavam USDA podatke...');
  
  const foodNutrientPath = path.join(usdaDir, 'food_nutrient.csv');
  const foodNutrientData = parseCSV(foodNutrientPath);
  
  console.log(`✅ Učitano ${foodNutrientData.length} nutrient zapisa\n`);
  
  console.log('🔍 Izvlačim makronutrijente za naše namirnice:\n');
  console.log('| Namirnica | Protein | Carbs | Fat | Calories |');
  console.log('|-----------|---------|-------|-----|----------|');
  
  const results: Record<string, NutrientData> = {};
  
  for (const [foodId, usdaInfo] of Object.entries(FOOD_TO_USDA)) {
    const nutrients = getNutrients(foodNutrientData, usdaInfo.fdc_id);
    results[foodId] = nutrients;
    
    console.log(`| ${foodId.padEnd(15)} | ${nutrients.protein.toString().padStart(6)}g | ${nutrients.carbs.toString().padStart(5)}g | ${nutrients.fat.toString().padStart(3)}g | ${nutrients.calories.toString().padStart(8)} |`);
  }
  
  console.log('\n✅ Gotovo! Kopiraj ove vrijednosti u foods-database.ts');
  
  // Generate TypeScript code
  console.log('\n📝 TypeScript kod za kopiranje:\n');
  
  for (const [foodId, nutrients] of Object.entries(results)) {
    if (nutrients.calories > 0) {
      console.log(`// ${foodId}`);
      console.log(`proteinPer100g: ${nutrients.protein},`);
      console.log(`carbsPer100g: ${nutrients.carbs},`);
      console.log(`fatsPer100g: ${nutrients.fat},`);
      console.log(`caloriesPer100g: ${nutrients.calories},`);
      console.log('');
    }
  }
}

main().catch(console.error);


