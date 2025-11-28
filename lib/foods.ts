/**
 * Foods Library
 * 
 * Tipovi i funkcije za rad sa hranom i generiranje planova prehrane
 */

// ============================================
// TYPES
// ============================================

export interface Food {
  id: string;
  name: string;
  category: "protein" | "carbs" | "fats" | "vegetables" | "fruits";
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatsPer100g: number;
  amount?: number; // Količina u gramima (opciono)
}

export interface Meal {
  foods: Food[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFats: number;
}

export interface MealPlan {
  days: Meal[][]; // days[0] = dan 1, days[1] = dan 2, itd.
}

// ============================================
// FOOD DATABASE
// ============================================

/**
 * Osnovna baza hrane sa makronutrijentima
 */
export const healthyFoods: Food[] = [
  // Proteini
  { id: "chicken-breast", name: "Pileća prsa", category: "protein", caloriesPer100g: 165, proteinPer100g: 31, carbsPer100g: 0, fatsPer100g: 3.6 },
  { id: "turkey", name: "Puretina", category: "protein", caloriesPer100g: 189, proteinPer100g: 29, carbsPer100g: 0, fatsPer100g: 7 },
  { id: "salmon", name: "Losos", category: "protein", caloriesPer100g: 208, proteinPer100g: 20, carbsPer100g: 0, fatsPer100g: 12 },
  { id: "tuna", name: "Tuna", category: "protein", caloriesPer100g: 144, proteinPer100g: 30, carbsPer100g: 0, fatsPer100g: 1 },
  { id: "eggs", name: "Jaja", category: "protein", caloriesPer100g: 155, proteinPer100g: 13, carbsPer100g: 1.1, fatsPer100g: 11 },
  { id: "greek-yogurt", name: "Grčki jogurt", category: "protein", caloriesPer100g: 59, proteinPer100g: 10, carbsPer100g: 3.6, fatsPer100g: 0.4 },
  { id: "cottage-cheese", name: "Svježi sir", category: "protein", caloriesPer100g: 98, proteinPer100g: 11, carbsPer100g: 3.4, fatsPer100g: 4.3 },
  { id: "lean-beef", name: "Mljeveno meso (mlado)", category: "protein", caloriesPer100g: 250, proteinPer100g: 26, carbsPer100g: 0, fatsPer100g: 17 },
  
  // Ugljikohidrati
  { id: "rice", name: "Riža (kuhana)", category: "carbs", caloriesPer100g: 130, proteinPer100g: 2.7, carbsPer100g: 28, fatsPer100g: 0.3 },
  { id: "sweet-potatoes", name: "Batat", category: "carbs", caloriesPer100g: 86, proteinPer100g: 1.6, carbsPer100g: 20, fatsPer100g: 0.1 },
  { id: "potatoes", name: "Krumpir", category: "carbs", caloriesPer100g: 77, proteinPer100g: 2, carbsPer100g: 17, fatsPer100g: 0.1 },
  { id: "oats", name: "Zobene pahuljice", category: "carbs", caloriesPer100g: 389, proteinPer100g: 17, carbsPer100g: 66, fatsPer100g: 7 },
  { id: "quinoa", name: "Quinoa", category: "carbs", caloriesPer100g: 368, proteinPer100g: 14, carbsPer100g: 64, fatsPer100g: 6 },
  { id: "banana", name: "Banana", category: "carbs", caloriesPer100g: 89, proteinPer100g: 1.1, carbsPer100g: 23, fatsPer100g: 0.3 },
  { id: "bread", name: "Kruh (cijelozrnati)", category: "carbs", caloriesPer100g: 247, proteinPer100g: 13, carbsPer100g: 41, fatsPer100g: 4.2 },
  
  // Masti
  { id: "avocado", name: "Avokado", category: "fats", caloriesPer100g: 160, proteinPer100g: 2, carbsPer100g: 9, fatsPer100g: 15 },
  { id: "olive-oil", name: "Maslinovo ulje", category: "fats", caloriesPer100g: 884, proteinPer100g: 0, carbsPer100g: 0, fatsPer100g: 100 },
  { id: "almonds", name: "Bademi", category: "fats", caloriesPer100g: 579, proteinPer100g: 21, carbsPer100g: 22, fatsPer100g: 50 },
  { id: "walnuts", name: "Orašasti plodovi (orah)", category: "fats", caloriesPer100g: 654, proteinPer100g: 15, carbsPer100g: 14, fatsPer100g: 65 },
  { id: "peanut-butter", name: "Maslac od kikirikija", category: "fats", caloriesPer100g: 588, proteinPer100g: 25, carbsPer100g: 20, fatsPer100g: 50 },
  
  // Povrće
  { id: "broccoli", name: "Brokula", category: "vegetables", caloriesPer100g: 34, proteinPer100g: 2.8, carbsPer100g: 7, fatsPer100g: 0.4 },
  { id: "spinach", name: "Špinat", category: "vegetables", caloriesPer100g: 23, proteinPer100g: 2.9, carbsPer100g: 3.6, fatsPer100g: 0.4 },
  { id: "carrots", name: "Mrkva", category: "vegetables", caloriesPer100g: 41, proteinPer100g: 0.9, carbsPer100g: 10, fatsPer100g: 0.2 },
  { id: "tomatoes", name: "Rajčica", category: "vegetables", caloriesPer100g: 18, proteinPer100g: 0.9, carbsPer100g: 3.9, fatsPer100g: 0.2 },
  { id: "cucumber", name: "Krastavac", category: "vegetables", caloriesPer100g: 16, proteinPer100g: 0.7, carbsPer100g: 4, fatsPer100g: 0.1 },
  { id: "peppers", name: "Paprika", category: "vegetables", caloriesPer100g: 20, proteinPer100g: 1, carbsPer100g: 4.6, fatsPer100g: 0.2 },
  
  // Voće
  { id: "apple", name: "Jabuka", category: "fruits", caloriesPer100g: 52, proteinPer100g: 0.3, carbsPer100g: 14, fatsPer100g: 0.2 },
  { id: "orange", name: "Naranča", category: "fruits", caloriesPer100g: 47, proteinPer100g: 0.9, carbsPer100g: 12, fatsPer100g: 0.1 },
  { id: "berries", name: "Bobice (mješano)", category: "fruits", caloriesPer100g: 57, proteinPer100g: 0.7, carbsPer100g: 14, fatsPer100g: 0.3 },
];

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Izračunaj ukupne makroe za listu hrane
 */
function calculateMealTotals(foods: Food[]): { calories: number; protein: number; carbs: number; fats: number } {
  return foods.reduce(
    (totals, food) => {
      const amount = food.amount || 100;
      const ratio = amount / 100;
      return {
        calories: totals.calories + food.caloriesPer100g * ratio,
        protein: totals.protein + food.proteinPer100g * ratio,
        carbs: totals.carbs + food.carbsPer100g * ratio,
        fats: totals.fats + food.fatsPer100g * ratio,
      };
    },
    { calories: 0, protein: 0, carbs: 0, fats: 0 }
  );
}

// ============================================
// MAIN FUNCTION: generateMealPlan
// ============================================

/**
 * Generiraj dnevni plan prehrane
 * 
 * @param targetCalories - Ciljne kalorije po danu
 * @param targetProtein - Ciljni proteini (g) po danu
 * @param targetCarbs - Ciljni ugljikohidrati (g) po danu
 * @param targetFats - Ciljne masti (g) po danu
 * @param days - Broj dana (default: 7)
 * @returns MealPlan - Plan prehrane za navedeni broj dana
 */
export function generateMealPlan(
  targetCalories: number,
  targetProtein: number,
  targetCarbs: number,
  targetFats: number,
  days: number = 7
): MealPlan {
  const mealPlan: MealPlan = { days: [] };

  for (let day = 0; day < days; day++) {
    const dailyMeals: Meal[] = [];
    let remainingCalories = targetCalories;
    let remainingProtein = targetProtein;
    let remainingCarbs = targetCarbs;
    let remainingFats = targetFats;

    // Generiraj 3-4 obroka dnevno
    const mealCount = 4;
    const caloriesPerMeal = targetCalories / mealCount;
    const proteinPerMeal = targetProtein / mealCount;
    const carbsPerMeal = targetCarbs / mealCount;
    const fatsPerMeal = targetFats / mealCount;

    for (let mealIndex = 0; mealIndex < mealCount; mealIndex++) {
      const mealFoods: Food[] = [];
      let currentCal = 0;
      let currentProt = 0;
      let currentCarb = 0;
      let currentFat = 0;

      const targetCal = caloriesPerMeal;
      const targetProt = proteinPerMeal;
      const targetCarb = carbsPerMeal;
      const targetFat = fatsPerMeal;

      // Dodaj proteine
      const proteins = healthyFoods.filter((f) => f.category === "protein");
      while (currentProt < targetProt * 0.9 && proteins.length > 0) {
        const food = proteins[Math.floor(Math.random() * proteins.length)];
        const amount = Math.min(200, (targetProt - currentProt) / food.proteinPer100g * 100);
        mealFoods.push({ ...food, amount: Math.round(amount) });
        currentCal += (food.caloriesPer100g * amount / 100);
        currentProt += (food.proteinPer100g * amount / 100);
        currentCarb += (food.carbsPer100g * amount / 100);
        currentFat += (food.fatsPer100g * amount / 100);
      }

      // Dodaj ugljikohidrate
      const carbs = healthyFoods.filter((f) => f.category === "carbs");
      while (currentCarb < targetCarb * 0.9 && carbs.length > 0) {
        const food = carbs[Math.floor(Math.random() * carbs.length)];
        const amount = Math.min(300, (targetCarb - currentCarb) / food.carbsPer100g * 100);
        mealFoods.push({ ...food, amount: Math.round(amount) });
        currentCal += (food.caloriesPer100g * amount / 100);
        currentProt += (food.proteinPer100g * amount / 100);
        currentCarb += (food.carbsPer100g * amount / 100);
        currentFat += (food.fatsPer100g * amount / 100);
      }

      // Dodaj masti
      const fats = healthyFoods.filter((f) => f.category === "fats");
      while (currentFat < targetFat * 0.9 && fats.length > 0) {
        const food = fats[Math.floor(Math.random() * fats.length)];
        const amount = Math.min(50, (targetFat - currentFat) / food.fatsPer100g * 100);
        mealFoods.push({ ...food, amount: Math.round(amount) });
        currentCal += (food.caloriesPer100g * amount / 100);
        currentProt += (food.proteinPer100g * amount / 100);
        currentCarb += (food.carbsPer100g * amount / 100);
        currentFat += (food.fatsPer100g * amount / 100);
      }

      // Dodaj povrće (zeleno, niskokalorično)
      if (mealIndex < 3) { // Ne dodavaj povrće u snack
        const vegetables = healthyFoods.filter((f) => f.category === "vegetables");
        const vegCount = Math.floor(Math.random() * 3) + 1; // 1-3 povrća
        for (let i = 0; i < vegCount; i++) {
          const food = vegetables[Math.floor(Math.random() * vegetables.length)];
          const amount = Math.floor(Math.random() * 100) + 50; // 50-150g
          mealFoods.push({ ...food, amount });
          currentCal += (food.caloriesPer100g * amount / 100);
          currentProt += (food.proteinPer100g * amount / 100);
          currentCarb += (food.carbsPer100g * amount / 100);
          currentFat += (food.fatsPer100g * amount / 100);
        }
      }

      const totals = calculateMealTotals(mealFoods);
      dailyMeals.push({
        foods: mealFoods,
        totalCalories: Math.round(totals.calories * 10) / 10,
        totalProtein: Math.round(totals.protein * 10) / 10,
        totalCarbs: Math.round(totals.carbs * 10) / 10,
        totalFats: Math.round(totals.fats * 10) / 10,
      });

      remainingCalories -= totals.calories;
      remainingProtein -= totals.protein;
      remainingCarbs -= totals.carbs;
      remainingFats -= totals.fats;
    }

    mealPlan.days.push(dailyMeals);
  }

  return mealPlan;
}

// ============================================
// EXPORT
// ============================================

export default {
  healthyFoods,
  generateMealPlan,
};

