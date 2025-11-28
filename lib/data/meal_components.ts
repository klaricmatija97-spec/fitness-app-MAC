import mealComponentsJson from "./meal_components.json";

export type ComponentDefinition = { 
  food: string; 
  grams: number;
  displayName?: string;
};

export type GoalType = "lose" | "maintain" | "gain";

export type CompositeMealDefinition = {
  id?: string;
  name: string;
  description?: string;
  components: ComponentDefinition[];
  tags?: string[];
  suitableFor?: GoalType[];
};

export type MealComponentsConfig = {
  breakfast?: CompositeMealDefinition[];
  lunch?: CompositeMealDefinition[];
  dinner?: CompositeMealDefinition[];
  snack?: CompositeMealDefinition[];
};

export const mealComponents: MealComponentsConfig = mealComponentsJson as MealComponentsConfig;

/**
 * Dohvati obroke prikladne za određeni cilj
 */
export function getMealsForGoal(
  mealType: keyof MealComponentsConfig, 
  goal: GoalType
): CompositeMealDefinition[] {
  const meals = mealComponents[mealType] || [];
  return meals.filter(meal => {
    // Ako nema suitableFor, pretpostavi da je za sve ciljeve
    if (!meal.suitableFor || meal.suitableFor.length === 0) {
      return true;
    }
    return meal.suitableFor.includes(goal);
  });
}

/**
 * Dohvati hrvatski naziv namirnice
 */
export function getDisplayName(component: ComponentDefinition): string {
  return component.displayName || component.food;
}
