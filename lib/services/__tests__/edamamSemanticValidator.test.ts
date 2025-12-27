/**
 * Testovi za Edamam Semantic Validator
 * 
 * Testira da UI label i Edamam match moraju pripadati istoj semantičkoj kategoriji
 */

import {
  validateRecipeSemanticConsistency,
  resolveCategoryFromUILabel,
  resolveCategoryFromEdamamMatch,
  generateUserFriendlyError,
  SemanticCategory,
  type IngredientWithSemantics,
} from "../edamamSemanticValidator";

describe("Edamam Semantic Validator", () => {
  describe("resolveCategoryFromUILabel", () => {
    it("treba resolvirati PROSCIUTTO_CURED_PORK za 'Pršut'", () => {
      expect(resolveCategoryFromUILabel("Pršut")).toBe(SemanticCategory.PROSCIUTTO_CURED_PORK);
      expect(resolveCategoryFromUILabel("pršut")).toBe(SemanticCategory.PROSCIUTTO_CURED_PORK);
      expect(resolveCategoryFromUILabel("prosciutto")).toBe(SemanticCategory.PROSCIUTTO_CURED_PORK);
    });

    it("treba resolvirati POULTRY_HAM za 'Pileća šunka'", () => {
      expect(resolveCategoryFromUILabel("Pileća šunka")).toBe(SemanticCategory.POULTRY_HAM);
      expect(resolveCategoryFromUILabel("pileca sunka")).toBe(SemanticCategory.POULTRY_HAM);
      expect(resolveCategoryFromUILabel("chicken ham")).toBe(SemanticCategory.POULTRY_HAM);
    });

    it("treba resolvirati SALAMI_SAUSAGE za 'Salama'", () => {
      expect(resolveCategoryFromUILabel("Salama")).toBe(SemanticCategory.SALAMI_SAUSAGE);
      expect(resolveCategoryFromUILabel("salami")).toBe(SemanticCategory.SALAMI_SAUSAGE);
      expect(resolveCategoryFromUILabel("sausage")).toBe(SemanticCategory.SALAMI_SAUSAGE);
    });
  });

  describe("resolveCategoryFromEdamamMatch", () => {
    it("treba resolvirati PROSCIUTTO_CURED_PORK za 'prosciutto'", () => {
      expect(resolveCategoryFromEdamamMatch("prosciutto")).toBe(SemanticCategory.PROSCIUTTO_CURED_PORK);
      expect(resolveCategoryFromEdamamMatch("dry-cured ham")).toBe(SemanticCategory.PROSCIUTTO_CURED_PORK);
    });

    it("treba resolvirati POULTRY_HAM za 'chicken ham'", () => {
      expect(resolveCategoryFromEdamamMatch("chicken ham")).toBe(SemanticCategory.POULTRY_HAM);
      expect(resolveCategoryFromEdamamMatch("turkey ham")).toBe(SemanticCategory.POULTRY_HAM);
    });

    it("treba resolvirati SALAMI_SAUSAGE za 'salami'", () => {
      expect(resolveCategoryFromEdamamMatch("salami")).toBe(SemanticCategory.SALAMI_SAUSAGE);
      expect(resolveCategoryFromEdamamMatch("sausage")).toBe(SemanticCategory.SALAMI_SAUSAGE);
    });
  });

  describe("validateRecipeSemanticConsistency", () => {
    it("treba BLOCKIRATI ako UI kaže 'Pršut' ali Edamam mapira 'chicken ham'", () => {
      const ingredients: IngredientWithSemantics[] = [
        {
          uiLabel: "Pršut",
          semanticCategory: SemanticCategory.PROSCIUTTO_CURED_PORK,
          edamamMatch: "chicken ham",
          edamamResolvedCategory: SemanticCategory.POULTRY_HAM,
          quantity: 50,
          unit: "g",
        },
      ];

      const result = validateRecipeSemanticConsistency(ingredients);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].uiLabel).toBe("Pršut");
      expect(result.errors[0].uiCategory).toBe(SemanticCategory.PROSCIUTTO_CURED_PORK);
      expect(result.errors[0].edamamMatch).toBe("chicken ham");
      expect(result.errors[0].edamamCategory).toBe(SemanticCategory.POULTRY_HAM);
      expect(result.errors[0].mismatchReason).toContain("PROSCIUTTO_CURED_PORK");
      expect(result.errors[0].mismatchReason).toContain("POULTRY_HAM");
    });

    it("treba BLOCKIRATI ako UI kaže 'Pileća šunka' ali Edamam mapira 'prosciutto'", () => {
      const ingredients: IngredientWithSemantics[] = [
        {
          uiLabel: "Pileća šunka",
          semanticCategory: SemanticCategory.POULTRY_HAM,
          edamamMatch: "prosciutto",
          edamamResolvedCategory: SemanticCategory.PROSCIUTTO_CURED_PORK,
          quantity: 50,
          unit: "g",
        },
      ];

      const result = validateRecipeSemanticConsistency(ingredients);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].mismatchReason).toContain("POULTRY_HAM");
      expect(result.errors[0].mismatchReason).toContain("PROSCIUTTO_CURED_PORK");
    });

    it("treba PRODOPUSTITI ako UI kaže 'Pršut' i Edamam mapira 'prosciutto'", () => {
      const ingredients: IngredientWithSemantics[] = [
        {
          uiLabel: "Pršut",
          semanticCategory: SemanticCategory.PROSCIUTTO_CURED_PORK,
          edamamMatch: "prosciutto",
          edamamResolvedCategory: SemanticCategory.PROSCIUTTO_CURED_PORK,
          quantity: 50,
          unit: "g",
        },
      ];

      const result = validateRecipeSemanticConsistency(ingredients);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.audit[0].isConsistent).toBe(true);
    });

    it("treba BLOCKIRATI ako UI kaže 'Salama' ali Edamam mapira 'chicken ham'", () => {
      const ingredients: IngredientWithSemantics[] = [
        {
          uiLabel: "Salama",
          semanticCategory: SemanticCategory.SALAMI_SAUSAGE,
          edamamMatch: "chicken ham",
          edamamResolvedCategory: SemanticCategory.POULTRY_HAM,
          quantity: 30,
          unit: "g",
        },
      ];

      const result = validateRecipeSemanticConsistency(ingredients);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
    });

    it("treba proizvesti audit trail za sve ingrediente", () => {
      const ingredients: IngredientWithSemantics[] = [
        {
          uiLabel: "Pršut",
          semanticCategory: SemanticCategory.PROSCIUTTO_CURED_PORK,
          edamamMatch: "prosciutto",
          edamamResolvedCategory: SemanticCategory.PROSCIUTTO_CURED_PORK,
          quantity: 50,
          unit: "g",
        },
        {
          uiLabel: "Pileća šunka",
          semanticCategory: SemanticCategory.POULTRY_HAM,
          edamamMatch: "chicken ham",
          edamamResolvedCategory: SemanticCategory.POULTRY_HAM,
          quantity: 40,
          unit: "g",
        },
      ];

      const result = validateRecipeSemanticConsistency(ingredients);

      expect(result.audit).toHaveLength(2);
      expect(result.audit[0].uiLabel).toBe("Pršut");
      expect(result.audit[0].isConsistent).toBe(true);
      expect(result.audit[1].uiLabel).toBe("Pileća šunka");
      expect(result.audit[1].isConsistent).toBe(true);
    });

    it("treba automatski resolvirati kategorije ako nisu eksplicitno postavljene", () => {
      const ingredients: IngredientWithSemantics[] = [
        {
          uiLabel: "Pršut",
          // semanticCategory nije postavljen - treba se automatski resolvirati
          edamamMatch: "prosciutto",
          // edamamResolvedCategory nije postavljen - treba se automatski resolvirati
          quantity: 50,
          unit: "g",
        },
      ];

      const result = validateRecipeSemanticConsistency(ingredients);

      expect(result.audit[0].uiCategory).toBe(SemanticCategory.PROSCIUTTO_CURED_PORK);
      expect(result.audit[0].edamamCategory).toBe(SemanticCategory.PROSCIUTTO_CURED_PORK);
      expect(result.isValid).toBe(true);
    });
  });

  describe("generateUserFriendlyError", () => {
    it("treba generirati čitljivu poruku greške", () => {
      const result = validateRecipeSemanticConsistency([
        {
          uiLabel: "Pršut",
          semanticCategory: SemanticCategory.PROSCIUTTO_CURED_PORK,
          edamamMatch: "chicken ham",
          edamamResolvedCategory: SemanticCategory.POULTRY_HAM,
          quantity: 50,
          unit: "g",
        },
      ]);

      const errorMessage = generateUserFriendlyError(result);
      
      expect(errorMessage).toContain("Pršut");
      expect(errorMessage).toContain("PROSCIUTTO_CURED_PORK");
      expect(errorMessage).toContain("chicken ham");
      expect(errorMessage).toContain("POULTRY_HAM");
      expect(errorMessage).toContain("Remap ingredient or change UI text");
    });

    it("treba vratiti null ako nema grešaka", () => {
      const result = validateRecipeSemanticConsistency([
        {
          uiLabel: "Pršut",
          semanticCategory: SemanticCategory.PROSCIUTTO_CURED_PORK,
          edamamMatch: "prosciutto",
          edamamResolvedCategory: SemanticCategory.PROSCIUTTO_CURED_PORK,
          quantity: 50,
          unit: "g",
        },
      ]);

      const errorMessage = generateUserFriendlyError(result);
      expect(errorMessage).toBeNull();
    });
  });
});

