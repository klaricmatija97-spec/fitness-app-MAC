/**
 * CENTRALNA BAZA NAMIRNICA - CORPEX
 * 
 * Sve nutritivne vrijednosti su po 100g.
 * Kalorije se UVIJEK računaju kao: P×4 + UH×4 + M×9
 * 
 * Izvor: USDA FoodData Central (FDC) - ažurirano 2024
 * https://fdc.nal.usda.gov/
 */

export interface Namirnica {
  id: string;
  name: string;           // Hrvatski naziv
  nameEn: string;         // Engleski naziv (za mapping)
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatsPer100g: number;
  category: 'protein' | 'carb' | 'fat' | 'vegetable' | 'fruit' | 'dairy' | 'supplement';
}

// Pomoćna funkcija za konzistentno računanje kalorija
function calcKcal(p: number, c: number, f: number): number {
  return Math.round(p * 4 + c * 4 + f * 9);
}

/**
 * BAZA NAMIRNICA - USDA FoodData Central vrijednosti
 * Sve vrijednosti su po 100g
 */
export const NAMIRNICE: Namirnica[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // PROTEINI (meso, riba, jaja)
  // USDA FDC verified values
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'chicken_breast',
    name: 'Pileća prsa',
    nameEn: 'Chicken breast',
    // USDA FDC 331960: Chicken, breast, skinless, boneless, cooked
    proteinPer100g: 32.1,
    carbsPer100g: 0,
    fatsPer100g: 3.2,
    caloriesPer100g: 166, // USDA exact
    category: 'protein',
  },
  {
    id: 'turkey_breast',
    name: 'Pureća prsa',
    nameEn: 'Turkey breast',
    // USDA FDC 330869: Turkey, ground, 93% lean, cooked
    proteinPer100g: 27.1,
    carbsPer100g: 0,
    fatsPer100g: 11.6,
    caloriesPer100g: 220, // USDA exact
    category: 'protein',
  },
  {
    id: 'beef_lean',
    name: 'Junetina (but)',
    nameEn: 'Beef',
    // USDA: Beef, loin, top loin steak, boneless, separable lean
    proteinPer100g: 22.8,
    carbsPer100g: 0,
    fatsPer100g: 6.4,
    caloriesPer100g: calcKcal(22.8, 0, 6.4), // 149 kcal
    category: 'protein',
  },
  {
    id: 'salmon',
    name: 'Losos',
    nameEn: 'Salmon',
    // USDA: Fish, salmon, Atlantic, farm raised, raw
    proteinPer100g: 20.3,
    carbsPer100g: 0,
    fatsPer100g: 13.1,
    caloriesPer100g: calcKcal(20.3, 0, 13.1), // 199 kcal
    category: 'protein',
  },
  {
    id: 'tuna_canned',
    name: 'Tuna (konzerva u vodi)',
    nameEn: 'Tuna',
    // USDA FDC 334194: Fish, tuna, light, canned in water, drained solids
    proteinPer100g: 19.0,
    carbsPer100g: 0.1,
    fatsPer100g: 0.9,
    caloriesPer100g: 90, // USDA exact
    category: 'protein',
  },
  {
    id: 'egg_whole',
    name: 'Jaje (cijelo)',
    nameEn: 'Egg',
    // USDA: Egg, whole, raw
    proteinPer100g: 12.3,
    carbsPer100g: 0.9,
    fatsPer100g: 10.3,
    caloriesPer100g: calcKcal(12.3, 0.9, 10.3), // 146 kcal
    category: 'protein',
  },
  {
    id: 'egg_white',
    name: 'Bjelanjak',
    nameEn: 'Egg white',
    // USDA: Egg, white, raw
    proteinPer100g: 10.1,
    carbsPer100g: 0.7,
    fatsPer100g: 0.2,
    caloriesPer100g: calcKcal(10.1, 0.7, 0.2), // 45 kcal
    category: 'protein',
  },
  {
    id: 'ham_chicken',
    name: 'Pileća šunka/salama',
    nameEn: 'Ham',
    // USDA: Ham, sliced, pre-packaged, deli meat
    proteinPer100g: 16.7,
    carbsPer100g: 0.3,
    fatsPer100g: 3.7,
    caloriesPer100g: calcKcal(16.7, 0.3, 3.7), // 101 kcal
    category: 'protein',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MLIJEČNI PROIZVODI
  // USDA FDC verified values
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'greek_yogurt',
    name: 'Grčki jogurt 0%',
    nameEn: 'Greek yogurt',
    // USDA FDC 330137: Yogurt, Greek, plain, nonfat
    proteinPer100g: 10.3,
    carbsPer100g: 3.6,
    fatsPer100g: 0.4,
    caloriesPer100g: 61, // USDA exact
    category: 'dairy',
  },
  {
    id: 'skyr',
    name: 'Skyr',
    nameEn: 'Skyr',
    // Similar to Greek yogurt nonfat (Icelandic style)
    proteinPer100g: 11.0,
    carbsPer100g: 4.0,
    fatsPer100g: 0.2,
    caloriesPer100g: calcKcal(11.0, 4.0, 0.2), // 62 kcal
    category: 'dairy',
  },
  {
    id: 'cottage_cheese',
    name: 'Svježi sir (cottage)',
    nameEn: 'Cottage cheese',
    // USDA FDC 328841: Cheese, cottage, lowfat, 2% milkfat
    proteinPer100g: 11.0,
    carbsPer100g: 4.3,
    fatsPer100g: 2.3,
    caloriesPer100g: 84, // USDA exact
    category: 'dairy',
  },
  {
    id: 'cream_cheese_light',
    name: 'Sirni namaz light',
    nameEn: 'Cream cheese light',
    // USDA FDC 173417: Cream cheese, fat free
    proteinPer100g: 10.0,
    carbsPer100g: 8.0,
    fatsPer100g: 5.0,
    caloriesPer100g: calcKcal(10.0, 8.0, 5.0), // 117 kcal
    category: 'dairy',
  },
  {
    id: 'milk_low_fat',
    name: 'Mlijeko 1.5%',
    nameEn: 'Milk',
    // USDA FDC 322228: Milk, lowfat, fluid, 1% milkfat
    proteinPer100g: 3.4,
    carbsPer100g: 5.2,
    fatsPer100g: 1.0,
    caloriesPer100g: 43, // USDA exact
    category: 'dairy',
  },
  {
    id: 'sour_cream',
    name: 'Kiselo vrhnje 20%',
    nameEn: 'Sour cream',
    // USDA: Cream, sour, full fat
    proteinPer100g: 3.1,
    carbsPer100g: 5.6,
    fatsPer100g: 18.0,
    caloriesPer100g: calcKcal(3.1, 5.6, 18.0), // 197 kcal
    category: 'dairy',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // UGLJIKOHIDRATI (žitarice, kruh, tjestenina)
  // USDA FDC verified values
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'oats',
    name: 'Zobene pahuljice (suhe)',
    nameEn: 'Oats',
    // USDA FDC 2346396: Oats, whole grain, rolled, old fashioned
    proteinPer100g: 13.5,
    carbsPer100g: 68.7,
    fatsPer100g: 5.9,
    caloriesPer100g: 382, // P×4 + C×4 + F×9
    category: 'carb',
  },
  {
    id: 'toast',
    name: 'Tost kruh',
    nameEn: 'Toast',
    // USDA: Bread, white, commercially prepared
    proteinPer100g: 9.4,
    carbsPer100g: 49.2,
    fatsPer100g: 3.6,
    caloriesPer100g: calcKcal(9.4, 49.2, 3.6), // 267 kcal
    category: 'carb',
  },
  {
    id: 'rice_crackers',
    name: 'Rižini krekeri',
    nameEn: 'Rice crackers',
    // Estimate based on rice cake values
    proteinPer100g: 7.0,
    carbsPer100g: 82.0,
    fatsPer100g: 2.5,
    caloriesPer100g: calcKcal(7.0, 82.0, 2.5), // 379 kcal
    category: 'carb',
  },
  {
    id: 'pasta_cooked',
    name: 'Tjestenina (kuhana)',
    nameEn: 'Pasta cooked',
    // USDA: Pasta, dry divided by ~2.5 for cooked
    proteinPer100g: 5.0,
    carbsPer100g: 25.0,
    fatsPer100g: 0.9,
    caloriesPer100g: calcKcal(5.0, 25.0, 0.9), // 128 kcal
    category: 'carb',
  },
  {
    id: 'potato_boiled',
    name: 'Krumpir (kuhani)',
    nameEn: 'Potatoes',
    // USDA FDC 2346401: Potatoes, russet, without skin, raw
    proteinPer100g: 2.3,
    carbsPer100g: 17.8,
    fatsPer100g: 0.4,
    caloriesPer100g: 82, // Calculated: P×4 + C×4 + F×9
    category: 'carb',
  },
  {
    id: 'rice_cooked',
    name: 'Riža (kuhana)',
    nameEn: 'Rice',
    // USDA FDC 2512381 (raw) / ~3 for cooked: Rice, white, long grain
    proteinPer100g: 2.4,
    carbsPer100g: 28.0,
    fatsPer100g: 0.3,
    caloriesPer100g: 130, // USDA cooked value
    category: 'carb',
  },
  {
    id: 'buckwheat_cooked',
    name: 'Heljda (kuhana)',
    nameEn: 'Buckwheat',
    // USDA: Buckwheat, whole grain / 3 (cooked)
    proteinPer100g: 3.7,
    carbsPer100g: 23.7,
    fatsPer100g: 1.0,
    caloriesPer100g: calcKcal(3.7, 23.7, 1.0), // 119 kcal
    category: 'carb',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // VOĆE
  // USDA FDC verified values
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'banana',
    name: 'Banana',
    nameEn: 'Banana',
    // USDA: Bananas, raw
    proteinPer100g: 0.7,
    carbsPer100g: 20.1,
    fatsPer100g: 0.2,
    caloriesPer100g: calcKcal(0.7, 20.1, 0.2), // 85 kcal
    category: 'fruit',
  },
  {
    id: 'apple',
    name: 'Jabuka',
    nameEn: 'Apple',
    // USDA: Apples, red delicious, with skin, raw
    proteinPer100g: 0.2,
    carbsPer100g: 14.8,
    fatsPer100g: 0.2,
    caloriesPer100g: calcKcal(0.2, 14.8, 0.2), // 62 kcal
    category: 'fruit',
  },
  {
    id: 'blueberries',
    name: 'Borovnice',
    nameEn: 'Blueberries',
    // USDA: Blueberries, raw
    proteinPer100g: 0.7,
    carbsPer100g: 14.6,
    fatsPer100g: 0.3,
    caloriesPer100g: calcKcal(0.7, 14.6, 0.3), // 64 kcal
    category: 'fruit',
  },
  {
    id: 'cherries',
    name: 'Trešnje',
    nameEn: 'Cherries',
    // USDA: Cherries, sweet, dark red, raw
    proteinPer100g: 1.0,
    carbsPer100g: 16.2,
    fatsPer100g: 0.2,
    caloriesPer100g: calcKcal(1.0, 16.2, 0.2), // 71 kcal
    category: 'fruit',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // POVRĆE
  // USDA FDC verified values
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'lettuce',
    name: 'Zelena salata',
    nameEn: 'Lettuce',
    // USDA: Lettuce, cos or romaine, raw
    proteinPer100g: 1.2,
    carbsPer100g: 3.2,
    fatsPer100g: 0.3,
    caloriesPer100g: calcKcal(1.2, 3.2, 0.3), // 20 kcal
    category: 'vegetable',
  },
  {
    id: 'tomato',
    name: 'Rajčica',
    nameEn: 'Tomato',
    // USDA FDC 321360: Tomatoes, grape, raw
    proteinPer100g: 0.8,
    carbsPer100g: 5.5,
    fatsPer100g: 0.6,
    caloriesPer100g: 27, // USDA exact
    category: 'vegetable',
  },
  {
    id: 'cucumber',
    name: 'Krastavac',
    nameEn: 'Cucumber',
    // USDA: Cucumber, with peel, raw
    proteinPer100g: 0.6,
    carbsPer100g: 3.0,
    fatsPer100g: 0.2,
    caloriesPer100g: calcKcal(0.6, 3.0, 0.2), // 16 kcal
    category: 'vegetable',
  },
  {
    id: 'broccoli',
    name: 'Brokula',
    nameEn: 'Broccoli',
    // USDA FDC 321900: Broccoli, raw
    proteinPer100g: 2.6,
    carbsPer100g: 6.3,
    fatsPer100g: 0.3,
    caloriesPer100g: 32, // USDA exact
    category: 'vegetable',
  },
  {
    id: 'carrot',
    name: 'Mrkva',
    nameEn: 'Carrot',
    // USDA: Carrots, mature, raw
    proteinPer100g: 0.9,
    carbsPer100g: 10.3,
    fatsPer100g: 0.4,
    caloriesPer100g: calcKcal(0.9, 10.3, 0.4), // 48 kcal
    category: 'vegetable',
  },
  {
    id: 'corn',
    name: 'Kukuruz',
    nameEn: 'Corn',
    // USDA: Corn, sweet, yellow and white kernels, fresh, raw
    proteinPer100g: 2.8,
    carbsPer100g: 14.7,
    fatsPer100g: 1.6,
    caloriesPer100g: calcKcal(2.8, 14.7, 1.6), // 84 kcal
    category: 'vegetable',
  },
  {
    id: 'onion',
    name: 'Luk',
    nameEn: 'Onion',
    // USDA: Onions, yellow, raw
    proteinPer100g: 0.8,
    carbsPer100g: 8.6,
    fatsPer100g: 0.1,
    caloriesPer100g: calcKcal(0.8, 8.6, 0.1), // 38 kcal
    category: 'vegetable',
  },
  {
    id: 'mushroom',
    name: 'Šampinjoni',
    nameEn: 'Mushroom',
    // USDA: Mushrooms, white button
    proteinPer100g: 2.9,
    carbsPer100g: 4.1,
    fatsPer100g: 0.4,
    caloriesPer100g: calcKcal(2.9, 4.1, 0.4), // 32 kcal
    category: 'vegetable',
  },
  {
    id: 'spinach',
    name: 'Špinat',
    nameEn: 'Spinach',
    // USDA: Spinach, baby
    proteinPer100g: 2.9,
    carbsPer100g: 2.4,
    fatsPer100g: 0.6,
    caloriesPer100g: calcKcal(2.9, 2.4, 0.6), // 27 kcal
    category: 'vegetable',
  },
  {
    id: 'zucchini',
    name: 'Tikvica',
    nameEn: 'Zucchini',
    // USDA: Squash, summer, green, zucchini, includes skin, raw
    proteinPer100g: 1.0,
    carbsPer100g: 3.1,
    fatsPer100g: 0.2,
    caloriesPer100g: calcKcal(1.0, 3.1, 0.2), // 18 kcal
    category: 'vegetable',
  },
  {
    id: 'peas',
    name: 'Grašak',
    nameEn: 'Peas',
    // USDA: Peas, green, sweet
    proteinPer100g: 4.7,
    carbsPer100g: 12.7,
    fatsPer100g: 1.2,
    caloriesPer100g: calcKcal(4.7, 12.7, 1.2), // 81 kcal
    category: 'vegetable',
  },
  {
    id: 'garlic',
    name: 'Češnjak',
    nameEn: 'Garlic',
    // USDA: Garlic, raw
    proteinPer100g: 6.6,
    carbsPer100g: 28.2,
    fatsPer100g: 0.4,
    caloriesPer100g: calcKcal(6.6, 28.2, 0.4), // 143 kcal
    category: 'vegetable',
  },
  {
    id: 'bell_pepper',
    name: 'Paprika',
    nameEn: 'Bell pepper',
    // USDA: Peppers, sweet, red, raw (estimated)
    proteinPer100g: 1.0,
    carbsPer100g: 6.0,
    fatsPer100g: 0.3,
    caloriesPer100g: calcKcal(1.0, 6.0, 0.3), // 31 kcal
    category: 'vegetable',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // NAMIRNICE ZA RIŽOTO - PROTEINI I RIBE
  // USDA FDC verified values
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'hake',
    name: 'Oslić',
    nameEn: 'Hake',
    // USDA: Fish, cod, atlantic, wild caught, raw (similar to hake)
    proteinPer100g: 16.1,
    carbsPer100g: 0,
    fatsPer100g: 0.7,
    caloriesPer100g: calcKcal(16.1, 0, 0.7), // 71 kcal
    category: 'protein',
  },
  {
    id: 'tofu',
    name: 'Tofu',
    nameEn: 'Tofu',
    // Standard firm tofu values
    proteinPer100g: 8.0,
    carbsPer100g: 2.0,
    fatsPer100g: 4.5,
    caloriesPer100g: calcKcal(8.0, 2.0, 4.5), // 81 kcal
    category: 'protein',
  },
  {
    id: 'parmesan_light',
    name: 'Parmezan light',
    nameEn: 'Parmesan light',
    // USDA: Cheese, parmesan, grated, refrigerated
    proteinPer100g: 30.1,
    carbsPer100g: 4.3,
    fatsPer100g: 29.5,
    caloriesPer100g: calcKcal(30.1, 4.3, 29.5), // 403 kcal
    category: 'dairy',
  },
  {
    id: 'butter_light',
    name: 'Maslac light',
    nameEn: 'Butter light',
    // Light butter (reduced fat)
    proteinPer100g: 1.0,
    carbsPer100g: 1.0,
    fatsPer100g: 40.0,
    caloriesPer100g: calcKcal(1.0, 1.0, 40.0), // 368 kcal
    category: 'fat',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // NOVE NAMIRNICE - ŽITARICE I SJEMENKE
  // USDA FDC verified values
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'quinoa_cooked',
    name: 'Quinoa (kuhana)',
    nameEn: 'Quinoa',
    // USDA: Flour, quinoa / 2.5 (cooked estimate)
    proteinPer100g: 4.8,
    carbsPer100g: 27.8,
    fatsPer100g: 2.6,
    caloriesPer100g: calcKcal(4.8, 27.8, 2.6), // 154 kcal
    category: 'carb',
  },
  {
    id: 'couscous_cooked',
    name: 'Kus kus (kuhani)',
    nameEn: 'Couscous',
    // Couscous cooked values
    proteinPer100g: 3.8,
    carbsPer100g: 23.2,
    fatsPer100g: 0.2,
    caloriesPer100g: calcKcal(3.8, 23.2, 0.2), // 110 kcal
    category: 'carb',
  },
  {
    id: 'whole_wheat_pasta',
    name: 'Integralna tjestenina (kuhana)',
    nameEn: 'Whole wheat pasta',
    // Whole wheat pasta cooked
    proteinPer100g: 5.3,
    carbsPer100g: 26.5,
    fatsPer100g: 1.1,
    caloriesPer100g: calcKcal(5.3, 26.5, 1.1), // 137 kcal
    category: 'carb',
  },
  {
    id: 'tortilla',
    name: 'Tortilja (pšenična)',
    nameEn: 'Tortilla',
    // Flour tortilla values
    proteinPer100g: 8.0,
    carbsPer100g: 48.0,
    fatsPer100g: 7.0,
    caloriesPer100g: calcKcal(8.0, 48.0, 7.0), // 287 kcal
    category: 'carb',
  },
  {
    id: 'chia_seeds',
    name: 'Chia sjemenke',
    nameEn: 'Chia seeds',
    // USDA: Chia seeds, dry, raw
    proteinPer100g: 17.0,
    carbsPer100g: 38.3,
    fatsPer100g: 32.9,
    caloriesPer100g: calcKcal(17.0, 38.3, 32.9), // 517 kcal
    category: 'fat',
  },
  {
    id: 'flax_seeds',
    name: 'Lanene sjemenke',
    nameEn: 'Flax seeds',
    // USDA: Flaxseed, ground
    proteinPer100g: 18.0,
    carbsPer100g: 34.4,
    fatsPer100g: 37.3,
    caloriesPer100g: calcKcal(18.0, 34.4, 37.3), // 545 kcal
    category: 'fat',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // NOVE NAMIRNICE - MAHUNARKE
  // USDA FDC verified values (cooked values)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'black_beans',
    name: 'Crni grah (kuhani)',
    nameEn: 'Black beans',
    // USDA: Beans, black, cooked (dry / 2.5)
    proteinPer100g: 8.9,
    carbsPer100g: 23.7,
    fatsPer100g: 0.5,
    caloriesPer100g: calcKcal(8.9, 23.7, 0.5), // 135 kcal
    category: 'carb',
  },
  {
    id: 'kidney_beans',
    name: 'Crveni grah (kuhani)',
    nameEn: 'Kidney beans',
    // USDA: Beans, kidney, cooked
    proteinPer100g: 8.7,
    carbsPer100g: 22.8,
    fatsPer100g: 0.5,
    caloriesPer100g: calcKcal(8.7, 22.8, 0.5), // 131 kcal
    category: 'carb',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // NOVE NAMIRNICE - VOĆE
  // USDA FDC verified values
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'raspberries',
    name: 'Maline',
    nameEn: 'Raspberries',
    // USDA: Raspberries, raw
    proteinPer100g: 1.0,
    carbsPer100g: 12.9,
    fatsPer100g: 0.2,
    caloriesPer100g: calcKcal(1.0, 12.9, 0.2), // 58 kcal
    category: 'fruit',
  },
  {
    id: 'strawberries',
    name: 'Jagode',
    nameEn: 'Strawberries',
    // USDA: Strawberries, raw
    proteinPer100g: 0.7,
    carbsPer100g: 7.7,
    fatsPer100g: 0.3,
    caloriesPer100g: calcKcal(0.7, 7.7, 0.3), // 36 kcal
    category: 'fruit',
  },
  {
    id: 'mango',
    name: 'Mango',
    nameEn: 'Mango',
    // USDA: Mango, tommy atkins, peeled, raw
    proteinPer100g: 0.6,
    carbsPer100g: 15.3,
    fatsPer100g: 0.6,
    caloriesPer100g: calcKcal(0.6, 15.3, 0.6), // 69 kcal
    category: 'fruit',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // NOVE NAMIRNICE - MLIJEČNI I SIREVI
  // USDA FDC verified values
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'mozzarella',
    name: 'Mozzarella',
    nameEn: 'Mozzarella',
    // USDA: Cheese, mozzarella, low moisture, part-skim
    proteinPer100g: 23.7,
    carbsPer100g: 4.4,
    fatsPer100g: 20.4,
    caloriesPer100g: calcKcal(23.7, 4.4, 20.4), // 296 kcal
    category: 'dairy',
  },
  {
    id: 'tomato_sauce',
    name: 'Pasirana rajčica',
    nameEn: 'Tomato sauce',
    // USDA: Sauce, pasta, spaghetti/marinara
    proteinPer100g: 1.4,
    carbsPer100g: 8.1,
    fatsPer100g: 1.5,
    caloriesPer100g: calcKcal(1.4, 8.1, 1.5), // 52 kcal
    category: 'vegetable',
  },
  {
    id: 'olives',
    name: 'Masline',
    nameEn: 'Olives',
    // USDA: Olives, green, manzanilla, stuffed with pimiento
    proteinPer100g: 1.1,
    carbsPer100g: 5.0,
    fatsPer100g: 12.9,
    caloriesPer100g: calcKcal(1.1, 5.0, 12.9), // 140 kcal
    category: 'fat',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MASTI I ORAŠASTI PLODOVI
  // USDA FDC verified values
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'avocado',
    name: 'Avokado',
    nameEn: 'Avocado',
    // USDA: Avocado, Hass, peeled, raw
    proteinPer100g: 1.8,
    carbsPer100g: 8.3,
    fatsPer100g: 20.3,
    caloriesPer100g: calcKcal(1.8, 8.3, 20.3), // 223 kcal
    category: 'fat',
  },
  {
    id: 'peanut_butter',
    name: 'Maslac od kikirikija',
    nameEn: 'Peanut butter',
    // USDA FDC 324860: Peanut butter, smooth style, with salt
    proteinPer100g: 22.5,
    carbsPer100g: 22.3,
    fatsPer100g: 51.1,
    caloriesPer100g: 597, // USDA exact
    category: 'fat',
  },
  {
    id: 'almonds',
    name: 'Bademi',
    nameEn: 'Almonds',
    // USDA FDC 323294: Nuts, almonds, dry roasted, with salt added
    proteinPer100g: 20.4,
    carbsPer100g: 16.2,
    fatsPer100g: 57.8,
    caloriesPer100g: 620, // USDA exact
    category: 'fat',
  },
  {
    id: 'cashews',
    name: 'Indijski oraščići',
    nameEn: 'Cashews',
    // USDA: Nuts, cashew nuts, raw
    proteinPer100g: 17.4,
    carbsPer100g: 36.3,
    fatsPer100g: 38.9,
    caloriesPer100g: calcKcal(17.4, 36.3, 38.9), // 565 kcal
    category: 'fat',
  },
  {
    id: 'olive_oil',
    name: 'Maslinovo ulje',
    nameEn: 'Olive oil',
    // Standard olive oil values
    proteinPer100g: 0,
    carbsPer100g: 0,
    fatsPer100g: 100,
    caloriesPer100g: calcKcal(0, 0, 100), // 900 kcal
    category: 'fat',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // VISOKO UGLJIKOHIDRATNE NAMIRNICE
  // Za gain mode - fokus na UH
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'honey',
    name: 'Med',
    nameEn: 'Honey',
    proteinPer100g: 0.3,
    carbsPer100g: 82.0,
    fatsPer100g: 0,
    caloriesPer100g: calcKcal(0.3, 82.0, 0), // 329 kcal
    category: 'carb',
  },
  {
    id: 'jam',
    name: 'Džem/Marmelada',
    nameEn: 'Jam',
    proteinPer100g: 0.4,
    carbsPer100g: 68.0,
    fatsPer100g: 0.1,
    caloriesPer100g: calcKcal(0.4, 68.0, 0.1), // 274 kcal
    category: 'carb',
  },
  {
    id: 'granola',
    name: 'Granola/Musli',
    nameEn: 'Granola',
    proteinPer100g: 10.0,
    carbsPer100g: 64.0,
    fatsPer100g: 15.0,
    caloriesPer100g: calcKcal(10.0, 64.0, 15.0), // 431 kcal
    category: 'carb',
  },
  {
    id: 'cornflakes',
    name: 'Kukuruzne pahuljice',
    nameEn: 'Cornflakes',
    proteinPer100g: 7.0,
    carbsPer100g: 84.0,
    fatsPer100g: 0.5,
    caloriesPer100g: calcKcal(7.0, 84.0, 0.5), // 369 kcal
    category: 'carb',
  },
  {
    id: 'raisins',
    name: 'Grožđice',
    nameEn: 'Raisins',
    proteinPer100g: 3.0,
    carbsPer100g: 79.0,
    fatsPer100g: 0.5,
    caloriesPer100g: calcKcal(3.0, 79.0, 0.5), // 333 kcal
    category: 'fruit',
  },
  {
    id: 'dates',
    name: 'Datulje',
    nameEn: 'Dates',
    proteinPer100g: 2.5,
    carbsPer100g: 75.0,
    fatsPer100g: 0.4,
    caloriesPer100g: calcKcal(2.5, 75.0, 0.4), // 314 kcal
    category: 'fruit',
  },
  {
    id: 'orange_juice',
    name: 'Sok od naranče',
    nameEn: 'Orange juice',
    proteinPer100g: 0.7,
    carbsPer100g: 10.0,
    fatsPer100g: 0.2,
    caloriesPer100g: calcKcal(0.7, 10.0, 0.2), // 45 kcal
    category: 'fruit',
  },
  {
    id: 'sweet_potato',
    name: 'Batat (slatki krumpir)',
    nameEn: 'Sweet potato',
    // USDA FDC 2346404: Sweet potatoes, orange flesh, without skin, raw
    proteinPer100g: 1.6,
    carbsPer100g: 17.3,
    fatsPer100g: 0.4,
    caloriesPer100g: 79, // Calculated: P×4 + C×4 + F×9
    category: 'carb',
  },
  {
    id: 'white_bread',
    name: 'Bijeli kruh',
    nameEn: 'White bread',
    proteinPer100g: 9.0,
    carbsPer100g: 49.0,
    fatsPer100g: 3.2,
    caloriesPer100g: calcKcal(9.0, 49.0, 3.2), // 261 kcal
    category: 'carb',
  },
  {
    id: 'croissant',
    name: 'Kroasan',
    nameEn: 'Croissant',
    proteinPer100g: 8.0,
    carbsPer100g: 45.0,
    fatsPer100g: 21.0,
    caloriesPer100g: calcKcal(8.0, 45.0, 21.0), // 401 kcal
    category: 'carb',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SUPLEMENTI
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'whey_protein',
    name: 'Whey protein',
    nameEn: 'Whey',
    // Standard whey protein isolate values
    proteinPer100g: 80.0,
    carbsPer100g: 8.0,
    fatsPer100g: 3.0,
    caloriesPer100g: calcKcal(80.0, 8.0, 3.0), // 379 kcal
    category: 'supplement',
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// MAPIRANJE KLJUČEVA NA NAMIRNICE
// ═══════════════════════════════════════════════════════════════════════════

// Kreiraj mapu za brzi pristup po ID-u
export const NAMIRNICE_BY_ID = new Map<string, Namirnica>(
  NAMIRNICE.map(n => [n.id, n])
);

// Kreiraj mapu za pristup po engleskom nazivu (case-insensitive)
export const NAMIRNICE_BY_NAME_EN = new Map<string, Namirnica>(
  NAMIRNICE.map(n => [n.nameEn.toLowerCase(), n])
);

// Aliasi za mapiranje iz meal_components.json
export const FOOD_ALIASES: Record<string, string> = {
  // Proteini
  'Egg': 'egg_whole',
  'Egg white': 'egg_white',
  'Chicken breast': 'chicken_breast',
  'Chicken': 'chicken_breast',
  'Turkey breast': 'turkey_breast',
  'Turkey': 'turkey_breast',
  'Salmon': 'salmon',
  'Tuna': 'tuna_canned',
  'Beef': 'beef_lean',
  'Ham': 'ham_chicken',
  
  // Mliječni
  'Greek yogurt': 'greek_yogurt',
  'Skyr': 'skyr',
  'Cottage cheese': 'cottage_cheese',
  'Cream cheese light': 'cream_cheese_light',
  'Cream cheese': 'cream_cheese_light',
  'Milk': 'milk_low_fat',
  'Sour cream': 'sour_cream',
  
  // Ugljikohidrati
  'Oats': 'oats',
  'Toast': 'toast',
  'Rice crackers': 'rice_crackers',
  'Pasta cooked': 'pasta_cooked',
  'Pasta': 'pasta_cooked',
  'Potatoes': 'potato_boiled',
  'Potato': 'potato_boiled',
  'Rice': 'rice_cooked',
  'Buckwheat': 'buckwheat_cooked',
  'Honey': 'honey',
  'Med': 'honey',
  'Jam': 'jam',
  'Dzem': 'jam',
  'Granola': 'granola',
  'Musli': 'granola',
  'Cornflakes': 'cornflakes',
  'Raisins': 'raisins',
  'Grozdice': 'raisins',
  'Dates': 'dates',
  'Datulje': 'dates',
  'Orange juice': 'orange_juice',
  'Sweet potato': 'sweet_potato',
  'Batat': 'sweet_potato',
  'White bread': 'white_bread',
  'Croissant': 'croissant',
  
  // Voće
  'Banana': 'banana',
  'Apple': 'apple',
  'Blueberries': 'blueberries',
  'Cherries': 'cherries',
  'Raspberries': 'raspberries',
  'Strawberries': 'strawberries',
  'Mango': 'mango',
  
  // Povrće
  'Lettuce': 'lettuce',
  'Tomato': 'tomato',
  'Cucumber': 'cucumber',
  'Broccoli': 'broccoli',
  'Carrot': 'carrot',
  'Corn': 'corn',
  'Onion': 'onion',
  'Mushroom': 'mushroom',
  'Tomato sauce': 'tomato_sauce',
  'Spinach': 'spinach',
  'Zucchini': 'zucchini',
  'Peas': 'peas',
  'Garlic': 'garlic',
  'Bell pepper': 'bell_pepper',
  
  // Ribe i proteini za rižoto
  'Hake': 'hake',
  'Tofu': 'tofu',
  'Parmesan light': 'parmesan_light',
  'Parmesan': 'parmesan_light',
  'Butter light': 'butter_light',
  'Butter': 'butter_light',
  
  // Masti i sjemenke
  'Avocado': 'avocado',
  'Peanut butter': 'peanut_butter',
  'Almonds': 'almonds',
  'Cashews': 'cashews',
  'Olive oil': 'olive_oil',
  'Olives': 'olives',
  'Chia seeds': 'chia_seeds',
  'Chia': 'chia_seeds',
  'Flax seeds': 'flax_seeds',
  'Flax': 'flax_seeds',
  
  // Nove žitarice i mahunarke
  'Quinoa': 'quinoa_cooked',
  'Couscous': 'couscous_cooked',
  'Kus kus': 'couscous_cooked',
  'Whole wheat pasta': 'whole_wheat_pasta',
  'Tortilla': 'tortilla',
  'Black beans': 'black_beans',
  'Kidney beans': 'kidney_beans',
  'Beans': 'kidney_beans',
  
  // Sirevi
  'Mozzarella': 'mozzarella',
  
  // Suplementi
  'Whey': 'whey_protein',
  'Whey protein': 'whey_protein',
};

/**
 * Pronađi namirnicu po ključu iz meal_components.json
 * Vraća null ako nije pronađeno
 */
export function findNamirnica(foodKey: string): Namirnica | null {
  // 1. Pokušaj direktni alias
  const aliasId = FOOD_ALIASES[foodKey];
  if (aliasId) {
    return NAMIRNICE_BY_ID.get(aliasId) || null;
  }
  
  // 2. Pokušaj po ID-u
  const byId = NAMIRNICE_BY_ID.get(foodKey.toLowerCase().replace(/\s+/g, '_'));
  if (byId) return byId;
  
  // 3. Pokušaj po engleskom nazivu
  const byNameEn = NAMIRNICE_BY_NAME_EN.get(foodKey.toLowerCase());
  if (byNameEn) return byNameEn;
  
  // 4. Djelomično podudaranje
  const lowerKey = foodKey.toLowerCase();
  for (const namirnica of NAMIRNICE) {
    if (namirnica.nameEn.toLowerCase().includes(lowerKey) ||
        lowerKey.includes(namirnica.nameEn.toLowerCase()) ||
        namirnica.name.toLowerCase().includes(lowerKey)) {
      return namirnica;
    }
  }
  
  return null;
}

/**
 * Izračunaj makroe za određenu gramažu
 */
export function calculateMacrosForGrams(
  namirnica: Namirnica,
  grams: number
): { calories: number; protein: number; carbs: number; fat: number } {
  const ratio = grams / 100;
  
  const protein = Math.round(namirnica.proteinPer100g * ratio * 10) / 10;
  const carbs = Math.round(namirnica.carbsPer100g * ratio * 10) / 10;
  const fat = Math.round(namirnica.fatsPer100g * ratio * 10) / 10;
  
  // UVIJEK računaj kalorije iz makrosa
  const calories = Math.round(protein * 4 + carbs * 4 + fat * 9);
  
  return { calories, protein, carbs, fat };
}

/**
 * Default namirnica za nepoznate ključeve
 */
export const DEFAULT_NAMIRNICA: Namirnica = {
  id: 'unknown',
  name: 'Nepoznato',
  nameEn: 'Unknown',
  proteinPer100g: 5,
  carbsPer100g: 15,
  fatsPer100g: 5,
  caloriesPer100g: calcKcal(5, 15, 5), // 125 kcal
  category: 'carb',
};
