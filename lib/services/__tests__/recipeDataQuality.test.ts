/**
 * Testovi za Recipe Data Quality Service
 * 
 * Testira bug primjer: "Mix orašastih plodova" s invalid mapping-om
 */

import {
  validateRecipeDataQuality,
  checkHardRules,
  type MealDefinition,
} from "../recipeDataQuality";

describe("Recipe Data Quality Service", () => {
  describe("Bug Example: Mix orašastih plodova", () => {
    /**
     * BUG EXAMPLE:
     * - UI description: almonds, walnuts, hazelnuts, dried cranberries, dark chocolate
     * - Stored ingredients: Bademi 40g, Orasi 40g, Orašasti plodovi 40g (generic), Jaje 110g (WRONG!), Višnje 40g (mismatch)
     * - Expected: BLOCKED as INVALID_MAPPING
     */
    it("should BLOCK meal with generic 'Orašasti plodovi' ingredient", async () => {
      const buggyMeal: MealDefinition = {
        id: "snack_test_bug",
        name: "Mix orašastih plodova",
        description: "Klasični trail mix. Bademi, orasi, lješnjaci, sušene brusnice i tamna čokolada.",
        components: [
          { food: "Almonds", grams: 40, displayName: "Bademi" },
          { food: "Walnuts", grams: 40, displayName: "Orasi" },
          { food: "Mixed nuts", grams: 40, displayName: "Orašasti plodovi" }, // ❌ Generic!
          { food: "Egg", grams: 110, displayName: "Jaje" }, // ❌ Doesn't belong!
          { food: "Cherries", grams: 40, displayName: "Višnje" }, // ❌ Mismatch: UI says cranberries
        ],
      };

      const result = await validateRecipeDataQuality(buggyMeal);

      expect(result.status).toBe("INVALID_MAPPING");
      expect(result.needsRemap).toBe(true);
      expect(result.errors.length).toBeGreaterThan(0);
      
      // Provjeri da hard rules blokiraju
      const hardRules = checkHardRules(buggyMeal);
      expect(hardRules.blocked).toBe(true);
      expect(hardRules.reasons.some((r) => r.includes("Generic ingredient"))).toBe(true);
      expect(hardRules.reasons.some((r) => r.includes("invalid ingredient") || r.includes("Egg"))).toBe(true);
      expect(hardRules.reasons.some((r) => r.includes("cranberries") || r.includes("cherries"))).toBe(true);
    });

    it("should VERIFY meal with correct ingredients matching description", async () => {
      const correctMeal: MealDefinition = {
        id: "snack_test_correct",
        name: "Mix orašastih plodova",
        description: "Klasični trail mix. Bademi, orasi, lješnjaci, sušene brusnice i tamna čokolada.",
        components: [
          { food: "Almonds", grams: 20, displayName: "Bademi" },
          { food: "Walnuts", grams: 15, displayName: "Orasi" },
          { food: "Hazelnuts", grams: 15, displayName: "Lješnjaci" },
          { food: "Dried cranberries", grams: 15, displayName: "Sušene brusnice" },
          { food: "Dark chocolate", grams: 10, displayName: "Tamna čokolada 70%+" },
        ],
      };

      const result = await validateRecipeDataQuality(correctMeal);

      // Ako je Edamam API dostupan, trebao bi biti VERIFIED
      // Ako nije, može biti NEEDS_REVIEW zbog Edamam API greške
      expect(["VERIFIED", "NEEDS_REVIEW"]).toContain(result.status);
      
      // Hard rules ne bi trebale blokirati
      const hardRules = checkHardRules(correctMeal);
      expect(hardRules.blocked).toBe(false);
    });
  });

  describe("Hard Rules", () => {
    it("should block generic 'Orašasti plodovi' ingredient", () => {
      const meal: MealDefinition = {
        id: "test_1",
        name: "Test meal",
        components: [
          { food: "Mixed nuts", grams: 40, displayName: "Orašasti plodovi" },
        ],
      };

      const result = checkHardRules(meal);
      expect(result.blocked).toBe(true);
      expect(result.reasons.some((r) => r.includes("Generic ingredient"))).toBe(true);
    });

    it("should block eggs in trail mix", () => {
      const meal: MealDefinition = {
        id: "test_2",
        name: "Mix orašastih plodova",
        description: "Trail mix with nuts",
        components: [
          { food: "Almonds", grams: 20, displayName: "Bademi" },
          { food: "Egg", grams: 110, displayName: "Jaje" }, // ❌
        ],
      };

      const result = checkHardRules(meal);
      expect(result.blocked).toBe(true);
      expect(result.reasons.some((r) => r.includes("invalid ingredient") || r.includes("Egg"))).toBe(true);
    });

    it("should block cherries when description says cranberries", () => {
      const meal: MealDefinition = {
        id: "test_3",
        name: "Mix orašastih plodova",
        description: "Trail mix with cranberries",
        components: [
          { food: "Cherries", grams: 40, displayName: "Višnje" }, // ❌
        ],
      };

      const result = checkHardRules(meal);
      expect(result.blocked).toBe(true);
      expect(result.reasons.some((r) => r.includes("cranberries") || r.includes("cherries"))).toBe(true);
    });

    it("should allow specific nut types", () => {
      const meal: MealDefinition = {
        id: "test_4",
        name: "Test meal",
        components: [
          { food: "Almonds", grams: 20, displayName: "Bademi" },
          { food: "Walnuts", grams: 15, displayName: "Orasi" },
        ],
      };

      const result = checkHardRules(meal);
      expect(result.blocked).toBe(false);
    });
  });
});

















