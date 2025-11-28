/**
 * CSV Loader za USDA food, nutrient i food_nutrient podatke
 * 
 * Učitava CSV fajlove iz data/usda/ foldera i omogućava brzo pretraživanje
 * Optimizirano za brz pristup sa lazy loading i indexing
 */

import fs from 'fs';
import path from 'path';

// Cache za učitane podatke
let foodsCache: Map<number, FoodRow> | null = null;
let nutrientsCache: Map<number, NutrientRow> | null = null;
let foodNutrientsCache: Map<number, FoodNutrientRow[]> | null = null;

// Index za brže pretraživanje
let foodsSearchIndex: Map<string, number[]> | null = null; // keyword -> fdc_id[]
let foodsWithMacrosCache: Array<{
  fdc_id: number;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}> | null = null;

// Flag za inicijalizaciju
let isInitialized = false;

interface FoodRow {
  fdc_id: number;
  data_type: string;
  description: string;
  food_category_id: number | null;
  publication_date: string | null;
}

interface NutrientRow {
  id: number;
  name: string;
  unit_name: string;
  nutrient_nbr: string;
  rank: number;
}

interface FoodNutrientRow {
  id: number;
  fdc_id: number;
  nutrient_id: number;
  amount: number;
  data_points: number | null;
  derivation_id: number | null;
  min: number | null;
  max: number | null;
  median: number | null;
  footnote: string | null;
  min_year_acquired: number | null;
}

// Nutrient IDs za glavne makronutrijente
const NUTRIENT_IDS = {
  ENERGY: 2047, // Energy (Atwater General Factors) - KCAL
  PROTEIN: 1003, // Protein - G
  CARBS: 1005, // Carbohydrate, by difference - G
  FAT: 1004, // Total lipid (fat) - G
  FIBER: 1079, // Fiber, total dietary - G
};

/**
 * Parse CSV string u array objekata (optimizirano)
 */
function parseCSV<T>(csvContent: string, headers: string[]): T[] {
  const lines = csvContent.split('\n');
  const result: T[] = [];
  const lineCount = lines.length;
  
  // Pre-allocate array za bolje performanse
  result.length = lineCount - 1;

  let resultIndex = 0;
  for (let i = 1; i < lineCount; i++) {
    const line = lines[i];
    if (!line || !line.trim()) continue;

    // Optimizirani CSV parser
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    if (values.length !== headers.length) continue;

    const obj: any = {};
    for (let h = 0; h < headers.length; h++) {
      const header = headers[h];
      let value = values[h]?.replace(/^"|"$/g, '') || '';
      // Try to parse as number
      if (value && !isNaN(Number(value)) && value !== '') {
        obj[header] = Number(value);
      } else {
        obj[header] = value || null;
      }
    }

    result[resultIndex++] = obj as T;
  }

  // Trim array na stvarni broj elemenata
  result.length = resultIndex;
  return result;
}

/**
 * Učitaj foods CSV
 */
async function loadFoods(): Promise<Map<number, FoodRow>> {
  if (foodsCache) return foodsCache;

  const csvPath = path.join(process.cwd(), 'data', 'usda', 'food.csv');
  
  // Provjeri da li fajl postoji
  if (!fs.existsSync(csvPath)) {
    console.warn(`⚠️ CSV fajl ne postoji: ${csvPath}`);
    foodsCache = new Map(); // Vrati prazan cache
    return foodsCache;
  }
  
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  
  const foods = parseCSV<FoodRow>(csvContent, [
    'fdc_id',
    'data_type',
    'description',
    'food_category_id',
    'publication_date',
  ]);

  foodsCache = new Map();
  foods.forEach(food => {
    foodsCache!.set(food.fdc_id, food);
  });

  console.log(`✅ Učitano ${foods.length} namirnica iz CSV-a`);
  return foodsCache;
}

/**
 * Učitaj nutrients CSV
 */
async function loadNutrients(): Promise<Map<number, NutrientRow>> {
  if (nutrientsCache) return nutrientsCache;

  const csvPath = path.join(process.cwd(), 'data', 'usda', 'nutrient.csv');
  
  // Provjeri da li fajl postoji
  if (!fs.existsSync(csvPath)) {
    console.warn(`⚠️ CSV fajl ne postoji: ${csvPath}`);
    nutrientsCache = new Map(); // Vrati prazan cache
    return nutrientsCache;
  }
  
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  
  const nutrients = parseCSV<NutrientRow>(csvContent, [
    'id',
    'name',
    'unit_name',
    'nutrient_nbr',
    'rank',
  ]);

  nutrientsCache = new Map();
  nutrients.forEach(nutrient => {
    nutrientsCache!.set(nutrient.id, nutrient);
  });

  console.log(`✅ Učitano ${nutrients.length} nutrijenata iz CSV-a`);
  return nutrientsCache;
}

/**
 * Učitaj food_nutrient CSV
 */
async function loadFoodNutrients(): Promise<Map<number, FoodNutrientRow[]>> {
  if (foodNutrientsCache) return foodNutrientsCache;

  const csvPath = path.join(process.cwd(), 'data', 'usda', 'food_nutrient.csv');
  
  // Provjeri da li fajl postoji
  if (!fs.existsSync(csvPath)) {
    console.warn(`⚠️ CSV fajl ne postoji: ${csvPath}`);
    foodNutrientsCache = new Map(); // Vrati prazan cache
    return foodNutrientsCache;
  }
  
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  
  const foodNutrients = parseCSV<FoodNutrientRow>(csvContent, [
    'id',
    'fdc_id',
    'nutrient_id',
    'amount',
    'data_points',
    'derivation_id',
    'min',
    'max',
    'median',
    'footnote',
    'min_year_acquired',
  ]);

  foodNutrientsCache = new Map<number, FoodNutrientRow[]>();
  foodNutrients.forEach(fn => {
    if (!foodNutrientsCache!.has(fn.fdc_id)) {
      foodNutrientsCache!.set(fn.fdc_id, []);
    }
    foodNutrientsCache!.get(fn.fdc_id)!.push(fn);
  });

  console.log(`✅ Učitano ${foodNutrients.length} food-nutrient veza iz CSV-a`);
  return foodNutrientsCache;
}

/**
 * Kreiraj search index za brže pretraživanje
 */
function buildSearchIndex() {
  if (!foodsCache || foodsSearchIndex) return;
  
  foodsSearchIndex = new Map();
  
  for (const [fdcId, food] of foodsCache.entries()) {
    const words = food.description.toLowerCase().split(/\s+/);
    for (const word of words) {
      if (word.length >= 3) { // Ignoriraj kratke riječi
        if (!foodsSearchIndex.has(word)) {
          foodsSearchIndex.set(word, []);
        }
        foodsSearchIndex.get(word)!.push(fdcId);
      }
    }
  }
  
  console.log(`✅ Search index kreiran sa ${foodsSearchIndex.size} ključeva`);
}

/**
 * Inicijaliziraj sve CSV podatke (lazy loading)
 */
export async function initializeCSVData() {
  if (isInitialized) return;
  
  console.log("🔄 Inicijalizacija CSV podataka...");
  const startTime = Date.now();
  
  try {
    await Promise.all([
      loadFoods(),
      loadNutrients(),
      loadFoodNutrients(),
    ]);
    
    // Kreiraj search index samo ako ima podataka
    if (foodsCache && foodsCache.size > 0) {
      buildSearchIndex();
    }
    
    isInitialized = true;
    const duration = Date.now() - startTime;
    console.log(`✅ CSV podaci inicijalizirani za ${duration}ms`);
  } catch (error) {
    console.error("❌ Greška pri inicijalizaciji CSV podataka:", error);
    // Ne bacaj grešku, samo logiraj - koristit će se Supabase fallback
    isInitialized = true; // Označi kao inicijalizirano da ne pokušava ponovo
  }
}

/**
 * Dohvati namirnicu po fdc_id
 */
export async function getFoodByFdcId(fdcId: number): Promise<FoodRow | null> {
  const foods = await loadFoods();
  return foods.get(fdcId) || null;
}

/**
 * Pretraži namirnice po nazivu (optimizirano sa indexom)
 */
export async function searchFoods(query: string, limit: number = 50): Promise<FoodRow[]> {
  await initializeCSVData();
  const foods = await loadFoods();
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/).filter(w => w.length >= 3);
  
  if (!foodsSearchIndex || queryWords.length === 0) {
    // Fallback na linearno pretraživanje
    const results: FoodRow[] = [];
    for (const food of foods.values()) {
      if (food.description.toLowerCase().includes(queryLower)) {
        results.push(food);
        if (results.length >= limit) break;
      }
    }
    return results;
  }
  
  // Koristi index za brže pretraživanje
  const candidateIds = new Set<number>();
  for (const word of queryWords) {
    const ids = foodsSearchIndex.get(word);
    if (ids) {
      ids.forEach(id => candidateIds.add(id));
    }
  }
  
  // Filtriraj kandidate
  const results: FoodRow[] = [];
  for (const fdcId of candidateIds) {
    const food = foods.get(fdcId);
    if (food && food.description.toLowerCase().includes(queryLower)) {
      results.push(food);
      if (results.length >= limit) break;
    }
  }
  
  return results;
}

/**
 * Dohvati nutrijente za namirnicu
 */
export async function getFoodNutrients(fdcId: number): Promise<FoodNutrientRow[]> {
  const foodNutrients = await loadFoodNutrients();
  return foodNutrients.get(fdcId) || [];
}

/**
 * Dohvati makronutrijente za namirnicu (kalorije, proteini, ugljikohidrati, masti)
 */
export async function getFoodMacros(fdcId: number): Promise<{
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
} | null> {
  const foodNutrients = await getFoodNutrients(fdcId);
  
  let calories = 0;
  let protein = 0;
  let carbs = 0;
  let fats = 0;

  for (const fn of foodNutrients) {
    if (fn.nutrient_id === NUTRIENT_IDS.ENERGY) {
      calories = fn.amount;
    } else if (fn.nutrient_id === NUTRIENT_IDS.PROTEIN) {
      protein = fn.amount;
    } else if (fn.nutrient_id === NUTRIENT_IDS.CARBS) {
      carbs = fn.amount;
    } else if (fn.nutrient_id === NUTRIENT_IDS.FAT) {
      fats = fn.amount;
    }
  }

  // Ako nema podataka, vrati null
  if (calories === 0 && protein === 0 && carbs === 0 && fats === 0) {
    return null;
  }

  return { calories, protein, carbs, fats };
}

/**
 * Dohvati sve namirnice sa makronutrijentima (za brzo pretraživanje)
 * Koristi cache za brže učitavanje
 */
export async function getAllFoodsWithMacros(limit?: number): Promise<Array<{
  fdc_id: number;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}>> {
  await initializeCSVData();
  
  // Koristi cache ako postoji i nije limitiran
  if (foodsWithMacrosCache && !limit) {
    return foodsWithMacrosCache;
  }
  
  const foods = await loadFoods();
  const foodNutrients = await loadFoodNutrients();
  const results: Array<{
    fdc_id: number;
    description: string;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  }> = [];

  let count = 0;
  const maxCount = limit || foods.size;
  
  // Batch processing za bolje performanse
  for (const food of foods.values()) {
    if (count >= maxCount) break;
    
    const nutrients = foodNutrients.get(food.fdc_id) || [];
    let calories = 0;
    let protein = 0;
    let carbs = 0;
    let fats = 0;

    for (const fn of nutrients) {
      if (fn.nutrient_id === NUTRIENT_IDS.ENERGY) {
        calories = fn.amount;
      } else if (fn.nutrient_id === NUTRIENT_IDS.PROTEIN) {
        protein = fn.amount;
      } else if (fn.nutrient_id === NUTRIENT_IDS.CARBS) {
        carbs = fn.amount;
      } else if (fn.nutrient_id === NUTRIENT_IDS.FAT) {
        fats = fn.amount;
      }
    }

    // Dodaj samo ako ima makronutrijente
    if (calories > 0 || protein > 0 || carbs > 0 || fats > 0) {
      results.push({
        fdc_id: food.fdc_id,
        description: food.description,
        calories,
        protein,
        carbs,
        fats,
      });
      count++;
    }
  }

  // Spremi u cache ako nije limitirano
  if (!limit) {
    foodsWithMacrosCache = results;
  }

  return results;
}

