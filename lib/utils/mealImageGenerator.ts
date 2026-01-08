/**
 * Meal Image Generator
 * 
 * Automatski generira URL-ove slika za jela na temelju sastojaka.
 * Koristi Unsplash za besplatne, visokokvalitetne slike hrane.
 */

// Mapa hrvatskih naziva namirnica na engleske search termine
const FOOD_TRANSLATION_MAP: Record<string, string> = {
  // Proteini
  "Egg": "scrambled eggs",
  "Egg white": "egg whites",
  "Chicken breast": "grilled chicken breast",
  "Smoked chicken breast": "smoked chicken",
  "Turkey breast": "turkey breast",
  "Beef": "beef steak",
  "Beef lean": "lean beef",
  "Salmon": "salmon fillet",
  "Tuna": "tuna steak",
  "Tuna canned": "canned tuna",
  "Cod": "cod fish",
  "Shrimp": "shrimp",
  "Ham": "prosciutto ham",
  "Bacon": "bacon strips",
  "Whey protein": "protein shake",
  "Whey": "protein shake",
  
  // Mliječni proizvodi
  "Milk": "glass of milk",
  "Greek yogurt": "greek yogurt bowl",
  "Skyr": "skyr yogurt",
  "Cottage cheese": "cottage cheese",
  "Cheese": "cheese slices",
  "Mozzarella": "mozzarella cheese",
  "Feta": "feta cheese",
  "Parmesan": "parmesan cheese",
  "Sour cream": "sour cream",
  "Butter": "butter",
  
  // Ugljikohidrati
  "Rice": "cooked rice",
  "Rice cooked": "cooked rice",
  "Pasta": "pasta",
  "Pasta cooked": "cooked pasta",
  "Bread": "whole grain bread",
  "Toast": "toast bread",
  "Oats": "oatmeal bowl",
  "Oatmeal": "oatmeal bowl",
  "Potatoes": "baked potatoes",
  "Sweet potato": "sweet potato",
  "Rice crackers": "rice crackers",
  "Granola": "granola bowl",
  "Quinoa": "quinoa bowl",
  "Couscous": "couscous",
  
  // Voće
  "Banana": "banana",
  "Apple": "apple",
  "Blueberries": "blueberries",
  "Strawberries": "strawberries",
  "Orange": "orange",
  "Mango": "mango",
  "Pineapple": "pineapple",
  "Grapes": "grapes",
  "Watermelon": "watermelon",
  "Avocado": "avocado",
  
  // Povrće
  "Broccoli": "broccoli",
  "Spinach": "spinach",
  "Tomato": "tomatoes",
  "Cucumber": "cucumber",
  "Lettuce": "lettuce salad",
  "Peppers": "bell peppers",
  "Onion": "onion",
  "Garlic": "garlic",
  "Carrots": "carrots",
  "Zucchini": "zucchini",
  "Mushrooms": "mushrooms",
  "Asparagus": "asparagus",
  
  // Orašasti plodovi i sjemenke
  "Almonds": "almonds",
  "Walnuts": "walnuts",
  "Peanut butter": "peanut butter",
  "Peanuts": "peanuts",
  "Cashews": "cashews",
  "Chia seeds": "chia seeds",
  "Flax seeds": "flax seeds",
  
  // Ulja i masti
  "Olive oil": "olive oil",
  "Coconut oil": "coconut oil",
  
  // Ostalo
  "Honey": "honey",
  "Maple syrup": "maple syrup",
  "Chocolate dark": "dark chocolate",
  "Cocoa powder": "cocoa powder",
};

// Generičke slike po tipu obroka (fallback)
const MEAL_TYPE_IMAGES: Record<string, string> = {
  breakfast: "https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=400&h=300&fit=crop&q=80",
  lunch: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop&q=80",
  dinner: "https://images.unsplash.com/photo-1432139555190-58524dae6a55?w=400&h=300&fit=crop&q=80",
  snack: "https://images.unsplash.com/photo-1505576399279-565b52d4ac71?w=400&h=300&fit=crop&q=80",
};

// Ručno mapirane slike za specifična jela (za problematična jela)
const MANUAL_MEAL_IMAGES: Record<string, string> = {
  // Dodaj ovdje ID-ove jela s ručno odabranim slikama
  // "breakfast_lose_1": "https://images.unsplash.com/photo-XXXXX",
};

interface MealComponent {
  food: string;
  grams: number;
  displayName?: string;
}

interface MealOption {
  id: string;
  name: string;
  components: MealComponent[];
  imageUrl?: string;
}

/**
 * Ekstraktira glavne sastojke iz jela i vraća engleski search query
 */
function extractMainIngredients(components: MealComponent[]): string[] {
  // Sortiraj po gramaži (najveći prvi) i uzmi top 3
  const sortedComponents = [...components]
    .sort((a, b) => b.grams - a.grams)
    .slice(0, 3);
  
  const ingredients: string[] = [];
  
  for (const component of sortedComponents) {
    const foodName = component.food;
    
    // Pronađi prijevod
    const translation = FOOD_TRANSLATION_MAP[foodName] || 
                       FOOD_TRANSLATION_MAP[foodName.toLowerCase()] ||
                       foodName.toLowerCase().replace(/_/g, ' ');
    
    if (translation && !ingredients.includes(translation)) {
      ingredients.push(translation);
    }
  }
  
  return ingredients;
}

/**
 * Generira Unsplash URL za jelo na temelju sastojaka
 */
export function getMealImageUrl(
  meal: MealOption,
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack'
): string {
  // 1. Provjeri ručno mapirane slike
  if (MANUAL_MEAL_IMAGES[meal.id]) {
    return MANUAL_MEAL_IMAGES[meal.id];
  }
  
  // 2. Provjeri imageUrl u jelu
  if (meal.imageUrl) {
    return meal.imageUrl;
  }
  
  // 3. Generiraj na temelju sastojaka
  const ingredients = extractMainIngredients(meal.components);
  
  if (ingredients.length > 0) {
    // Dodaj tip obroka za bolji kontekst
    const mealTypeContext = mealType || 'food';
    const query = [...ingredients, mealTypeContext, 'healthy'].join(' ');
    const encodedQuery = encodeURIComponent(query);
    
    // Koristi Unsplash Source API s preciznim queryjem
    return `https://source.unsplash.com/400x300/?${encodedQuery}`;
  }
  
  // 4. Fallback na generičku sliku tipa obroka
  if (mealType && MEAL_TYPE_IMAGES[mealType]) {
    return MEAL_TYPE_IMAGES[mealType];
  }
  
  // 5. Ultimate fallback
  return "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop&q=80";
}

/**
 * Generira Unsplash URL samo na temelju imena jela (manje precizno)
 */
export function getMealImageByName(mealName: string, mealType?: string): string {
  const query = encodeURIComponent(`${mealName} food ${mealType || 'meal'}`);
  return `https://source.unsplash.com/400x300/?${query}`;
}

/**
 * Dohvaća generičku sliku za tip obroka
 */
export function getMealTypePlaceholder(mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'): string {
  return MEAL_TYPE_IMAGES[mealType] || MEAL_TYPE_IMAGES.lunch;
}

/**
 * Dodaje imageUrl ručno za specifično jelo
 * Koristi ovo za problematična jela
 */
export function addManualMealImage(mealId: string, imageUrl: string): void {
  MANUAL_MEAL_IMAGES[mealId] = imageUrl;
}

/**
 * Batch funkcija za generiranje slika za sva jela
 * Vraća mapu id -> imageUrl
 */
export function generateAllMealImages(
  meals: MealOption[],
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
): Map<string, string> {
  const imageMap = new Map<string, string>();
  
  for (const meal of meals) {
    const imageUrl = getMealImageUrl(meal, mealType);
    imageMap.set(meal.id, imageUrl);
  }
  
  return imageMap;
}

