import React, { useState, useRef } from "react";
import { Animated, View, StyleSheet } from "react-native";
import WelcomeScreen from "./src/screens/WelcomeScreen";
import LoginScreen from "./src/screens/LoginScreen";
import OnboardingScreen from "./src/screens/OnboardingScreen";
import GoalSelectionScreen, { GoalType } from "./src/screens/GoalSelectionScreen";
import IntakeFlowScreen from "./src/screens/IntakeFlowScreen";
import CalculatorScreen from "./src/screens/CalculatorScreen";
import CalculationsSummaryScreen from "./src/screens/CalculationsSummaryScreen";
import MealPlanGeneratorScreen from "./src/screens/MealPlanGeneratorScreen";
import { goalStorage } from "./src/services/storage";

export default function App() {
  const [showLogin, setShowLogin] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showGoalSelection, setShowGoalSelection] = useState(false);
  const [showIntakeFlow, setShowIntakeFlow] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [showCalculationsSummary, setShowCalculationsSummary] = useState(false);
  const [showMealPlan, setShowMealPlan] = useState(false);
  const [intakeFormData, setIntakeFormData] = useState<any>(null);
  const [calculatorResults, setCalculatorResults] = useState<any>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const handleGetStarted = () => {
    // Smooth transition animacija
    Animated.timing(slideAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start(() => {
      setShowLogin(true);
    });
  };

  const handleLoginSuccess = () => {
    console.log("Login successful!");
    // Prikaži onboarding nakon login-a
    setShowLogin(false);
    setShowOnboarding(true);
  };

  const handleSkipLogin = () => {
    // Preskoči login i idi direktno na onboarding
    setShowLogin(false);
    setShowOnboarding(true);
  };

  const handleOnboardingComplete = () => {
    console.log("Onboarding complete!");
    // Prikaži ekran za odabir cilja
    setShowOnboarding(false);
    setShowGoalSelection(true);
  };

  const handleGoalSelected = async (selectedGoal: GoalType) => {
    console.log("Goal selected:", selectedGoal);
    // Spremi odabrani cilj
    await goalStorage.saveGoal(selectedGoal);
    // Prikaži intake flow
    setShowGoalSelection(false);
    setShowIntakeFlow(true);
  };

  const handleIntakeComplete = (formData: any) => {
    console.log("Intake complete:", formData);
    setIntakeFormData(formData);
    // Prikaži kalkulatore nakon intake flow-a
    setShowIntakeFlow(false);
    setShowCalculator(true);
  };

  const getIntakePreferences = () => {
    if (!intakeFormData) return undefined;
    return {
      allergies: intakeFormData.allergies || '',
      foodPreferences: intakeFormData.foodPreferences || '',
      avoidIngredients: intakeFormData.avoidIngredients || '',
      trainingFrequency: intakeFormData.trainingFrequency || '',
    };
  };

  const handleCalculatorComplete = (results: any) => {
    console.log("Calculator complete:", results);
    setCalculatorResults(results);
    // Prikaži summary ekran nakon kalkulatora
    setShowCalculator(false);
    setShowCalculationsSummary(true);
  };

  const handleGenerateMealPlan = () => {
    // Prikaži generator prehrane s direktnim kalkulacijama
    setShowCalculationsSummary(false);
    setShowMealPlan(true);
  };

  const handleBackToIntakeFlow = () => {
    setShowCalculator(false);
    setShowIntakeFlow(true);
  };

  const handleBackToCalculator = () => {
    setShowCalculationsSummary(false);
    setShowCalculator(true);
  };

  const handleBackToCalculationsSummary = () => {
    setShowMealPlan(false);
    setShowCalculationsSummary(true);
  };

  const handleBackToGoalSelection = () => {
    setShowIntakeFlow(false);
    setShowGoalSelection(true);
  };

  const handleBackToOnboarding = () => {
    setShowGoalSelection(false);
    setShowOnboarding(true);
  };

  const handleBackToLogin = () => {
    setShowOnboarding(false);
    setShowLogin(true);
  };

  const handleBackToWelcome = () => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 400,
      useNativeDriver: true,
    }).start(() => {
      setShowLogin(false);
    });
  };

  // Summary ekran nakon kalkulatora
  if (showCalculationsSummary && calculatorResults) {
    return (
      <CalculationsSummaryScreen
        calculations={{
          bmr: calculatorResults.bmr,
          tdee: calculatorResults.tdee,
          targetCalories: calculatorResults.targetCalories,
          macros: calculatorResults.macros,
          goalType: calculatorResults.goalType || 'maintain',
        }}
        onGenerate={handleGenerateMealPlan}
        onBack={handleBackToCalculator}
      />
    );
  }

  // Generator prehrane ekran nakon summary-a
  if (showMealPlan && calculatorResults) {
    return (
      <MealPlanGeneratorScreen
        onBack={handleBackToCalculationsSummary}
        directCalculations={{
          targetCalories: calculatorResults.targetCalories,
          targetProtein: calculatorResults.macros.protein,
          targetCarbs: calculatorResults.macros.carbs,
          targetFat: calculatorResults.macros.fats,
          goalType: calculatorResults.goalType || 'maintain',
          bmr: calculatorResults.bmr,
          tdee: calculatorResults.tdee,
          preferences: getIntakePreferences(),
        }}
      />
    );
  }

  // Kalkulator ekran nakon intake flow-a
  if (showCalculator) {
    return (
      <CalculatorScreen
        onComplete={handleCalculatorComplete}
        onBack={handleBackToIntakeFlow}
        initialData={{
          weight: intakeFormData?.weight?.value ? parseFloat(intakeFormData.weight.value) : undefined,
          height: intakeFormData?.height?.value ? parseFloat(intakeFormData.height.value) : undefined,
          age: intakeFormData?.ageRange ? parseInt(intakeFormData.ageRange.split('-')[0]) : undefined,
          gender: intakeFormData?.honorific === 'mr' ? 'male' : 'female',
        }}
      />
    );
  }

  // Ako još nije login, prikaži welcome s animacijom
  if (!showLogin && !showOnboarding && !showGoalSelection && !showIntakeFlow) {
    return (
      <Animated.View
        style={[
          styles.container,
          {
            opacity: slideAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 0],
            }),
            transform: [
              {
                translateY: slideAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -50],
                }),
              },
            ],
          },
        ]}
      >
        <WelcomeScreen onGetStarted={handleGetStarted} />
      </Animated.View>
    );
  }

  // Intake flow ekran nakon odabira cilja
  if (showIntakeFlow) {
    return <IntakeFlowScreen onComplete={handleIntakeComplete} onBack={handleBackToGoalSelection} />;
  }

  // Ekran za odabir cilja nakon onboarding poruka
  if (showGoalSelection) {
    return <GoalSelectionScreen onComplete={handleGoalSelected} onBack={handleBackToOnboarding} />;
  }

  // Onboarding ekran nakon login-a
  if (showOnboarding) {
    return <OnboardingScreen onComplete={handleOnboardingComplete} onBack={handleBackToLogin} />;
  }

  // Login ekran s fade-in animacijom
  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: slideAnim,
          transform: [
            {
              translateY: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [50, 0],
              }),
            },
          ],
        },
      ]}
    >
      <LoginScreen onLoginSuccess={handleLoginSuccess} onSkipLogin={handleSkipLogin} onBack={handleBackToWelcome} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
