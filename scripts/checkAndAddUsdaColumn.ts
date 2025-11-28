/**
 * Provjeri i dodaj usda_fdc_id kolonu u foods tablicu
 * Pokreće se prije importa USDA podataka
 */

import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { createServiceClient } from "../lib/supabase.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, "..", ".env.local") });

async function checkAndAddColumn() {
  console.log("🔍 Provjera usda_fdc_id kolone...\n");

  try {
    const supabase = createServiceClient();

    // Provjeri da li kolona postoji
    const { data: columns, error: checkError } = await supabase
      .rpc("exec_sql", {
        query: `
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'foods' AND column_name = 'usda_fdc_id'
        `,
      });

    if (checkError) {
      // Ako RPC ne radi, pokušaj direktno provjeriti
      console.log("⚠️  RPC ne radi, pokušavam drugi pristup...");
      
      // Pokušaj SELECT da vidimo da li kolona postoji
      const { error: testError } = await supabase
        .from("foods")
        .select("usda_fdc_id")
        .limit(1);

      if (testError && testError.message.includes("does not exist")) {
        console.log("❌ Kolona usda_fdc_id ne postoji!\n");
        console.log("⚠️  Molimo pokrenite SQL skriptu ručno u Supabase SQL Editor:");
        console.log("   File: supabase-add-usda-fdc-id.sql\n");
        console.log("SQL koji treba pokrenuti:");
        console.log("─".repeat(50));
        console.log("ALTER TABLE foods ADD COLUMN IF NOT EXISTS usda_fdc_id BIGINT UNIQUE;");
        console.log("CREATE INDEX IF NOT EXISTS idx_foods_usda_fdc_id ON foods(usda_fdc_id);");
        console.log("─".repeat(50));
        return false;
      } else if (!testError) {
        console.log("✅ Kolona usda_fdc_id već postoji!\n");
        return true;
      }
    } else if (columns && columns.length > 0) {
      console.log("✅ Kolona usda_fdc_id već postoji!\n");
      return true;
    } else {
      console.log("❌ Kolona usda_fdc_id ne postoji!\n");
      console.log("⚠️  Molimo pokrenite SQL skriptu ručno u Supabase SQL Editor:");
      console.log("   File: supabase-add-usda-fdc-id.sql\n");
      return false;
    }

    return true;
  } catch (error) {
    console.error("❌ Greška pri provjeri:", error);
    console.log("\n⚠️  Molimo pokrenite SQL skriptu ručno u Supabase SQL Editor.");
    return false;
  }
}

checkAndAddColumn()
  .then((exists) => {
    if (exists) {
      console.log("✅ Provjera završena - kolona postoji ili je dodana.");
      process.exit(0);
    } else {
      console.log("⚠️  Provjera završena - kolona ne postoji. Molimo pokrenite SQL skriptu.");
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error("❌ Fatalna greška:", error);
    process.exit(1);
  });

