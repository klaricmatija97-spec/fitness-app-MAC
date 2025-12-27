/**
 * EDAMAM SEMANTIC VALIDATOR
 * 
 * Osigurava da UI label i Edamam match pripadaju istoj semantičkoj kategoriji.
 * Sprječava situacije gdje UI kaže "Pršut" ali Edamam mapira "chicken ham".
 */

// ============================================
// SEMANTIC CATEGORIES
// ============================================

export enum SemanticCategory {
  // Meso - Cured/Preserved
  PROSCIUTTO_CURED_PORK = "PROSCIUTTO_CURED_PORK", // Pršut, prosciutto, dry-cured ham
  POULTRY_HAM = "POULTRY_HAM", // Pileća šunka, turkey ham
  SALAMI_SAUSAGE = "SALAMI_SAUSAGE", // Salama, sausage, cured sausage
  
  // Meso - Fresh
  CHICKEN_BREAST = "CHICKEN_BREAST", // Pileća prsa, chicken breast
  SMOKED_CHICKEN = "SMOKED_CHICKEN", // Pileći dimcek, smoked chicken
  TURKEY_BREAST = "TURKEY_BREAST", // Pureća prsa, turkey breast
  BEEF = "BEEF", // Junetina, beef
  PORK = "PORK", // Svinjetina, pork
  
  // Riba
  TUNA_CANNED = "TUNA_CANNED", // Tuna u konzervi, tuna canned
  SALMON = "SALMON", // Losos, salmon
  FISH_OTHER = "FISH_OTHER", // Ostala riba
  
  // Jaja
  EGG_WHOLE = "EGG_WHOLE", // Cijela jaja, whole eggs
  EGG_WHITE = "EGG_WHITE", // Bjelanjak, egg white
  
  // Mlijeko i mliječni
  MILK = "MILK", // Mlijeko, milk
  GREEK_YOGURT = "GREEK_YOGURT", // Grčki jogurt, greek yogurt
  COTTAGE_CHEESE = "COTTAGE_CHEESE", // Zrnati/posni sir, cottage cheese
  CREAM_CHEESE = "CREAM_CHEESE", // Cream cheese
  MOZZARELLA = "MOZZARELLA", // Mozzarella
  GOUD_GOUDA = "GOUD_GOUDA", // Gouda sir
  
  // Ugljikohidrati
  RICE_COOKED = "RICE_COOKED", // Riža (kuhana), rice cooked
  BUCKWHEAT = "BUCKWHEAT", // Heljda, buckwheat
  PASTA_COOKED = "PASTA_COOKED", // Tjestenina (kuhana), pasta cooked
  RICE_CAKES = "RICE_CAKES", // Rižini krekeri, rice cakes
  TOAST = "TOAST", // Tost, toast
  OATS = "OATS", // Zobene, oats
  
  // Voće
  BANANA = "BANANA", // Banana
  APPLE = "APPLE", // Jabuka, apple
  BLUEBERRIES = "BLUEBERRIES", // Borovnice, blueberries
  FROZEN_BERRIES = "FROZEN_BERRIES", // Smješano voće, frozen berries
  
  // Povrće
  BROCCOLI = "BROCCOLI", // Brokula, broccoli
  LETTUCE = "LETTUCE", // Zelena salata, lettuce
  TOMATO = "TOMATO", // Rajčica, tomato
  CUCUMBER = "CUCUMBER", // Krastavac, cucumber
  CARROT = "CARROT", // Mrkva, carrot
  
  // Masti
  AVOCADO = "AVOCADO", // Avokado, avocado
  OLIVE_OIL = "OLIVE_OIL", // Maslinovo ulje, olive oil
  PEANUT_BUTTER = "PEANUT_BUTTER", // Kikiriki maslac, peanut butter
  
  // Supplements
  WHEY_PROTEIN = "WHEY_PROTEIN", // Whey protein
  
  // Nuts & Seeds
  ALMONDS = "ALMONDS", // Bademi, almonds
  WALNUTS = "WALNUTS", // Orasi, walnuts
  HAZELNUTS = "HAZELNUTS", // Lješnjaci, hazelnuts
  MIXED_NUTS = "MIXED_NUTS", // Mješavina orašastih plodova (samo ako je eksplicitno "mixed")
  
  // Dried Fruit
  DRIED_CRANBERRIES = "DRIED_CRANBERRIES", // Sušene brusnice, dried cranberries
  CHERRIES = "CHERRIES", // Višnje, cherries
  DRIED_FRUIT = "DRIED_FRUIT", // Sušeno voće (generic)
  
  // Chocolate
  DARK_CHOCOLATE = "DARK_CHOCOLATE", // Tamna čokolada, dark chocolate
  
  // Other
  OTHER = "OTHER", // Ostalo
  UNKNOWN = "UNKNOWN", // Nepoznato
}

// ============================================
// SYNONYM MAPS - UI Labels to Category
// ============================================

/**
 * Mapiranje UI labela na semantičke kategorije
 * Ključ: lowercase UI label (hrvatski ili engleski)
 * Vrijednost: SemanticCategory
 */
const UI_LABEL_TO_CATEGORY: Record<string, SemanticCategory> = {
  // Prosciutto / Pršut
  "pršut": SemanticCategory.PROSCIUTTO_CURED_PORK,
  "prsut": SemanticCategory.PROSCIUTTO_CURED_PORK,
  "prosciutto": SemanticCategory.PROSCIUTTO_CURED_PORK,
  "dry-cured ham": SemanticCategory.PROSCIUTTO_CURED_PORK,
  "dry cured ham": SemanticCategory.PROSCIUTTO_CURED_PORK,
  "serrano": SemanticCategory.PROSCIUTTO_CURED_PORK,
  "iberico": SemanticCategory.PROSCIUTTO_CURED_PORK,
  
  // Pileća šunka
  "pileća šunka": SemanticCategory.POULTRY_HAM,
  "pileca sunka": SemanticCategory.POULTRY_HAM,
  "chicken ham": SemanticCategory.POULTRY_HAM,
  "turkey ham": SemanticCategory.POULTRY_HAM,
  "pureća šunka": SemanticCategory.POULTRY_HAM,
  "pureca sunka": SemanticCategory.POULTRY_HAM,
  
  // Salama
  "salama": SemanticCategory.SALAMI_SAUSAGE,
  "sausage": SemanticCategory.SALAMI_SAUSAGE,
  "salami": SemanticCategory.SALAMI_SAUSAGE,
  "cured sausage": SemanticCategory.SALAMI_SAUSAGE,
  "pileća salama": SemanticCategory.SALAMI_SAUSAGE,
  "pileca salama": SemanticCategory.SALAMI_SAUSAGE,
  
  // Pileća prsa
  "pileća prsa": SemanticCategory.CHICKEN_BREAST,
  "pileca prsa": SemanticCategory.CHICKEN_BREAST,
  "chicken breast": SemanticCategory.CHICKEN_BREAST,
  "piletina": SemanticCategory.CHICKEN_BREAST,
  
  // Pileći dimcek
  "pileći dimcek": SemanticCategory.SMOKED_CHICKEN,
  "pileci dimcek": SemanticCategory.SMOKED_CHICKEN,
  "smoked chicken": SemanticCategory.SMOKED_CHICKEN,
  "smoked chicken breast": SemanticCategory.SMOKED_CHICKEN,
  
  // Pureća prsa
  "pureća prsa": SemanticCategory.TURKEY_BREAST,
  "pureca prsa": SemanticCategory.TURKEY_BREAST,
  "turkey breast": SemanticCategory.TURKEY_BREAST,
  "puretina": SemanticCategory.TURKEY_BREAST,
  
  // Junetina
  "junetina": SemanticCategory.BEEF,
  "beef": SemanticCategory.BEEF,
  "juneće": SemanticCategory.BEEF,
  "junec": SemanticCategory.BEEF,
  
  // Tuna
  "tuna": SemanticCategory.TUNA_CANNED,
  "tuna u konzervi": SemanticCategory.TUNA_CANNED,
  "tuna canned": SemanticCategory.TUNA_CANNED,
  "tuna canned in water": SemanticCategory.TUNA_CANNED,
  
  // Jaja
  "jaja": SemanticCategory.EGG_WHOLE,
  "jaje": SemanticCategory.EGG_WHOLE,
  "egg": SemanticCategory.EGG_WHOLE,
  "eggs": SemanticCategory.EGG_WHOLE,
  "whole egg": SemanticCategory.EGG_WHOLE,
  "bjelanjak": SemanticCategory.EGG_WHITE,
  "bjelanjci": SemanticCategory.EGG_WHITE,
  "egg white": SemanticCategory.EGG_WHITE,
  "egg whites": SemanticCategory.EGG_WHITE,
  
  // Rižini krekeri
  "rižini krekeri": SemanticCategory.RICE_CAKES,
  "rizini krekeri": SemanticCategory.RICE_CAKES,
  "rice crackers": SemanticCategory.RICE_CAKES,
  "rice cakes": SemanticCategory.RICE_CAKES,
  "rice cakes plain": SemanticCategory.RICE_CAKES,
  
  // Nuts
  "bademi": SemanticCategory.ALMONDS,
  "almonds": SemanticCategory.ALMONDS,
  "orasi": SemanticCategory.WALNUTS,
  "walnuts": SemanticCategory.WALNUTS,
  "lješnjaci": SemanticCategory.HAZELNUTS,
  "hazelnuts": SemanticCategory.HAZELNUTS,
  "orašasti plodovi": SemanticCategory.MIXED_NUTS, // ⚠️ Generic - treba biti specific
  "mixed nuts": SemanticCategory.MIXED_NUTS,
  
  // Dried Fruit
  "sušene brusnice": SemanticCategory.DRIED_CRANBERRIES,
  "dried cranberries": SemanticCategory.DRIED_CRANBERRIES,
  "cranberries": SemanticCategory.DRIED_CRANBERRIES,
  "višnje": SemanticCategory.CHERRIES,
  "cherries": SemanticCategory.CHERRIES,
  "sušeno voće": SemanticCategory.DRIED_FRUIT, // ⚠️ Generic
  "dried fruit": SemanticCategory.DRIED_FRUIT,
  
  // Chocolate
  "tamna čokolada": SemanticCategory.DARK_CHOCOLATE,
  "dark chocolate": SemanticCategory.DARK_CHOCOLATE,
  
  // Dodaj više synonyma po potrebi...
};

/**
 * Mapiranje Edamam match teksta na semantičke kategorije
 * Koristi se nakon što Edamam vrati rezultat
 */
const EDAMAM_MATCH_TO_CATEGORY: Record<string, SemanticCategory> = {
  // Prosciutto / Pršut
  "prosciutto": SemanticCategory.PROSCIUTTO_CURED_PORK,
  "dry-cured ham": SemanticCategory.PROSCIUTTO_CURED_PORK,
  "serrano ham": SemanticCategory.PROSCIUTTO_CURED_PORK,
  "iberico ham": SemanticCategory.PROSCIUTTO_CURED_PORK,
  "cured pork": SemanticCategory.PROSCIUTTO_CURED_PORK,
  
  // Pileća šunka
  "chicken ham": SemanticCategory.POULTRY_HAM,
  "turkey ham": SemanticCategory.POULTRY_HAM,
  "poultry ham": SemanticCategory.POULTRY_HAM,
  
  // Salama
  "salami": SemanticCategory.SALAMI_SAUSAGE,
  "sausage": SemanticCategory.SALAMI_SAUSAGE,
  "cured sausage": SemanticCategory.SALAMI_SAUSAGE,
  "chorizo": SemanticCategory.SALAMI_SAUSAGE,
  
  // Pileća prsa
  "chicken breast": SemanticCategory.CHICKEN_BREAST,
  "chicken": SemanticCategory.CHICKEN_BREAST, // Fallback
  
  // Pileći dimcek
  "smoked chicken": SemanticCategory.SMOKED_CHICKEN,
  "smoked chicken breast": SemanticCategory.SMOKED_CHICKEN,
  
  // Tuna
  "tuna": SemanticCategory.TUNA_CANNED,
  "tuna canned": SemanticCategory.TUNA_CANNED,
  "tuna canned in water": SemanticCategory.TUNA_CANNED,
  
  // Rižini krekeri
  "rice cakes": SemanticCategory.RICE_CAKES,
  "rice crackers": SemanticCategory.RICE_CAKES,
  "rice cakes plain": SemanticCategory.RICE_CAKES,
  
  // Nuts
  "almonds": SemanticCategory.ALMONDS,
  "walnuts": SemanticCategory.WALNUTS,
  "hazelnuts": SemanticCategory.HAZELNUTS,
  "mixed nuts": SemanticCategory.MIXED_NUTS,
  
  // Dried Fruit
  "dried cranberries": SemanticCategory.DRIED_CRANBERRIES,
  "cranberries": SemanticCategory.DRIED_CRANBERRIES,
  "cherries": SemanticCategory.CHERRIES,
  "dried fruit": SemanticCategory.DRIED_FRUIT,
  
  // Chocolate
  "dark chocolate": SemanticCategory.DARK_CHOCOLATE,
  
  // Dodaj više...
};

// ============================================
// TYPES
// ============================================

export interface IngredientWithSemantics {
  // UI Layer
  uiLabel: string; // Što korisnik vidi (npr. "Pršut")
  
  // Internal Layer
  canonicalKey?: string; // Interni ključ (npr. "prosciutto")
  semanticCategory?: SemanticCategory | null; // Semantička kategorija (null = unresolved)
  
  // Edamam Layer
  edamamQuery?: string; // Query koji se šalje Edamam-u
  edamamFoodId?: string; // Edamam food ID (ako postoji)
  edamamMatch?: string; // Što je Edamam vratio (food label)
  edamamResolvedCategory?: SemanticCategory | null; // Kategorija iz Edamam match-a (null = unresolved)
  
  // Quantity
  quantity: number;
  unit: string;
  
  // Metadata
  brand?: string;
  upc?: string;
}

export interface SemanticValidationResult {
  isValid: boolean;
  errors: Array<{
    ingredientIndex: number;
    uiLabel: string;
    uiCategory: SemanticCategory | null;
    edamamMatch: string;
    edamamCategory: SemanticCategory | null;
    mismatchReason: string;
  }>;
  audit: Array<{
    ingredientIndex: number;
    uiLabel: string;
    edamamQuery: string | undefined;
    edamamFoodId: string | undefined;
    edamamMatch: string | undefined;
    uiCategory: SemanticCategory | null;
    edamamCategory: SemanticCategory | null;
    isConsistent: boolean;
    mismatchReason?: string;
  }>;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Resolviraj semantičku kategoriju iz UI labela
 */
export function resolveCategoryFromUILabel(uiLabel: string): SemanticCategory | null {
  if (!uiLabel) return null;
  
  const normalized = uiLabel.toLowerCase().trim();
  
  // Provjeri točno poklapanje
  if (UI_LABEL_TO_CATEGORY[normalized]) {
    return UI_LABEL_TO_CATEGORY[normalized];
  }
  
  // Provjeri djelomično poklapanje
  for (const [key, category] of Object.entries(UI_LABEL_TO_CATEGORY)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return category;
    }
  }
  
  return SemanticCategory.UNKNOWN;
}

/**
 * Resolviraj semantičku kategoriju iz Edamam match teksta
 */
export function resolveCategoryFromEdamamMatch(edamamMatch: string): SemanticCategory | null {
  if (!edamamMatch) return null;
  
  const normalized = edamamMatch.toLowerCase().trim();
  
  // Provjeri točno poklapanje
  if (EDAMAM_MATCH_TO_CATEGORY[normalized]) {
    return EDAMAM_MATCH_TO_CATEGORY[normalized];
  }
  
  // Provjeri djelomično poklapanje
  for (const [key, category] of Object.entries(EDAMAM_MATCH_TO_CATEGORY)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return category;
    }
  }
  
  return SemanticCategory.UNKNOWN;
}

// ============================================
// VALIDATION FUNCTION
// ============================================

/**
 * Validira semantičku konzistentnost između UI labela i Edamam match-a
 */
export function validateRecipeSemanticConsistency(
  ingredients: IngredientWithSemantics[]
): SemanticValidationResult {
  const errors: SemanticValidationResult["errors"] = [];
  const audit: SemanticValidationResult["audit"] = [];
  
  for (let i = 0; i < ingredients.length; i++) {
    const ingredient = ingredients[i];
    
    // Resolviraj kategorije
    const uiCategory = ingredient.semanticCategory || resolveCategoryFromUILabel(ingredient.uiLabel);
    const edamamCategory = ingredient.edamamResolvedCategory || 
      (ingredient.edamamMatch ? resolveCategoryFromEdamamMatch(ingredient.edamamMatch) : null);
    
    // Audit log
    const auditEntry = {
      ingredientIndex: i,
      uiLabel: ingredient.uiLabel,
      edamamQuery: ingredient.edamamQuery,
      edamamFoodId: ingredient.edamamFoodId,
      edamamMatch: ingredient.edamamMatch,
      uiCategory,
      edamamCategory,
      isConsistent: uiCategory === edamamCategory && uiCategory !== SemanticCategory.UNKNOWN,
      mismatchReason: undefined as string | undefined,
    };
    
    // Validacija konzistentnosti
    if (ingredient.edamamMatch) {
      // Ako imamo Edamam match, mora biti konzistentan
      if (uiCategory === null || edamamCategory === null) {
        // Jedna od kategorija nije resolvirana
        const reason = `Category unresolved: UI=${uiCategory}, Edamam=${edamamCategory}`;
        auditEntry.mismatchReason = reason;
        errors.push({
          ingredientIndex: i,
          uiLabel: ingredient.uiLabel,
          uiCategory,
          edamamMatch: ingredient.edamamMatch,
          edamamCategory,
          mismatchReason: reason,
        });
      } else if (uiCategory !== edamamCategory) {
        // Kategorije se ne podudaraju
        const reason = `UI says "${ingredient.uiLabel}" (${uiCategory}) but Edamam matched "${ingredient.edamamMatch}" (${edamamCategory})`;
        auditEntry.mismatchReason = reason;
        errors.push({
          ingredientIndex: i,
          uiLabel: ingredient.uiLabel,
          uiCategory,
          edamamMatch: ingredient.edamamMatch,
          edamamCategory,
          mismatchReason: reason,
        });
      }
    } else {
      // Nema Edamam match - možda još nije izračunato
      // To je OK, ali zabilježi u audit-u
      auditEntry.mismatchReason = "No Edamam match yet";
    }
    
    audit.push(auditEntry);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    audit,
  };
}

// ============================================
// ERROR MESSAGES
// ============================================

/**
 * Generiraj korisnički čitljivu poruku greške
 */
export function generateUserFriendlyError(
  validation: SemanticValidationResult
): string | null {
  if (validation.isValid) return null;
  
  const errorMessages = validation.errors.map((error) => {
    return `UI says "${error.uiLabel}" (${error.uiCategory}) but mapped as "${error.edamamMatch}" (${error.edamamCategory}). Remap ingredient or change UI text.`;
  });
  
  return errorMessages.join("\n");
}

