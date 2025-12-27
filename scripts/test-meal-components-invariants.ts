/**
 * Test skripta koja prođe sva jela iz meal_components.json i verificira invariants
 * 
 * Pokreće se sa: tsx scripts/test-meal-components-invariants.ts
 * 
 * Test provjerava:
 * 1. Da se nakon generiranja plana ne pojavljuju extra sastojci (koji nisu u JSON-u)
 * 2. Da se ne gube sastojci (missing sastojci)
 * 3. Da su gramaže razumne (ne eksplodirale)
 * 4. Da se invariants zadržavaju kroz više iteracija
 */

import { generateWeeklyProMealPlanWithCalculations } from '../lib/services/proMealPlanGenerator';
import mealComponents from '../lib/data/meal_components.json';
import { MealComponentsConfig } from '../lib/data/meal_components';

// Tipovi za meal_components.json
type MealComponent = {
  food: string;
  grams: number;
  displayName?: string;
};

type MealDefinition = {
  id: string;
  name: string;
  components: MealComponent[];
  tags?: string[];
  suitableFor?: string[];
  description?: string;
  preparationTip?: string;
};

type MealComponentsConfigType = {
  breakfast: MealDefinition[];
  lunch: MealDefinition[];
  dinner: MealDefinition[];
  snack: MealDefinition[];
};

const MEAL_COMPONENTS = mealComponents as MealComponentsConfigType;

interface TestResult {
  mealId: string;
  mealName: string;
  slot: string;
  iteration: number;
  passed: boolean;
  errors: string[];
  warnings: string[];
  originalComponents: string[];
  finalComponents: string[];
  extraComponents: string[];
  missingComponents: string[];
  invalidGrams: Array<{ component: string; grams: number }>;
}

/**
 * Provjeri invariants za jelo
 */
function checkMealInvariants(
  mealId: string,
  mealName: string,
  slot: string,
  originalComponents: MealComponent[],
  finalComponentDetails: any[]
): { passed: boolean; errors: string[]; warnings: string[]; extra: string[]; missing: string[]; invalidGrams: Array<{ component: string; grams: number }> } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const invalidGrams: Array<{ component: string; grams: number }> = [];
  
  // Kreiraj Set originalnih food ključeva (lowercase)
  const originalFoodKeys = new Set(originalComponents.map(c => c.food.toLowerCase().trim()));
  
  // Kreiraj Set finalnih food ključeva (lowercase)
  const finalFoodKeys = new Set(finalComponentDetails.map((c: any) => {
    const foodName = (c.foodName || c.name || c.food?.name || '').toLowerCase().trim();
    return foodName;
  }));
  
  // Provjeri extra sastojke (sastojci koji nisu u originalComponents)
  const extra: string[] = [];
  for (const finalFood of finalFoodKeys) {
    if (finalFood.includes('water') || finalFood.includes('voda')) continue;
    
    const hasMatch = Array.from(originalFoodKeys).some(origFood => {
      if (origFood === finalFood) return true;
      const origWords = origFood.split(/\s+/);
      const finalWords = finalFood.split(/\s+/);
      return origWords.some(ow => finalWords.some(fw => ow.includes(fw) || fw.includes(ow)));
    });
    
    if (!hasMatch) {
      extra.push(finalFood);
    }
  }
  
  // Provjeri missing sastojke (sastojci koji su u originalComponents ali nisu u finalComponentDetails)
  const missing: string[] = [];
  for (const origFood of originalFoodKeys) {
    if (origFood.includes('water') || origFood.includes('voda')) continue;
    
    const hasMatch = Array.from(finalFoodKeys).some(finalFood => {
      if (origFood === finalFood) return true;
      const origWords = origFood.split(/\s+/);
      const finalWords = finalFood.split(/\s+/);
      return origWords.some(ow => finalWords.some(fw => ow.includes(fw) || fw.includes(ow)));
    });
    
    if (!hasMatch) {
      missing.push(origFood);
    }
  }
  
  // Provjeri gramaže
  const MAX_REASONABLE_GRAMS = 600;
  for (const comp of finalComponentDetails) {
    const grams = comp.grams || 0;
    if (isNaN(grams) || grams < 0) {
      invalidGrams.push({ component: comp.foodName || comp.name || '', grams });
      errors.push(`Invalid grams: ${comp.foodName || comp.name} = ${grams}g`);
    }
    if (grams > MAX_REASONABLE_GRAMS) {
      invalidGrams.push({ component: comp.foodName || comp.name || '', grams });
      errors.push(`Grams too high: ${comp.foodName || comp.name} = ${grams}g (max: ${MAX_REASONABLE_GRAMS}g)`);
    }
  }
  
  // Dodaj greške za extra i missing sastojke
  if (extra.length > 0) {
    errors.push(`Extra sastojci: ${extra.join(', ')}`);
  }
  if (missing.length > 0) {
    warnings.push(`Missing sastojci: ${missing.join(', ')}`);
  }
  
  const passed = errors.length === 0;
  
  return { passed, errors, warnings, extra, missing, invalidGrams };
}

/**
 * Testira sva jela iz meal_components.json
 */
async function testAllMeals(iterations: number = 50): Promise<TestResult[]> {
  const results: TestResult[] = [];
  
  // Test kalkulacije (za testiranje)
  const testCalculations = {
    targetCalories: 2000,
    targetProtein: 150,
    targetCarbs: 200,
    targetFat: 65,
    goalType: 'maintain' as const,
  };
  
  console.log(`\n🧪 TESTIRANJE INVARIANTS ZA SVA JELA IZ meal_components.json`);
  console.log(`   Iteracije po jelu: ${iterations}`);
  console.log(`   Test kalkulacije: ${testCalculations.targetCalories} kcal, P: ${testCalculations.targetProtein}g, C: ${testCalculations.targetCarbs}g, F: ${testCalculations.targetFat}g\n`);
  
  // Prođi kroz sve slotove
  const slots = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
  
  for (const slot of slots) {
    const meals = MEAL_COMPONENTS[slot] || [];
    console.log(`\n📋 Testiranje ${meals.length} jela za ${slot}...`);
    
    for (const meal of meals) {
      console.log(`   🔍 Testiranje: ${meal.name} (${meal.id})...`);
      
      // Testiraj jelo N puta
      for (let i = 0; i < iterations; i++) {
        try {
          // Generiraj plan (koristi samo test kalkulacije)
          const plan = await generateWeeklyProMealPlanWithCalculations(testCalculations);
          
          // Pronađi jelo u planu (provjeri sve dane)
          let foundMeal: any = null;
          for (const day of plan.days) {
            const slotMeal = day.meals[slot];
            if (slotMeal && (slotMeal.id === meal.id || slotMeal.name === meal.name)) {
              foundMeal = slotMeal;
              break;
            }
          }
          
          if (!foundMeal) {
            // Jelo nije generirano u ovom planu - to je OK, nastavi
            continue;
          }
          
          // Provjeri invariants
          const originalComponents = meal.components || [];
          const finalComponentDetails = (foundMeal as any).componentDetails || [];
          
          const checkResult = checkMealInvariants(
            meal.id,
            meal.name,
            slot,
            originalComponents,
            finalComponentDetails
          );
          
          if (!checkResult.passed || checkResult.warnings.length > 0) {
            const result: TestResult = {
              mealId: meal.id,
              mealName: meal.name,
              slot,
              iteration: i + 1,
              passed: checkResult.passed,
              errors: checkResult.errors,
              warnings: checkResult.warnings,
              originalComponents: originalComponents.map(c => c.food),
              finalComponents: finalComponentDetails.map((c: any) => c.foodName || c.name || c.food?.name || ''),
              extraComponents: checkResult.extra,
              missingComponents: checkResult.missing,
              invalidGrams: checkResult.invalidGrams,
            };
            
            results.push(result);
            
            // Ispiši grešku odmah
            console.error(`\n   ❌ FAIL na iteraciji ${i + 1}:`);
            console.error(`      Meal: ${meal.name} (${meal.id})`);
            console.error(`      Errors: ${checkResult.errors.join('; ')}`);
            if (checkResult.warnings.length > 0) {
              console.warn(`      Warnings: ${checkResult.warnings.join('; ')}`);
            }
            console.error(`      Original components: ${result.originalComponents.join(', ')}`);
            console.error(`      Final components: ${result.finalComponents.join(', ')}`);
            if (checkResult.extra.length > 0) {
              console.error(`      Extra: ${checkResult.extra.join(', ')}`);
            }
            if (checkResult.missing.length > 0) {
              console.warn(`      Missing: ${checkResult.missing.join(', ')}`);
            }
            
            // Ako je kritična greška, zaustavi testiranje ovog jela
            if (checkResult.errors.length > 0) {
              break;
            }
          }
        } catch (error) {
          console.error(`   ❌ ERROR na iteraciji ${i + 1} za ${meal.name}:`, error);
          results.push({
            mealId: meal.id,
            mealName: meal.name,
            slot,
            iteration: i + 1,
            passed: false,
            errors: [error instanceof Error ? error.message : String(error)],
            warnings: [],
            originalComponents: meal.components.map(c => c.food),
            finalComponents: [],
            extraComponents: [],
            missingComponents: [],
            invalidGrams: [],
          });
          break;
        }
      }
    }
  }
  
  return results;
}

/**
 * Glavna funkcija
 */
async function main() {
  try {
    const iterations = parseInt(process.env.TEST_ITERATIONS || '50', 10);
    const results = await testAllMeals(iterations);
    
    // Sažetak rezultata
    console.log(`\n\n📊 SAŽETAK REZULTATA:`);
    console.log(`   Ukupno testiranih jela: ${results.length}`);
    
    const failed = results.filter(r => !r.passed);
    const passed = results.filter(r => r.passed);
    
    console.log(`   ✅ Prošlo: ${passed.length}`);
    console.log(`   ❌ Neuspjelo: ${failed.length}`);
    
    if (failed.length > 0) {
      console.log(`\n❌ NEUSPJELA JELA:`);
      for (const result of failed) {
        console.log(`\n   ${result.mealName} (${result.mealId}) - ${result.slot} - Iteracija ${result.iteration}:`);
        console.log(`      Errors: ${result.errors.join('; ')}`);
        if (result.warnings.length > 0) {
          console.log(`      Warnings: ${result.warnings.join('; ')}`);
        }
        console.log(`      Original: ${result.originalComponents.join(', ')}`);
        console.log(`      Final: ${result.finalComponents.join(', ')}`);
        if (result.extraComponents.length > 0) {
          console.log(`      Extra: ${result.extraComponents.join(', ')}`);
        }
        if (result.missingComponents.length > 0) {
          console.log(`      Missing: ${result.missingComponents.join(', ')}`);
        }
        if (result.invalidGrams.length > 0) {
          console.log(`      Invalid grams: ${result.invalidGrams.map(g => `${g.component}=${g.grams}g`).join(', ')}`);
        }
      }
      
      process.exit(1);
    } else {
      console.log(`\n✅ SVI TESTOVI PROŠLI!`);
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ FATAL ERROR:', error);
    process.exit(1);
  }
}

// Pokreni test
main();


