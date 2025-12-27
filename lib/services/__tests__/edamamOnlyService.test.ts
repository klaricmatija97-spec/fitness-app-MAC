/**
 * Testovi za Edamam-Only Service
 * 
 * Ovi testovi koriste mock Edamam API da testiraju logiku bez stvarnih API poziva
 */

import {
  computeIngredientMacrosFromEdamam,
  computeRecipeMacrosFromEdamam,
  convertMealDefinitionToEdamamRecipe,
  getDebugInfoForRecipe,
  type EdamamIngredient,
  type EdamamRecipe,
} from "../edamamOnlyService";

// Mock Edamam service
jest.mock("../edamamService", () => ({
  analyzeNutritionFromText: jest.fn(),
}));

import { analyzeNutritionFromText } from "../edamamService";
const mockAnalyzeNutritionFromText = analyzeNutritionFromText as jest.MockedFunction<
  typeof analyzeNutritionFromText
>;

describe("Edamam-Only Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("computeIngredientMacrosFromEdamam", () => {
    it("treba vratiti makroe za pojedini ingredient", async () => {
      mockAnalyzeNutritionFromText.mockResolvedValue({
        calories: 90,
        protein: 19.0,
        carbs: 0.1,
        fat: 0.9,
        fiber: 0,
        sugar: 0,
        sodium: 300,
        vitaminA: 0,
        vitaminC: 0,
        vitaminD: 0,
        vitaminB12: 0,
        calcium: 0,
        iron: 0,
        potassium: 0,
        magnesium: 0,
      });

      const ingredient: EdamamIngredient = {
        name: "tuna canned in water",
        quantity: 100,
        unit: "g",
        brand: "Eva Podravka",
      };

      const result = await computeIngredientMacrosFromEdamam(ingredient);

      expect(result.macros.calories).toBe(90);
      expect(result.macros.protein).toBe(19.0);
      expect(result.needsUserMapping).toBe(false);
      expect(mockAnalyzeNutritionFromText).toHaveBeenCalledWith(
        expect.stringContaining("100 g Eva Podravka tuna canned in water"),
        "tuna canned in water"
      );
    });

    it("treba označiti ingredient kao NEEDS_USER_MAPPING ako nema servingSizeGrams", async () => {
      const ingredient: EdamamIngredient = {
        name: "rice cakes",
        quantity: 2,
        unit: "pcs",
        // Nema servingSizeGrams
      };

      const result = await computeIngredientMacrosFromEdamam(ingredient);

      expect(result.needsUserMapping).toBe(true);
      expect(result.macros.calories).toBe(0);
      expect(mockAnalyzeNutritionFromText).not.toHaveBeenCalled();
    });
  });

  describe("computeRecipeMacrosFromEdamam", () => {
    it("treba izračunati makroe za cijeli recept", async () => {
      // Mock za tuna
      mockAnalyzeNutritionFromText
        .mockResolvedValueOnce({
          calories: 90,
          protein: 19.0,
          carbs: 0.1,
          fat: 0.9,
          fiber: 0,
          sugar: 0,
          sodium: 300,
          vitaminA: 0,
          vitaminC: 0,
          vitaminD: 0,
          vitaminB12: 0,
          calcium: 0,
          iron: 0,
          potassium: 0,
          magnesium: 0,
        })
        // Mock za rice crackers
        .mockResolvedValueOnce({
          calories: 115,
          protein: 2.8,
          carbs: 23.4,
          fat: 0.9,
          fiber: 0.4,
          sugar: 0,
          sodium: 90,
          vitaminA: 0,
          vitaminC: 0,
          vitaminD: 0,
          vitaminB12: 0,
          calcium: 0,
          iron: 0,
          potassium: 0,
          magnesium: 0,
        });

      const recipe: EdamamRecipe = {
        id: "test_1",
        name: "Tuna s rižinim krekerima",
        ingredients: [
          {
            name: "tuna canned in water",
            quantity: 100,
            unit: "g",
            brand: "Eva Podravka",
          },
          {
            name: "rice cakes plain",
            quantity: 30,
            unit: "g",
            brand: "Natur bio",
          },
        ],
      };

      const result = await computeRecipeMacrosFromEdamam(recipe);

      // Očekivani totali
      expect(result.macros.calories).toBe(205); // 90 + 115
      expect(result.macros.protein).toBe(21.8); // 19.0 + 2.8
      expect(result.macros.carbs).toBe(23.5); // 0.1 + 23.4
      expect(result.macros.fat).toBe(1.8); // 0.9 + 0.9

      // Provjeri audit trail
      expect(result.auditTrail.ingredients).toHaveLength(2);
      expect(result.auditTrail.consistencyCheck.isConsistent).toBe(true);
      expect(result.needsReview).toBe(false);
    });

    it("treba označiti kao DATA_INCONSISTENT ako razlika > 7%", async () => {
      // Mock koji vraća nekonzistentne podatke
      mockAnalyzeNutritionFromText.mockResolvedValue({
        calories: 100, // Ovo je netočno
        protein: 25, // 25 * 4 = 100 kcal samo od proteina
        carbs: 20, // 20 * 4 = 80 kcal
        fat: 10, // 10 * 9 = 90 kcal
        // Ukupno: 270 kcal, ali API vratio 100 -> razlika > 7%
        fiber: 0,
        sugar: 0,
        sodium: 0,
        vitaminA: 0,
        vitaminC: 0,
        vitaminD: 0,
        vitaminB12: 0,
        calcium: 0,
        iron: 0,
        potassium: 0,
        magnesium: 0,
      });

      const recipe: EdamamRecipe = {
        id: "test_2",
        name: "Test jelo",
        ingredients: [
          {
            name: "test ingredient",
            quantity: 100,
            unit: "g",
          },
        ],
      };

      const result = await computeRecipeMacrosFromEdamam(recipe);

      expect(result.auditTrail.consistencyCheck.isConsistent).toBe(false);
      expect(result.auditTrail.consistencyCheck.flag).toBe("DATA_INCONSISTENT");
      expect(result.needsReview).toBe(true);
    });
  });

  describe("convertMealDefinitionToEdamamRecipe", () => {
    it("treba konvertirati meal definition u Edamam format", () => {
      const mealDef = {
        id: "breakfast_lose_1",
        name: "Tuna s rižinim krekerima",
        components: [
          { food: "Tuna canned", grams: 100, displayName: "Tuna Eva Podravka" },
          { food: "Rice crackers", grams: 30, displayName: "Rižini krekeri (Natur bio)" },
        ],
      };

      const result = convertMealDefinitionToEdamamRecipe(mealDef);

      expect(result.id).toBe("breakfast_lose_1");
      expect(result.name).toBe("Tuna s rižinim krekerima");
      expect(result.ingredients).toHaveLength(2);
      expect(result.ingredients[0].name).toBe("tuna canned in water");
      expect(result.ingredients[0].brand).toBe("Eva Podravka");
      expect(result.ingredients[1].name).toBe("rice cakes plain");
      expect(result.ingredients[1].brand).toBe("Natur bio");
    });
  });

  describe("getDebugInfoForRecipe", () => {
    it("treba vratiti debug informacije za recept", async () => {
      mockAnalyzeNutritionFromText.mockResolvedValue({
        calories: 100,
        protein: 10,
        carbs: 5,
        fat: 3,
        fiber: 1,
        sugar: 2,
        sodium: 200,
        vitaminA: 0,
        vitaminC: 0,
        vitaminD: 0,
        vitaminB12: 0,
        calcium: 0,
        iron: 0,
        potassium: 0,
        magnesium: 0,
      });

      const recipe: EdamamRecipe = {
        id: "test_3",
        name: "Test jelo",
        ingredients: [
          {
            name: "test ingredient",
            quantity: 100,
            unit: "g",
          },
        ],
      };

      const debugInfo = await getDebugInfoForRecipe(recipe);

      expect(debugInfo.recipeId).toBe("test_3");
      expect(debugInfo.edamamQueries).toHaveLength(1);
      expect(debugInfo.edamamQueries[0].cached).toBe(false); // Prvi poziv
      expect(debugInfo.consistencyCheck.isConsistent).toBe(true);
    });
  });
});

