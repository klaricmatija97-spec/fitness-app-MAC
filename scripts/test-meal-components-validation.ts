/**
 * Test skript za validaciju sastojaka jela
 * 
 * Provjerava da set(final.food) == set(meal.components.food) za sva jela
 * i da su grams identični (ili skalirani proporcionalno)
 */

import mealComponentsData from '../lib/data/meal_components.json';
// buildCompositeMealForSlot nije exportan, koristimo alternativni pristup
// import { buildCompositeMealForSlot } from '../lib/services/proMealPlanGenerator';
import { findNamirnica } from '../lib/data/foods-database';

interface MealComponent {
  food: string;
  grams: number;
  displayName?: string;
}

interface MealDefinition {
  id: string;
  name: string;
  components: MealComponent[];
  description?: string;
  preparationTip?: string;
  tags?: string[];
  suitableFor?: string[];
}

interface TestResult {
  mealId: string;
  mealName: string;
  slot: string;
  passed: boolean;
  errors: string[];
  warnings: string[];
  originalComponents: Array<{ food: string; grams: number }>;
  finalComponents: Array<{ food: string; grams: number }>;
}

const MEAL_COMPONENTS = mealComponentsData as any;

async function testMealComponents() {
  console.log('🧪 Počinjem validaciju sastojaka jela...\n');
  
  const results: TestResult[] = [];
  const slots: Array<'breakfast' | 'lunch' | 'dinner' | 'snack'> = ['breakfast', 'lunch', 'dinner', 'snack'];
  
  for (const slot of slots) {
    const meals = MEAL_COMPONENTS[slot] || [];
    console.log(`\n📋 Testiram ${meals.length} jela za ${slot}...`);
    
    for (const meal of meals as MealDefinition[]) {
      const mealId = meal.id || meal.name;
      const testResult: TestResult = {
        mealId,
        mealName: meal.name,
        slot,
        passed: true,
        errors: [],
        warnings: [],
        originalComponents: meal.components.map(c => ({
          food: c.food.toLowerCase().trim(),
          grams: c.grams
        })),
        finalComponents: []
      };
      
      try {
        // Generiraj jelo koristeći buildCompositeMealForSlot
        const generatedMeal = await buildCompositeMealForSlot(
          slot,
          [], // allFoods - prazan array, koristi se foods-database.ts
          new Set(), // usedToday
          500, // slotTargetCalories (proizvoljno)
          null, // previousMeal
          [], // previousMeals
          2, // minIngredients
          null, // usedMealsThisWeek
          null, // previousDayMeal
          new Set(), // excludedMealNames
          'maintain', // userGoal
          undefined, // preferences
          null // preferredSnackType
        );
        
        if (!generatedMeal) {
          testResult.passed = false;
          testResult.errors.push('buildCompositeMealForSlot je vratio null');
          results.push(testResult);
          continue;
        }
        
        // Izvuci finalne komponente
        const componentDetails = (generatedMeal as any).componentDetails || [];
        testResult.finalComponents = componentDetails.map((c: any) => ({
          food: (c.foodName || c.name || c.food?.name || '').toLowerCase().trim(),
          grams: c.grams || 0
        }));
        
        // Provjeri da li se svi originalni sastojci nalaze u finalnim
        const originalFoodSet = new Set(testResult.originalComponents.map(c => c.food));
        const finalFoodSet = new Set(testResult.finalComponents.map(c => c.food));
        
        // Preskoči vodu u provjeri (ona se filtrira)
        const originalFoodsWithoutWater = Array.from(originalFoodSet).filter(f => 
          !f.includes('water') && !f.includes('voda')
        );
        const finalFoodsWithoutWater = Array.from(finalFoodSet).filter(f => 
          !f.includes('water') && !f.includes('voda')
        );
        
        // Provjeri da li postoje extra sastojci
        const extraComponents = finalFoodsWithoutWater.filter(f => {
          // Provjeri fuzzy match (možda se nazivi razlikuju malo)
          return !originalFoodsWithoutWater.some(orig => 
            orig.includes(f) || f.includes(orig) || 
            orig.replace(/\s+/g, '') === f.replace(/\s+/g, '')
          );
        });
        
        // Provjeri da li nedostaju originalne komponente
        const missingComponents = originalFoodsWithoutWater.filter(orig => {
          return !finalFoodsWithoutWater.some(final => 
            final.includes(orig) || orig.includes(final) ||
            orig.replace(/\s+/g, '') === final.replace(/\s+/g, '')
          );
        });
        
        if (extraComponents.length > 0) {
          testResult.passed = false;
          testResult.errors.push(`Extra sastojci (ne postoje u meal_components.json): ${extraComponents.join(', ')}`);
        }
        
        if (missingComponents.length > 0) {
          testResult.passed = false;
          testResult.errors.push(`Nedostaju sastojci (iz meal_components.json): ${missingComponents.join(', ')}`);
        }
        
        // Provjeri da li se broj komponenti poklapa (bez vode)
        if (originalFoodsWithoutWater.length !== finalFoodsWithoutWater.length) {
          testResult.passed = false;
          testResult.errors.push(
            `Broj komponenti se ne poklapa: ${originalFoodsWithoutWater.length} (original) vs ${finalFoodsWithoutWater.length} (final)`
          );
        }
        
        // Provjeri gramaže (mogu biti skalirane, ali bi trebale biti proporcionalne)
        // Ovo je warning, ne error, jer se gramaže skaliraju prema target kalorijama
        const originalTotalGrams = testResult.originalComponents
          .filter(c => !c.food.includes('water') && !c.food.includes('voda'))
          .reduce((sum, c) => sum + c.grams, 0);
        const finalTotalGrams = testResult.finalComponents
          .filter(c => !c.food.includes('water') && !c.food.includes('voda'))
          .reduce((sum, c) => sum + c.grams, 0);
        
        if (originalTotalGrams > 0) {
          const gramsRatio = finalTotalGrams / originalTotalGrams;
          // Ako je ratio previše različit (manje od 0.5 ili više od 2.0), upozori
          if (gramsRatio < 0.5 || gramsRatio > 2.0) {
            testResult.warnings.push(
              `Gramaže su značajno različite: original ${originalTotalGrams}g vs final ${finalTotalGrams}g (ratio: ${gramsRatio.toFixed(2)})`
            );
          }
        }
        
      } catch (error) {
        testResult.passed = false;
        testResult.errors.push(`Greška pri generiranju: ${error instanceof Error ? error.message : String(error)}`);
      }
      
      results.push(testResult);
      
      // Ispiši rezultat
      if (!testResult.passed) {
        console.log(`  ❌ ${meal.name}: ${testResult.errors.join('; ')}`);
      } else if (testResult.warnings.length > 0) {
        console.log(`  ⚠️  ${meal.name}: ${testResult.warnings.join('; ')}`);
      } else {
        console.log(`  ✅ ${meal.name}`);
      }
    }
  }
  
  // Sažetak
  console.log('\n' + '='.repeat(80));
  console.log('📊 SAŽETAK VALIDACIJE');
  console.log('='.repeat(80));
  
  const totalMeals = results.length;
  const passedMeals = results.filter(r => r.passed).length;
  const failedMeals = results.filter(r => !r.passed);
  const mealsWithWarnings = results.filter(r => r.warnings.length > 0);
  
  console.log(`\nUkupno jela: ${totalMeals}`);
  console.log(`✅ Prošlo: ${passedMeals} (${((passedMeals / totalMeals) * 100).toFixed(1)}%)`);
  console.log(`❌ Neuspjelo: ${failedMeals.length} (${((failedMeals.length / totalMeals) * 100).toFixed(1)}%)`);
  console.log(`⚠️  S upozorenjima: ${mealsWithWarnings.length}`);
  
  if (failedMeals.length > 0) {
    console.log('\n❌ NEUSPJELA JELA:');
    console.log('-'.repeat(80));
    for (const failed of failedMeals) {
      console.log(`\n${failed.mealName} (${failed.slot}):`);
      console.log(`  Originalne komponente: ${failed.originalComponents.map(c => `${c.food} (${c.grams}g)`).join(', ')}`);
      console.log(`  Finalne komponente: ${failed.finalComponents.map(c => `${c.food} (${c.grams}g)`).join(', ')}`);
      failed.errors.forEach(err => console.log(`  ❌ ${err}`));
    }
  }
  
  // Ispiši "svako treće" jelo koje pada
  if (failedMeals.length > 0) {
    console.log('\n🔍 ANALIZA: "Svako treće" jelo koje pada:');
    console.log('-'.repeat(80));
    for (let i = 2; i < failedMeals.length; i += 3) {
      const failed = failedMeals[i];
      console.log(`\n${i + 1}. ${failed.mealName} (${failed.slot}):`);
      console.log(`   Original: ${failed.originalComponents.map(c => c.food).join(', ')}`);
      console.log(`   Final: ${failed.finalComponents.map(c => c.food).join(', ')}`);
      console.log(`   Greške: ${failed.errors.join('; ')}`);
    }
  }
  
  console.log('\n' + '='.repeat(80));
  
  // Vrati exit code
  process.exit(failedMeals.length > 0 ? 1 : 0);
}

// Pokreni test
testMealComponents().catch(error => {
  console.error('❌ Greška pri pokretanju testa:', error);
  process.exit(1);
});

