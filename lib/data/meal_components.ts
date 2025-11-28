import mealComponentsJson from "./meal_components.json";

export type ComponentDefinition = { food: string; grams: number };

export type CompositeMealDefinition = {
  name: string;
  components: ComponentDefinition[];
};

export type MealComponentsConfig = {
  breakfast?: CompositeMealDefinition[];
  lunch?: CompositeMealDefinition[];
  dinner?: CompositeMealDefinition[];
  snack?: CompositeMealDefinition[];
};

export const mealComponents: MealComponentsConfig = mealComponentsJson as MealComponentsConfig;


