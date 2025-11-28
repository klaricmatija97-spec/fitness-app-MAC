/**
 * Provjeri da li su USDA podaci uspješno importirani u Supabase
 */

import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { createServiceClient } from "../lib/supabase.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envPath1 = resolve(__dirname, "..", ".env.local");
const envPath2 = resolve(__dirname, "..", "env.local");

if (require("fs").existsSync(envPath2)) {
  dotenv.config({ path: envPath2, override: true });
} else if (require("fs").existsSync(envPath1)) {
  dotenv.config({ path: envPath1, override: true });
}

async function verifyImport() {
  console.log("🔍 Provjera USDA importa...\n");

  try {
    const supabase = createServiceClient();

    // Provjeri koliko zapisa ima
    const { count, error: countError } = await supabase
      .from("foods")
      .select("*", { count: "exact", head: true })
      .not("usda_fdc_id", "is", null);

    if (countError) {
      throw countError;
    }

    console.log(`✅ Pronađeno ${count} zapisa sa usda_fdc_id u tablici foods\n`);

    // Dohvati prvih 5 zapisa kao uzorak
    const { data, error } = await supabase
      .from("foods")
      .select("usda_fdc_id, name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, category")
      .not("usda_fdc_id", "is", null)
      .limit(5);

    if (error) {
      throw error;
    }

    console.log("📋 Uzorak zapisa:\n");
    data?.forEach((food, index) => {
      console.log(`${index + 1}. ${food.name}`);
      console.log(`   usda_fdc_id: ${food.usda_fdc_id}`);
      console.log(`   Calories: ${food.calories_per_100g} kcal/100g`);
      console.log(`   Protein: ${food.protein_per_100g}g/100g`);
      console.log(`   Carbs: ${food.carbs_per_100g}g/100g`);
      console.log(`   Fat: ${food.fat_per_100g}g/100g`);
      console.log(`   Category: ${food.category}`);
      console.log();
    });

    console.log("✅ USDA import je uspješno završen!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Greška pri provjeri:", error);
    process.exit(1);
  }
}

verifyImport();

