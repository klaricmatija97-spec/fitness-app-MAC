/**
 * MIGRATION SCRIPT - Migriraj sva jela iz meal_components.json na Edamam-only sustav
 * 
 * Usage:
 *   npx tsx scripts/migrate-meals-to-edamam.ts
 * 
 * Output:
 *   - migration-report.json (detaljni izvještaj)
 *   - migration-summary.txt (sažetak)
 */

import * as fs from "fs";
import * as path from "path";
import {
  migrateAllMeals,
  type MealDefinition,
  type RecipeValidationResult,
} from "../lib/services/recipeDataQuality";

// ============================================
// LOAD MEALS
// ============================================

function loadMealsFromJSON(): MealDefinition[] {
  const filePath = path.join(__dirname, "../lib/data/meal_components.json");
  const content = fs.readFileSync(filePath, "utf-8");
  const data = JSON.parse(content);
  
  const meals: MealDefinition[] = [];
  
  // Iteriraj kroz sve kategorije (breakfast, lunch, dinner, snack)
  for (const category of ["breakfast", "lunch", "dinner", "snack"]) {
    if (data[category] && Array.isArray(data[category])) {
      for (const meal of data[category]) {
        meals.push({
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
  }
  
  return meals;
}

// ============================================
// MIGRATION
// ============================================

async function main() {
  console.log("🔄 Starting meal migration to Edamam-only system...\n");
  
  // Load meals
  const meals = loadMealsFromJSON();
  console.log(`📦 Loaded ${meals.length} meals from meal_components.json\n`);
  
  // Migrate
  const migrationResult = await migrateAllMeals(meals);
  
  // ============================================
  // GENERATE REPORT
  // ============================================
  
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: migrationResult.total,
      verified: migrationResult.verified,
      needsRemap: migrationResult.needsRemap,
      invalidMapping: migrationResult.invalidMapping,
      needsReview: migrationResult.needsReview,
      verifiedPercent: ((migrationResult.verified / migrationResult.total) * 100).toFixed(2),
    },
    results: migrationResult.results,
    invalidMeals: migrationResult.results.filter((r) => r.status === "INVALID_MAPPING"),
    needsRemapMeals: migrationResult.results.filter((r) => r.status === "NEEDS_REMAP"),
    needsReviewMeals: migrationResult.results.filter((r) => r.status === "NEEDS_REVIEW"),
  };
  
  // Save detailed report
  const reportPath = path.join(__dirname, "../migration-report.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`✅ Detailed report saved to: ${reportPath}\n`);
  
  // Generate summary
  const summaryLines: string[] = [];
  summaryLines.push("=".repeat(60));
  summaryLines.push("MEAL MIGRATION REPORT - Edamam-Only System");
  summaryLines.push("=".repeat(60));
  summaryLines.push("");
  summaryLines.push(`Timestamp: ${report.timestamp}`);
  summaryLines.push("");
  summaryLines.push("SUMMARY:");
  summaryLines.push(`  Total meals: ${report.summary.total}`);
  summaryLines.push(`  ✅ Verified: ${report.summary.verified} (${report.summary.verifiedPercent}%)`);
  summaryLines.push(`  ⚠️  Needs Remap: ${report.summary.needsRemap}`);
  summaryLines.push(`  ❌ Invalid Mapping: ${report.summary.invalidMapping}`);
  summaryLines.push(`  🔍 Needs Review: ${report.summary.needsReview}`);
  summaryLines.push("");
  
  if (report.invalidMeals.length > 0) {
    summaryLines.push("=".repeat(60));
    summaryLines.push("INVALID MAPPING MEALS (BLOCKED):");
    summaryLines.push("=".repeat(60));
    for (const meal of report.invalidMeals) {
      summaryLines.push("");
      summaryLines.push(`ID: ${meal.mealId}`);
      summaryLines.push(`Name: ${meal.mealName}`);
      summaryLines.push(`Errors:`);
      for (const error of meal.errors) {
        summaryLines.push(`  - ${error}`);
      }
      if (meal.remapReasons.length > 0) {
        summaryLines.push(`Remap Reasons:`);
        for (const reason of meal.remapReasons) {
          summaryLines.push(`  - ${reason}`);
        }
      }
    }
    summaryLines.push("");
  }
  
  if (report.needsRemapMeals.length > 0) {
    summaryLines.push("=".repeat(60));
    summaryLines.push("MEALS NEEDING REMAP:");
    summaryLines.push("=".repeat(60));
    for (const meal of report.needsRemapMeals.slice(0, 20)) { // First 20
      summaryLines.push("");
      summaryLines.push(`ID: ${meal.mealId}`);
      summaryLines.push(`Name: ${meal.mealName}`);
      if (meal.remapReasons.length > 0) {
        summaryLines.push(`Reasons:`);
        for (const reason of meal.remapReasons) {
          summaryLines.push(`  - ${reason}`);
        }
      }
    }
    if (report.needsRemapMeals.length > 20) {
      summaryLines.push(`\n... and ${report.needsRemapMeals.length - 20} more`);
    }
    summaryLines.push("");
  }
  
  // Save summary
  const summaryPath = path.join(__dirname, "../migration-summary.txt");
  fs.writeFileSync(summaryPath, summaryLines.join("\n"));
  console.log(`✅ Summary saved to: ${summaryPath}\n`);
  
  // Print summary to console
  console.log(summaryLines.join("\n"));
  
  console.log("\n✅ Migration complete!");
}

// Run
main().catch((error) => {
  console.error("❌ Migration failed:", error);
  process.exit(1);
});




























