/**
 * DETALJNA PROVJERA - Ispisuje sve užine s nazivima i sastojcima za ručnu provjeru
 */

import * as fs from "fs";
import * as path from "path";

function loadSnacks() {
  const filePath = path.join(__dirname, "../lib/data/meal_components.json");
  const content = fs.readFileSync(filePath, "utf-8");
  const data = JSON.parse(content);
  
  return (data.snack || []).map((meal: any) => ({
    id: meal.id,
    name: meal.name,
    description: meal.description,
    components: meal.components || [],
  }));
}

const snacks = loadSnacks();

console.log("=".repeat(80));
console.log("DETALJNI PREGLED SVIH UŽINA");
console.log("=".repeat(80));
console.log("");

for (const snack of snacks) {
  console.log(`📌 ${snack.name}`);
  console.log(`   ID: ${snack.id}`);
  console.log(`   Opis: ${snack.description || "Nema opisa"}`);
  console.log(`   Sastojci:`);
  
  const nameLower = snack.name.toLowerCase();
  const componentNames = snack.components.map((c: any) => (c.displayName || c.food).toLowerCase()).join(", ");
  
  // Provjeri konzistentnost
  const issues: string[] = [];
  
  // Provjeri "s voćem"
  if (nameLower.includes("s voćem") || nameLower.includes("s vocem")) {
    const hasFruit = componentNames.match(/\b(banana|jabuka|apple|borovnic|blueberri|cranberri|raspberri|jagod|strawberri|malin|voce|fruit)\b/);
    if (!hasFruit) {
      issues.push("⚠️  Naziv spominje 's voćem' ali nema voća u sastojcima");
    }
  }
  
  // Provjeri "bademima"
  if (nameLower.includes("badem") || nameLower.includes("almond")) {
    const hasAlmonds = componentNames.includes("badem") || componentNames.includes("almond");
    if (!hasAlmonds) {
      issues.push("⚠️  Naziv spominje bademe/almonds ali nema badema u sastojcima");
    }
  }
  
  // Provjeri "grčki jogurt"
  if (nameLower.includes("grčki jogurt") || nameLower.includes("greek yogurt")) {
    const hasYogurt = componentNames.includes("grcki jogurt") || componentNames.includes("greek yogurt") || componentNames.includes("jogurt");
    if (!hasYogurt) {
      issues.push("⚠️  Naziv spominje grčki jogurt ali nema jogurta u sastojcima");
    }
  }
  
  // Provjeri "skyr"
  if (nameLower.includes("skyr")) {
    const hasSkyr = componentNames.includes("skyr");
    if (!hasSkyr) {
      issues.push("⚠️  Naziv spominje skyr ali nema skyra u sastojcima");
    }
  }
  
  for (const component of snack.components) {
    console.log(`     • ${component.displayName || component.food}: ${component.grams}g`);
  }
  
  if (issues.length > 0) {
    console.log(`   ❌ PROBLEMI:`);
    for (const issue of issues) {
      console.log(`     ${issue}`);
    }
  } else {
    console.log(`   ✅ Konzistentno`);
  }
  
  console.log("");
}















