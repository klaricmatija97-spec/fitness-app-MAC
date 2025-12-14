import React, { useState, useRef } from "react";
import { Animated, View, StyleSheet } from "react-native";
import WelcomeScreen from "./src/screens/WelcomeScreen";
import LoginScreen from "./src/screens/LoginScreen";
import OnboardingScreen from "./src/screens/OnboardingScreen";
import GoalSelectionScreen, { GoalType } from "./src/screens/GoalSelectionScreen";
import { goalStorage } from "./src/services/storage";

export default function App() {
  const [showLogin, setShowLogin] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showGoalSelection, setShowGoalSelection] = useState(false);
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
    // TODO: Navigate to main app
    setShowGoalSelection(false);
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

  // Ako još nije login, prikaži welcome s animacijom
  if (!showLogin && !showOnboarding && !showGoalSelection) {
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
