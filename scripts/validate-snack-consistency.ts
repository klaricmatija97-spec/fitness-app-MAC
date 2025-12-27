/**
 * SCRIPT - Validira konzistentnost naziva i sastojaka za sve užine
 * 
 * Usage:
 *   npx tsx scripts/validate-snack-consistency.ts
 */

import * as fs from "fs";
import * as path from "path";
import { checkHardRules, type MealDefinition } from "../lib/services/recipeDataQuality";

// ============================================
// LOAD MEALS
// ============================================

function loadSnacksFromJSON(): MealDefinition[] {
  const filePath = path.join(__dirname, "../lib/data/meal_components.json");
  const content = fs.readFileSync(filePath, "utf-8");
  const data = JSON.parse(content);
  
  const snacks: MealDefinition[] = [];
  
  if (data.snack && Array.isArray(data.snack)) {
    for (const meal of data.snack) {
      snacks.push({
        id: meal.id,
        name: meal.name,
        description: meal.description,
        preparationTip: meal.preparationTip,
        components: meal.components || [],
        tags: meal.tags || [],
        suitableFor: meal.suitableFor || [],
      });
    }
  }
  
  return snacks;
}

// ============================================
// VALIDATION
// ============================================

async function main() {
  console.log("🔍 Validiranje konzistentnosti naziva i sastojaka za užine...\n");
  
  const snacks = loadSnacksFromJSON();
  console.log(`📦 Pronađeno ${snacks.length} užina\n`);
  
  const issues: Array<{
    meal: MealDefinition;
    hardRules: ReturnType<typeof checkHardRules>;
  }> = [];
  
  for (const snack of snacks) {
    const hardRules = checkHardRules(snack);
    if (hardRules.blocked) {
      issues.push({ meal: snack, hardRules });
    }
  }
  
  // ============================================
  // REPORT
  // ============================================
  
  console.log("=".repeat(60));
  console.log("IZVJEŠTAJ - Problemi u užinama");
  console.log("=".repeat(60));
  console.log("");
  console.log(`Ukupno užina: ${snacks.length}`);
  console.log(`Problemi: ${issues.length}`);
  console.log("");
  
  if (issues.length > 0) {
    console.log("PROBLEMATIČNA JELA:");
    console.log("");
    
    for (const { meal, hardRules } of issues) {
      console.log(`❌ ${meal.name} (ID: ${meal.id})`);
      console.log(`   Greške:`);
      for (const reason of hardRules.reasons) {
        console.log(`   - ${reason}`);
      }
      console.log(`   Sastojci:`);
      for (const component of meal.components) {
        console.log(`     • ${component.displayName || component.food}: ${component.grams}g`);
      }
      console.log("");
    }
  } else {
    console.log("✅ Sve užine su konzistentne!");
  }
  
  // Save report
  const reportPath = path.join(__dirname, "../snack-validation-report.json");
  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        total: snacks.length,
        issues: issues.length,
        problematicMeals: issues.map(({ meal, hardRules }) => ({
          id: meal.id,
          name: meal.name,
          errors: hardRules.reasons,
          components: meal.components,
        })),
      },
      null,
      2
    )
  );
  console.log(`✅ Izvještaj spremljen: ${reportPath}`);
}

main().catch((error) => {
  console.error("❌ Greška:", error);
  process.exit(1);
});










