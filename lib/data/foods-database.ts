/**
 * CENTRALNA BAZA NAMIRNICA - CORPEX
 * 
 * Sve nutritivne vrijednosti su po 100g.
 * Kalorije se UVIJEK računaju kao: P×4 + UH×4 + M×9
 * 
 * Izvor: USDA FoodData Central + verificirane hrvatske tablice
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
 * BAZA NAMIRNICA - verificirane vrijednosti
 */
export const NAMIRNICE: Namirnica[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // PROTEINI (meso, riba, jaja)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'chicken_breast',
    name: 'Pileća prsa',
    nameEn: 'Chicken breast',
    proteinPer100g: 31,
    carbsPer100g: 0,
    fatsPer100g: 3.6,
    caloriesPer100g: calcKcal(31, 0, 3.6), // 156 kcal
    category: 'protein',
  },
  {
    id: 'turkey_breast',
    name: 'Pureća prsa',
    nameEn: 'Turkey breast',
    proteinPer100g: 29,
    carbsPer100g: 0,
    fatsPer100g: 1,
    caloriesPer100g: calcKcal(29, 0, 1), // 125 kcal
    category: 'protein',
  },
  {
    id: 'beef_lean',
    name: 'Junetina (but)',
    nameEn: 'Beef',
    proteinPer100g: 26,
    carbsPer100g: 0,
    fatsPer100g: 8,
    caloriesPer100g: calcKcal(26, 0, 8), // 176 kcal
    category: 'protein',
  },
  {
    id: 'salmon',
    name: 'Losos',
    nameEn: 'Salmon',
    proteinPer100g: 20,
    carbsPer100g: 0,
    fatsPer100g: 13,
    caloriesPer100g: calcKcal(20, 0, 13), // 197 kcal
    category: 'protein',
  },
  {
    id: 'tuna_canned',
    name: 'Tuna (konzerva u vodi)',
    nameEn: 'Tuna',
    proteinPer100g: 26,
    carbsPer100g: 0,
    fatsPer100g: 1,
    caloriesPer100g: calcKcal(26, 0, 1), // 113 kcal
    category: 'protein',
  },
  {
    id: 'egg_whole',
    name: 'Jaje (cijelo)',
    nameEn: 'Egg',
    proteinPer100g: 13,
    carbsPer100g: 1,
    fatsPer100g: 10,
    caloriesPer100g: calcKcal(13, 1, 10), // 146 kcal
    category: 'protein',
  },
  {
    id: 'egg_white',
    name: 'Bjelanjak',
    nameEn: 'Egg white',
    proteinPer100g: 11,
    carbsPer100g: 1,
    fatsPer100g: 0,
    caloriesPer100g: calcKcal(11, 1, 0), // 48 kcal
    category: 'protein',
  },
  {
    id: 'ham_chicken',
    name: 'Pileća šunka/salama',
    nameEn: 'Ham',
    proteinPer100g: 18,
    carbsPer100g: 2,
    fatsPer100g: 3,
    caloriesPer100g: calcKcal(18, 2, 3), // 107 kcal
    category: 'protein',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MLIJEČNI PROIZVODI
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'greek_yogurt',
    name: 'Grčki jogurt 0%',
    nameEn: 'Greek yogurt',
    proteinPer100g: 10,
    carbsPer100g: 4,
    fatsPer100g: 0,
    caloriesPer100g: calcKcal(10, 4, 0), // 56 kcal
    category: 'dairy',
  },
  {
    id: 'skyr',
    name: 'Skyr',
    nameEn: 'Skyr',
    proteinPer100g: 11,
    carbsPer100g: 4,
    fatsPer100g: 0,
    caloriesPer100g: calcKcal(11, 4, 0), // 60 kcal
    category: 'dairy',
  },
  {
    id: 'cottage_cheese',
    name: 'Svježi sir (cottage)',
    nameEn: 'Cottage cheese',
    proteinPer100g: 11,
    carbsPer100g: 3,
    fatsPer100g: 4,
    caloriesPer100g: calcKcal(11, 3, 4), // 92 kcal
    category: 'dairy',
  },
  {
    id: 'milk_low_fat',
    name: 'Mlijeko 1.5%',
    nameEn: 'Milk',
    proteinPer100g: 3,
    carbsPer100g: 5,
    fatsPer100g: 1.5,
    caloriesPer100g: calcKcal(3, 5, 1.5), // 46 kcal
    category: 'dairy',
  },
  {
    id: 'sour_cream',
    name: 'Kiselo vrhnje 20%',
    nameEn: 'Sour cream',
    proteinPer100g: 2,
    carbsPer100g: 4,
    fatsPer100g: 20,
    caloriesPer100g: calcKcal(2, 4, 20), // 204 kcal
    category: 'dairy',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // UGLJIKOHIDRATI (žitarice, kruh, tjestenina)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'oats',
    name: 'Zobene pahuljice (suhe)',
    nameEn: 'Oats',
    proteinPer100g: 13,
    carbsPer100g: 66,
    fatsPer100g: 7,
    caloriesPer100g: calcKcal(13, 66, 7), // 379 kcal
    category: 'carb',
  },
  {
    id: 'toast',
    name: 'Tost kruh',
    nameEn: 'Toast',
    proteinPer100g: 9,
    carbsPer100g: 45,
    fatsPer100g: 3,
    caloriesPer100g: calcKcal(9, 45, 3), // 243 kcal
    category: 'carb',
  },
  {
    id: 'rice_crackers',
    name: 'Rižini krekeri',
    nameEn: 'Rice crackers',
    proteinPer100g: 7,
    carbsPer100g: 80,
    fatsPer100g: 3,
    caloriesPer100g: calcKcal(7, 80, 3), // 375 kcal
    category: 'carb',
  },
  {
    id: 'pasta_cooked',
    name: 'Tjestenina (kuhana)',
    nameEn: 'Pasta cooked',
    proteinPer100g: 5,
    carbsPer100g: 25,
    fatsPer100g: 1,
    caloriesPer100g: calcKcal(5, 25, 1), // 129 kcal
    category: 'carb',
  },
  {
    id: 'potato_boiled',
    name: 'Krumpir (kuhani)',
    nameEn: 'Potatoes',
    proteinPer100g: 2,
    carbsPer100g: 17,
    fatsPer100g: 0,
    caloriesPer100g: calcKcal(2, 17, 0), // 76 kcal
    category: 'carb',
  },
  {
    id: 'rice_cooked',
    name: 'Riža (kuhana)',
    nameEn: 'Rice',
    proteinPer100g: 3,
    carbsPer100g: 28,
    fatsPer100g: 0,
    caloriesPer100g: calcKcal(3, 28, 0), // 124 kcal
    category: 'carb',
  },
  {
    id: 'buckwheat_cooked',
    name: 'Heljda (kuhana)',
    nameEn: 'Buckwheat',
    proteinPer100g: 3,
    carbsPer100g: 20,
    fatsPer100g: 1,
    caloriesPer100g: calcKcal(3, 20, 1), // 101 kcal
    category: 'carb',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // VOĆE
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'banana',
    name: 'Banana',
    nameEn: 'Banana',
    proteinPer100g: 1,
    carbsPer100g: 23,
    fatsPer100g: 0,
    caloriesPer100g: calcKcal(1, 23, 0), // 96 kcal
    category: 'fruit',
  },
  {
    id: 'apple',
    name: 'Jabuka',
    nameEn: 'Apple',
    proteinPer100g: 0,
    carbsPer100g: 14,
    fatsPer100g: 0,
    caloriesPer100g: calcKcal(0, 14, 0), // 56 kcal
    category: 'fruit',
  },
  {
    id: 'blueberries',
    name: 'Borovnice',
    nameEn: 'Blueberries',
    proteinPer100g: 1,
    carbsPer100g: 14,
    fatsPer100g: 0,
    caloriesPer100g: calcKcal(1, 14, 0), // 60 kcal
    category: 'fruit',
  },
  {
    id: 'cherries',
    name: 'Trešnje',
    nameEn: 'Cherries',
    proteinPer100g: 1,
    carbsPer100g: 12,
    fatsPer100g: 0,
    caloriesPer100g: calcKcal(1, 12, 0), // 52 kcal
    category: 'fruit',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // POVRĆE
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'lettuce',
    name: 'Zelena salata',
    nameEn: 'Lettuce',
    proteinPer100g: 1,
    carbsPer100g: 2,
    fatsPer100g: 0,
    caloriesPer100g: calcKcal(1, 2, 0), // 12 kcal
    category: 'vegetable',
  },
  {
    id: 'tomato',
    name: 'Rajčica',
    nameEn: 'Tomato',
    proteinPer100g: 1,
    carbsPer100g: 4,
    fatsPer100g: 0,
    caloriesPer100g: calcKcal(1, 4, 0), // 20 kcal
    category: 'vegetable',
  },
  {
    id: 'cucumber',
    name: 'Krastavac',
    nameEn: 'Cucumber',
    proteinPer100g: 1,
    carbsPer100g: 4,
    fatsPer100g: 0,
    caloriesPer100g: calcKcal(1, 4, 0), // 20 kcal
    category: 'vegetable',
  },
  {
    id: 'broccoli',
    name: 'Brokula',
    nameEn: 'Broccoli',
    proteinPer100g: 3,
    carbsPer100g: 7,
    fatsPer100g: 0,
    caloriesPer100g: calcKcal(3, 7, 0), // 40 kcal
    category: 'vegetable',
  },
  {
    id: 'carrot',
    name: 'Mrkva',
    nameEn: 'Carrot',
    proteinPer100g: 1,
    carbsPer100g: 10,
    fatsPer100g: 0,
    caloriesPer100g: calcKcal(1, 10, 0), // 44 kcal
    category: 'vegetable',
  },
  {
    id: 'corn',
    name: 'Kukuruz',
    nameEn: 'Corn',
    proteinPer100g: 3,
    carbsPer100g: 19,
    fatsPer100g: 1,
    caloriesPer100g: calcKcal(3, 19, 1), // 97 kcal
    category: 'vegetable',
  },
  {
    id: 'onion',
    name: 'Luk',
    nameEn: 'Onion',
    proteinPer100g: 1,
    carbsPer100g: 9,
    fatsPer100g: 0,
    caloriesPer100g: calcKcal(1, 9, 0), // 40 kcal
    category: 'vegetable',
  },
  {
    id: 'mushroom',
    name: 'Šampinjoni',
    nameEn: 'Mushroom',
    proteinPer100g: 3,
    carbsPer100g: 3,
    fatsPer100g: 0,
    caloriesPer100g: calcKcal(3, 3, 0), // 24 kcal
    category: 'vegetable',
  },
  {
    id: 'spinach',
    name: 'Špinat',
    nameEn: 'Spinach',
    proteinPer100g: 3,
    carbsPer100g: 4,
    fatsPer100g: 0,
    caloriesPer100g: calcKcal(3, 4, 0), // 28 kcal
    category: 'vegetable',
  },
  {
    id: 'zucchini',
    name: 'Tikvica',
    nameEn: 'Zucchini',
    proteinPer100g: 1,
    carbsPer100g: 3,
    fatsPer100g: 0,
    caloriesPer100g: calcKcal(1, 3, 0), // 16 kcal
    category: 'vegetable',
  },
  {
    id: 'peas',
    name: 'Grašak',
    nameEn: 'Peas',
    proteinPer100g: 5,
    carbsPer100g: 14,
    fatsPer100g: 0,
    caloriesPer100g: calcKcal(5, 14, 0), // 76 kcal
    category: 'vegetable',
  },
  {
    id: 'garlic',
    name: 'Češnjak',
    nameEn: 'Garlic',
    proteinPer100g: 6,
    carbsPer100g: 33,
    fatsPer100g: 0,
    caloriesPer100g: calcKcal(6, 33, 0), // 156 kcal
    category: 'vegetable',
  },
  {
    id: 'bell_pepper',
    name: 'Paprika',
    nameEn: 'Bell pepper',
    proteinPer100g: 1,
    carbsPer100g: 6,
    fatsPer100g: 0,
    caloriesPer100g: calcKcal(1, 6, 0), // 28 kcal
    category: 'vegetable',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // NAMIRNICE ZA RIŽOTO - PROTEINI I RIBE
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'hake',
    name: 'Oslić',
    nameEn: 'Hake',
    proteinPer100g: 18,
    carbsPer100g: 0,
    fatsPer100g: 1,
    caloriesPer100g: calcKcal(18, 0, 1), // 81 kcal
    category: 'protein',
  },
  {
    id: 'tofu',
    name: 'Tofu',
    nameEn: 'Tofu',
    proteinPer100g: 8,
    carbsPer100g: 2,
    fatsPer100g: 4,
    caloriesPer100g: calcKcal(8, 2, 4), // 76 kcal
    category: 'protein',
  },
  {
    id: 'parmesan_light',
    name: 'Parmezan light',
    nameEn: 'Parmesan light',
    proteinPer100g: 35,
    carbsPer100g: 4,
    fatsPer100g: 25,
    caloriesPer100g: calcKcal(35, 4, 25), // 381 kcal
    category: 'dairy',
  },
  {
    id: 'butter_light',
    name: 'Maslac light',
    nameEn: 'Butter light',
    proteinPer100g: 1,
    carbsPer100g: 1,
    fatsPer100g: 40,
    caloriesPer100g: calcKcal(1, 1, 40), // 368 kcal
    category: 'fat',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // NOVE NAMIRNICE - ŽITARICE I SJEMENKE
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'quinoa_cooked',
    name: 'Quinoa (kuhana)',
    nameEn: 'Quinoa',
    proteinPer100g: 4,
    carbsPer100g: 21,
    fatsPer100g: 2,
    caloriesPer100g: calcKcal(4, 21, 2), // 120 kcal
    category: 'carb',
  },
  {
    id: 'couscous_cooked',
    name: 'Kus kus (kuhani)',
    nameEn: 'Couscous',
    proteinPer100g: 4,
    carbsPer100g: 23,
    fatsPer100g: 0,
    caloriesPer100g: calcKcal(4, 23, 0), // 108 kcal
    category: 'carb',
  },
  {
    id: 'whole_wheat_pasta',
    name: 'Integralna tjestenina (kuhana)',
    nameEn: 'Whole wheat pasta',
    proteinPer100g: 5,
    carbsPer100g: 27,
    fatsPer100g: 1,
    caloriesPer100g: calcKcal(5, 27, 1), // 137 kcal
    category: 'carb',
  },
  {
    id: 'tortilla',
    name: 'Tortilja (pšenična)',
    nameEn: 'Tortilla',
    proteinPer100g: 8,
    carbsPer100g: 48,
    fatsPer100g: 7,
    caloriesPer100g: calcKcal(8, 48, 7), // 287 kcal
    category: 'carb',
  },
  {
    id: 'chia_seeds',
    name: 'Chia sjemenke',
    nameEn: 'Chia seeds',
    proteinPer100g: 17,
    carbsPer100g: 42,
    fatsPer100g: 31,
    caloriesPer100g: calcKcal(17, 42, 31), // 515 kcal
    category: 'fat',
  },
  {
    id: 'flax_seeds',
    name: 'Lanene sjemenke',
    nameEn: 'Flax seeds',
    proteinPer100g: 18,
    carbsPer100g: 29,
    fatsPer100g: 42,
    caloriesPer100g: calcKcal(18, 29, 42), // 566 kcal
    category: 'fat',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // NOVE NAMIRNICE - MAHUNARKE
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'black_beans',
    name: 'Crni grah (kuhani)',
    nameEn: 'Black beans',
    proteinPer100g: 9,
    carbsPer100g: 24,
    fatsPer100g: 0,
    caloriesPer100g: calcKcal(9, 24, 0), // 132 kcal
    category: 'carb',
  },
  {
    id: 'kidney_beans',
    name: 'Crveni grah (kuhani)',
    nameEn: 'Kidney beans',
    proteinPer100g: 9,
    carbsPer100g: 22,
    fatsPer100g: 0,
    caloriesPer100g: calcKcal(9, 22, 0), // 124 kcal
    category: 'carb',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // NOVE NAMIRNICE - VOĆE
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'raspberries',
    name: 'Maline',
    nameEn: 'Raspberries',
    proteinPer100g: 1,
    carbsPer100g: 12,
    fatsPer100g: 1,
    caloriesPer100g: calcKcal(1, 12, 1), // 61 kcal
    category: 'fruit',
  },
  {
    id: 'strawberries',
    name: 'Jagode',
    nameEn: 'Strawberries',
    proteinPer100g: 1,
    carbsPer100g: 8,
    fatsPer100g: 0,
    caloriesPer100g: calcKcal(1, 8, 0), // 36 kcal
    category: 'fruit',
  },
  {
    id: 'mango',
    name: 'Mango',
    nameEn: 'Mango',
    proteinPer100g: 1,
    carbsPer100g: 15,
    fatsPer100g: 0,
    caloriesPer100g: calcKcal(1, 15, 0), // 64 kcal
    category: 'fruit',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // NOVE NAMIRNICE - MLIJEČNI I SIREVI
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'mozzarella',
    name: 'Mozzarella',
    nameEn: 'Mozzarella',
    proteinPer100g: 22,
    carbsPer100g: 2,
    fatsPer100g: 22,
    caloriesPer100g: calcKcal(22, 2, 22), // 294 kcal
    category: 'dairy',
  },
  {
    id: 'tomato_sauce',
    name: 'Pasirana rajčica',
    nameEn: 'Tomato sauce',
    proteinPer100g: 1,
    carbsPer100g: 8,
    fatsPer100g: 0,
    caloriesPer100g: calcKcal(1, 8, 0), // 36 kcal
    category: 'vegetable',
  },
  {
    id: 'olives',
    name: 'Masline',
    nameEn: 'Olives',
    proteinPer100g: 1,
    carbsPer100g: 4,
    fatsPer100g: 15,
    caloriesPer100g: calcKcal(1, 4, 15), // 155 kcal
    category: 'fat',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MASTI I ORAŠASTI PLODOVI
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'avocado',
    name: 'Avokado',
    nameEn: 'Avocado',
    proteinPer100g: 2,
    carbsPer100g: 9,
    fatsPer100g: 15,
    caloriesPer100g: calcKcal(2, 9, 15), // 179 kcal
    category: 'fat',
  },
  {
    id: 'peanut_butter',
    name: 'Maslac od kikirikija',
    nameEn: 'Peanut butter',
    proteinPer100g: 25,
    carbsPer100g: 20,
    fatsPer100g: 50,
    caloriesPer100g: calcKcal(25, 20, 50), // 630 kcal
    category: 'fat',
  },
  {
    id: 'almonds',
    name: 'Bademi',
    nameEn: 'Almonds',
    proteinPer100g: 21,
    carbsPer100g: 22,
    fatsPer100g: 50,
    caloriesPer100g: calcKcal(21, 22, 50), // 622 kcal
    category: 'fat',
  },
  {
    id: 'cashews',
    name: 'Indijski oraščići',
    nameEn: 'Cashews',
    proteinPer100g: 18,
    carbsPer100g: 30,
    fatsPer100g: 44,
    caloriesPer100g: calcKcal(18, 30, 44), // 588 kcal
    category: 'fat',
  },
  {
    id: 'olive_oil',
    name: 'Maslinovo ulje',
    nameEn: 'Olive oil',
    proteinPer100g: 0,
    carbsPer100g: 0,
    fatsPer100g: 100,
    caloriesPer100g: calcKcal(0, 0, 100), // 900 kcal
    category: 'fat',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SUPLEMENTI
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'whey_protein',
    name: 'Whey protein',
    nameEn: 'Whey',
    proteinPer100g: 80,
    carbsPer100g: 8,
    fatsPer100g: 3,
    caloriesPer100g: calcKcal(80, 8, 3), // 379 kcal
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

