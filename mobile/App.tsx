import React, { useState, useRef, useEffect, useCallback } from "react";
import { Animated, View, StyleSheet, Alert } from "react-native";
import { API_BASE_URL } from "./src/services/api";
import WelcomeScreen from "./src/screens/WelcomeScreen";
import LoginScreen from "./src/screens/LoginScreen";
import OnboardingScreen from "./src/screens/OnboardingScreen";
import GoalSelectionScreen, { GoalType } from "./src/screens/GoalSelectionScreen";
import IntakeFlowScreen from "./src/screens/IntakeFlowScreen";
import CalculatorScreen from "./src/screens/CalculatorScreen";
import CalculationsSummaryScreen from "./src/screens/CalculationsSummaryScreen";
import MealPlanGeneratorScreen from "./src/screens/MealPlanGeneratorScreen";
import TrainerProgramBuilderScreen from "./src/screens/TrainerProgramBuilderScreen";
import TrainerHomeScreen from "./src/screens/TrainerHomeScreen";
import TrainerClientDetailScreen from "./src/screens/TrainerClientDetailScreen";
import AnnualPlanBuilderScreen from "./src/screens/AnnualPlanBuilderScreen";
import AddClientScreen from "./src/screens/AddClientScreen";
import ManualMesocycleBuilderScreen from "./src/screens/ManualMesocycleBuilderScreen";
import ConnectTrainerScreen from "./src/screens/ConnectTrainerScreen";
import TrainerCodeScreen from "./src/screens/TrainerCodeScreen";
import ClientDashboardScreen from "./src/screens/ClientDashboardScreen";
import WorkoutSessionScreen from "./src/screens/WorkoutSessionScreen";
import ProgressChartsScreen from "./src/screens/ProgressChartsScreen";
import TrainerClientResultsScreen from "./src/screens/TrainerClientResultsScreen";
import NotificationSettingsScreen from "./src/screens/NotificationSettingsScreen";
import TrainerBrowseScreen from "./src/screens/TrainerBrowseScreen";
import TrainerProfileScreen from "./src/screens/TrainerProfileScreen";
import TrainerProfileEditScreen from "./src/screens/TrainerProfileEditScreen";
import { goalStorage } from "./src/services/storage";

// Helper funkcija za kreiranje auth tokena (format: base64(userId:timestamp))
// Za MVP koristimo hardcoded trainer UUID
const TRAINER_ID = "6dd75281-e4fe-4cfe-8a9d-a07a7a23a9f7"; // Mock trainer ID
function generateTrainerToken(): string {
  // Format: base64(userId:timestamp)
  const timestamp = Date.now();
  const tokenString = `${TRAINER_ID}:${timestamp}`;
  
  // React Native/Expo ima btoa dostupan
  if (typeof btoa !== 'undefined') {
    return btoa(tokenString);
  }
  
  // Fallback: koristi hardcoded token ako btoa nije dostupan
  // Ovo je base64("6dd75281-e4fe-4cfe-8a9d-a07a7a23a9f7:1736704675059")
  return "NmRkNzUyODEtZTRmZS00Y2ZlLThhOWQtYTA3YTdhMjNhOWY3OjE3MzY3MDQ2NzUwNTk=";
}

const TRAINER_TOKEN = generateTrainerToken();

export default function App() {
  const [showLogin, setShowLogin] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showGoalSelection, setShowGoalSelection] = useState(false);
  const [showIntakeFlow, setShowIntakeFlow] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [showCalculationsSummary, setShowCalculationsSummary] = useState(false);
  const [showMealPlan, setShowMealPlan] = useState(false);
  const [showTrainingGenerator, setShowTrainingGenerator] = useState(false);
  const [showTrainerHome, setShowTrainerHome] = useState(false);
  const [showTrainerClientDetail, setShowTrainerClientDetail] = useState(false);
  const [showAnnualPlanBuilder, setShowAnnualPlanBuilder] = useState(false);
  const [showAddClient, setShowAddClient] = useState(false);
  const [showManualBuilder, setShowManualBuilder] = useState(false);
  const [showConnectTrainer, setShowConnectTrainer] = useState(false);
  const [showTrainerCode, setShowTrainerCode] = useState(false);
  const [showClientDashboard, setShowClientDashboard] = useState(false);
  const [showWorkoutSession, setShowWorkoutSession] = useState(false);
  const [showProgressCharts, setShowProgressCharts] = useState(false);
  const [showTrainerClientResults, setShowTrainerClientResults] = useState(false);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [showTrainerBrowse, setShowTrainerBrowse] = useState(false);
  const [showTrainerProfile, setShowTrainerProfile] = useState(false);
  const [showTrainerProfileEdit, setShowTrainerProfileEdit] = useState(false);
  const [selectedTrainerIdForProfile, setSelectedTrainerIdForProfile] = useState<string | null>(null);
  const [selectedTrainerCodeForProfile, setSelectedTrainerCodeForProfile] = useState<string | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedClientName, setSelectedClientName] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedPhaseData, setSelectedPhaseData] = useState<{
    phaseType: string;
    phaseName: string;
    startWeek: number;
    endWeek: number;
    durationWeeks: number;
    mesocycleId: string;
    ponavljanja: string;
    intenzitet: string;
  } | null>(null);
  const [connectedTrainerId, setConnectedTrainerId] = useState<string | null>(null);
  const [connectedTrainerName, setConnectedTrainerName] = useState<string | null>(null);
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);

  // Provjeri je li klijent već povezan s trenerom
  const checkTrainerConnection = useCallback(async () => {
    if (isCheckingConnection) return;
    setIsCheckingConnection(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/client/connect`, {
        headers: { 'Authorization': `Bearer ${CLIENT_TOKEN}` },
      });
      const result = await response.json();
      
      if (result.success && result.data.isConnected) {
        setConnectedTrainerId(result.data.trainer?.id || null);
        setConnectedTrainerName(result.data.trainer?.name || null);
        console.log('[App] Connected to trainer:', result.data.trainer?.name);
      } else {
        setConnectedTrainerId(null);
        setConnectedTrainerName(null);
        console.log('[App] Not connected to any trainer');
      }
    } catch (error) {
      console.log('[App] Error checking trainer connection:', error);
    } finally {
      setIsCheckingConnection(false);
    }
  }, [isCheckingConnection, CLIENT_TOKEN]);

  // Provjeri vezu kada se prikaže MealPlan ekran
  useEffect(() => {
    if (showMealPlan && !connectedTrainerId) {
      checkTrainerConnection();
    }
  }, [showMealPlan]);
  const [intakeFormData, setIntakeFormData] = useState<any>(null);
  const [calculatorResults, setCalculatorResults] = useState<any>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;
  
  // Generiraj client token (za javne korisnike)
  // Koristimo pravi UUID format za klijenta
  const CLIENT_ID = "c1234567-89ab-cdef-0123-456789abcdef"; // Mock client UUID
  const CLIENT_TOKEN = typeof btoa !== 'undefined' 
    ? btoa(`${CLIENT_ID}:${Date.now()}`)
    : "YzEyMzQ1NjctODlhYi1jZGVmLTAxMjMtNDU2Nzg5YWJjZGVmOjE3MzY3MDQ2NzUwNTk=";

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

  const handleNavigateToTraining = () => {
    // Klijent NE može sam generirati program
    // Ako je povezan s trenerom → vodi na ClientDashboard
    // Ako nije povezan → prikaži poruku
    if (connectedTrainerId) {
      setShowMealPlan(false);
      setShowClientDashboard(true);
    } else {
      Alert.alert(
        '🔗 Poveži se s trenerom',
        'Za pristup treninzima potrebno je biti povezan s trenerom. Trener će ti kreirati personalizirani program.',
        [
          { text: 'Odustani', style: 'cancel' },
          { 
            text: 'Poveži se', 
            onPress: () => {
              setShowMealPlan(false);
              setShowConnectTrainer(true);
            }
          },
        ]
      );
    }
  };

  const handleBackToMealPlan = () => {
    setShowTrainingGenerator(false);
    setShowMealPlan(true);
  };

  const handleTrainingComplete = (programId?: string) => {
    // Nakon završetka generatora treninga, vrati se na trainer home
    setShowTrainingGenerator(false);
    if (selectedClientId) {
      // Ako je generiran program za klijenta, vrati se na detail screen
      setShowTrainerClientDetail(true);
    } else {
      // Inače, vrati se na trainer home
      setShowTrainerHome(true);
    }
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

  const handleShowTrainerMode = () => {
    // Prikaži trenerski ekran
    setShowLogin(false);
    setShowOnboarding(false);
    setShowTrainerHome(true);
  };

  const handleTrainerClientPress = (clientId: string) => {
    setSelectedClientId(clientId);
    setShowTrainerHome(false);
    setShowTrainerClientDetail(true);
  };

  const handleAnnualPlanPress = (clientId: string, clientName: string) => {
    setSelectedClientId(clientId);
    setSelectedClientName(clientName);
    setSelectedYear(new Date().getFullYear());
    setShowTrainerClientDetail(false);
    setShowAnnualPlanBuilder(true);
  };

  const handleGenerateProgram = (clientId: string, phaseData?: {
    phaseType: string;
    phaseName: string;
    startWeek: number;
    endWeek: number;
    durationWeeks: number;
    mesocycleId: string;
    ponavljanja: string;
    intenzitet: string;
  }) => {
    setSelectedClientId(clientId);
    setSelectedPhaseData(phaseData || null);
    setShowTrainerClientDetail(false);
    setShowAnnualPlanBuilder(false);
    setShowTrainingGenerator(true);
  };

  const handleManualBuilder = (clientId: string, mesocycleId?: string) => {
    setSelectedClientId(clientId);
    setShowAnnualPlanBuilder(false);
    setShowManualBuilder(true);
    // TODO: Ako je mesocycleId proslijeđen, koristi ga za edit mode
  };

  const handleBackFromManualBuilder = () => {
    setShowManualBuilder(false);
    if (selectedClientId) {
      setShowTrainerClientDetail(true);
    } else {
      setShowTrainerHome(true);
    }
  };

  const handleBackFromAnnualPlan = () => {
    setShowAnnualPlanBuilder(false);
    setShowTrainerClientDetail(true);
  };

  const handleShowAddClient = () => {
    setShowTrainerHome(false);
    setShowAddClient(true);
  };

  const handleBackFromAddClient = () => {
    setShowAddClient(false);
    setShowTrainerHome(true);
  };

  const handleClientAdded = (clientId: string) => {
    // Nakon što je klijent dodan, vrati se na listu klijenata
    setShowAddClient(false);
    setShowTrainerHome(true);
    // TODO: Refresh lista klijenata u TrainerHomeScreen
  };

  const handleBackToTrainerHome = () => {
    setShowTrainerClientDetail(false);
    setShowTrainerHome(true);
  };

  const handleNewProgramFromTrainerHome = () => {
    setShowTrainerHome(false);
    setShowTrainingGenerator(true);
  };

  const handleBackFromTrainingToTrainerHome = () => {
    setShowTrainingGenerator(false);
    setShowTrainerHome(true);
  };

  // === CONNECT TRAINER HANDLERS ===
  const handleShowConnectTrainer = () => {
    // Ako je već povezan, prikaži Client Dashboard
    if (connectedTrainerId) {
      setShowMealPlan(false);
      setShowClientDashboard(true);
    } else {
      setShowMealPlan(false);
      setShowConnectTrainer(true);
    }
  };

  const handleTrainerConnected = (trainerName: string, trainerId: string) => {
    setConnectedTrainerId(trainerId);
    setConnectedTrainerName(trainerName);
    setShowConnectTrainer(false);
    // Prikaži Client Dashboard nakon povezivanja
    setShowClientDashboard(true);
  };

  const handleSkipConnectTrainer = () => {
    setShowConnectTrainer(false);
    setShowMealPlan(true);
  };

  const handleBackFromConnectTrainer = () => {
    setShowConnectTrainer(false);
    setShowMealPlan(true);
  };

  // === CLIENT DASHBOARD HANDLERS ===
  const handleBackFromClientDashboard = () => {
    setShowClientDashboard(false);
    setShowMealPlan(true);
  };

  const handleDisconnectFromTrainer = () => {
    setConnectedTrainerId(null);
    setConnectedTrainerName(null);
    setShowClientDashboard(false);
    setShowMealPlan(true);
  };

  const handleStartWorkout = (sessionId: string) => {
    // TODO: Implementirati WorkoutSessionScreen
    Alert.alert('Info', `Započinjem trening: ${sessionId}`);
  };

  // === TRAINER CODE HANDLERS ===
  const handleShowTrainerCode = () => {
    setShowTrainerHome(false);
    setShowTrainerCode(true);
  };

  const handleBackFromTrainerCode = () => {
    setShowTrainerCode(false);
    setShowTrainerHome(true);
  };

  // === TRAINER BROWSE/PROFILE HANDLERS ===
  const handleShowTrainerBrowse = () => {
    setShowConnectTrainer(false);
    setShowTrainerBrowse(true);
  };

  const handleBackFromTrainerBrowse = () => {
    setShowTrainerBrowse(false);
    setShowConnectTrainer(true);
  };

  const handleSelectTrainerForProfile = (trainerId: string, trainerCode?: string) => {
    setSelectedTrainerIdForProfile(trainerId);
    setSelectedTrainerCodeForProfile(trainerCode || null);
    setShowTrainerBrowse(false);
    setShowTrainerProfile(true);
  };

  const handleBackFromTrainerProfile = () => {
    setShowTrainerProfile(false);
    setSelectedTrainerIdForProfile(null);
    setSelectedTrainerCodeForProfile(null);
    setShowTrainerBrowse(true);
  };

  const handleConnectFromProfile = (trainerId: string, trainerName: string) => {
    setConnectedTrainerId(trainerId);
    setConnectedTrainerName(trainerName);
    setShowTrainerProfile(false);
    setSelectedTrainerIdForProfile(null);
    setSelectedTrainerCodeForProfile(null);
    setShowClientDashboard(true);
  };

  // === TRAINER PROFILE EDIT HANDLERS ===
  const handleShowTrainerProfileEdit = () => {
    setShowTrainerHome(false);
    setShowTrainerProfileEdit(true);
  };

  const handleBackFromTrainerProfileEdit = () => {
    setShowTrainerProfileEdit(false);
    setShowTrainerHome(true);
  };

  const handleTrainerProfileSaved = () => {
    setShowTrainerProfileEdit(false);
    setShowTrainerHome(true);
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

  // Manual Mesocycle Builder ekran
  if (showManualBuilder && selectedClientId) {
    return (
      <ManualMesocycleBuilderScreen
        programId={selectedProgramId || undefined}
        onComplete={(programId) => {
          setSelectedProgramId(programId);
          handleBackFromManualBuilder();
        }}
        onCancel={handleBackFromManualBuilder}
      />
    );
  }

  // Annual Plan Builder ekran
  if (showAnnualPlanBuilder && selectedClientId && selectedClientName) {
    return (
      <AnnualPlanBuilderScreen
        authToken={TRAINER_TOKEN}
        clientId={selectedClientId}
        clientName={selectedClientName}
        year={selectedYear}
        onBack={handleBackFromAnnualPlan}
        onGenerateProgram={handleGenerateProgram}
        onGenerateAllPhases={async (clientId, phases, onComplete) => {
          console.log('[App] Generating all phases:', phases.length);
          const results: {phaseType: string; phaseName: string; programId: string | null; success: boolean; error?: string}[] = [];
          let previousProgramId: string | null = null;
          
          for (let i = 0; i < phases.length; i++) {
            const phase = phases[i];
            console.log(`[App] Generating phase ${i + 1}/${phases.length}: ${phase.phaseName}`);
            
            // Skip kratke faze (manje od 4 tjedna) - API ih ne podržava
            if (phase.durationWeeks < 4) {
              console.log(`[App] Skipping ${phase.phaseName} - too short (${phase.durationWeeks} weeks)`);
              results.push({
                phaseType: phase.phaseType,
                phaseName: phase.phaseName,
                programId: null,
                success: false,
                error: `Faza prekratka (${phase.durationWeeks} tj.) - minimum je 4 tjedna`,
              });
              continue;
            }
            
            try {
              // Mapiraj phaseType na cilj
              let cilj: string;
              switch (phase.phaseType) {
                case 'jakost':
                case 'snaga':
                  cilj = 'maksimalna_snaga';
                  break;
                case 'izdrzljivost':
                  cilj = 'misicna_izdrzljivost';
                  break;
                case 'hipertrofija':
                default:
                  cilj = 'hipertrofija';
                  break;
              }
              
              const response = await fetch(`${API_BASE_URL}/api/training/generate`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${TRAINER_TOKEN}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  klijentId: clientId,
                  cilj: cilj,
                  razina: 'srednja',
                  frekvencija: 4,
                  splitTip: 'upper_lower',
                  trajanjeTjedana: phase.durationWeeks,
                  dostupnaOprema: ['barbell', 'dumbbell', 'cable', 'machine'],
                  previousProgramId: previousProgramId,
                  phaseOrder: i + 1,
                  totalPhases: phases.length,
                }),
              });
              
              if (!response.ok) {
                const errorText = await response.text();
                console.error(`[App] API error for ${phase.phaseName}:`, errorText);
                results.push({
                  phaseType: phase.phaseType,
                  phaseName: phase.phaseName,
                  programId: null,
                  success: false,
                  error: `API greška: ${response.status}`,
                });
                continue;
              }
              
              const data = await response.json();
              
              if (data.success && data.data?.programId) {
                console.log(`[App] Successfully generated ${phase.phaseName}: ${data.data.programId}`);
                previousProgramId = data.data.programId;
                results.push({
                  phaseType: phase.phaseType,
                  phaseName: phase.phaseName,
                  programId: data.data.programId,
                  success: true,
                });
              } else {
                console.error(`[App] Generation failed for ${phase.phaseName}:`, data);
                results.push({
                  phaseType: phase.phaseType,
                  phaseName: phase.phaseName,
                  programId: null,
                  success: false,
                  error: data.error || 'Nepoznata greška',
                });
              }
            } catch (error) {
              console.error(`[App] Error generating ${phase.phaseName}:`, error);
              results.push({
                phaseType: phase.phaseType,
                phaseName: phase.phaseName,
                programId: null,
                success: false,
                error: error instanceof Error ? error.message : 'Network error',
              });
            }
          }
          
          onComplete(results);
        }}
      />
    );
  }

  // Trainer Client Detail ekran
  if (showTrainerClientDetail && selectedClientId) {
    return (
      <TrainerClientDetailScreen
        authToken={TRAINER_TOKEN}
        clientId={selectedClientId}
        onBack={handleBackToTrainerHome}
        onAnnualPlanPress={handleAnnualPlanPress}
        onGenerateProgram={handleGenerateProgram}
        onViewResults={(clientId, clientName) => {
          setSelectedClientId(clientId);
          setSelectedClientName(clientName);
          setShowTrainerClientDetail(false);
          setShowTrainerClientResults(true);
        }}
      />
    );
  }

  // Add Client ekran
  if (showAddClient) {
    return (
      <AddClientScreen
        authToken={TRAINER_TOKEN}
        onComplete={handleClientAdded}
        onCancel={handleBackFromAddClient}
      />
    );
  }

  // Workout Session ekran (izvršavanje treninga)
  if (showWorkoutSession && selectedSessionId) {
    return (
      <WorkoutSessionScreen
        authToken={CLIENT_TOKEN}
        sessionId={selectedSessionId}
        onComplete={() => {
          setShowWorkoutSession(false);
          setSelectedSessionId(null);
          setShowClientDashboard(true);
        }}
        onBack={() => {
          setShowWorkoutSession(false);
          setSelectedSessionId(null);
          setShowClientDashboard(true);
        }}
      />
    );
  }

  // Progress Charts ekran (za klijenta)
  if (showProgressCharts) {
    return (
      <ProgressChartsScreen
        authToken={CLIENT_TOKEN}
        onBack={() => {
          setShowProgressCharts(false);
          setShowClientDashboard(true);
        }}
      />
    );
  }

  // Trainer Client Results ekran (trener vidi rezultate klijenta)
  if (showTrainerClientResults && selectedClientId && selectedClientName) {
    return (
      <TrainerClientResultsScreen
        authToken={TRAINER_TOKEN}
        clientId={selectedClientId}
        clientName={selectedClientName}
        onBack={() => {
          setShowTrainerClientResults(false);
          setSelectedClientId(null);
          setSelectedClientName(null);
          setShowTrainerHome(true);
        }}
        onAdjustProgram={(clientId) => {
          setSelectedClientId(clientId);
          setShowTrainerClientResults(false);
          setShowTrainerProgramBuilder(true);
        }}
      />
    );
  }

  // Notification Settings ekran
  if (showNotificationSettings) {
    return (
      <NotificationSettingsScreen
        onBack={() => {
          setShowNotificationSettings(false);
          // Vrati se na prethodni ekran (Client Dashboard ili Trainer Home)
          if (connectedTrainerId) {
            setShowClientDashboard(true);
          } else {
            setShowMealPlan(true);
          }
        }}
      />
    );
  }

  // Client Dashboard ekran (nakon povezivanja s trenerom)
  if (showClientDashboard) {
    return (
      <ClientDashboardScreen
        authToken={CLIENT_TOKEN}
        trainerName={connectedTrainerName || undefined}
        onBack={handleBackFromClientDashboard}
        onDisconnect={handleDisconnectFromTrainer}
        onStartWorkout={(sessionId) => {
          setSelectedSessionId(sessionId);
          setShowClientDashboard(false);
          setShowWorkoutSession(true);
        }}
        onViewProgress={() => {
          setShowClientDashboard(false);
          setShowProgressCharts(true);
        }}
        onSettings={() => {
          setShowClientDashboard(false);
          setShowNotificationSettings(true);
        }}
      />
    );
  }

  // Trainer Profile ekran (prikaz portfolia trenera)
  if (showTrainerProfile && selectedTrainerIdForProfile) {
    return (
      <TrainerProfileScreen
        trainerId={selectedTrainerIdForProfile}
        trainerCode={selectedTrainerCodeForProfile || undefined}
        authToken={CLIENT_TOKEN}
        onConnect={handleConnectFromProfile}
        onBack={handleBackFromTrainerProfile}
      />
    );
  }

  // Trainer Browse ekran (lista javnih trenera)
  if (showTrainerBrowse) {
    return (
      <TrainerBrowseScreen
        authToken={CLIENT_TOKEN}
        onSelectTrainer={handleSelectTrainerForProfile}
        onBack={handleBackFromTrainerBrowse}
      />
    );
  }

  // Connect Trainer ekran (za klijente)
  if (showConnectTrainer) {
    return (
      <ConnectTrainerScreen
        authToken={CLIENT_TOKEN}
        onConnected={handleTrainerConnected}
        onSkip={handleSkipConnectTrainer}
        onBack={handleBackFromConnectTrainer}
        onBrowseTrainers={handleShowTrainerBrowse}
      />
    );
  }

  // Trainer Profile Edit ekran (za trenere - uređivanje portfolia)
  if (showTrainerProfileEdit) {
    return (
      <TrainerProfileEditScreen
        authToken={TRAINER_TOKEN}
        onBack={handleBackFromTrainerProfileEdit}
        onSaved={handleTrainerProfileSaved}
      />
    );
  }

  // Trainer Code ekran (za trenere)
  if (showTrainerCode) {
    return (
      <TrainerCodeScreen
        authToken={TRAINER_TOKEN}
        onBack={handleBackFromTrainerCode}
      />
    );
  }

  // Trainer Home ekran (lista klijenata)
  if (showTrainerHome) {
    return (
      <TrainerHomeScreen
        authToken={TRAINER_TOKEN}
        onClientPress={handleTrainerClientPress}
        onNewClient={handleShowAddClient}
        onNewProgram={handleNewProgramFromTrainerHome}
        onShowCode={handleShowTrainerCode}
        onEditProfile={handleShowTrainerProfileEdit}
      />
    );
  }

  // Generator treninga ekran
  if (showTrainingGenerator) {
    // Provjeri da li dolazi iz annual plan (ima phaseData) ili iz trainer home
    const onCancelHandler = selectedPhaseData 
      ? () => {
          setSelectedPhaseData(null);
          setShowTrainingGenerator(false);
          setShowAnnualPlanBuilder(true);
        }
      : (showTrainerHome ? handleBackFromTrainingToTrainerHome : handleBackToMealPlan);
    
    return (
      <TrainerProgramBuilderScreen
        authToken={TRAINER_TOKEN}
        clientId={selectedClientId || undefined}
        phaseData={selectedPhaseData || undefined}
        onComplete={(programId) => {
          setSelectedPhaseData(null);
          handleTrainingComplete(programId);
        }}
        onCancel={onCancelHandler}
      />
    );
  }

  // Generator prehrane ekran nakon summary-a
  if (showMealPlan && calculatorResults) {
    return (
      <MealPlanGeneratorScreen
        onBack={handleBackToCalculationsSummary}
        onNavigateToTraining={handleNavigateToTraining}
        onConnectTrainer={handleShowConnectTrainer}
        isConnectedToTrainer={!!connectedTrainerId}
        trainerName={connectedTrainerName || undefined}
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
      <LoginScreen onLoginSuccess={handleLoginSuccess} onSkipLogin={handleSkipLogin} onBack={handleBackToWelcome} onTrainerMode={handleShowTrainerMode} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
