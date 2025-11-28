/**
 * USDA Foods Import Script
 * 
 * Učitava USDA CSV datoteke i importa ih u Supabase "foods" tablicu.
 * 
 * Pokretanje:
 *   npm run import:usda
 * 
 * Ili direktno:
 *   npx tsx scripts/importUsdaFoodsToSupabase.ts
 * 
 * Preduvjeti:
 *   1. Pokreni SQL skriptu: supabase-add-usda-fdc-id.sql
 *   2. Postavi environment varijable: SUPABASE_URL i SUPABASE_SERVICE_ROLE_KEY
 *   3. CSV datoteke moraju biti u: data/usda/
 */

// Učitaj environment varijable iz .env.local
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve, join } from "path";
import * as fs from "fs";
import { parse } from "csv-parse/sync";
import { createServiceClient } from "../lib/supabase.js";

// Get __dirname za ES modules (tsx podržava import.meta.url)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Učitaj env.local - pokušaj više lokacija
const envPath1 = resolve(__dirname, "..", ".env.local");
const envPath2 = resolve(__dirname, "..", "env.local");

let envLoaded = false;
if (fs.existsSync(envPath2)) {
  // Prvo pokušaj env.local (bez točke) - ovo je stvarni fajl
  dotenv.config({ path: envPath2, override: true });
  envLoaded = true;
} else if (fs.existsSync(envPath1)) {
  // Zatim pokušaj .env.local (sa točkom)
  dotenv.config({ path: envPath1, override: true });
  envLoaded = true;
}

if (!envLoaded) {
  console.warn("⚠️  .env.local ili env.local nije pronađen!");
  console.warn(`   Tražio u: ${envPath1}`);
  console.warn(`   Tražio u: ${envPath2}`);
}

// Provjeri da li su environment varijable učitane
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("\n❌ GREŠKA: SUPABASE_URL ili SUPABASE_SERVICE_ROLE_KEY nisu postavljeni!");
  console.error(`   SUPABASE_URL: ${process.env.SUPABASE_URL ? 'OK (' + process.env.SUPABASE_URL.substring(0, 30) + '...)' : 'MISSING'}`);
  console.error(`   SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'OK (***)' : 'MISSING'}`);
  console.error("\n   Provjeri da li env.local postoji i sadrži ove varijable.");
  process.exit(1);
}

// ============================================
// TYPES
// ============================================

interface FoodRow {
  fdc_id: string;
  data_type: string;
  description: string;
  food_category_id?: string;
  publication_date?: string;
}

interface FoodNutrientRow {
  id: string;
  fdc_id: string;
  nutrient_id: string;
  amount: string;
  data_points?: string;
  derivation_id?: string;
  min?: string;
  max?: string;
  median?: string;
  footnote?: string;
  min_year_acquired?: string;
}

interface NutrientRow {
  id: string;
  name: string;
  unit_name: string;
  nutrient_nbr: string;
  rank?: string;
}

interface NutrientMap {
  energy_kcal?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
}

interface FoodInsert {
  usda_fdc_id: number;
  name: string;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  category: string;
  tags: string[];
  allergens: string | null;
}

// ============================================
// CONSTANTS
// ============================================

// Core data types koje učitavamo
// CSV koristi lowercase nazive: foundation_food, sr_legacy, survey_fndds
const CORE_DATA_TYPES = [
  "foundation_food",  // Foundation foods
  "sr_legacy",        // SR Legacy (ako postoji)
  "survey_fndds",     // Survey (FNDDS) (ako postoji)
  // Također prihvaćamo originalne nazive za kompatibilnost
  "SR Legacy",
  "Foundation",
  "Survey (FNDDS)"
];

// Nutrient ID-evi koji nas zanimaju
// Napomena: amount vrijednosti u food_nutrient.csv su već "per 100 g"
const NUTRIENT_IDS = {
  ENERGY_KCAL: "1008", // Energy (KCAL)
  PROTEIN_G: "1003", // Protein (G)
  FAT_G: "1004", // Total lipid (fat) (G)
  CARBS_G: "1005", // Carbohydrate, by difference (G)
} as const;

// Batch size za upsert (Supabase preporučuje do 1000 redaka odjednom)
const BATCH_SIZE = 500;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Učita CSV datoteku i parse-ira je
 */
function loadCSV<T>(filePath: string): T[] {
  if (!fs.existsSync(filePath)) {
    throw new Error(`CSV datoteka ne postoji: ${filePath}`);
  }

  const fileContent = fs.readFileSync(filePath, "utf-8");
  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  });
  return records as T[];
}

/**
 * Mapira data_type u jednostavnu kategoriju
 */
function mapCategory(dataType: string): string {
  if (dataType === "Foundation") return "Foundation";
  if (dataType === "SR Legacy") return "SR Legacy";
  if (dataType === "Survey (FNDDS)") return "Survey (FNDDS)";
  return dataType;
}

// ============================================
// MAIN FUNCTION
// ============================================

async function importUsdaFoods() {
  console.log("🚀 Pokretanje USDA importa...\n");

  try {
    // 1. Učitaj CSV datoteke
    console.log("📂 Učitavanje CSV datoteka...");
    const dataDir = join(__dirname, "..", "data", "usda");

    const foodRows = loadCSV<FoodRow>(join(dataDir, "food.csv"));
    console.log(`   ✓ food.csv: ${foodRows.length} redaka`);

    const foodNutrientRows = loadCSV<FoodNutrientRow>(
      join(dataDir, "food_nutrient.csv")
    );
    console.log(`   ✓ food_nutrient.csv: ${foodNutrientRows.length} redaka`);

    const nutrientRows = loadCSV<NutrientRow>(
      join(dataDir, "nutrient.csv")
    );
    console.log(`   ✓ nutrient.csv: ${nutrientRows.length} redaka\n`);

    // 2. Filtriraj samo core zapise iz food.csv
    console.log("🔍 Filtriranje core zapisa...");
    const coreFoods = foodRows.filter((row) =>
      CORE_DATA_TYPES.includes(row.data_type)
    );
    console.log(`   ✓ Pronađeno ${coreFoods.length} core zapisa (od ${foodRows.length} ukupno)\n`);

    // 3. Kreiraj mapu nutrijenata po fdc_id
    console.log("📊 Kreiranje mape nutrijenata...");
    const nutrientMapByFdcId = new Map<number, NutrientMap>();

    for (const row of foodNutrientRows) {
      const fdcId = parseInt(row.fdc_id, 10);
      const nutrientId = row.nutrient_id;
      const amount = parseFloat(row.amount);

      if (isNaN(fdcId) || isNaN(amount)) continue;

      if (!nutrientMapByFdcId.has(fdcId)) {
        nutrientMapByFdcId.set(fdcId, {});
      }

      const nutrientMap = nutrientMapByFdcId.get(fdcId)!;

      // Mapiraj nutrijente preko nutrient_id
      // Napomena: amount vrijednosti su već "per 100 g"
      switch (nutrientId) {
        case NUTRIENT_IDS.ENERGY_KCAL:
          nutrientMap.energy_kcal = amount;
          break;
        case NUTRIENT_IDS.PROTEIN_G:
          nutrientMap.protein_g = amount;
          break;
        case NUTRIENT_IDS.FAT_G:
          nutrientMap.fat_g = amount;
          break;
        case NUTRIENT_IDS.CARBS_G:
          nutrientMap.carbs_g = amount;
          break;
      }
    }

    console.log(`   ✓ Kreirana mapa za ${nutrientMapByFdcId.size} hrane\n`);

    // 4. Konstruiraj objekte za Supabase
    console.log("🏗️  Konstruiranje objekata za Supabase...");
    const foodsToInsert: FoodInsert[] = [];

    for (const foodRow of coreFoods) {
      const fdcId = parseInt(foodRow.fdc_id, 10);
      if (isNaN(fdcId)) continue;

      const nutrients = nutrientMapByFdcId.get(fdcId);
      if (!nutrients) continue;

      // Provjeri da imamo sve potrebne nutrijente
      if (
        nutrients.energy_kcal === undefined ||
        nutrients.protein_g === undefined ||
        nutrients.fat_g === undefined ||
        nutrients.carbs_g === undefined
      ) {
        // Možemo preskočiti ako nemamo sve nutrijente, ili postaviti na 0
        // Za sada preskačemo
        continue;
      }

      const foodInsert: FoodInsert = {
        usda_fdc_id: fdcId,
        name: foodRow.description.trim(),
        calories_per_100g: Math.round(nutrients.energy_kcal * 10) / 10, // Zaokruži na 1 decimalu
        protein_per_100g: Math.round(nutrients.protein_g * 10) / 10,
        carbs_per_100g: Math.round(nutrients.carbs_g * 10) / 10,
        fat_per_100g: Math.round(nutrients.fat_g * 10) / 10,
        category: mapCategory(foodRow.data_type),
        tags: ["usda", "core_food"],
        allergens: null,
      };

      foodsToInsert.push(foodInsert);
    }

    console.log(`   ✓ Konstruirano ${foodsToInsert.length} objekata za import\n`);

    // 5. Upsert u Supabase (batch po batch_size)
    console.log("💾 Spremanje u Supabase...");
    const supabase = createServiceClient();

    let totalInserted = 0;
    let totalUpdated = 0;
    let totalErrors = 0;

    for (let i = 0; i < foodsToInsert.length; i += BATCH_SIZE) {
      const batch = foodsToInsert.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(foodsToInsert.length / BATCH_SIZE);

      try {
        const { data, error } = await supabase
          .from("foods")
          .upsert(batch, {
            onConflict: "usda_fdc_id",
            ignoreDuplicates: false,
          })
          .select();

        if (error) {
          console.error(`   ❌ Greška u batch-u ${batchNum}/${totalBatches}:`, error.message);
          totalErrors += batch.length;
        } else {
          // Razlikujemo insert i update na osnovu da li postoji id (možemo procijeniti)
          // Zapravo, upsert ne vraća informaciju o tome da li je insert ili update
          // Za jednostavnost, pretpostavljamo da su svi inserti ako nema greške
          totalInserted += batch.length;
          console.log(
            `   ✓ Batch ${batchNum}/${totalBatches}: ${batch.length} zapisa spremljeno`
          );
        }
      } catch (error) {
        console.error(`   ❌ Greška u batch-u ${batchNum}/${totalBatches}:`, error);
        totalErrors += batch.length;
      }
    }

    // 6. Finalni rezime
    console.log("\n✅ Import završen!\n");
    console.log("📊 Rezime:");
    console.log(`   • Ukupno obrađeno: ${foodsToInsert.length} zapisa`);
    console.log(`   • Uspješno spremljeno: ${totalInserted} zapisa`);
    console.log(`   • Greške: ${totalErrors} zapisa`);

    if (totalErrors === 0) {
      console.log("\n🎉 Svi zapisi su uspješno importirani!");
    } else {
      console.log(`\n⚠️  ${totalErrors} zapisa nije bilo moguće spremiti.`);
    }
  } catch (error) {
    console.error("\n❌ Kritična greška:", error);
    process.exit(1);
  }
}

// ============================================
// EXECUTE
// ============================================

importUsdaFoods()
  .then(() => {
    console.log("\n👋 Gotovo!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Fatalna greška:", error);
    process.exit(1);
  });

