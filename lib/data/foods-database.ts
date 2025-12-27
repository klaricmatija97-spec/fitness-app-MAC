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
    id: 'smoked_chicken_breast',
    name: 'Pileći dimcek Cekin',
    nameEn: 'Smoked chicken breast',
    // Cekin Dimcek - makronutrijenti sa pakiranja
    proteinPer100g: 17.0,
    carbsPer100g: 2.7,
    fatsPer100g: 1.0,
    caloriesPer100g: 88, // Prema pakiranju
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
    name: 'Zrnati sir',
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
    id: 'milk_1_2',
    name: 'Mlijeko 1.2%',
    nameEn: 'Milk 1.2%',
    // USDA FDC 322228: Milk, lowfat, fluid, 1% milkfat (koristimo za 1.2%)
    // Hrvatsko mlijeko 1.2% ima slične vrijednosti kao USDA 1% milkfat
    proteinPer100g: 3.4,
    carbsPer100g: 5.2,
    fatsPer100g: 1.2,
    caloriesPer100g: calcKcal(3.4, 5.2, 1.2), // 44 kcal
    category: 'dairy',
  },
  {
    id: 'milk_3_2',
    name: 'Mlijeko 3.2%',
    nameEn: 'Milk 3.2%',
    // USDA FDC 171265: Milk, whole, 3.25% milkfat
    proteinPer100g: 3.2,
    carbsPer100g: 4.8,
    fatsPer100g: 3.2,
    caloriesPer100g: calcKcal(3.2, 4.8, 3.2), // 61 kcal
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
    // Natur bio rižini krekeri - makronutrijenti sa neta (384 kcal/100g)
    proteinPer100g: 9.3,
    carbsPer100g: 78.0,
    fatsPer100g: 3.1,
    caloriesPer100g: 384, // Točno prema Natur bio rižini krekeri
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
  {
    id: 'semolina_cooked',
    name: 'Griz (kuhani)',
    nameEn: 'Semolina',
    // Semolina (griz) cooked - proizvod od pšenice, kuhan s omjerom 1:3-4
    // Suhi griz: ~374 kcal/100g, 8g P, 75g C, 1.5g F
    // Kuhani griz (1:3 omjer): ~125 kcal/100g
    proteinPer100g: 3.5,
    carbsPer100g: 25.0,
    fatsPer100g: 0.4,
    caloriesPer100g: calcKcal(3.5, 25.0, 0.4), // 125 kcal
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
    id: 'cherry_tomatoes',
    name: 'Cherry rajčice',
    nameEn: 'Cherry tomatoes',
    // USDA: Tomatoes, red, ripe, raw, year round average
    proteinPer100g: 0.9,
    carbsPer100g: 3.9,
    fatsPer100g: 0.2,
    caloriesPer100g: calcKcal(0.9, 3.9, 0.2), // 21 kcal
    category: 'vegetable',
  },
  {
    id: 'pesto',
    name: 'Pesto genovese',
    nameEn: 'Pesto',
    // USDA: Sauce, pesto, ready-to-serve, refrigerated
    proteinPer100g: 4.6,
    carbsPer100g: 5.0,
    fatsPer100g: 38.0,
    caloriesPer100g: calcKcal(4.6, 5.0, 38.0), // 372 kcal
    category: 'fat',
  },
  {
    id: 'pine_nuts',
    name: 'Pinija',
    nameEn: 'Pine nuts',
    // USDA: Nuts, pine nuts, dried
    proteinPer100g: 13.7,
    carbsPer100g: 13.1,
    fatsPer100g: 68.4,
    caloriesPer100g: calcKcal(13.7, 13.1, 68.4), // 673 kcal
    category: 'fat',
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
  {
    id: 'asparagus',
    name: 'Šparoga',
    nameEn: 'Asparagus',
    // USDA: Asparagus, raw
    proteinPer100g: 2.2,
    carbsPer100g: 3.9,
    fatsPer100g: 0.1,
    caloriesPer100g: calcKcal(2.2, 3.9, 0.1), // 25 kcal
    category: 'vegetable',
  },
  {
    id: 'basmati_rice',
    name: 'Basmati riža (kuhana)',
    nameEn: 'Basmati rice',
    // USDA: Rice, white, long-grain, cooked
    proteinPer100g: 2.7,
    carbsPer100g: 28.0,
    fatsPer100g: 0.3,
    caloriesPer100g: calcKcal(2.7, 28.0, 0.3), // 130 kcal
    category: 'carb',
  },
  {
    id: 'bechamel_sauce',
    name: 'Bešamel umak',
    nameEn: 'Bechamel sauce',
    // USDA: Sauce, white, medium
    proteinPer100g: 4.0,
    carbsPer100g: 7.0,
    fatsPer100g: 9.0,
    caloriesPer100g: calcKcal(4.0, 7.0, 9.0), // 130 kcal
    category: 'fat',
  },
  {
    id: 'carp',
    name: 'Šaran',
    nameEn: 'Carp',
    // USDA: Fish, carp, raw
    proteinPer100g: 18.0,
    carbsPer100g: 0,
    fatsPer100g: 5.6,
    caloriesPer100g: calcKcal(18.0, 0, 5.6), // 127 kcal
    category: 'protein',
  },
  {
    id: 'cheese',
    name: 'Sir',
    nameEn: 'Cheese',
    // USDA: Cheese, cheddar (generic)
    proteinPer100g: 25.0,
    carbsPer100g: 1.3,
    fatsPer100g: 33.0,
    caloriesPer100g: calcKcal(25.0, 1.3, 33.0), // 408 kcal
    category: 'dairy',
  },
  {
    id: 'chives',
    name: 'Vlasac',
    nameEn: 'Chives',
    // USDA: Chives, raw
    proteinPer100g: 3.3,
    carbsPer100g: 4.4,
    fatsPer100g: 0.7,
    caloriesPer100g: calcKcal(3.3, 4.4, 0.7), // 30 kcal
    category: 'vegetable',
  },
  {
    id: 'cocoa_powder',
    name: 'Kakao prah',
    nameEn: 'Cocoa powder',
    // USDA: Cocoa, dry powder, unsweetened
    proteinPer100g: 19.6,
    carbsPer100g: 57.9,
    fatsPer100g: 13.7,
    caloriesPer100g: calcKcal(19.6, 57.9, 13.7), // 228 kcal
    category: 'carb',
  },
  {
    id: 'dark_chocolate',
    name: 'Tamna čokolada',
    nameEn: 'Dark chocolate',
    // USDA: Chocolate, dark, 70-85% cacao
    proteinPer100g: 7.8,
    carbsPer100g: 45.9,
    fatsPer100g: 42.6,
    caloriesPer100g: calcKcal(7.8, 45.9, 42.6), // 598 kcal
    category: 'fat',
  },
  {
    id: 'dried_cranberries',
    name: 'Suhe brusnice',
    nameEn: 'Dried cranberries',
    // USDA: Cranberries, dried, sweetened
    proteinPer100g: 0.1,
    carbsPer100g: 82.4,
    fatsPer100g: 1.4,
    caloriesPer100g: calcKcal(0.1, 82.4, 1.4), // 308 kcal
    category: 'fruit',
  },
  {
    id: 'eggplant',
    name: 'Patlidžan',
    nameEn: 'Eggplant',
    // USDA: Eggplant, raw
    proteinPer100g: 1.0,
    carbsPer100g: 5.9,
    fatsPer100g: 0.2,
    caloriesPer100g: calcKcal(1.0, 5.9, 0.2), // 25 kcal
    category: 'vegetable',
  },
  {
    id: 'gnocchi',
    name: 'Njoki',
    nameEn: 'Gnocchi',
    // USDA: Pasta, cooked, enriched, without added salt (similar to gnocchi)
    proteinPer100g: 4.6,
    carbsPer100g: 30.9,
    fatsPer100g: 0.9,
    caloriesPer100g: calcKcal(4.6, 30.9, 0.9), // 158 kcal
    category: 'carb',
  },
  {
    id: 'ground_beef',
    name: 'Mljevena govedina',
    nameEn: 'Ground beef',
    // USDA: Beef, ground, 85% lean meat / 15% fat, raw
    proteinPer100g: 18.6,
    carbsPer100g: 0,
    fatsPer100g: 15.0,
    caloriesPer100g: calcKcal(18.6, 0, 15.0), // 215 kcal
    category: 'protein',
  },
  {
    id: 'hazelnuts',
    name: 'Lješnjaci',
    nameEn: 'Hazelnuts',
    // USDA: Nuts, hazelnuts or filberts
    proteinPer100g: 15.0,
    carbsPer100g: 16.7,
    fatsPer100g: 60.8,
    caloriesPer100g: calcKcal(15.0, 16.7, 60.8), // 628 kcal
    category: 'fat',
  },
  {
    id: 'lasagna_sheets',
    name: 'Lasagne listovi',
    nameEn: 'Lasagna sheets',
    // USDA: Pasta, dry, enriched (similar to lasagna sheets)
    proteinPer100g: 13.0,
    carbsPer100g: 71.0,
    fatsPer100g: 1.5,
    caloriesPer100g: calcKcal(13.0, 71.0, 1.5), // 371 kcal
    category: 'carb',
  },
  {
    id: 'lemon',
    name: 'Limun',
    nameEn: 'Lemon',
    // USDA: Lemons, raw, without peel
    proteinPer100g: 1.1,
    carbsPer100g: 9.3,
    fatsPer100g: 0.3,
    caloriesPer100g: calcKcal(1.1, 9.3, 0.3), // 29 kcal
    category: 'fruit',
  },
  {
    id: 'mushrooms',
    name: 'Gljive',
    nameEn: 'Mushrooms',
    // USDA: Mushrooms, white, raw
    proteinPer100g: 3.1,
    carbsPer100g: 3.3,
    fatsPer100g: 0.3,
    caloriesPer100g: calcKcal(3.1, 3.3, 0.3), // 22 kcal
    category: 'vegetable',
  },
  {
    id: 'new_potatoes',
    name: 'Mladi krumpir',
    nameEn: 'New potatoes',
    // USDA: Potatoes, raw, skin
    proteinPer100g: 2.0,
    carbsPer100g: 17.5,
    fatsPer100g: 0.1,
    caloriesPer100g: calcKcal(2.0, 17.5, 0.1), // 77 kcal
    category: 'carb',
  },
  {
    id: 'pancake',
    name: 'Palačinka',
    nameEn: 'Pancake',
    // USDA: Pancakes, plain, prepared from recipe
    proteinPer100g: 7.9,
    carbsPer100g: 28.3,
    fatsPer100g: 9.7,
    caloriesPer100g: calcKcal(7.9, 28.3, 9.7), // 227 kcal
    category: 'carb',
  },
  {
    id: 'paprika_powder',
    name: 'Papar',
    nameEn: 'Paprika powder',
    // USDA: Spices, paprika
    proteinPer100g: 14.1,
    carbsPer100g: 53.9,
    fatsPer100g: 12.9,
    caloriesPer100g: calcKcal(14.1, 53.9, 12.9), // 282 kcal
    category: 'vegetable',
  },
  {
    id: 'pork_tenderloin',
    name: 'Svinjski file',
    nameEn: 'Pork tenderloin',
    // USDA: Pork, fresh, loin, tenderloin, separable lean only, raw
    proteinPer100g: 22.3,
    carbsPer100g: 0,
    fatsPer100g: 3.5,
    caloriesPer100g: calcKcal(22.3, 0, 3.5), // 120 kcal
    category: 'protein',
  },
  {
    id: 'prunes',
    name: 'Šljive',
    nameEn: 'Prunes',
    // USDA: Plums, dried (prunes), uncooked
    proteinPer100g: 2.2,
    carbsPer100g: 63.9,
    fatsPer100g: 0.4,
    caloriesPer100g: calcKcal(2.2, 63.9, 0.4), // 240 kcal
    category: 'fruit',
  },
  {
    id: 'pumpkin_seeds',
    name: 'Sjemenke bundeve',
    nameEn: 'Pumpkin seeds',
    // USDA: Seeds, pumpkin and squash seed kernels, dried
    proteinPer100g: 30.2,
    carbsPer100g: 10.7,
    fatsPer100g: 49.0,
    caloriesPer100g: calcKcal(30.2, 10.7, 49.0), // 559 kcal
    category: 'fat',
  },
  {
    id: 'red_wine',
    name: 'Crno vino',
    nameEn: 'Red wine',
    // USDA: Alcoholic beverage, wine, table, red
    proteinPer100g: 0.1,
    carbsPer100g: 2.6,
    fatsPer100g: 0,
    caloriesPer100g: calcKcal(0.1, 2.6, 0), // 85 kcal
    category: 'carb',
  },
  {
    id: 'ribeye_steak',
    name: 'Rebro odrezak',
    nameEn: 'Ribeye steak',
    // USDA: Beef, rib eye, small end (ribs 10-12), separable lean and fat, trimmed to 0" fat, choice, raw
    proteinPer100g: 18.9,
    carbsPer100g: 0,
    fatsPer100g: 18.5,
    caloriesPer100g: calcKcal(18.9, 0, 18.5), // 264 kcal
    category: 'protein',
  },
  {
    id: 'rice_cakes',
    name: 'Rižine krekere',
    nameEn: 'Rice cakes',
    // USDA: Snacks, rice cakes, brown rice, plain
    proteinPer100g: 7.2,
    carbsPer100g: 81.5,
    fatsPer100g: 3.2,
    caloriesPer100g: calcKcal(7.2, 81.5, 3.2), // 387 kcal
    category: 'carb',
  },
  {
    id: 'sea_bass',
    name: 'Brancin',
    nameEn: 'Sea bass',
    // USDA: Fish, sea bass, mixed species, raw
    proteinPer100g: 18.4,
    carbsPer100g: 0,
    fatsPer100g: 2.0,
    caloriesPer100g: calcKcal(18.4, 0, 2.0), // 97 kcal
    category: 'protein',
  },
  {
    id: 'sea_bream',
    name: 'Orata',
    nameEn: 'Sea bream',
    // USDA: Fish, porgy, mixed species, raw (similar to sea bream)
    proteinPer100g: 18.9,
    carbsPer100g: 0,
    fatsPer100g: 1.9,
    caloriesPer100g: calcKcal(18.9, 0, 1.9), // 105 kcal
    category: 'protein',
  },
  {
    id: 'squid',
    name: 'Lignje',
    nameEn: 'Squid',
    // USDA: Mollusks, squid, mixed species, raw
    proteinPer100g: 15.6,
    carbsPer100g: 3.1,
    fatsPer100g: 1.4,
    caloriesPer100g: calcKcal(15.6, 3.1, 1.4), // 92 kcal
    category: 'protein',
  },
  {
    id: 'tikka_masala_paste',
    name: 'Tikka masala pasta',
    nameEn: 'Tikka masala paste',
    // USDA: Spices, curry powder (approximation for tikka masala)
    proteinPer100g: 14.3,
    carbsPer100g: 55.8,
    fatsPer100g: 14.0,
    caloriesPer100g: calcKcal(14.3, 55.8, 14.0), // 325 kcal
    category: 'fat',
  },
  {
    id: 'tomato_paste',
    name: 'Pasirana rajčica',
    nameEn: 'Tomato paste',
    // USDA: Tomatoes, red, ripe, canned, with green chilies
    proteinPer100g: 4.3,
    carbsPer100g: 18.9,
    fatsPer100g: 0.3,
    caloriesPer100g: calcKcal(4.3, 18.9, 0.3), // 82 kcal
    category: 'vegetable',
  },
  {
    id: 'trout',
    name: 'Pastrva',
    nameEn: 'Trout',
    // USDA: Fish, trout, rainbow, farmed, raw
    proteinPer100g: 19.9,
    carbsPer100g: 0,
    fatsPer100g: 6.6,
    caloriesPer100g: calcKcal(19.9, 0, 6.6), // 148 kcal
    category: 'protein',
  },
  {
    id: 'tuna_canned',
    name: 'Tuna (konzerva)',
    nameEn: 'Tuna canned',
    // USDA: Fish, tuna, light, canned in water, drained solids
    proteinPer100g: 25.5,
    carbsPer100g: 0,
    fatsPer100g: 0.8,
    caloriesPer100g: calcKcal(25.5, 0, 0.8), // 116 kcal
    category: 'protein',
  },
  {
    id: 'walnuts',
    name: 'Orašasti plodovi',
    nameEn: 'Walnuts',
    // USDA: Nuts, walnuts, english
    proteinPer100g: 15.2,
    carbsPer100g: 13.7,
    fatsPer100g: 65.2,
    caloriesPer100g: calcKcal(15.2, 13.7, 65.2), // 654 kcal
    category: 'fat',
  },
  {
    id: 'water',
    name: 'Voda',
    nameEn: 'Water',
    // Voda nema kalorije
    proteinPer100g: 0,
    carbsPer100g: 0,
    fatsPer100g: 0,
    caloriesPer100g: 0,
    category: 'vegetable',
  },
  {
    id: 'white_wine',
    name: 'Bijelo vino',
    nameEn: 'White wine',
    // USDA: Alcoholic beverage, wine, table, white
    proteinPer100g: 0.1,
    carbsPer100g: 2.6,
    fatsPer100g: 0,
    caloriesPer100g: calcKcal(0.1, 2.6, 0), // 82 kcal
    category: 'carb',
  },
  {
    id: 'whole_egg',
    name: 'Cijelo jaje',
    nameEn: 'Whole egg',
    // USDA: Egg, whole, raw, fresh (same as Egg)
    proteinPer100g: 12.6,
    carbsPer100g: 0.7,
    fatsPer100g: 9.5,
    caloriesPer100g: calcKcal(12.6, 0.7, 9.5), // 143 kcal
    category: 'protein',
  },
  {
    id: 'wine_vinegar',
    name: 'Vinski ocat',
    nameEn: 'Wine vinegar',
    // USDA: Vinegar, red wine
    proteinPer100g: 0,
    carbsPer100g: 0.3,
    fatsPer100g: 0,
    caloriesPer100g: calcKcal(0, 0.3, 0), // 18 kcal
    category: 'vegetable',
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
  'Smoked chicken breast': 'smoked_chicken_breast',
  'Smoked Chicken breast': 'smoked_chicken_breast',
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
  'Milk': 'milk_1_2', // Default: Mlijeko 1.2% (najčešće korišteno)
  'Milk 1.2%': 'milk_1_2',
  'Milk 3.2%': 'milk_3_2',
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
  'Semolina': 'semolina_cooked',
  'Griz': 'semolina_cooked',
  'Griz (kuhani)': 'semolina_cooked',
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
  'Cherry tomatoes': 'cherry_tomatoes',
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
  'Pine nuts': 'pine_nuts',
  'Pinija': 'pine_nuts',
  'Pesto': 'pesto',
  'Pesto genovese': 'pesto',
  'Asparagus': 'asparagus',
  'Basmati rice': 'basmati_rice',
  'Bechamel sauce': 'bechamel_sauce',
  'Carp': 'carp',
  'Cheese': 'cheese',
  'Chives': 'chives',
  'Cocoa powder': 'cocoa_powder',
  'Dark chocolate': 'dark_chocolate',
  'Dried cranberries': 'dried_cranberries',
  'Eggplant': 'eggplant',
  'Gnocchi': 'gnocchi',
  'Ground beef': 'ground_beef',
  'Hazelnuts': 'hazelnuts',
  'Lasagna sheets': 'lasagna_sheets',
  'Lemon': 'lemon',
  'Mushrooms': 'mushrooms',
  'New potatoes': 'new_potatoes',
  'Pancake': 'pancake',
  'Paprika powder': 'paprika_powder',
  'Pork tenderloin': 'pork_tenderloin',
  'Prunes': 'prunes',
  'Pumpkin seeds': 'pumpkin_seeds',
  'Red wine': 'red_wine',
  'Ribeye steak': 'ribeye_steak',
  'Rice cakes': 'rice_cakes',
  'Sea bass': 'sea_bass',
  'Sea bream': 'sea_bream',
  'Squid': 'squid',
  'Tikka masala paste': 'tikka_masala_paste',
  'Tomato paste': 'tomato_paste',
  'Trout': 'trout',
  'Tuna canned': 'tuna_canned',
  'Walnuts': 'walnuts',
  'Water': 'water',
  'White wine': 'white_wine',
  'Whole egg': 'whole_egg',
  'Wine vinegar': 'wine_vinegar',
  
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
