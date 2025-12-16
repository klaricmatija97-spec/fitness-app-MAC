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

// Tipovi
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

interface DailyPlan {
  date: string;
  dayName: string;
  meals: {
    breakfast: GeneratedMeal;
    snack1: GeneratedMeal;
    lunch: GeneratedMeal;
    snack2: GeneratedMeal;
    snack3?: GeneratedMeal;
    dinner: GeneratedMeal;
  };
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
  userTargets?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    goal: string;
  };
  days: DailyPlan[];
  weeklyTotals?: {
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

export default function MealPlanGeneratorScreen({ onBack, directCalculations }: MealPlanGeneratorScreenProps) {
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

      // Try to get auth if not using direct calculations
      if (!directCalculations) {
        clientId = await authStorage.getClientId();
        token = await authStorage.getToken();
      }

      // Log podatke prije slanja
      if (directCalculations) {
        console.log('📤 Sending to generator:', {
          targetCalories: directCalculations.targetCalories,
          targetProtein: directCalculations.targetProtein,
          targetCarbs: directCalculations.targetCarbs,
          targetFat: directCalculations.targetFat,
          goalType: directCalculations.goalType,
          bmr: directCalculations.bmr,
          tdee: directCalculations.tdee,
          preferences: directCalculations.preferences,
        });
      }

      const result = await generateWeeklyMealPlan(clientId, token, directCalculations);

      if (!result || !result.ok || !result.plan) {
        throw new Error(result?.message || 'Greška pri generiranju plana');
      }

      // Log generirani plan
      if (result.plan) {
        console.log('📥 Received plan:', {
          userTargets: result.plan.userTargets,
          weeklyTotals: result.plan.weeklyTotals,
          weeklyAverage: result.plan.weeklyAverage,
          planKeys: Object.keys(result.plan),
        });
      }

      // Normaliziraj plan - osiguraj da ima sve potrebne property-je
      const plan = result.plan;
      const normalizedPlan: WeeklyMealPlan = {
        ...plan,
        userTargets: plan.userTargets || {
          calories: directCalculations?.targetCalories || 0,
          protein: directCalculations?.targetProtein || 0,
          carbs: directCalculations?.targetCarbs || 0,
          fat: directCalculations?.targetFat || 0,
          goal: directCalculations?.goalType || 'maintain',
        },
        weeklyTotals: plan.weeklyTotals || plan.weeklyAverage || {
          avgCalories: 0,
          avgProtein: 0,
          avgCarbs: 0,
          avgFat: 0,
        },
      };

      console.log('📥 Normalized plan:', {
        hasUserTargets: !!normalizedPlan.userTargets,
        userTargets: normalizedPlan.userTargets,
      });

      setWeeklyPlan(normalizedPlan);
      setSelectedDay(0);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Greška pri generiranju plana';
      setError(errorMessage);
      console.error('Generate plan error:', err);
    } finally {
      setLoading(false);
    }
  };

  const renderMealCard = (title: string, meal: GeneratedMeal, onPress: () => void) => (
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
          <Text style={styles.macroValue}>{Math.round(meal.totals.calories)}</Text>
          <Text style={styles.macroLabel}>kcal</Text>
        </View>
        <View style={styles.macroItem}>
          <Text style={styles.macroValue}>{Math.round(meal.totals.protein)}g</Text>
          <Text style={styles.macroLabel}>P</Text>
        </View>
        <View style={styles.macroItem}>
          <Text style={styles.macroValue}>{Math.round(meal.totals.carbs)}g</Text>
          <Text style={styles.macroLabel}>C</Text>
        </View>
        <View style={styles.macroItem}>
          <Text style={styles.macroValue}>{Math.round(meal.totals.fat)}g</Text>
          <Text style={styles.macroLabel}>F</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

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
                <Text style={styles.preparationTipTitle}>💡 Savjet za pripremu</Text>
                <Text style={styles.preparationTipText}>{meal.preparationTip}</Text>
              </View>
            )}

            <View style={styles.ingredientsSection}>
              <Text style={styles.sectionTitle}>Sastojci:</Text>
              {meal.components.map((component, idx) => (
                <View key={idx} style={styles.ingredientItem}>
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

  if (!weeklyPlan) {
    return null;
  }

  const currentDay = weeklyPlan.days[selectedDay];
  const meals = currentDay.meals;

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
          <TouchableOpacity
            style={styles.generateButton}
            onPress={generatePlan}
            disabled={loading}
          >
            <Text style={styles.generateButtonText}>
              {loading ? 'Generiram...' : 'Novi plan'}
            </Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.title}>Tjedni Plan Prehrane</Text>
        {weeklyPlan.userTargets ? (
          <Text style={styles.subtitle}>
            Program: {weeklyPlan.userTargets.goal === 'lose' ? 'Gubitak kila' : weeklyPlan.userTargets.goal === 'gain' ? 'Dobivanje kila' : 'Održavanje težine'} |{' '}
            Cilj: {Math.round(weeklyPlan.userTargets.calories)} kcal |{' '}
            P: {Math.round(weeklyPlan.userTargets.protein)}g |{' '}
            C: {Math.round(weeklyPlan.userTargets.carbs)}g |{' '}
            F: {Math.round(weeklyPlan.userTargets.fat)}g
          </Text>
        ) : (
          <Text style={styles.subtitle}>
            Program: Održavanje težine | Cilj: 0 kcal | P: 0g | C: 0g | F: 0g
          </Text>
        )}
      </Animated.View>

      {/* Day Selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.daySelector}
        contentContainerStyle={styles.daySelectorContent}
      >
        {weeklyPlan.days.map((day, idx) => {
          const date = new Date(day.date);
          const dayName = DAY_NAMES[date.getDay()];
          const isSelected = idx === selectedDay;

          return (
            <TouchableOpacity
              key={idx}
              style={[styles.dayButton, isSelected && styles.dayButtonSelected]}
              onPress={() => setSelectedDay(idx)}
            >
              <Text style={[styles.dayButtonText, isSelected && styles.dayButtonTextSelected]}>
                {dayName}
              </Text>
              <Text style={[styles.dayButtonDate, isSelected && styles.dayButtonDateSelected]}>
                {date.getDate()}.{date.getMonth() + 1}.
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
            {Math.round(currentDay.dailyTotals.calories)} kcal
          </Text>
          <Text style={styles.dailyTotalMacro}>
            P: {Math.round(currentDay.dailyTotals.protein)}g
          </Text>
          <Text style={styles.dailyTotalMacro}>
            C: {Math.round(currentDay.dailyTotals.carbs)}g
          </Text>
          <Text style={styles.dailyTotalMacro}>
            F: {Math.round(currentDay.dailyTotals.fat)}g
          </Text>
        </View>
      </View>

      {/* Meals List */}
      <ScrollView style={styles.mealsList} contentContainerStyle={styles.mealsListContent}>
        {renderMealCard(
          MEAL_NAMES.breakfast,
          meals.breakfast,
          () => setSelectedMeal({ title: MEAL_NAMES.breakfast, meal: meals.breakfast })
        )}
        {renderMealCard(
          MEAL_NAMES.snack1,
          meals.snack1,
          () => setSelectedMeal({ title: MEAL_NAMES.snack1, meal: meals.snack1 })
        )}
        {renderMealCard(
          MEAL_NAMES.lunch,
          meals.lunch,
          () => setSelectedMeal({ title: MEAL_NAMES.lunch, meal: meals.lunch })
        )}
        {renderMealCard(
          MEAL_NAMES.snack2,
          meals.snack2,
          () => setSelectedMeal({ title: MEAL_NAMES.snack2, meal: meals.snack2 })
        )}
        {meals.snack3 && renderMealCard(
          MEAL_NAMES.snack3,
          meals.snack3,
          () => meals.snack3 && setSelectedMeal({ title: MEAL_NAMES.snack3, meal: meals.snack3 })
        )}
        {renderMealCard(
          MEAL_NAMES.dinner,
          meals.dinner,
          () => setSelectedMeal({ title: MEAL_NAMES.dinner, meal: meals.dinner })
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

