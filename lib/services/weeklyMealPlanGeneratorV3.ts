/**
* TJEDNI PLAN PREHRANE - PROFESIONALNI GENERATOR V3
*
* NOVI GENERATOR - ISPRAVLJENA VERZIJA SA TOLERANCIJOM MAKSIMALNO 10%
*
* Po uzoru na najbolje generatore:
* - Iterativno skaliranje dok makroi nisu unutar ±10% (kalorije i makroi)
* - Strogi tracking jela (nikad duplikati unutar dana, maksimalna različitost kroz tjedan)
* - Točne kalorije u skladu s kalkulatorom
* - Kalorijske granice po obroku
* - clampToPortionLimits() za realistične porcije
* - Poboljšana logika skaliranja za postizanje točnih targeta
*/

import { createServiceClient } from "../supabase";
import mealComponentsData from "../data/meal_components.json";
import {
findNamirnica,
calculateMacrosForGrams,
type Namirnica,
} from "../data/foods-database";
import { chooseBestMeal, type Meal } from "./scoring";

const supabase = createServiceClient();

// ============================================
// TIPOVI
// ============================================

interface MealComponent {
food: string;
grams: number;
displayName: string;
}

interface CompositeMeal {
id: string;
name: string;
description: string;
image?: string;
preparationTip?: string;
components: MealComponent[];
tags: string[];
suitableFor: string[];
}

interface MealComponentsData {
breakfast: CompositeMeal[];
lunch: CompositeMeal[];
dinner: CompositeMeal[];
snack: CompositeMeal[];
}

interface UserCalculations {
targetCalories: number;
targetProtein: number;
targetCarbs: number;
targetFat: number;
goalType: "lose" | "maintain" | "gain";
bmr: number;
tdee: number;
}

interface GeneratedMeal {
id?: string;
name: string;
description: string;
image?: string;
preparationTip?: string;
components: {
name: string;
grams: number;
calories: number;
protein: number;
carbs: number;
fat: number;
}[];
totals: {
calories: number;
protein: number;
carbs: number;
fat: number;
};
// Originalne komponente iz baze (za kasnije skaliranje)
_originalComponents?: Array<{
food: string;
grams: number;
displayName: string;
}>;
}

interface DailyPlan {
date: string;
dayName: string;
meals: Record<string, GeneratedMeal>;
dailyTotals: {
calories: number;
protein: number;
carbs: number;
fat: number;
};
}

interface WeeklyMealPlan {
userId: string;
generatedAt: string;
weekStartDate: string;
userTargets: {
calories: number;
protein: number;
carbs: number;
fat: number;
goal: string;
};
days: DailyPlan[];
weeklyTotals: {
avgCalories: number;
avgProtein: number;
avgCarbs: number;
avgFat: number;
};
}

interface UserPreferences {
avoidIngredients: string[];
preferredIngredients: string[];
desiredMealsPerDay: 3 | 5 | 6;
}

// ============================================
// OGRANIČENJA KALORIJA PO OBROKU
// ============================================
// FLEKSIBILNA OGRANIČENJA - prioritet je postizanje točnog dnevnog targeta!

const MEAL_CALORIE_LIMITS: Record<string, { min: number; max: number }> = {
breakfast: { min: 150, max: 1200 },
snack: { min: 50, max: 600 },
snack1: { min: 50, max: 600 },
snack2: { min: 50, max: 600 },
snack3: { min: 50, max: 600 },
lunch: { min: 300, max: 1500 },
dinner: { min: 300, max: 1200 },
};

// ============================================
// PORTION LIMITS
// ============================================

const PORTION_LIMITS: Record<string, { min: number; max: number }> = {
// Proteini - max 250g
chicken_breast: { min: 20, max: 250 },
"Chicken breast": { min: 20, max: 250 },
turkey_breast: { min: 20, max: 250 },
"Turkey breast": { min: 20, max: 250 },
beef_lean: { min: 20, max: 250 },
Beef: { min: 20, max: 250 },
salmon: { min: 20, max: 250 },
Salmon: { min: 20, max: 250 },
tuna_canned: { min: 20, max: 250 },
tuna: { min: 20, max: 250 },
Tuna: { min: 20, max: 250 },
hake: { min: 20, max: 250 },
Hake: { min: 20, max: 250 },
egg_whole: { min: 20, max: 250 },
Egg: { min: 20, max: 250 },
egg_white: { min: 20, max: 250 },
"Egg white": { min: 20, max: 250 },

// Ugljikohidrati - povećani limiti za gain mode (max 400g za glavne izvore)
oats: { min: 20, max: 200 },
Oats: { min: 20, max: 200 },
rice_cooked: { min: 20, max: 450 },
rice: { min: 20, max: 450 },
Rice: { min: 20, max: 450 },
pasta_cooked: { min: 20, max: 450 },
"Pasta cooked": { min: 20, max: 450 },
Pasta: { min: 20, max: 450 },
potato_boiled: { min: 20, max: 500 },
potatoes: { min: 20, max: 500 },
Potatoes: { min: 20, max: 500 },
buckwheat_cooked: { min: 20, max: 400 },
Buckwheat: { min: 20, max: 400 },
couscous_cooked: { min: 20, max: 400 },
Couscous: { min: 20, max: 400 },
toast: { min: 20, max: 250 },
Toast: { min: 20, max: 250 },
rice_crackers: { min: 20, max: 200 },
"Rice crackers": { min: 20, max: 200 },
quinoa_cooked: { min: 20, max: 400 },
Quinoa: { min: 20, max: 400 },
tortilla: { min: 20, max: 200 },
Tortilla: { min: 20, max: 200 },

// Masti - max 40g
avocado: { min: 20, max: 40 },
Avocado: { min: 20, max: 40 },
peanut_butter: { min: 5, max: 40 },
"Peanut butter": { min: 5, max: 40 },
olive_oil: { min: 3, max: 40 },
"Olive oil": { min: 3, max: 40 },
olives: { min: 20, max: 40 },
Olives: { min: 20, max: 40 },

// Mliječni
greek_yogurt: { min: 20, max: 250 },
"Greek yogurt": { min: 20, max: 250 },
cottage_cheese: { min: 20, max: 250 },
"Cottage cheese": { min: 20, max: 250 },
milk_low_fat: { min: 20, max: 400 },
milk: { min: 20, max: 400 },
Milk: { min: 20, max: 400 },
skyr: { min: 20, max: 250 },
Skyr: { min: 20, max: 250 },
sour_cream: { min: 20, max: 40 },
"Sour cream": { min: 20, max: 40 },

// Voće - povećani limiti za gain mode
banana: { min: 20, max: 300 },
Banana: { min: 20, max: 300 },
apple: { min: 20, max: 250 },
Apple: { min: 20, max: 250 },
blueberries: { min: 20, max: 200 },
Blueberries: { min: 20, max: 200 },
frozen_cherries: { min: 20, max: 200 },
FrozenCherries: { min: 20, max: 200 },
Cherries: { min: 20, max: 200 },
raspberries: { min: 20, max: 200 },
Raspberries: { min: 20, max: 200 },
strawberries: { min: 20, max: 200 },
Strawberries: { min: 20, max: 200 },
mango: { min: 20, max: 200 },
Mango: { min: 20, max: 200 },

// Povrće
broccoli: { min: 20, max: 200 },
Broccoli: { min: 20, max: 200 },
carrot: { min: 20, max: 200 },
Carrot: { min: 20, max: 200 },
cucumber: { min: 20, max: 200 },
Cucumber: { min: 20, max: 200 },
lettuce: { min: 20, max: 200 },
Lettuce: { min: 20, max: 200 },
tomato: { min: 20, max: 200 },
Tomato: { min: 20, max: 200 },
corn: { min: 20, max: 180 },
Corn: { min: 20, max: 180 },

// Whey
whey_protein: { min: 10, max: 50 },
Whey: { min: 10, max: 50 },
"Whey protein": { min: 10, max: 50 },

// Default
default: { min: 20, max: 200 },
};

function getPortionLimits(foodKey: string): { min: number; max: number } {
const namirnica = findNamirnica(foodKey);
if (!namirnica) {
return PORTION_LIMITS["default"];
}

const byId = PORTION_LIMITS[namirnica.id];
if (byId) return byId;

const byName = PORTION_LIMITS[namirnica.name];
if (byName) return byName;

const byNameEn = PORTION_LIMITS[namirnica.nameEn];
if (byNameEn) return byNameEn;

if (namirnica.category === "protein") {
return { min: 20, max: 300 };
} else if (namirnica.category === "carb") {
return { min: 20, max: 450 }; // Povećano za gain mode
} else if (namirnica.category === "fat") {
return { min: 10, max: 80 };
} else if (namirnica.category === "vegetable") {
return { min: 20, max: 250 };
} else if (namirnica.category === "fruit") {
return { min: 20, max: 250 };
} else if (namirnica.category === "dairy") {
if (namirnica.proteinPer100g > 8) {
return { min: 20, max: 300 };
} else {
return { min: 20, max: 250 };
}
}

return PORTION_LIMITS["default"];
}

function clampToPortionLimits(foodKey: string, grams: number): number {
const limits = getPortionLimits(foodKey);
const clamped = Math.max(
limits.min,
Math.min(limits.max * 1.5, Math.round(grams / 5) * 5)
);
return clamped;
}

// ============================================
// POMOĆNE FUNKCIJE
// ============================================

async function getUserCalculations(userId: string): Promise<UserCalculations> {
const { data, error } = await supabase
.from("client_calculations")
.select("*")
.eq("client_id", userId)
.single();

if (error || !data) {
throw new Error(
"Nema kalkulacija u bazi. Molimo prvo izračunajte kalkulacije."
);
}

const parseNumeric = (value: any): number => {
if (typeof value === "number") return value;
if (typeof value === "string") {
const parsed = parseFloat(value);
return isNaN(parsed) ? 0 : parsed;
}
if (value && typeof value === "object" && "toNumber" in value) {
// Decimal tip
// @ts-ignore
return value.toNumber();
}
return 0;
};

const targetCalories = parseNumeric(data.target_calories);
const targetProtein = parseNumeric(data.protein_grams);
const targetCarbs = parseNumeric(data.carbs_grams);
const targetFat = parseNumeric(data.fats_grams);
const bmr = parseNumeric(data.bmr);
const tdee = parseNumeric(data.tdee);

if (
targetCalories <= 0 ||
targetProtein <= 0 ||
targetCarbs <= 0 ||
targetFat <= 0
) {
throw new Error(
`Nevaljane kalkulacije u bazi: ${targetCalories} kcal, P: ${targetProtein}g, C: ${targetCarbs}g, F: ${targetFat}g`
);
}

console.log(
`📊 ČITAM IZ KALKULATORA: ${targetCalories} kcal, P: ${targetProtein}g, C: ${targetCarbs}g, F: ${targetFat}g`
);

return {
targetCalories: Math.round(targetCalories),
targetProtein: Math.round(targetProtein * 10) / 10,
targetCarbs: Math.round(targetCarbs * 10) / 10,
targetFat: Math.round(targetFat * 10) / 10,
goalType: (data.goal_type as "lose" | "maintain" | "gain") || "maintain",
bmr: Math.round(bmr),
tdee: Math.round(tdee),
};
}

function parseUserPreferences(
allergiesText: string | null | undefined
): UserPreferences {
const preferences: UserPreferences = {
avoidIngredients: [],
preferredIngredients: [],
desiredMealsPerDay: 5,
};

if (!allergiesText) return preferences;

const lowerText = allergiesText.toLowerCase();

const alergijeMatch = lowerText.match(
/(?:alergije|alergičan|intolerancija)[:;]?\s*(.+?)(?:\.|ne\s+želim|preferiram|obroci|$)/i
);
if (alergijeMatch) {
const alergijeArray = alergijeMatch[1]
.split(/[,;]/)
.map((a) => a.trim())
.filter(Boolean);
preferences.avoidIngredients.push(...alergijeArray);
}

const neZelimMatch = lowerText.match(
/(?:ne\s+želim|izbjegavam|ne\s+volim)[:;]?\s*(.+?)(?:\.|preferiram|obroci|$)/i
);
if (neZelimMatch) {
const avoidArray = neZelimMatch[1]
.split(/[,;]/)
.map((a) => a.trim())
.filter(Boolean);
preferences.avoidIngredients.push(...avoidArray);
}

const preferiramMatch = lowerText.match(
/(?:preferiram|volim|želim)[:;]?\s*(.+?)(?:\.|obroci|$)/i
);
if (preferiramMatch) {
const prefArray = preferiramMatch[1]
.split(/[,;]/)
.map((p) => p.trim())
.filter(Boolean);
preferences.preferredIngredients.push(...prefArray);
}

const obrociMatch = lowerText.match(/(?:obroci|meals)[:;]?\s*([356])/i);
if (obrociMatch) {
const numMeals = parseInt(obrociMatch[1]);
if (numMeals === 3 || numMeals === 5 || numMeals === 6) {
preferences.desiredMealsPerDay = numMeals as 3 | 5 | 6;
}
}

if (!alergijeMatch && !neZelimMatch && !preferiramMatch && !obrociMatch) {
const allItems = allergiesText
.split(/[,;]/)
.map((a) => a.trim())
.filter(Boolean);
preferences.avoidIngredients.push(...allItems);
}

return preferences;
}

function hasAvoidedIngredient(
meal: CompositeMeal,
avoidIngredients: string[]
): boolean {
if (avoidIngredients.length === 0) return false;

const mealIngredients = meal.components.map((c) => c.food.toLowerCase());
const avoidLower = avoidIngredients.map((a) => a.toLowerCase());

return mealIngredients.some((ing) => {
return avoidLower.some(
(avoid) => ing.includes(avoid) || avoid.includes(ing)
);
});
}

function hasPreferredIngredient(
meal: CompositeMeal,
preferredIngredients: string[]
): boolean {
if (preferredIngredients.length === 0) return false;

const mealIngredients = meal.components
.map((c) => c.food.toLowerCase())
.join(" ");
const prefLower = preferredIngredients.map((p) => p.toLowerCase());

return prefLower.some((pref) => mealIngredients.includes(pref));
}

function getMainProteins(meal: CompositeMeal): string[] {
const proteinFoods = [
"chicken",
"beef",
"turkey",
"salmon",
"tuna",
"hake",
"egg",
"cottage",
"greek",
"skyr",
];

const mainProteins: string[] = [];
const mealFoods = meal.components.map((c) => c.food.toLowerCase());

for (const food of mealFoods) {
for (const protein of proteinFoods) {
if (food.includes(protein) || protein.includes(food)) {
mainProteins.push(protein);
break;
}
}
}

return mainProteins;
}

function hasSameMainProteins(
meal: CompositeMeal,
previousMainProteins: string[]
): boolean {
if (previousMainProteins.length === 0) return false;

const currentMainProteins = getMainProteins(meal);
if (currentMainProteins.length === 0) return false;

return currentMainProteins.some((protein) =>
previousMainProteins.includes(protein)
);
}

function calculateMealMacros(
components: MealComponent[],
scaleFactor: number = 1
): GeneratedMeal["components"] {
return components.map((comp) => {
const namirnica = findNamirnica(comp.food);
if (!namirnica) {
return {
name: comp.displayName || comp.food,
grams: Math.round((comp.grams * scaleFactor) / 5) * 5,
calories: 0,
protein: 0,
carbs: 0,
fat: 0,
};
}

const scaledGrams = clampToPortionLimits(comp.food, comp.grams * scaleFactor);
const macros = calculateMacrosForGrams(namirnica, scaledGrams);

return {
name: comp.displayName || comp.food,
grams: scaledGrams,
calories: Math.round(macros.calories),
protein: Math.round(macros.protein * 10) / 10,
carbs: Math.round(macros.carbs * 10) / 10,
fat: Math.round(macros.fat * 10) / 10,
};
});
}

function calculateMealTotals(
components: GeneratedMeal["components"]
): GeneratedMeal["totals"] {
const totals = components.reduce(
(acc, comp) => ({
protein: acc.protein + comp.protein,
carbs: acc.carbs + comp.carbs,
fat: acc.fat + comp.fat,
}),
{ protein: 0, carbs: 0, fat: 0 }
);

const protein = Math.round(totals.protein * 10) / 10;
const carbs = Math.round(totals.carbs * 10) / 10;
const fat = Math.round(totals.fat * 10) / 10;

const calories = Math.round(protein * 4 + carbs * 4 + fat * 9);

return { calories, protein, carbs, fat };
}

function isWithinMealCalorieLimits(
meal: GeneratedMeal,
mealType: string
): boolean {
const limits = MEAL_CALORIE_LIMITS[mealType];
if (!limits) return true;
return (
meal.totals.calories >= limits.min && meal.totals.calories <= limits.max
);
}

function isMealSuitableForMode(
meal: CompositeMeal,
goalType: "lose" | "maintain" | "gain"
): boolean {
if (meal.suitableFor && meal.suitableFor.length > 0) {
const modeMap: Record<string, string> = {
lose: "lose",
maintain: "maintain",
gain: "gain",
};
const targetMode = modeMap[goalType];
if (!meal.suitableFor.includes(targetMode)) {
return false;
}
}

const mealFoods = meal.components.map((c) => c.food.toLowerCase()).join(" ");
const mealFoodsLower = mealFoods.toLowerCase();

if (goalType === "lose") {
if (mealFoodsLower.includes("batat") || mealFoodsLower.includes("sweet potato")) {
return false;
}

const pbComponent = meal.components.find(
(c) =>
c.food.toLowerCase().includes("peanut") ||
c.food.toLowerCase().includes("pb")
);
if (pbComponent && pbComponent.grams > 10) {
return false;
}
if (pbComponent && meal.components.length === 1) {
return false;
}
}

if (goalType === "maintain") {
const pbComponent = meal.components.find(
(c) =>
c.food.toLowerCase().includes("peanut") ||
c.food.toLowerCase().includes("pb")
);
if (pbComponent && (pbComponent.grams < 10 || pbComponent.grams > 20)) {
return false;
}
}

if (goalType === "gain") {
const pbComponent = meal.components.find(
(c) =>
c.food.toLowerCase().includes("peanut") ||
c.food.toLowerCase().includes("pb")
);
if (pbComponent && pbComponent.grams > 25) {
return false;
}
}

return true;
}

function convertToMeal(compositeMeal: CompositeMeal): Meal {
const baseComponents = calculateMealMacros(compositeMeal.components, 1);
const totals = calculateMealTotals(baseComponents);
return {
kcal: totals.calories,
protein: totals.protein,
carbs: totals.carbs,
fat: totals.fat,
id: compositeMeal.id,
name: compositeMeal.name,
_compositeMeal: compositeMeal,
} as any;
}

function selectRandomMeal(
meals: CompositeMeal[],
usedMealIds: Set<string>,
usedMealNamesToday: Set<string>,
usedMealNamesThisWeek: Set<string>,
preferences: UserPreferences,
previousMainProteins: string[] | undefined,
goalType: "lose" | "maintain" | "gain" | undefined,
targetCalories: number,
targetProtein: number,
targetCarbs: number,
targetFat: number,
runningMacros?: {
protein: number;
carbs: number;
fat: number;
calories: number;
}
): CompositeMeal | null {
let availableMeals = meals;

if (preferences.avoidIngredients.length > 0) {
availableMeals = availableMeals.filter(
(meal) => !hasAvoidedIngredient(meal, preferences.avoidIngredients)
);
}

if (goalType) {
availableMeals = availableMeals.filter((meal) =>
isMealSuitableForMode(meal, goalType)
);
}

if (availableMeals.length === 0) return null;

let preferredMeals = availableMeals.filter(
(meal) =>
!usedMealIds.has(meal.id) &&
!usedMealNamesToday.has(meal.name.toLowerCase()) &&
!usedMealNamesThisWeek.has(meal.name.toLowerCase())
);

if (previousMainProteins && previousMainProteins.length > 0) {
preferredMeals = preferredMeals.filter(
(meal) => !hasSameMainProteins(meal, previousMainProteins)
);
}

if (preferredMeals.length === 0) {
preferredMeals = availableMeals.filter(
(meal) =>
!usedMealIds.has(meal.id) &&
!usedMealNamesToday.has(meal.name.toLowerCase())
);
}

if (preferredMeals.length === 0) {
preferredMeals = availableMeals;
}

if (preferences.preferredIngredients.length > 0) {
const mealsWithPrefs = preferredMeals.filter((meal) =>
hasPreferredIngredient(meal, preferences.preferredIngredients)
);
if (mealsWithPrefs.length > 0) {
preferredMeals = mealsWithPrefs;
}
}

const mealCandidates: Meal[] = preferredMeals.map(convertToMeal);

const bestMeal = chooseBestMeal(
mealCandidates,
targetCalories,
targetProtein,
targetFat,
targetCarbs,
goalType || "maintain",
runningMacros
);

if (!bestMeal) {
const randomIndex = Math.floor(Math.random() * preferredMeals.length);
return preferredMeals[randomIndex];
}

return (
(bestMeal as any)._compositeMeal ||
preferredMeals.find((m) => m.id === bestMeal.id) ||
preferredMeals[0]
);
}

function generateMealWithTracking(
mealType: "breakfast" | "lunch" | "dinner" | "snack",
mealData: MealComponentsData,
targetCalories: number,
targetProtein: number,
targetCarbs: number,
targetFat: number,
usedMealIds: Set<string>,
usedMealNamesToday: Set<string>,
usedMealNamesThisWeekBySlot: Set<string>,
preferences: UserPreferences,
previousMainProteins: Map<string, string[]>,
todayMainProteins: Map<string, string[]>,
goalType?: "lose" | "maintain" | "gain"
): GeneratedMeal | null {
const slotKey = mealType === "snack" ? "snack" : mealType;
const prevProteins = previousMainProteins.get(slotKey) || [];

const meal = generateMeal(
mealType,
mealData,
targetCalories,
targetProtein,
targetCarbs,
targetFat,
usedMealIds,
usedMealNamesToday,
usedMealNamesThisWeekBySlot,
preferences,
prevProteins,
goalType
);

if (meal) {
const mealComponents = mealData[mealType] as CompositeMeal[];
const selectedMeal = mealComponents.find((m) => m.id === meal.id);
if (selectedMeal) {
const mainProteins = getMainProteins(selectedMeal);
todayMainProteins.set(slotKey, mainProteins);
}
}

return meal;
}

function generateMeal(
mealType: "breakfast" | "lunch" | "dinner" | "snack",
mealData: MealComponentsData,
targetCalories: number,
targetProtein: number,
targetCarbs: number,
targetFat: number,
usedMealIds: Set<string>,
usedMealNamesToday: Set<string>,
usedMealNamesThisWeekBySlot: Set<string>,
preferences: UserPreferences,
previousMainProteins?: string[],
goalType?: "lose" | "maintain" | "gain"
): GeneratedMeal | null {
const meals = mealData[mealType] as CompositeMeal[];
const selectedMeal = selectRandomMeal(
meals,
usedMealIds,
usedMealNamesToday,
usedMealNamesThisWeekBySlot,
preferences,
previousMainProteins,
goalType,
targetCalories,
targetProtein,
targetCarbs,
targetFat
);

if (!selectedMeal) return null;

usedMealIds.add(selectedMeal.id);
usedMealNamesToday.add(selectedMeal.name.toLowerCase());
usedMealNamesThisWeekBySlot.add(selectedMeal.name.toLowerCase());

const baseComponents = calculateMealMacros(selectedMeal.components, 1);
const baseTotals = calculateMealTotals(baseComponents);

if (baseTotals.calories === 0) return null;

const scaledComponents = baseComponents;
const scaledTotals = calculateMealTotals(scaledComponents);

const originalComponents = selectedMeal.components.map((comp) => ({
food: comp.food,
grams: comp.grams,
displayName: comp.displayName || comp.food,
}));

if (!originalComponents || originalComponents.length === 0) {
console.error(`❌ Meal ${selectedMeal.id} nema komponenti!`);
return null;
}

return {
id: selectedMeal.id,
name: selectedMeal.name,
description: selectedMeal.description,
image: selectedMeal.image,
preparationTip: selectedMeal.preparationTip,
components: scaledComponents,
totals: scaledTotals,
_originalComponents: originalComponents,
};
}

/**
* JEDNOSTAVNO, STABILNO SKALIRANJE OBROKA
*
* - Koristi USDA bazu (findNamirnica + calculateMacrosForGrams)
* - Jedan globalni scale faktor za SVE komponente
* - Cilj: dnevni total unutar ~±3% za kalorije i makroe
* - Nema ludih oscilacija između dana
*/
function scaleAllMealsToTarget(
meals: Record<string, GeneratedMeal>,
targetCalories: number,
targetProtein: number,
targetCarbs: number,
targetFat: number,
goalType: "lose" | "maintain" | "gain"
): Record<string, GeneratedMeal> {
const MAX_ITER = 40;
const CAL_TOL = 0.03; // 3% za kalorije
const MACRO_TOL = 0.05; // 5% za makroe

if (!meals || Object.keys(meals).length === 0) {
console.warn("⚠️ scaleAllMealsToTarget: nema obroka za skaliranje");
return meals;
}

// Helper: ukupni makroi i kalorije za dan
const getTotals = (m: Record<string, GeneratedMeal>) => {
const macroTotals = Object.values(m).reduce(
(acc, meal) => ({
protein: acc.protein + meal.totals.protein,
carbs: acc.carbs + meal.totals.carbs,
fat: acc.fat + meal.totals.fat,
}),
{ protein: 0, carbs: 0, fat: 0 }
);

const protein = Math.round(macroTotals.protein * 10) / 10;
const carbs = Math.round(macroTotals.carbs * 10) / 10;
const fat = Math.round(macroTotals.fat * 10) / 10;
const calories = Math.round(protein * 4 + carbs * 4 + fat * 9);

return { calories, protein, carbs, fat };
};

// Početni total
const startTotals = getTotals(meals);
if (!startTotals.calories || startTotals.calories === 0) {
console.warn("⚠️ scaleAllMealsToTarget: nevaljani početni makroi");
return meals;
}

console.log(
`\n🔧 SCALE START: curr ${startTotals.calories} kcal, ` +
`P:${startTotals.protein}g, C:${startTotals.carbs}g, F:${startTotals.fat}g ` +
`→ target: ${targetCalories} kcal, P:${targetProtein}g, C:${targetCarbs}g, F:${targetFat}g`
);

let currentMeals: Record<string, GeneratedMeal> = meals;

for (let iter = 0; iter < MAX_ITER; iter++) {
const { calories, protein, carbs, fat } = getTotals(currentMeals);

const calDev =
targetCalories > 0
? Math.abs(calories - targetCalories) / targetCalories
: 0;
const pDev =
targetProtein > 0
? Math.abs(protein - targetProtein) / targetProtein
: 0;
const cDev =
targetCarbs > 0
? Math.abs(carbs - targetCarbs) / targetCarbs
: 0;
const fDev =
targetFat > 0 ? Math.abs(fat - targetFat) / targetFat : 0;

const withinTarget =
calDev <= CAL_TOL &&
pDev <= MACRO_TOL &&
cDev <= MACRO_TOL &&
fDev <= MACRO_TOL;

if (withinTarget) {
if (iter > 0) {
console.log(
`✅ SCALE OK nakon ${iter} iteracija → ` +
`${calories} kcal, P:${protein}g, C:${carbs}g, F:${fat}g`
);
}
return currentMeals;
}

if (iter < 3 || iter % 5 === 0) {
console.log(
`🔄 Iter ${iter + 1}: ${calories} kcal (dev ${(calDev * 100).toFixed(
1
)}%), ` +
`P:${protein}g, C:${carbs}g, F:${fat}g`
);
}

// Izračunaj JEDAN scale faktor (prioritet kalorije + protein)
const calFactor =
calories > 0 ? targetCalories / calories : 1.0;
const pFactor =
protein > 0 ? targetProtein / protein : 1.0;
const cFactor =
carbs > 0 ? targetCarbs / carbs : 1.0;
const fFactor =
fat > 0 ? targetFat / fat : 1.0;

let scaleFactor =
calFactor * 0.5 + // najvažnije
pFactor * 0.3 +
cFactor * 0.1 +
fFactor * 0.1;

// Ograniči scale faktor da ne poludi
scaleFactor = Math.max(0.7, Math.min(1.3, scaleFactor));

const scaledMeals: Record<string, GeneratedMeal> = {};

for (const [slot, meal] of Object.entries(currentMeals)) {
// Uvijek koristi originalne komponente ako postoje (iz baze)
const baseComponents =
(meal as any)._originalComponents ||
meal.components.map((c: any) => ({
food: c.name, // fallback ako nemamo food id
grams: c.grams,
displayName: c.name,
}));

const scaledComponents = baseComponents.map((comp: any) => {
const foodId = comp.food;
const baseGrams = comp.grams || 0;

if (!foodId || baseGrams === 0) {
return {
name: comp.displayName || foodId,
grams: baseGrams,
calories: 0,
protein: 0,
carbs: 0,
fat: 0,
};
}

const namirnica = findNamirnica(foodId);
if (!namirnica) {
return {
name: comp.displayName || foodId,
grams: baseGrams,
calories: 0,
protein: 0,
carbs: 0,
fat: 0,
};
}

// Izračunaj nove gramaže
let newGrams = baseGrams * scaleFactor;
// Realne porcije + zaokruživanje
newGrams = clampToPortionLimits(foodId, newGrams);
const macros = calculateMacrosForGrams(namirnica, newGrams);

return {
name: comp.displayName || foodId,
grams: Math.round(newGrams / 5) * 5,
calories: Math.round(macros.calories),
protein: Math.round(macros.protein * 10) / 10,
carbs: Math.round(macros.carbs * 10) / 10,
fat: Math.round(macros.fat * 10) / 10,
};
});

const totals = calculateMealTotals(scaledComponents);

scaledMeals[slot] = {
...meal,
components: scaledComponents,
totals,
_originalComponents:
(meal as any)._originalComponents || baseComponents,
};
}

currentMeals = scaledMeals;
}

// Ako nismo pogodili unutar MAX_ITER, vrati zadnju verziju
const finalTotals = getTotals(currentMeals);
console.warn(
`⚠️ SCALE: nije postignut cilj unutar ${MAX_ITER} iteracija → ` +
`${finalTotals.calories} kcal, P:${finalTotals.protein}g, C:${finalTotals.carbs}g, F:${finalTotals.fat}g`
);

return currentMeals;
}

function getMealDistribution(
numMeals: 3 | 5 | 6,
goalType: "lose" | "maintain" | "gain"
): {
calories: Record<string, number>;
protein: Record<string, number>;
carbs: Record<string, number>;
fat: Record<string, number>;
} {
let calorieDist: Record<string, number>;

if (numMeals === 3) {
calorieDist = {
breakfast: 0.35,
lunch: 0.4,
dinner: 0.25,
};
} else if (numMeals === 5) {
if (goalType === "lose") {
calorieDist = {
breakfast: 0.3,
snack1: 0.1,
lunch: 0.3,
snack2: 0.1,
dinner: 0.2,
};
} else if (goalType === "gain") {
calorieDist = {
breakfast: 0.25,
snack1: 0.12,
lunch: 0.35,
snack2: 0.12,
dinner: 0.16,
};
} else {
calorieDist = {
breakfast: 0.25,
snack1: 0.1,
lunch: 0.35,
snack2: 0.1,
dinner: 0.2,
};
}
} else {
if (goalType === "lose") {
calorieDist = {
breakfast: 0.25,
snack1: 0.08,
lunch: 0.28,
snack2: 0.08,
snack3: 0.08,
dinner: 0.23,
};
} else if (goalType === "gain") {
calorieDist = {
breakfast: 0.22,
snack1: 0.1,
lunch: 0.3,
snack2: 0.1,
snack3: 0.1,
dinner: 0.18,
};
} else {
calorieDist = {
breakfast: 0.22,
snack1: 0.08,
lunch: 0.3,
snack2: 0.08,
snack3: 0.1,
dinner: 0.22,
};
}
}

return {
calories: calorieDist,
protein: calorieDist,
carbs: calorieDist,
fat: calorieDist,
};
}

// ============================================
// GLAVNI GENERATOR
// ============================================

export async function generateWeeklyMealPlan(
userId: string
): Promise<WeeklyMealPlan> {
console.log(
"🚀 Pokretanje profesionalnog generatora tjednog plana prehrane..."
);
console.log(`📋 Korisnik ID: ${userId}`);

const calculations = await getUserCalculations(userId);
console.log(
`✅ Kalkulacije iz DB: ${calculations.targetCalories} kcal, P: ${calculations.targetProtein}g, C: ${calculations.targetCarbs}g, F: ${calculations.targetFat}g`
);
console.log(`🎯 Cilj: ${calculations.goalType}`);

let preferences: UserPreferences = {
avoidIngredients: [],
preferredIngredients: [],
desiredMealsPerDay: 5,
};
try {
const { data: clientData } = await supabase
.from("clients")
.select("allergies, meal_frequency")
.eq("id", userId)
.single();

if (clientData?.meal_frequency) {
const mealFreq = parseInt(clientData.meal_frequency);
if (mealFreq === 3 || mealFreq === 5 || mealFreq === 6) {
preferences.desiredMealsPerDay = mealFreq as 3 | 5 | 6;
console.log(`🍽️ Broj obroka iz baze: ${preferences.desiredMealsPerDay}`);
}
}

if (clientData?.allergies) {
const allergiesText =
typeof clientData.allergies === "string"
? clientData.allergies
: Array.isArray(clientData.allergies)
? clientData.allergies.join(", ")
: "";

const parsedPrefs = parseUserPreferences(allergiesText);
preferences.avoidIngredients = parsedPrefs.avoidIngredients;
preferences.preferredIngredients = parsedPrefs.preferredIngredients;

if (!clientData?.meal_frequency) {
preferences.desiredMealsPerDay = parsedPrefs.desiredMealsPerDay;
}

console.log(
`🚫 Izbjegavane namirnice: ${
preferences.avoidIngredients.join(", ") || "nema"
}`
);
console.log(
`✅ Preferirane namirnice: ${
preferences.preferredIngredients.join(", ") || "nema"
}`
);
console.log(`🍽️ Broj obroka: ${preferences.desiredMealsPerDay}`);
}
} catch (error) {
console.log("ℹ️ Nema preferencija ili greška pri dohvaćanju:", error);
}

const mealData = mealComponentsData as MealComponentsData;
const mealDistribution = getMealDistribution(
preferences.desiredMealsPerDay,
calculations.goalType
);

const days: DailyPlan[] = [];
const dayNames = [
"Ponedjeljak",
"Utorak",
"Srijeda",
"Četvrtak",
"Petak",
"Subota",
"Nedjelja",
];

const today = new Date();
const dayOfWeek = today.getDay();
const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
const weekStart = new Date(today);
weekStart.setDate(today.getDate() + daysToMonday);

const weeklyUsedMealNamesBySlot: Map<string, Set<string>> = new Map();
const weeklyUsedMealIds: Set<string> = new Set();
const previousDayMainProteins: Map<string, string[]> = new Map();

for (let i = 0; i < 7; i++) {
const currentDate = new Date(weekStart);
currentDate.setDate(weekStart.getDate() + i);
const dateStr = currentDate.toISOString().split("T")[0];

console.log(
`\n📅 Generiranje dana ${i + 1}/7: ${dayNames[i]} (${dateStr})`
);

const usedMealIdsToday = new Set<string>();
const usedMealNamesToday = new Set<string>();
const todayMainProteins: Map<string, string[]> = new Map();

const allUsedMealIds = new Set([
...weeklyUsedMealIds,
...usedMealIdsToday,
]);

const meals: Record<string, GeneratedMeal> = {};

if (preferences.desiredMealsPerDay === 3) {
const breakfastSlot =
weeklyUsedMealNamesBySlot.get("breakfast") || new Set<string>();
const breakfast = generateMeal(
"breakfast",
mealData,
calculations.targetCalories * mealDistribution.calories.breakfast,
calculations.targetProtein * mealDistribution.protein.breakfast,
calculations.targetCarbs * mealDistribution.carbs.breakfast,
calculations.targetFat * mealDistribution.fat.breakfast,
allUsedMealIds,
usedMealNamesToday,
breakfastSlot,
preferences,
undefined,
calculations.goalType
);
if (!breakfast)
throw new Error(`Nije moguće generirati doručak za dan ${i + 1}`);
meals.breakfast = breakfast;
breakfastSlot.add(breakfast.name.toLowerCase());
weeklyUsedMealNamesBySlot.set("breakfast", breakfastSlot);
weeklyUsedMealIds.add(breakfast.id || breakfast.name.toLowerCase());

const lunchSlot =
weeklyUsedMealNamesBySlot.get("lunch") || new Set<string>();
const lunch = generateMeal(
"lunch",
mealData,
calculations.targetCalories * mealDistribution.calories.lunch,
calculations.targetProtein * mealDistribution.protein.lunch,
calculations.targetCarbs * mealDistribution.carbs.lunch,
calculations.targetFat * mealDistribution.fat.lunch,
allUsedMealIds,
usedMealNamesToday,
lunchSlot,
preferences,
undefined,
calculations.goalType
);
if (!lunch)
throw new Error(`Nije moguće generirati ručak za dan ${i + 1}`);
meals.lunch = lunch;
lunchSlot.add(lunch.name.toLowerCase());
weeklyUsedMealNamesBySlot.set("lunch", lunchSlot);
weeklyUsedMealIds.add(lunch.id || lunch.name.toLowerCase());

const dinnerSlot =
weeklyUsedMealNamesBySlot.get("dinner") || new Set<string>();
const dinner = generateMeal(
"dinner",
mealData,
calculations.targetCalories * mealDistribution.calories.dinner,
calculations.targetProtein * mealDistribution.protein.dinner,
calculations.targetCarbs * mealDistribution.carbs.dinner,
calculations.targetFat * mealDistribution.fat.dinner,
allUsedMealIds,
usedMealNamesToday,
dinnerSlot,
preferences,
undefined,
calculations.goalType
);
if (!dinner)
throw new Error(`Nije moguće generirati večeru za dan ${i + 1}`);
meals.dinner = dinner;
dinnerSlot.add(dinner.name.toLowerCase());
weeklyUsedMealNamesBySlot.set("dinner", dinnerSlot);
weeklyUsedMealIds.add(dinner.id || dinner.name.toLowerCase());
} else if (preferences.desiredMealsPerDay === 5) {
const breakfastSlot =
weeklyUsedMealNamesBySlot.get("breakfast") || new Set<string>();
const breakfast = generateMeal(
"breakfast",
mealData,
calculations.targetCalories * mealDistribution.calories.breakfast,
calculations.targetProtein * mealDistribution.protein.breakfast,
calculations.targetCarbs * mealDistribution.carbs.breakfast,
calculations.targetFat * mealDistribution.fat.breakfast,
allUsedMealIds,
usedMealNamesToday,
breakfastSlot,
preferences,
undefined,
calculations.goalType
);
if (!breakfast)
throw new Error(`Nije moguće generirati doručak za dan ${i + 1}`);
meals.breakfast = breakfast;
breakfastSlot.add(breakfast.name.toLowerCase());
weeklyUsedMealNamesBySlot.set("breakfast", breakfastSlot);
weeklyUsedMealIds.add(breakfast.id || breakfast.name.toLowerCase());

const snack1Slot =
weeklyUsedMealNamesBySlot.get("snack1") || new Set<string>();
const snack1 = generateMeal(
"snack",
mealData,
calculations.targetCalories * mealDistribution.calories.snack1,
calculations.targetProtein * mealDistribution.protein.snack1,
calculations.targetCarbs * mealDistribution.carbs.snack1,
calculations.targetFat * mealDistribution.fat.snack1,
allUsedMealIds,
usedMealNamesToday,
snack1Slot,
preferences,
undefined,
calculations.goalType
);
if (!snack1)
throw new Error(
`Nije moguće generirati međuobrok 1 za dan ${i + 1}`
);
meals.snack1 = snack1;
snack1Slot.add(snack1.name.toLowerCase());
weeklyUsedMealNamesBySlot.set("snack1", snack1Slot);
weeklyUsedMealIds.add(snack1.id || snack1.name.toLowerCase());

const lunchSlot =
weeklyUsedMealNamesBySlot.get("lunch") || new Set<string>();
const lunch = generateMeal(
"lunch",
mealData,
calculations.targetCalories * mealDistribution.calories.lunch,
calculations.targetProtein * mealDistribution.protein.lunch,
calculations.targetCarbs * mealDistribution.carbs.lunch,
calculations.targetFat * mealDistribution.fat.lunch,
allUsedMealIds,
usedMealNamesToday,
lunchSlot,
preferences,
undefined,
calculations.goalType
);
if (!lunch)
throw new Error(`Nije moguće generirati ručak za dan ${i + 1}`);
meals.lunch = lunch;
lunchSlot.add(lunch.name.toLowerCase());
weeklyUsedMealNamesBySlot.set("lunch", lunchSlot);

const snack2Slot =
weeklyUsedMealNamesBySlot.get("snack2") || new Set<string>();
const snack2 = generateMeal(
"snack",
mealData,
calculations.targetCalories * mealDistribution.calories.snack2,
calculations.targetProtein * mealDistribution.protein.snack2,
calculations.targetCarbs * mealDistribution.carbs.snack2,
calculations.targetFat * mealDistribution.fat.snack2,
allUsedMealIds,
usedMealNamesToday,
snack2Slot,
preferences,
undefined,
calculations.goalType
);
if (!snack2)
throw new Error(
`Nije moguće generirati međuobrok 2 za dan ${i + 1}`
);
meals.snack2 = snack2;
snack2Slot.add(snack2.name.toLowerCase());
weeklyUsedMealNamesBySlot.set("snack2", snack2Slot);
weeklyUsedMealIds.add(snack2.id || snack2.name.toLowerCase());

const dinnerSlot =
weeklyUsedMealNamesBySlot.get("dinner") || new Set<string>();
const dinner = generateMeal(
"dinner",
mealData,
calculations.targetCalories * mealDistribution.calories.dinner,
calculations.targetProtein * mealDistribution.protein.dinner,
calculations.targetCarbs * mealDistribution.carbs.dinner,
calculations.targetFat * mealDistribution.fat.dinner,
allUsedMealIds,
usedMealNamesToday,
dinnerSlot,
preferences,
undefined,
calculations.goalType
);
if (!dinner)
throw new Error(`Nije moguće generirati večeru za dan ${i + 1}`);
meals.dinner = dinner;
dinnerSlot.add(dinner.name.toLowerCase());
weeklyUsedMealNamesBySlot.set("dinner", dinnerSlot);
weeklyUsedMealIds.add(dinner.id || dinner.name.toLowerCase());
} else {
const breakfastSlot =
weeklyUsedMealNamesBySlot.get("breakfast") || new Set<string>();
const breakfast = generateMeal(
"breakfast",
mealData,
calculations.targetCalories * mealDistribution.calories.breakfast,
calculations.targetProtein * mealDistribution.protein.breakfast,
calculations.targetCarbs * mealDistribution.carbs.breakfast,
calculations.targetFat * mealDistribution.fat.breakfast,
allUsedMealIds,
usedMealNamesToday,
breakfastSlot,
preferences,
undefined,
calculations.goalType
);
if (!breakfast)
throw new Error(`Nije moguće generirati doručak za dan ${i + 1}`);
meals.breakfast = breakfast;
breakfastSlot.add(breakfast.name.toLowerCase());
weeklyUsedMealNamesBySlot.set("breakfast", breakfastSlot);
weeklyUsedMealIds.add(breakfast.id || breakfast.name.toLowerCase());

const snack1Slot =
weeklyUsedMealNamesBySlot.get("snack1") || new Set<string>();
const snack1 = generateMeal(
"snack",
mealData,
calculations.targetCalories * mealDistribution.calories.snack1,
calculations.targetProtein * mealDistribution.protein.snack1,
calculations.targetCarbs * mealDistribution.carbs.snack1,
calculations.targetFat * mealDistribution.fat.snack1,
allUsedMealIds,
usedMealNamesToday,
snack1Slot,
preferences,
undefined,
calculations.goalType
);
if (!snack1)
throw new Error(
`Nije moguće generirati međuobrok 1 za dan ${i + 1}`
);
meals.snack1 = snack1;
snack1Slot.add(snack1.name.toLowerCase());
weeklyUsedMealNamesBySlot.set("snack1", snack1Slot);
weeklyUsedMealIds.add(snack1.id || snack1.name.toLowerCase());

const lunchSlot =
weeklyUsedMealNamesBySlot.get("lunch") || new Set<string>();
const lunch = generateMeal(
"lunch",
mealData,
calculations.targetCalories * mealDistribution.calories.lunch,
calculations.targetProtein * mealDistribution.protein.lunch,
calculations.targetCarbs * mealDistribution.carbs.lunch,
calculations.targetFat * mealDistribution.fat.lunch,
allUsedMealIds,
usedMealNamesToday,
lunchSlot,
preferences,
undefined,
calculations.goalType
);
if (!lunch)
throw new Error(`Nije moguće generirati ručak za dan ${i + 1}`);
meals.lunch = lunch;
lunchSlot.add(lunch.name.toLowerCase());
weeklyUsedMealNamesBySlot.set("lunch", lunchSlot);

const snack2Slot =
weeklyUsedMealNamesBySlot.get("snack2") || new Set<string>();
const snack2 = generateMeal(
"snack",
mealData,
calculations.targetCalories * mealDistribution.calories.snack2,
calculations.targetProtein * mealDistribution.protein.snack2,
calculations.targetCarbs * mealDistribution.carbs.snack2,
calculations.targetFat * mealDistribution.fat.snack2,
allUsedMealIds,
usedMealNamesToday,
snack2Slot,
preferences,
undefined,
calculations.goalType
);
if (!snack2)
throw new Error(
`Nije moguće generirati međuobrok 2 za dan ${i + 1}`
);
meals.snack2 = snack2;
snack2Slot.add(snack2.name.toLowerCase());
weeklyUsedMealNamesBySlot.set("snack2", snack2Slot);
weeklyUsedMealIds.add(snack2.id || snack2.name.toLowerCase());

const snack3Slot =
weeklyUsedMealNamesBySlot.get("snack3") || new Set<string>();
const snack3 = generateMeal(
"snack",
mealData,
calculations.targetCalories * mealDistribution.calories.snack3,
calculations.targetProtein * mealDistribution.protein.snack3,
calculations.targetCarbs * mealDistribution.carbs.snack3,
calculations.targetFat * mealDistribution.fat.snack3,
allUsedMealIds,
usedMealNamesToday,
snack3Slot,
preferences,
undefined,
calculations.goalType
);
if (!snack3)
throw new Error(
`Nije moguće generirati međuobrok 3 za dan ${i + 1}`
);
meals.snack3 = snack3;
snack3Slot.add(snack3.name.toLowerCase());
weeklyUsedMealNamesBySlot.set("snack3", snack3Slot);
weeklyUsedMealIds.add(snack3.id || snack3.name.toLowerCase());

const dinnerSlot =
weeklyUsedMealNamesBySlot.get("dinner") || new Set<string>();
const dinner = generateMeal(
"dinner",
mealData,
calculations.targetCalories * mealDistribution.calories.dinner,
calculations.targetProtein * mealDistribution.protein.dinner,
calculations.targetCarbs * mealDistribution.carbs.dinner,
calculations.targetFat * mealDistribution.fat.dinner,
allUsedMealIds,
usedMealNamesToday,
dinnerSlot,
preferences,
undefined,
calculations.goalType
);
if (!dinner)
throw new Error(`Nije moguće generirati večeru za dan ${i + 1}`);
meals.dinner = dinner;
dinnerSlot.add(dinner.name.toLowerCase());
weeklyUsedMealNamesBySlot.set("dinner", dinnerSlot);
weeklyUsedMealIds.add(dinner.id || dinner.name.toLowerCase());
}

const scaledMeals = scaleAllMealsToTarget(
meals,
calculations.targetCalories,
calculations.targetProtein,
calculations.targetCarbs,
calculations.targetFat,
calculations.goalType
);

const dailyMacroTotals = Object.values(scaledMeals).reduce(
(totals, meal) => ({
protein: totals.protein + meal.totals.protein,
carbs: totals.carbs + meal.totals.carbs,
fat: totals.fat + meal.totals.fat,
}),
{ protein: 0, carbs: 0, fat: 0 }
);

const dailyProtein = Math.round(dailyMacroTotals.protein * 10) / 10;
const dailyCarbs = Math.round(dailyMacroTotals.carbs * 10) / 10;
const dailyFat = Math.round(dailyMacroTotals.fat * 10) / 10;

const dailyCalories = Math.round(
dailyProtein * 4 + dailyCarbs * 4 + dailyFat * 9
);

const dailyTotals = {
calories: dailyCalories,
protein: dailyProtein,
carbs: dailyCarbs,
fat: dailyFat,
};

const calDev =
Math.abs(dailyTotals.calories - calculations.targetCalories) /
calculations.targetCalories;
const proteinDev =
Math.abs(dailyTotals.protein - calculations.targetProtein) /
calculations.targetProtein;
const carbsDev =
Math.abs(dailyTotals.carbs - calculations.targetCarbs) /
calculations.targetCarbs;
const fatDev =
Math.abs(dailyTotals.fat - calculations.targetFat) /
calculations.targetFat;
const maxDev = Math.max(calDev, proteinDev, carbsDev, fatDev);

const calDiff = Math.abs(
dailyTotals.calories - calculations.targetCalories
);
const proteinDiff = Math.abs(
dailyTotals.protein - calculations.targetProtein
);
const carbsDiff = Math.abs(
dailyTotals.carbs - calculations.targetCarbs
);
const fatDiff = Math.abs(dailyTotals.fat - calculations.targetFat);

console.log(
` 📊 Dnevni total: ${dailyTotals.calories} kcal, P: ${dailyTotals.protein}g, C: ${dailyTotals.carbs}g, F: ${dailyTotals.fat}g`
);
console.log(
` 🎯 Target: ${calculations.targetCalories} kcal, P: ${calculations.targetProtein}g, C: ${calculations.targetCarbs}g, F: ${calculations.targetFat}g`
);
console.log(` 📈 Odstupanje: ${(maxDev * 100).toFixed(1)}%`);
console.log(
` 📉 Apsolutne razlike: ${calDiff.toFixed(
0
)} kcal, P: ${proteinDiff.toFixed(1)}g, C: ${carbsDiff.toFixed(
1
)}g, F: ${fatDiff.toFixed(1)}g`
);

if (
calculations.goalType === "lose" &&
dailyTotals.calories > calculations.targetCalories
) {
console.warn(
` ⚠️ LOSE: Kalorije (${dailyTotals.calories}) > target (${calculations.targetCalories})`
);
}
if (
calculations.goalType === "gain" &&
dailyTotals.calories < calculations.targetCalories
) {
console.warn(
` ⚠️ GAIN: Kalorije (${dailyTotals.calories}) < target (${calculations.targetCalories})`
);
}

days.push({
date: dateStr,
dayName: dayNames[i],
meals: scaledMeals,
dailyTotals,
});

for (const [slot, proteins] of todayMainProteins.entries()) {
previousDayMainProteins.set(slot, [...proteins]);
}
}

const totalProtein = days.reduce(
(sum, day) => sum + day.dailyTotals.protein,
0
);
const totalCarbs = days.reduce((sum, day) => sum + day.dailyTotals.carbs, 0);
const totalFat = days.reduce((sum, day) => sum + day.dailyTotals.fat, 0);

const avgProtein = Math.round((totalProtein / 7) * 10) / 10;
const avgCarbs = Math.round((totalCarbs / 7) * 10) / 10;
const avgFat = Math.round((totalFat / 7) * 10) / 10;

const avgCalories = Math.round(avgProtein * 4 + avgCarbs * 4 + avgFat * 9);

const weeklyTotals = {
avgCalories,
avgProtein,
avgCarbs,
avgFat,
};

console.log("\n✅ TJEDNI PLAN GENERIRAN!");
console.log(
`📊 Tjedni prosjek: ${weeklyTotals.avgCalories} kcal, P: ${weeklyTotals.avgProtein}g, C: ${weeklyTotals.avgCarbs}g, F: ${weeklyTotals.avgFat}g`
);
console.log(
`🎯 Target: ${calculations.targetCalories} kcal, P: ${calculations.targetProtein}g, C: ${calculations.targetCarbs}g, F: ${calculations.targetFat}g`
);

return {
userId,
generatedAt: new Date().toISOString(),
weekStartDate: weekStart.toISOString().split("T")[0],
userTargets: {
calories: calculations.targetCalories,
protein: calculations.targetProtein,
carbs: calculations.targetCarbs,
fat: calculations.targetFat,
goal: calculations.goalType,
},
days,
weeklyTotals,
};
}

/**
* Spremi plan u Supabase (opcionalno)
*/
export async function saveWeeklyPlanToSupabase(
plan: WeeklyMealPlan
): Promise<{ success: boolean; id?: string; error?: string }> {
try {
const { data, error } = await supabase
.from("meal_plans")
.insert({
client_id: plan.userId,
week_start_date: plan.weekStartDate,
meals: plan.days,
total_calories: plan.weeklyTotals.avgCalories * 7,
total_protein: Math.round(plan.weeklyTotals.avgProtein * 7),
total_carbs: Math.round(plan.weeklyTotals.avgCarbs * 7),
total_fats: Math.round(plan.weeklyTotals.avgFat * 7),
})
.select("id")
.single();

if (error) {
console.warn("⚠️ Greška pri spremanju u bazu:", error.message);
return { success: false, error: error.message };
}

return { success: true, id: data?.id };
} catch (error) {
console.error("Greška pri spremanju:", error);
return { success: false, error: String(error) };
}
}

export default {
generateWeeklyMealPlan,
saveWeeklyPlanToSupabase,
};