/**
 * Meal Plan Generator Screen
 * Generira i prikazuje tjedni plan prehrane
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Animated,
  Platform,
  Image,
  PanResponder,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { generateWeeklyMealPlan } from '../services/api';
import { authStorage } from '../services/storage';

// Tipovi - STRICT: sve je required osim snack3
interface MealComponent {
  name: string;
  grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface GeneratedMeal {
  name: string;
  description: string;
  image?: string;
  preparationTip?: string;
  components: MealComponent[];
  totals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

interface DailyPlanMeals {
  breakfast: GeneratedMeal | null;
  snack1: GeneratedMeal | null;
  lunch: GeneratedMeal | null;
  snack2: GeneratedMeal | null;
  snack3?: GeneratedMeal | null;
  dinner: GeneratedMeal | null;
}

interface DailyPlan {
  date: string; // YYYY-MM-DD format
  dayName: string;
  meals: DailyPlanMeals;
  dailyTotals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

interface WeeklyMealPlan {
  userId?: string;
  generatedAt?: string;
  weekStartDate: string;
  clientId?: string;
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
  weeklyAverage?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    deviation?: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
      total: number;
    };
  };
}

interface MealPlanGeneratorScreenProps {
  onBack?: () => void;
  onNavigateToTraining?: () => void;
  onConnectTrainer?: () => void;
  isConnectedToTrainer?: boolean;
  trainerName?: string;
  directCalculations?: {
    targetCalories: number;
    targetProtein: number;
    targetCarbs: number;
    targetFat: number;
    goalType: 'lose' | 'maintain' | 'gain';
    bmr?: number;
    tdee?: number;
    preferences?: {
      allergies?: string;
      foodPreferences?: string;
      avoidIngredients?: string;
      trainingFrequency?: string;
    };
  };
}

const DAY_NAMES = ['Nedjelja', 'Ponedjeljak', 'Utorak', 'Srijeda', 'Četvrtak', 'Petak', 'Subota'];
const MEAL_NAMES: Record<string, string> = {
  breakfast: 'Doručak',
  snack1: 'Užina 1',
  lunch: 'Ručak',
  snack2: 'Užina 2',
  snack3: 'Užina 3',
  dinner: 'Večera',
};

/**
 * Normaliziraj datum u YYYY-MM-DD format (bez timezone problema)
 */
function normalizeDate(dateInput: string | Date): string {
  if (typeof dateInput === 'string') {
    // Ako je već YYYY-MM-DD format, vrati ga
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      return dateInput;
    }
    // Parsiraj i normaliziraj
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid date: ${dateInput}`);
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  // Ako je Date objekt
  const year = dateInput.getFullYear();
  const month = String(dateInput.getMonth() + 1).padStart(2, '0');
  const day = String(dateInput.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Izračunaj dailyTotals iz obroka - UVIJEK se poziva ako dailyTotals nedostaje ili je 0
 */
function calculateDailyTotalsFromMeals(meals: DailyPlanMeals): {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
} {
  let calories = 0;
  let protein = 0;
  let carbs = 0;
  let fat = 0;

  Object.values(meals).forEach((meal) => {
    if (meal && meal.totals) {
      calories += meal.totals.calories || 0;
      protein += meal.totals.protein || 0;
      carbs += meal.totals.carbs || 0;
      fat += meal.totals.fat || 0;
    }
  });

  return {
    calories: Math.round(calories),
    protein: Math.round(protein * 10) / 10,
    carbs: Math.round(carbs * 10) / 10,
    fat: Math.round(fat * 10) / 10,
  };
}

export default function MealPlanGeneratorScreen({ onBack, onNavigateToTraining, onConnectTrainer, isConnectedToTrainer, trainerName, directCalculations }: MealPlanGeneratorScreenProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyMealPlan | null>(null);
  const [selectedDay, setSelectedDay] = useState(0);
  const [selectedMeal, setSelectedMeal] = useState<{ title: string; meal: GeneratedMeal } | null>(null);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    if (!weeklyPlan && !loading) {
      generatePlan();
    }
  }, []);

  const generatePlan = async () => {
    setLoading(true);
    setError(null);

    try {
      let clientId: string | null = null;
      let token: string | null = null;

      if (!directCalculations) {
        clientId = await authStorage.getClientId();
        token = await authStorage.getToken();
      }

      const result = await generateWeeklyMealPlan(clientId, token, directCalculations);

      if (!result || !result.ok) {
        throw new Error(result?.message || 'Greška pri generiranju plana');
      }

      // STEP 2: Ensure correct object is read from API response
      // Priority: response.data.plan > response.data.mealPlan > response.data.result.plan > response.data.data.plan > response.data
      let plan: any = null;
      
      if (result.data?.plan) {
        plan = result.data.plan;
      } else if (result.data?.mealPlan) {
        plan = result.data.mealPlan;
      } else if (result.data?.result?.plan) {
        plan = result.data.result.plan;
      } else if (result.data?.data?.plan) {
        plan = result.data.data.plan;
      } else if (result.data) {
        plan = result.data;
      } else if (result.plan) {
        plan = result.plan;
      } else {
        plan = result;
      }
      
      // STEP 1: RAW API RESPONSE LOGGING
      console.log('RAW API RESPONSE', JSON.stringify(result, null, 2));
      console.log('Object.keys(response)', Object.keys(result));
      console.log('Object.keys(response.data)', result.data ? Object.keys(result.data) : 'no data');
      console.log('Object.keys(plan)', plan ? Object.keys(plan) : 'no plan');
      console.log('plan?.days?.length', plan?.days?.length);
      console.log('plan?.days?.[0]?.meals', plan?.days?.[0]?.meals);
      console.log('RAW days', plan?.days);
      console.log('RAW first day', plan?.days?.[0]);
      console.log('RAW first day meals', plan?.days?.[0]?.meals);
      console.log('meals type', typeof plan?.days?.[0]?.meals);
      console.log('meals isArray', Array.isArray(plan?.days?.[0]?.meals));
      
      if (!plan) {
        throw new Error('Plan object not found in API response');
      }
      
      // STEP 3: Normalize days and meals defensively
      // days must default to []
      const rawDays = plan.days ?? [];
      
      // Transformiraj ScoredMeal u GeneratedMeal
      // STEP 3: Never drop meals with 0 macros
      const transformScoredMeal = (scoredMeal: any): GeneratedMeal | null => {
        if (!scoredMeal) {
          return null;
        }
        
        let components: MealComponent[] = [];
        if ((scoredMeal as any).componentDetails && Array.isArray((scoredMeal as any).componentDetails)) {
          components = (scoredMeal as any).componentDetails.map((c: any) => ({
            name: c.foodName || c.name || '',
            grams: c.grams || 0,
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
          }));
        } else if (scoredMeal.meta?.components && Array.isArray(scoredMeal.meta.components)) {
          components = scoredMeal.meta.components.map((c: any) => ({
            name: c.food || c.name || '',
            grams: c.grams || 0,
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
          }));
        } else if (scoredMeal.meta?.recipe) {
          components = [{
            name: scoredMeal.name,
            grams: scoredMeal.meta.quantity || 100,
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
          }];
        } else {
          components = [{
            name: scoredMeal.name,
            grams: 100,
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
          }];
        }
        
        // STEP 3: Never filter meals by calories/macros > 0
        const calories = Math.round(scoredMeal.calories || 0);
        const protein = Math.round((scoredMeal.protein || 0) * 10) / 10;
        const carbs = Math.round((scoredMeal.carbs || 0) * 10) / 10;
        const fat = Math.round((scoredMeal.fat || 0) * 10) / 10;
        
        // CRITICAL FIX: Ensure description and macros come from the SAME source
        // Prefer description from the same object that contains the macro calculations
        // Priority: scoredMeal.description > scoredMeal.meta?.description (skip recipe fallbacks to avoid mixing sources)
        const description = scoredMeal.description || scoredMeal.meta?.description || '';
        const preparationTip = scoredMeal.preparationTip || scoredMeal.meta?.preparationTip || undefined;
        
        // Validation: Check if description mentions ingredients that aren't in components
        const descLower = description.toLowerCase();
        const componentNamesLower = components.map(c => c.name.toLowerCase()).join(' ');
        const hasMismatch = 
          (descLower.includes('banana') && !componentNamesLower.includes('banana')) ||
          (descLower.includes('mlijeko') && !componentNamesLower.includes('mlijeko') && !componentNamesLower.includes('milk')) ||
          (descLower.includes('milk') && !componentNamesLower.includes('milk') && !componentNamesLower.includes('mlijeko')) ||
          (descLower.includes('voda') && !componentNamesLower.includes('voda') && !componentNamesLower.includes('water')) ||
          (descLower.includes('water') && !componentNamesLower.includes('water') && !componentNamesLower.includes('voda'));
        
        if (hasMismatch) {
          console.warn(` Description mismatch for "${scoredMeal.name}":`, {
            descriptionPreview: description.substring(0, 100),
            components: components.map(c => c.name),
            hasBananaInDesc: descLower.includes('banana'),
            hasBananaInComponents: componentNamesLower.includes('banana'),
            hasMilkInDesc: descLower.includes('mlijeko') || descLower.includes('milk'),
            hasMilkInComponents: componentNamesLower.includes('mlijeko') || componentNamesLower.includes('milk'),
            calories: Math.round(calories),
            protein: Math.round(protein),
            carbs: Math.round(carbs),
            fat: Math.round(fat),
          });
        }
        
        // Additional validation: Log meal ID for tracking
        const mealId = scoredMeal.id || scoredMeal.meta?.recipe?.id || 'unknown';
        if (hasMismatch || calories < 100) {
          console.log(` Meal ID: ${mealId}, Name: ${scoredMeal.name}`);
        }
        
        // Always return meal, even if macros are 0
        return {
          name: scoredMeal.name || 'Nepoznato jelo',
          description: description, // Use only from same source as macros
          image: scoredMeal.meta?.recipe?.image_url || undefined,
          preparationTip: preparationTip, // Use only from same source
          components,
          totals: {
            calories,
            protein,
            carbs,
            fat,
          },
        };
      };
      
      // STEP 4: Implement helpers
      /**
       * Normalize meals - handle array OR object, lowercase keys, NEVER filter by calories
       */
      const normalizeMeals = (meals: any, dayIndex?: number): DailyPlanMeals => {
        console.log(` normalizeMeals called for day ${dayIndex}:`, {
          meals,
          mealsType: typeof meals,
          mealsIsArray: Array.isArray(meals),
          mealsKeys: meals && typeof meals === 'object' ? Object.keys(meals) : [],
        });
        
        // meals must default to {}
        if (!meals) {
          console.warn(`Day ${dayIndex}: meals is null/undefined, returning empty meals`);
          return {
            breakfast: null,
            snack1: null,
            lunch: null,
            snack2: null,
            snack3: undefined,
            dinner: null,
          };
        }
        
        // If meals is array, convert to object
        if (Array.isArray(meals)) {
          console.log(`Day ${dayIndex}: meals is array with ${meals.length} items`);
          const mealsObj: DailyPlanMeals = {
            breakfast: null,
            snack1: null,
            lunch: null,
            snack2: null,
            snack3: undefined,
            dinner: null,
          };
          
          meals.forEach((meal: any, idx: number) => {
            if (!meal) {
              console.warn(`Day ${dayIndex}: meal at index ${idx} is null/undefined`);
              return;
            }
            const mealName = (meal?.name || '').toLowerCase();
            const transformed = transformScoredMeal(meal);
            if (!transformed) {
              console.warn(`Day ${dayIndex}: Failed to transform meal at index ${idx}:`, meal);
              return;
            }
            
            if (mealName.includes('doručak') || mealName.includes('breakfast') || idx === 0) {
              mealsObj.breakfast = transformed;
            } else if (mealName.includes('ručak') || mealName.includes('lunch') || idx === 1) {
              mealsObj.lunch = transformed;
            } else if (mealName.includes('večera') || mealName.includes('dinner') || idx === 2) {
              mealsObj.dinner = transformed;
            } else if (mealName.includes('užina') || mealName.includes('snack')) {
              if (!mealsObj.snack1) {
                mealsObj.snack1 = transformed;
              } else if (!mealsObj.snack2) {
                mealsObj.snack2 = transformed;
              } else {
                mealsObj.snack3 = transformed;
              }
            }
          });
          
          console.log(`Day ${dayIndex}: Normalized array meals:`, {
            breakfast: !!mealsObj.breakfast,
            snack1: !!mealsObj.snack1,
            lunch: !!mealsObj.lunch,
            snack2: !!mealsObj.snack2,
            dinner: !!mealsObj.dinner,
          });
          
          return mealsObj;
        }
        
        // If meals is object, normalize keys (lowercase)
        if (typeof meals === 'object') {
          const keys = Object.keys(meals);
          console.log(`Day ${dayIndex}: meals is object with keys:`, keys);
          
          const mealsObj: DailyPlanMeals = {
            breakfast: null,
            snack1: null,
            lunch: null,
            snack2: null,
            snack3: undefined,
            dinner: null,
          };
          
          keys.forEach(key => {
            const lowerKey = key.toLowerCase();
            const meal = meals[key];
            
            console.log(`Day ${dayIndex}: Processing meal key "${key}" (lowercase: "${lowerKey}"):`, {
              mealExists: !!meal,
              mealName: meal?.name,
              mealCalories: meal?.calories,
            });
            
            if (!meal) {
              console.warn(`Day ${dayIndex}: meal at key "${key}" is null/undefined`);
              return;
            }
            
            const transformed = transformScoredMeal(meal);
            if (!transformed) {
              console.warn(`Day ${dayIndex}: Failed to transform meal at key "${key}":`, meal);
              return;
            }
            
            if (lowerKey === 'breakfast' || lowerKey === 'doručak') {
              mealsObj.breakfast = transformed;
              console.log(`Day ${dayIndex}: Set breakfast:`, transformed.name);
            } else if (lowerKey === 'lunch' || lowerKey === 'ručak') {
              mealsObj.lunch = transformed;
              console.log(`Day ${dayIndex}: Set lunch:`, transformed.name);
            } else if (lowerKey === 'dinner' || lowerKey === 'večera') {
              mealsObj.dinner = transformed;
              console.log(`Day ${dayIndex}: Set dinner:`, transformed.name);
            } else if (lowerKey === 'snack' || lowerKey === 'užina') {
              mealsObj.snack1 = transformed;
              console.log(`Day ${dayIndex}: Set snack1:`, transformed.name);
            } else if (lowerKey === 'extrasnack' || lowerKey === 'extra_snack' || lowerKey === 'snack2') {
              mealsObj.snack2 = transformed;
              console.log(`Day ${dayIndex}: Set snack2:`, transformed.name);
            } else if (lowerKey === 'snack1') {
              mealsObj.snack1 = transformed;
              console.log(`Day ${dayIndex}: Set snack1 (from snack1 key):`, transformed.name);
            } else if (lowerKey === 'snack3') {
              mealsObj.snack3 = transformed;
              console.log(`Day ${dayIndex}: Set snack3:`, transformed.name);
            } else {
              console.warn(`Day ${dayIndex}: Unknown meal key "${key}" (lowercase: "${lowerKey}")`);
            }
          });
          
          console.log(`Day ${dayIndex}: Normalized object meals:`, {
            breakfast: !!mealsObj.breakfast,
            snack1: !!mealsObj.snack1,
            lunch: !!mealsObj.lunch,
            snack2: !!mealsObj.snack2,
            dinner: !!mealsObj.dinner,
            breakfastName: mealsObj.breakfast?.name,
            lunchName: mealsObj.lunch?.name,
            dinnerName: mealsObj.dinner?.name,
          });
          
          return mealsObj;
        }
        
        // Fallback
        console.warn(`Day ${dayIndex}: meals is neither array nor object, returning empty meals`);
        return {
          breakfast: null,
          snack1: null,
          lunch: null,
          snack2: null,
          snack3: undefined,
          dinner: null,
        };
      };
      
      /**
       * Get meal count - count non-null meals
       */
      const getMealCount = (meals: DailyPlanMeals): number => {
        return Object.values(meals ?? {}).filter(m => m != null).length;
      };
      
      // Provjeri da li je PRO plan format
      // Declare ONCE, immediately after rawDays is defined
      const isProPlanFormat = rawDays.length > 0 && 
        (rawDays[0].total || (rawDays[0].meals && (rawDays[0].meals.snack || rawDays[0].meals.extraSnack)));
      
      console.log(' Is PRO plan format:', isProPlanFormat);
      
      
      // STEP 5: Build normalizedDays using normalizeMeals for each day
      const normalizedDays: DailyPlan[] = rawDays.map((day: any, dayIndex: number) => {
        let meals: DailyPlanMeals;
        let dailyTotals: { calories: number; protein: number; carbs: number; fat: number };
        let normalizedDate: string;

        try {
          normalizedDate = normalizeDate(day.date);
        } catch (err) {
          console.error(`Invalid date for day ${dayIndex}:`, day.date);
          normalizedDate = new Date().toISOString().split('T')[0]; // Fallback na danas
        }

        // STEP 3: Normalize meals defensively
        const dayMeals = day.meals ?? {};
        console.log(` Day ${dayIndex} raw meals:`, {
          dayMeals,
          dayMealsType: typeof dayMeals,
          dayMealsIsArray: Array.isArray(dayMeals),
          dayMealsKeys: dayMeals && typeof dayMeals === 'object' ? Object.keys(dayMeals) : [],
          isProPlanFormat,
        });
        
        meals = normalizeMeals(dayMeals, dayIndex);
        
        // PRO plan specific: if format detected, ensure proper mapping
        // This should override normalizeMeals results if needed
        if (isProPlanFormat && dayMeals && typeof dayMeals === 'object' && !Array.isArray(dayMeals)) {
          console.log(` Day ${dayIndex}: Applying PRO plan specific mapping`);
          
          if (dayMeals.breakfast) {
            const transformed = transformScoredMeal(dayMeals.breakfast);
            if (transformed) {
              meals.breakfast = transformed;
              console.log(`Day ${dayIndex}: PRO mapped breakfast:`, transformed.name);
            }
          }
          if (dayMeals.lunch) {
            const transformed = transformScoredMeal(dayMeals.lunch);
            if (transformed) {
              meals.lunch = transformed;
              console.log(`Day ${dayIndex}: PRO mapped lunch:`, transformed.name);
            }
          }
          if (dayMeals.dinner) {
            const transformed = transformScoredMeal(dayMeals.dinner);
            if (transformed) {
              meals.dinner = transformed;
              console.log(`Day ${dayIndex}: PRO mapped dinner:`, transformed.name);
            }
          }
          if (dayMeals.snack) {
            const transformed = transformScoredMeal(dayMeals.snack);
            if (transformed) {
              meals.snack1 = transformed;
              console.log(`Day ${dayIndex}: PRO mapped snack1:`, transformed.name);
            }
          }
          if (dayMeals.extraSnack) {
            const transformed = transformScoredMeal(dayMeals.extraSnack);
            if (transformed) {
              meals.snack2 = transformed;
              console.log(`Day ${dayIndex}: PRO mapped snack2:`, transformed.name);
            }
          }
        }
        
        console.log(` Day ${dayIndex} final meals:`, {
          breakfast: !!meals.breakfast,
          snack1: !!meals.snack1,
          lunch: !!meals.lunch,
          snack2: !!meals.snack2,
          dinner: !!meals.dinner,
          breakfastName: meals.breakfast?.name,
          lunchName: meals.lunch?.name,
          dinnerName: meals.dinner?.name,
        });

        // Izračunaj dailyTotals - prvo iz day.dailyTotals ili day.total, zatim iz obroka
        if (day.dailyTotals && day.dailyTotals.calories > 0) {
          dailyTotals = {
            calories: Math.round(day.dailyTotals.calories || 0),
            protein: Math.round((day.dailyTotals.protein || 0) * 10) / 10,
            carbs: Math.round((day.dailyTotals.carbs || 0) * 10) / 10,
            fat: Math.round((day.dailyTotals.fat || 0) * 10) / 10,
          };
        } else if (day.total && day.total.calories > 0) {
          dailyTotals = {
            calories: Math.round(day.total.calories || 0),
            protein: Math.round((day.total.protein || 0) * 10) / 10,
            carbs: Math.round((day.total.carbs || 0) * 10) / 10,
            fat: Math.round((day.total.fat || 0) * 10) / 10,
          };
        } else {
          // UVIJEK izračunaj iz obroka ako dailyTotals/total nedostaje ili je 0
          dailyTotals = calculateDailyTotalsFromMeals(meals);
        }

        // Osiguraj da ima barem jedan obrok
        const hasAnyMeal = Object.values(meals).some(meal => meal !== null && meal !== undefined);
        if (!hasAnyMeal) {
          console.warn(`Day ${dayIndex} (${normalizedDate}) has no meals`);
        }

        // Izračunaj dayName iz datuma
        const dateObj = new Date(normalizedDate + 'T12:00:00'); // Koristi noon da izbjegne timezone probleme
        const dayName = DAY_NAMES[dateObj.getDay()];

        return {
          date: normalizedDate,
          dayName,
          meals,
          dailyTotals,
        };
      });

      // STEP 6: Validate plan using meal count ONLY
      if (normalizedDays.length === 0) {
        throw new Error('Plan nema dane');
      }
      
      // STEP 3: BEFORE validation, add FULL diagnostic logging
      console.log('FINAL normalizedDays:', JSON.stringify(normalizedDays, null, 2));
      console.log('FINAL days count:', normalizedDays.length);
      console.log('FINAL meals per day:', normalizedDays.map(d => d.meals));
      
      // STEP 4: Replace meal validation logic with TEMPORARY SAFE version
      const totalMeals = normalizedDays.reduce((sum, day) => {
        if (!day || !day.meals) return sum;
        if (Array.isArray(day.meals)) return sum + day.meals.length;
        if (typeof day.meals === 'object') return sum + Object.keys(day.meals).length;
        return sum;
      }, 0);
      
      console.log('FINAL totalMeals:', totalMeals);
      
      // STEP 7: Add logs
      console.log(' Final validation:', {
        daysCount: normalizedDays.length,
        totalMeals,
        firstDayMealsCount: getMealCount(normalizedDays[0]?.meals),
        firstDayDailyTotals: normalizedDays[0]?.dailyTotals,
        firstDayMeals: normalizedDays[0]?.meals,
        firstDayMealsType: typeof normalizedDays[0]?.meals,
        firstDayMealsIsArray: Array.isArray(normalizedDays[0]?.meals),
        firstDayMealsKeys: normalizedDays[0]?.meals ? Object.keys(normalizedDays[0].meals) : [],
      });
      
      // STEP 5: TEMPORARILY comment out the throw
      // Let the app render the plan UI even if meals are empty,
      // so we can visually confirm what data actually exists
      // if (totalMeals === 0) {
      //   console.error(' Plan has NO meals!');
      //   throw new Error('Plan nema obroka - provjeri API response');
      // }
      
      if (totalMeals === 0) {
        console.warn(' Plan has NO meals - but continuing to render UI for debugging');
      }

      // Osiguraj da selectedDay je validan
      const validSelectedDay = Math.max(0, Math.min(selectedDay, normalizedDays.length - 1));

      const normalizedPlan: WeeklyMealPlan = {
        ...plan,
        days: normalizedDays,
        userTargets: plan.userTargets || {
          calories: directCalculations?.targetCalories || 0,
          protein: directCalculations?.targetProtein || 0,
          carbs: directCalculations?.targetCarbs || 0,
          fat: directCalculations?.targetFat || 0,
          goal: directCalculations?.goalType || 'maintain',
        },
        weeklyTotals: plan.weeklyTotals || (plan.weeklyAverage ? {
          avgCalories: plan.weeklyAverage.calories || 0,
          avgProtein: plan.weeklyAverage.protein || 0,
          avgCarbs: plan.weeklyAverage.carbs || 0,
          avgFat: plan.weeklyAverage.fat || 0,
        } : {
          // Izračunaj iz dana ako nedostaje
          avgCalories: normalizedDays.reduce((sum, day) => sum + day.dailyTotals.calories, 0) / normalizedDays.length,
          avgProtein: normalizedDays.reduce((sum, day) => sum + day.dailyTotals.protein, 0) / normalizedDays.length,
          avgCarbs: normalizedDays.reduce((sum, day) => sum + day.dailyTotals.carbs, 0) / normalizedDays.length,
          avgFat: normalizedDays.reduce((sum, day) => sum + day.dailyTotals.fat, 0) / normalizedDays.length,
        }),
      };

      // STEP 7: Add logs
      console.log('TRANSFORMED plan', JSON.stringify(normalizedPlan, null, 2));
      console.log('TRANSFORMED first day meals', normalizedPlan?.days?.[0]?.meals);
      console.log('totalMeals', totalMeals);
      
      setWeeklyPlan(normalizedPlan);
      setSelectedDay(validSelectedDay);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Greška pri generiranju plana';
      setError(errorMessage);
      console.error('Generate plan error:', err);
    } finally {
      setLoading(false);
    }
  };

  const renderMealCard = (title: string, meal: GeneratedMeal | null | undefined, onPress: () => void) => {
    if (!meal) {
      return null;
    }
    
    const totals = meal.totals;
    
    return (
      <TouchableOpacity
        style={styles.mealCard}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <View style={styles.mealCardHeader}>
          <Text style={styles.mealCardTitle}>{title}</Text>
          <Text style={styles.mealCardName}>{meal.name}</Text>
        </View>
        {meal.description && (
          <Text style={styles.mealCardDescription} numberOfLines={2}>
            {meal.description}
          </Text>
        )}
        <View style={styles.mealCardMacros}>
          <View style={styles.macroItem}>
            <Text style={styles.macroValue}>{Math.round(totals.calories)}</Text>
            <Text style={styles.macroLabel}>kcal</Text>
          </View>
          <View style={styles.macroItem}>
            <Text style={styles.macroValue}>{Math.round(totals.protein)}g</Text>
            <Text style={styles.macroLabel}>P</Text>
          </View>
          <View style={styles.macroItem}>
            <Text style={styles.macroValue}>{Math.round(totals.carbs)}g</Text>
            <Text style={styles.macroLabel}>C</Text>
          </View>
          <View style={styles.macroItem}>
            <Text style={styles.macroValue}>{Math.round(totals.fat)}g</Text>
            <Text style={styles.macroLabel}>F</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderMealDetail = () => {
    if (!selectedMeal) return null;

    const { title, meal } = selectedMeal;

    return (
      <View style={styles.mealDetailOverlay}>
        <View style={styles.mealDetailContent}>
          <View style={styles.mealDetailHeader}>
            <Text style={styles.mealDetailTitle}>{title}</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setSelectedMeal(null)}
            >
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.mealDetailScroll}>
            <Text style={styles.mealDetailName}>{meal.name}</Text>
            
            {meal.description && (
              <Text style={styles.mealDetailDescription}>{meal.description}</Text>
            )}

            {meal.preparationTip && (
              <View style={styles.preparationTip}>
                <Text style={styles.preparationTipTitle}> Savjet za pripremu</Text>
                <Text style={styles.preparationTipText}>{meal.preparationTip}</Text>
              </View>
            )}

            <View style={styles.ingredientsSection}>
              <Text style={styles.sectionTitle}>Sastojci:</Text>
              {meal.components.map((component, idx) => (
                <View key={`component-${meal.name}-${component.name}-${idx}`} style={styles.ingredientItem}>
                  <Text style={styles.ingredientName}>{component.name}</Text>
                  <Text style={styles.ingredientAmount}>{component.grams}g</Text>
                </View>
              ))}
            </View>

            <View style={styles.macrosSection}>
              <Text style={styles.sectionTitle}>Makronutrijenti:</Text>
              <View style={styles.macrosGrid}>
                <View style={styles.macroBox}>
                  <Text style={styles.macroBoxValue}>{Math.round(meal.totals.calories)}</Text>
                  <Text style={styles.macroBoxLabel}>Kalorije</Text>
                </View>
                <View style={styles.macroBox}>
                  <Text style={styles.macroBoxValue}>{Math.round(meal.totals.protein)}g</Text>
                  <Text style={styles.macroBoxLabel}>Proteini</Text>
                </View>
                <View style={styles.macroBox}>
                  <Text style={styles.macroBoxValue}>{Math.round(meal.totals.carbs)}g</Text>
                  <Text style={styles.macroBoxLabel}>Ugljikohidrati</Text>
                </View>
                <View style={styles.macroBox}>
                  <Text style={styles.macroBoxValue}>{Math.round(meal.totals.fat)}g</Text>
                  <Text style={styles.macroBoxLabel}>Masti</Text>
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    );
  };

  if (loading && !weeklyPlan) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['rgba(0,0,0,0.9)', 'rgba(0,0,0,0.95)']}
          style={styles.gradient}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Generiram plan prehrane...</Text>
        </View>
      </View>
    );
  }

  if (error && !weeklyPlan) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['rgba(0,0,0,0.9)', 'rgba(0,0,0,0.95)']}
          style={styles.gradient}
        />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={generatePlan}>
            <Text style={styles.retryButtonText}>Pokušaj ponovno</Text>
          </TouchableOpacity>
          {onBack && (
            <TouchableOpacity style={styles.backButton} onPress={onBack}>
              <Text style={styles.backButtonText}>Nazad</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  if (!weeklyPlan || !weeklyPlan.days || weeklyPlan.days.length === 0) {
    return null;
  }

  // OSIGURAJ da selectedDay je validan
  const validSelectedDay = Math.max(0, Math.min(selectedDay, weeklyPlan.days.length - 1));
  const currentDay = weeklyPlan.days[validSelectedDay];
  
  if (!currentDay) {
    console.error('No current day found - this should never happen');
    return null;
  }
  
  const meals = currentDay.meals;
  const dailyTotals = currentDay.dailyTotals; // UVIJEK postoji nakon normalizacije
  
  // Debug logging for render
  console.log(' RENDERING - currentDay:', {
    date: currentDay.date,
    dayName: currentDay.dayName,
    mealsKeys: Object.keys(meals),
    mealsCount: Object.values(meals).filter(m => m !== null && m !== undefined).length,
    breakfast: !!meals.breakfast,
    snack1: !!meals.snack1,
    lunch: !!meals.lunch,
    snack2: !!meals.snack2,
    dinner: !!meals.dinner,
    breakfastName: meals.breakfast?.name,
    lunchName: meals.lunch?.name,
    dinnerName: meals.dinner?.name,
    dailyTotals,
  });

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['rgba(0,0,0,0.9)', 'rgba(0,0,0,0.95)']}
        style={styles.gradient}
      />

      {/* Header */}
      <Animated.View
        style={[
          styles.header,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={styles.headerTop}>
          {onBack && (
            <TouchableOpacity style={styles.backButtonHeader} onPress={onBack}>
              <Text style={styles.backButtonText}>← Nazad</Text>
            </TouchableOpacity>
          )}
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.generateButton}
              onPress={generatePlan}
              disabled={loading}
            >
              <Text style={styles.generateButtonText}>
                {loading ? 'Generiram...' : 'Novi plan'}
              </Text>
            </TouchableOpacity>
            {/* Trainer Connection Section */}
            {!isConnectedToTrainer ? (
              // Nije povezan - prikaži gumb za povezivanje
              <TouchableOpacity
                style={styles.connectTrainerButton}
                onPress={onConnectTrainer}
              >
                <Text style={styles.connectTrainerButtonText}> Poveži se s trenerom za plan treninga</Text>
              </TouchableOpacity>
            ) : (
              // Povezan - prikaži gumb za dashboard treninga
              <TouchableOpacity
                style={styles.connectedButton}
                onPress={onNavigateToTraining}
              >
                <Text style={styles.connectedButtonText}> Moj trening ({trainerName})</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        <Text style={styles.title}>Tjedni Plan Prehrane</Text>
        <Text style={styles.subtitle}>
          Program: {weeklyPlan.userTargets.goal === 'lose' ? 'Gubitak kila' : weeklyPlan.userTargets.goal === 'gain' ? 'Dobivanje kila' : 'Održavanje težine'} |{' '}
          Cilj: {Math.round(weeklyPlan.userTargets.calories)} kcal |{' '}
          P: {Math.round(weeklyPlan.userTargets.protein)}g |{' '}
          C: {Math.round(weeklyPlan.userTargets.carbs)}g |{' '}
          F: {Math.round(weeklyPlan.userTargets.fat)}g
        </Text>
      </Animated.View>

      {/* Day Selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.daySelector}
        contentContainerStyle={styles.daySelectorContent}
      >
        {weeklyPlan.days.map((day, idx) => {
          const dateObj = new Date(day.date + 'T12:00:00'); // Koristi noon da izbjegne timezone probleme
          const dayName = day.dayName || DAY_NAMES[dateObj.getDay()];
          const isSelected = idx === validSelectedDay;
          // Use stable key based on date instead of index to prevent React key warnings and state reuse
          const dayKey = `day-${day.date || idx}`;

          return (
            <TouchableOpacity
              key={dayKey}
              style={[styles.dayButton, isSelected && styles.dayButtonSelected]}
              onPress={() => setSelectedDay(idx)}
            >
              <Text style={[styles.dayButtonText, isSelected && styles.dayButtonTextSelected]}>
                {dayName}
              </Text>
              <Text style={[styles.dayButtonDate, isSelected && styles.dayButtonDateSelected]}>
                {dateObj.getDate()}.{dateObj.getMonth() + 1}.
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Daily Totals */}
      <View style={styles.dailyTotals}>
        <Text style={styles.dailyTotalsTitle}>Dnevni ukupno:</Text>
        <View style={styles.dailyTotalsMacros}>
          <Text style={styles.dailyTotalValue}>
            {Math.round(dailyTotals.calories)} kcal
          </Text>
          <Text style={styles.dailyTotalMacro}>
            P: {Math.round(dailyTotals.protein)}g
          </Text>
          <Text style={styles.dailyTotalMacro}>
            C: {Math.round(dailyTotals.carbs)}g
          </Text>
          <Text style={styles.dailyTotalMacro}>
            F: {Math.round(dailyTotals.fat)}g
          </Text>
        </View>
      </View>

      {/* Meals List */}
      <ScrollView style={styles.mealsList} contentContainerStyle={styles.mealsListContent}>
        {meals.breakfast && renderMealCard(
          MEAL_NAMES.breakfast,
          meals.breakfast,
          () => meals.breakfast && setSelectedMeal({ title: MEAL_NAMES.breakfast, meal: meals.breakfast! })
        )}
        {meals.snack1 && renderMealCard(
          MEAL_NAMES.snack1,
          meals.snack1,
          () => meals.snack1 && setSelectedMeal({ title: MEAL_NAMES.snack1, meal: meals.snack1! })
        )}
        {meals.lunch && renderMealCard(
          MEAL_NAMES.lunch,
          meals.lunch,
          () => meals.lunch && setSelectedMeal({ title: MEAL_NAMES.lunch, meal: meals.lunch! })
        )}
        {meals.snack2 && renderMealCard(
          MEAL_NAMES.snack2,
          meals.snack2,
          () => meals.snack2 && setSelectedMeal({ title: MEAL_NAMES.snack2, meal: meals.snack2! })
        )}
        {meals.snack3 && renderMealCard(
          MEAL_NAMES.snack3,
          meals.snack3,
          () => meals.snack3 && setSelectedMeal({ title: MEAL_NAMES.snack3, meal: meals.snack3! })
        )}
        {meals.dinner && renderMealCard(
          MEAL_NAMES.dinner,
          meals.dinner,
          () => meals.dinner && setSelectedMeal({ title: MEAL_NAMES.dinner, meal: meals.dinner! })
        )}
      </ScrollView>

      {/* Meal Detail Modal */}
      {renderMealDetail()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 16,
    color: '#ff4444',
    textAlign: 'center',
    marginBottom: 24,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  retryButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 12,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  backButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButtonHeader: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  generateButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  trainingButton: {
    backgroundColor: '#27272A',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  trainingButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  connectTrainerButton: {
    backgroundColor: '#3F3F46',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 12,
  },
  connectTrainerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  connectedButton: {
    backgroundColor: '#3F3F46',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 12,
  },
  connectedButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  daySelector: {
    maxHeight: 80,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  daySelectorContent: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  dayButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginHorizontal: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    minWidth: 80,
  },
  dayButtonSelected: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderColor: 'rgba(255,255,255,0.4)',
    borderWidth: 2,
  },
  dayButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  dayButtonTextSelected: {
    color: '#fff',
  },
  dayButtonDate: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  dayButtonDateSelected: {
    color: 'rgba(255,255,255,0.7)',
  },
  dailyTotals: {
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  dailyTotalsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  dailyTotalsMacros: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  dailyTotalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  dailyTotalMacro: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  mealsList: {
    flex: 1,
  },
  mealsListContent: {
    padding: 16,
    gap: 12,
  },
  mealCard: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    padding: 16,
  },
  mealCardHeader: {
    marginBottom: 8,
  },
  mealCardTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  mealCardName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  mealCardDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  mealCardMacros: {
    flexDirection: 'row',
    gap: 16,
  },
  macroItem: {
    alignItems: 'center',
  },
  macroValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  macroLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  mealDetailOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.95)',
    zIndex: 1000,
  },
  mealDetailContent: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  mealDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  mealDetailTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: '300',
  },
  mealDetailScroll: {
    flex: 1,
  },
  mealDetailName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  mealDetailDescription: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 24,
    marginBottom: 24,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  preparationTip: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  preparationTipTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  preparationTipText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 20,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  ingredientsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  ingredientItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  ingredientName: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  ingredientAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  macrosSection: {
    marginBottom: 24,
  },
  macrosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  macroBox: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  macroBoxValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  macroBoxLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
});
