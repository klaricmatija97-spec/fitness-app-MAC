import React, { useState, useRef, useEffect, useCallback } from "react";
import { Animated, View, StyleSheet, Alert } from "react-native";
import { API_BASE_URL } from "./src/services/api";
import WelcomeScreen from "./src/screens/WelcomeScreen";
import LoginScreen from "./src/screens/LoginScreen";
import OnboardingScreen from "./src/screens/OnboardingScreen";
import { GoalType } from "./src/screens/IntakeFlowScreen";
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
import TrainerRegisterScreen from "./src/screens/TrainerRegisterScreen";
import TrainerWorkoutLogScreen from "./src/screens/TrainerWorkoutLogScreen";
import { goalStorage, authStorage, appStateStorage, AppScreen } from "./src/services/storage";


export default function App() {
  // Auth state za trenera
  const [trainerToken, setTrainerToken] = useState<string | null>(null);
  const [trainerId, setTrainerId] = useState<string | null>(null);
  
  // Auth state za klijenta (nakon registracije/logina)
  const [loggedInClientId, setLoggedInClientId] = useState<string | null>(null);
  const [clientJwtToken, setClientJwtToken] = useState<string | null>(null);
  
  const [showLogin, setShowLogin] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showIntakeFlow, setShowIntakeFlow] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [showCalculationsSummary, setShowCalculationsSummary] = useState(false);
  const [showMealPlan, setShowMealPlan] = useState(false);
  const [showTrainingGenerator, setShowTrainingGenerator] = useState(false);
  const [showTrainerHome, setShowTrainerHome] = useState(false);
  const [showTrainerClientDetail, setShowTrainerClientDetail] = useState(false);
  const [viewProgramId, setViewProgramId] = useState<string | null>(null);
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
  const [showTrainerWorkoutLog, setShowTrainerWorkoutLog] = useState(false);
  const [workoutLogSession, setWorkoutLogSession] = useState<{
    clientId: string;
    clientName: string;
    sessionId: string;
    sessionName: string;
    programId?: string;
  } | null>(null);
  const [showTrainerProfile, setShowTrainerProfile] = useState(false);
  const [showTrainerProfileEdit, setShowTrainerProfileEdit] = useState(false);
  const [showTrainerRegister, setShowTrainerRegister] = useState(false);
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
  const [intakeFormData, setIntakeFormData] = useState<any>(null);
  const [calculatorResults, setCalculatorResults] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false); // Počinje s false - renderiraj odmah
  const slideAnim = useRef(new Animated.Value(0)).current; // Počinje vidljivo (opacity: 1 kad je slideAnim: 0)
  
  // Generiraj client token - koristi JWT ako postoji, inače legacy format
  // Koristi pravi client_id ako je korisnik ulogiran, inače mock
  const MOCK_CLIENT_ID = "c1234567-89ab-cdef-0123-456789abcdef"; // Mock client UUID (za neulogirane)
  const ACTUAL_CLIENT_ID = loggedInClientId || MOCK_CLIENT_ID;
  // KRITIČNO: Koristi JWT token ako postoji (za ispravnu autentifikaciju)
  const CLIENT_TOKEN = React.useMemo(() => {
    // Ako imamo pravi JWT token, koristi njega
    if (clientJwtToken) {
      console.log('[App] Using JWT token for client:', ACTUAL_CLIENT_ID);
      return clientJwtToken;
    }
    // Fallback na legacy token (samo za neulogirane korisnike)
    const token = typeof btoa !== 'undefined' 
      ? btoa(`${ACTUAL_CLIENT_ID}:${Date.now()}`)
      : "YzEyMzQ1NjctODlhYi1jZGVmLTAxMjMtNDU2Nzg5YWJjZGVmOjE3MzY3MDQ2NzUwNTk=";
    console.log('[App] Using legacy token for:', ACTUAL_CLIENT_ID);
    return token;
  }, [ACTUAL_CLIENT_ID, clientJwtToken]); // Mijenja se kad se promijeni client ID ili JWT token

  // Provjeri je li klijent već povezan s trenerom
  const checkTrainerConnection = useCallback(async () => {
    if (isCheckingConnection) return;
    
    // VAŽNO: Ne provjeravaj povezanost ako korisnik nije ulogiran (koristi se mock ID)
    // Mock ID ne smije imati trenera - samo registrirani klijenti mogu imati trenera
    if (!loggedInClientId) {
      console.log('[App] Skipping trainer connection check - user not logged in');
      setConnectedTrainerId(null);
      setConnectedTrainerName(null);
      return;
    }
    
    setIsCheckingConnection(true);
    
    try {
      // Koristi pravi client_id za provjeru
      const realClientToken = typeof btoa !== 'undefined' 
        ? btoa(`${loggedInClientId}:${Date.now()}`)
        : null;
      
      if (!realClientToken) {
        console.log('[App] Cannot create token for trainer check');
        setIsCheckingConnection(false);
        return;
      }
      
      // Timeout od 5 sekundi da ne blokira aplikaciju
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timeoutId = controller ? setTimeout(() => controller.abort(), 5000) : null;
      
      const response = await fetch(`${API_BASE_URL}/api/client/connect`, {
        headers: { 'Authorization': `Bearer ${realClientToken}` },
        ...(controller && { signal: controller.signal }),
      });
      
      if (timeoutId) clearTimeout(timeoutId);
      
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
      // Ne postavljaj error state - samo ignoriraj
    } finally {
      setIsCheckingConnection(false);
    }
  }, [isCheckingConnection, loggedInClientId]);

  // Učitaj spremljene podatke trenera i stanje aplikacije pri pokretanju
  useEffect(() => {
    const loadSavedData = async () => {
      try {
        console.log('[App] Loading saved data...');
        
        // 0. Učitaj client_id i JWT token ako postoji (iz registracije/logina)
        const savedClientId = await authStorage.getClientId();
        const savedToken = await authStorage.getToken();
        
        if (savedClientId) {
          setLoggedInClientId(savedClientId);
          console.log('[App] Loaded client ID:', savedClientId);
          
          // Učitaj JWT token za klijenta
          if (savedToken) {
            setClientJwtToken(savedToken);
            console.log('[App] Loaded client JWT token');
          }
        }
        
        // 1. Učitaj trener podatke
        const savedTrainerId = await authStorage.getTrainerId();
        const savedTrainerToken = await authStorage.getTrainerToken();
        
        console.log('[App] Checking trainer data:', {
          hasTrainerId: !!savedTrainerId,
          hasTrainerToken: !!savedTrainerToken,
          tokenPreview: savedTrainerToken ? savedTrainerToken.substring(0, 30) + '...' : 'null',
        });
        
        if (savedTrainerId && savedTrainerToken) {
          setTrainerId(savedTrainerId);
          setTrainerToken(savedTrainerToken);
          console.log('[App] Loaded trainer data:', savedTrainerId);
          // Ako je trener, prikaži trainer home
          setShowTrainerHome(true);
          return;
        }
        
        // 2. Učitaj stanje aplikacije za klijente
        const savedState = await appStateStorage.getAppState();
        if (savedState) {
          console.log('[App] Restoring saved state:', savedState.currentScreen);
          
          // Vrati spremljene podatke
          if (savedState.intakeFormData) {
            setIntakeFormData(savedState.intakeFormData);
          }
          if (savedState.calculatorResults) {
            setCalculatorResults(savedState.calculatorResults);
          }
          if (savedState.connectedTrainerId) {
            setConnectedTrainerId(savedState.connectedTrainerId);
            setConnectedTrainerName(savedState.connectedTrainerName || null);
          }
          
          // Vrati na spremljeni screen
          switch (savedState.currentScreen) {
            case 'intakeFlow':
              setShowIntakeFlow(true);
              break;
            case 'calculator':
              setShowIntakeFlow(false);
              setShowCalculator(true);
              break;
            case 'calculationsSummary':
              setShowCalculationsSummary(true);
              break;
            case 'mealPlan':
              setShowMealPlan(true);
              break;
            case 'clientDashboard':
              setShowClientDashboard(true);
              break;
            case 'onboarding':
              // PRESKOČI onboarding ako ima problema - idi direktno na intakeFlow
              console.log('[App] Skipping onboarding, going to intakeFlow');
              setShowIntakeFlow(true);
              break;
            case 'login':
              // Login je tranzicija - vrati na welcome umjesto da zapneš na loginu
              // Korisnik može ponovno kliknuti "Započni"
              console.log('[App] Login state found, showing welcome instead');
              break;
            // 'welcome' je default, ne treba ništa
          }
        }
      } catch (error) {
        console.error('[App] Error loading saved data:', error);
        // Ako ima grešku, jednostavno prikaži welcome screen
      }
    };
    loadSavedData();
  }, []);

  useEffect(() => {
    if (showMealPlan && !connectedTrainerId && !isLoading) {
      // Ne blokiraj render - pozovi asinkrono
      checkTrainerConnection().catch(err => {
        console.error('[App] Error checking trainer connection:', err);
      });
    }
  }, [showMealPlan, isLoading]);

  // Helper funkcija za spremanje stanja aplikacije
  const saveCurrentState = useCallback(async (screen: AppScreen) => {
    await appStateStorage.saveAppState({
      currentScreen: screen,
      intakeFormData,
      calculatorResults,
      connectedTrainerId,
      connectedTrainerName,
      lastUpdated: Date.now(),
    });
    console.log('[App] State saved:', screen);
  }, [intakeFormData, calculatorResults, connectedTrainerId, connectedTrainerName]);

  const handleGetStarted = () => {
    // Smooth transition animacija
    Animated.timing(slideAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start(() => {
      setShowLogin(true);
      saveCurrentState('login');
    });
  };

  const handleLoginSuccess = async () => {
    console.log("Login successful!");
    // Učitaj client_id i JWT token iz storage-a (sprema se u LoginScreen nakon uspješnog logina)
    const savedClientId = await authStorage.getClientId();
    const savedToken = await authStorage.getToken();
    
    if (!savedClientId) {
      console.log('[App] No client ID found, showing intake flow');
      setShowLogin(false);
      setShowIntakeFlow(true);
      saveCurrentState('intakeFlow');
      return;
    }
    
    setLoggedInClientId(savedClientId);
    
    // Postavi JWT token za klijenta
    if (savedToken) {
      setClientJwtToken(savedToken);
      console.log('[App] Client JWT token set');
    }
    
    console.log('[App] Client logged in with ID:', savedClientId);
    
    // Dohvati podatke klijenta iz baze da provjerimo je li intake završen
    try {
      const response = await fetch(`${API_BASE_URL}/api/client/${savedClientId}`);
      const clientData = await response.json();
      
      console.log('[App] Client data from API:', {
        intakeCompleted: clientData.intakeCompleted,
        hasCalculations: clientData.hasCalculations,
        trainerId: clientData.trainer_id,
      });
      
      if (clientData.ok && clientData.intakeCompleted) {
        // Klijent je već prošao intake - idi na dashboard
        console.log('[App] Intake already completed, going to dashboard');
        
        // Postavi podatke iz baze u state (ako postoje)
        if (clientData.calculations) {
          setCalculatorResults({
            bmr: clientData.calculations.bmr,
            tdee: clientData.calculations.tdee,
            targetCalories: clientData.calculations.target_calories,
            protein: clientData.calculations.protein_grams,
            carbs: clientData.calculations.carbs_grams,
            fats: clientData.calculations.fats_grams,
          });
        }
        
        // Postavi intake podatke iz baze
        if (clientData.training_frequency || clientData.activities?.length > 0) {
          setIntakeFormData({
            name: clientData.name,
            email: clientData.email,
            honorific: clientData.honorific,
            age: clientData.age_range,
            weight: { value: clientData.weight_value, unit: clientData.weight_unit },
            height: { value: clientData.height_value, unit: clientData.height_unit },
            trainingFrequency: clientData.training_frequency?.toString(),
            favoriteActivities: clientData.activities || [],
            allergies: clientData.allergies || '',
            healthConditions: clientData.injuries || clientData.health_conditions || '',
            foodPreferences: clientData.food_preferences || '',
            avoidIngredients: clientData.avoid_ingredients || '',
          });
        }
        
        // Provjeri povezanost s trenerom
        if (clientData.trainer_id) {
          setConnectedTrainerId(clientData.trainer_id);
        }
        
        // Idi na dashboard
        setShowLogin(false);
        setShowClientDashboard(true);
        saveCurrentState('clientDashboard');
        return;
      }
      
      // Intake nije završen - prikaži intake flow
      console.log('[App] Intake not completed, showing intake flow');
    } catch (error) {
      console.log('[App] Error fetching client data, showing intake flow:', error);
      // Ako API ne radi, nastavi s intake flow-om (sigurno)
    }
    
    // Provjeri povezanost s trenerom nakon logina
    setTimeout(() => {
      checkTrainerConnection();
    }, 500);
    
    // Preskoči onboarding i idi direktno na intake flow
    setShowLogin(false);
    setShowIntakeFlow(true);
    saveCurrentState('intakeFlow');
  };


  // Onboarding je sada preskočen - ova funkcija nije više potrebna
  // ali je ostavljena za kompatibilnost
  const handleOnboardingComplete = () => {
    console.log("Onboarding complete!");
    setShowOnboarding(false);
    setShowIntakeFlow(true);
    saveCurrentState('intakeFlow');
  };


  const handleIntakeComplete = async (formData: any) => {
    console.log("Intake complete:", formData);
    setIntakeFormData(formData);
    
    // Spremi cilj iz intake forme
    if (formData.goal) {
      await goalStorage.saveGoal(formData.goal);
    }
    
    // Spremi intake podatke lokalno
    await appStateStorage.saveIntakeData(formData);
    
    // Spremi intake podatke u bazu (ako je korisnik ulogiran)
    if (loggedInClientId) {
      try {
        console.log('[App] Saving intake data to database...');
        const updateData: any = {
          clientId: loggedInClientId,
        };
        
        // Osnovni podaci
        if (formData.name) updateData.name = formData.name;
        if (formData.email) updateData.email = formData.email;
        if (formData.honorific) updateData.honorific = formData.honorific;
        if (formData.age) updateData.ageRange = formData.age.toString();
        
        // Fizički podaci
        if (formData.weight?.value) updateData.weight = parseFloat(formData.weight.value);
        if (formData.height?.value) updateData.height = parseFloat(formData.height.value);
        
        // Intake specifični podaci
        if (formData.trainingFrequency) {
          updateData.training_frequency = parseInt(formData.trainingFrequency);
        }
        if (formData.favoriteActivities?.length > 0) {
          updateData.activities = formData.favoriteActivities;
        }
        if (formData.allergies) updateData.allergies = formData.allergies;
        if (formData.healthConditions) {
          updateData.health_conditions = formData.healthConditions;
          updateData.injuries = formData.healthConditions; // Legacy polje
        }
        if (formData.foodPreferences) updateData.food_preferences = formData.foodPreferences;
        if (formData.avoidIngredients) updateData.avoid_ingredients = formData.avoidIngredients;
        
        // Cilj
        if (formData.goal) {
          const goalMap: Record<string, string[]> = {
            'FAT_LOSS': ['lose-fat'],
            'RECOMPOSITION': ['recomp'],
            'MUSCLE_GAIN': ['gain-muscle'],
            'ENDURANCE': ['endurance'],
          };
          updateData.goals = goalMap[formData.goal] || [formData.goal];
        }
        
        const response = await fetch(`${API_BASE_URL}/api/client/update`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updateData),
        });
        
        const result = await response.json();
        if (result.ok) {
          console.log('[App] Intake data saved to database successfully');
        } else {
          console.error('[App] Error saving intake data:', result.message);
        }
      } catch (error) {
        console.error('[App] Error saving intake data to database:', error);
        // Nastavi dalje čak i ako spremanje ne uspije
      }
    }
    
    // Prikaži kalkulatore nakon intake flow-a
    setShowIntakeFlow(false);
    setShowCalculator(true);
    saveCurrentState('calculator');
  };

  const getIntakePreferences = () => {
    if (!intakeFormData) return undefined;
    return {
      allergies: intakeFormData.allergies || '',
      foodPreferences: intakeFormData.foodPreferences || '',
      avoidIngredients: intakeFormData.avoidIngredients || '',
      trainingFrequency: intakeFormData.trainingFrequency || '',
      favoriteActivities: intakeFormData.favoriteActivities || [],
      healthConditions: intakeFormData.healthConditions || '',
    };
  };

  const handleCalculatorComplete = async (results: any) => {
    console.log("Calculator complete:", results);
    setCalculatorResults(results);
    
    // Spremi rezultate kalkulatora lokalno
    await appStateStorage.saveCalculatorResults(results);
    
    // Spremi kalkulacije u bazu (ako je korisnik ulogiran)
    if (loggedInClientId) {
      try {
        console.log('[App] Saving calculator results to database...');
        
        // Mapiraj goal na goal_type
        let goalType = 'maintain';
        if (intakeFormData?.goal) {
          const goalMap: Record<string, string> = {
            'FAT_LOSS': 'lose',
            'MUSCLE_GAIN': 'gain',
            'RECOMPOSITION': 'maintain',
            'ENDURANCE': 'maintain',
          };
          goalType = goalMap[intakeFormData.goal] || 'maintain';
        }
        
        // Osiguraj da svi makronutrijenti imaju vrijednosti (baza ih zahtijeva)
        const targetCalories = results.targetCalories || results.calories || results.tdee || 2000;
        const proteinGrams = results.protein || results.proteinGrams || Math.round(targetCalories * 0.3 / 4); // 30% od kalorija
        const carbsGrams = results.carbs || results.carbsGrams || Math.round(targetCalories * 0.4 / 4); // 40% od kalorija
        const fatsGrams = results.fats || results.fatsGrams || Math.round(targetCalories * 0.3 / 9); // 30% od kalorija
        
        const updateData = {
          clientId: loggedInClientId,
          bmr: results.bmr || 1500,
          tdee: results.tdee || 2000,
          target_calories: targetCalories,
          goal_type: goalType,
          protein_grams: proteinGrams,
          carbs_grams: carbsGrams,
          fats_grams: fatsGrams,
        };
        
        console.log('[App] Update data:', updateData);
        
        const response = await fetch(`${API_BASE_URL}/api/client/update`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updateData),
        });
        
        const result = await response.json();
        if (result.ok) {
          console.log('[App] Calculator results saved to database successfully');
        } else {
          console.error('[App] Error saving calculator results:', result.message);
        }
      } catch (error) {
        console.error('[App] Error saving calculator results to database:', error);
        // Nastavi dalje čak i ako spremanje ne uspije
      }
    }
    
    // Prikaži summary ekran nakon kalkulatora
    setShowCalculator(false);
    setShowCalculationsSummary(true);
    saveCurrentState('calculationsSummary');
  };

  const handleGenerateMealPlan = () => {
    // Prikaži generator prehrane s direktnim kalkulacijama
    setShowCalculationsSummary(false);
    setShowMealPlan(true);
    saveCurrentState('mealPlan');
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

  const handleBackFromIntake = () => {
    setShowIntakeFlow(false);
    setShowLogin(true);
    saveCurrentState('login');
  };

  const handleBackToLogin = () => {
    setShowOnboarding(false);
    setShowIntakeFlow(false);
    setShowLogin(true);
    saveCurrentState('login');
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

  const handleShowTrainerRegister = () => {
    setShowLogin(false);
    setShowTrainerRegister(true);
  };

  const handleTrainerRegisterSuccess = async (trainerData: {
    id: string;
    name: string;
    email: string;
    trainerCode: string;
    accessToken: string;
  }) => {
    // Spremi token i podatke trenera u storage (poseban trainer token)
    await authStorage.saveTrainerToken(trainerData.accessToken);
    await authStorage.saveTrainerId(trainerData.id);
    
    // Postavi state za korištenje u aplikaciji
    setTrainerId(trainerData.id);
    setTrainerToken(trainerData.accessToken);
    
    console.log('[App] Trainer logged in:', trainerData.id, 'token:', trainerData.accessToken.substring(0, 30) + '...');
    
    // Prebaci na trainer home
    setShowTrainerRegister(false);
    setShowTrainerHome(true);
  };

  const handleTrainerRegisterBack = () => {
    setShowTrainerRegister(false);
    setShowLogin(true);
  };

  // Odjava trenera
  const handleTrainerLogout = async () => {
    console.log('[App] Trainer logout');
    
    // Obriši spremljene auth podatke
    await authStorage.clearAuth();
    
    // Resetiraj state
    setTrainerId(null);
    setTrainerToken(null);
    setShowTrainerHome(false);
    setShowLogin(true);
  };

  // Odjava klijenta
  const handleClientLogout = async () => {
    console.log('[App] Client logout');
    
    // Obriši spremljene auth podatke
    await authStorage.clearAuth();
    await appStateStorage.clearAppState();
    
    // Resetiraj SVE screen state-ove na false
    setShowOnboarding(false);
    setShowIntakeFlow(false);
    setShowCalculator(false);
    setShowCalculationsSummary(false);
    setShowMealPlan(false);
    setShowTrainingGenerator(false);
    setShowClientDashboard(false);
    setShowWorkoutSession(false);
    setShowProgressCharts(false);
    setShowConnectTrainer(false);
    setShowTrainerCode(false);
    setShowNotificationSettings(false);
    
    // Resetiraj state varijable
    setConnectedTrainerId(null);
    setConnectedTrainerName(null);
    setIntakeFormData(null);
    setCalculatorResults(null);
    setSelectedSessionId(null);
    setSelectedProgramId(null);
    
    // Postavi login screen
    setShowLogin(true);
    
    console.log('[App] Client logout complete - returning to login');
  };

  const handleTrainerClientPress = (clientId: string) => {
    setSelectedClientId(clientId);
    setShowTrainerHome(false);
    setShowTrainerClientDetail(true);
  };

  const handleAnnualPlanPress = (clientId: string, clientName: string) => {
    // Otvori TrainerProgramBuilderScreen direktno - ima svoju lentu vremena
    setSelectedClientId(clientId);
    setSelectedClientName(clientName);
    setSelectedYear(new Date().getFullYear());
    setSelectedPhaseData(null); // Nema unaprijed definiranu fazu
    setViewProgramId(null); // Resetiraj view mode
    setShowTrainerClientDetail(false);
    setShowTrainingGenerator(true); // Direktno na TrainerProgramBuilderScreen
  };

  const handleViewProgram = (programId: string, clientName: string) => {
    // Otvori TrainerProgramBuilderScreen u view mode za pregled postojećeg programa
    setSelectedClientName(clientName);
    setViewProgramId(programId);
    setSelectedPhaseData(null);
    setShowTrainerClientDetail(false);
    setShowTrainingGenerator(true);
  };

  // Handler za pokretanje workout loga (evidencija treninga)
  const handleStartWorkoutLog = (clientId: string, clientName: string, sessionId: string, sessionName: string, programId?: string) => {
    console.log('[App] Starting workout log for:', clientName, sessionName);
    setWorkoutLogSession({
      clientId,
      clientName,
      sessionId,
      sessionName,
      programId,
    });
    setShowTrainerClientDetail(false);
    setShowTrainerWorkoutLog(true);
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

  // Handler za prikaz kalkulacija iz dashboarda - useCallback za stabilnost
  const handleViewCalculationsFromDashboard = useCallback(() => {
    console.log('[App] handleViewCalculationsFromDashboard called');
    
    // Async operacija wrapped unutar funkcije
    const fetchAndNavigate = async () => {
      // Dohvati kalkulacije iz baze ako nisu postavljene
      if (!calculatorResults && loggedInClientId) {
        try {
          console.log('[App] Fetching calculations from API...');
          const response = await fetch(`${API_BASE_URL}/api/client/${loggedInClientId}`);
          const clientData = await response.json();
          
          console.log('[App] Client data received:', clientData.ok, clientData.calculations ? 'has calculations' : 'no calculations');
          
          if (clientData.ok && clientData.calculations) {
            setCalculatorResults({
              bmr: clientData.calculations.bmr || 1500,
              tdee: clientData.calculations.tdee || 2000,
              targetCalories: clientData.calculations.target_calories || clientData.target_calories || 2000,
              protein: clientData.calculations.protein_grams,
              carbs: clientData.calculations.carbs_grams,
              fats: clientData.calculations.fats_grams,
              goalType: clientData.calculations.goal_type || 'maintain',
              macros: {
                protein: clientData.calculations.protein_grams || 150,
                carbs: clientData.calculations.carbs_grams || 200,
                fats: clientData.calculations.fats_grams || 65,
              },
            });
          } else if (clientData.ok && clientData.target_calories) {
            // Fallback na podatke iz clients tablice
            setCalculatorResults({
              bmr: clientData.bmr || 1500,
              tdee: clientData.tdee || 2000,
              targetCalories: clientData.target_calories || 2000,
              protein: clientData.protein_grams || 150,
              carbs: clientData.carbs_grams || 200,
              fats: clientData.fats_grams || 65,
              goalType: clientData.goal_type || 'maintain',
              macros: {
                protein: clientData.protein_grams || 150,
                carbs: clientData.carbs_grams || 200,
                fats: clientData.fats_grams || 65,
              },
            });
          }
        } catch (error) {
          console.error('[App] Error fetching calculations:', error);
        }
      }
      
      // Prebaci na summary ekran
      setShowClientDashboard(false);
      setShowCalculationsSummary(true);
      saveCurrentState('calculationsSummary');
    };
    
    // Pozovi async funkciju i uhvati eventualne greške
    fetchAndNavigate().catch(err => {
      console.error('[App] fetchAndNavigate error:', err);
      // Ipak navigiraj na summary ekran
      setShowClientDashboard(false);
      setShowCalculationsSummary(true);
    });
  }, [calculatorResults, loggedInClientId, saveCurrentState]);

  // Handler za generiranje plana prehrane iz dashboarda - useCallback za stabilnost
  const handleGenerateMealPlanFromDashboard = useCallback(() => {
    console.log('[App] handleGenerateMealPlanFromDashboard called');
    
    // Async funkcija za dohvaćanje kalkulacija ako nisu postavljene
    const fetchCalculationsAndNavigate = async () => {
      // Ako kalkulacije nisu postavljene, dohvati ih iz baze
      if (!calculatorResults && loggedInClientId) {
        try {
          console.log('[App] Fetching calculations before meal plan...');
          const response = await fetch(`${API_BASE_URL}/api/client/${loggedInClientId}`);
          const clientData = await response.json();
          
          if (clientData.ok && clientData.calculations) {
            setCalculatorResults({
              bmr: clientData.calculations.bmr || 1500,
              tdee: clientData.calculations.tdee || 2000,
              targetCalories: clientData.calculations.target_calories || clientData.target_calories || 2000,
              protein: clientData.calculations.protein_grams,
              carbs: clientData.calculations.carbs_grams,
              fats: clientData.calculations.fats_grams,
              goalType: clientData.calculations.goal_type || 'maintain',
              macros: {
                protein: clientData.calculations.protein_grams || 150,
                carbs: clientData.calculations.carbs_grams || 200,
                fats: clientData.calculations.fats_grams || 65,
              },
            });
          } else if (clientData.ok && clientData.target_calories) {
            // Fallback na podatke iz clients tablice
            setCalculatorResults({
              bmr: clientData.bmr || 1500,
              tdee: clientData.tdee || 2000,
              targetCalories: clientData.target_calories || 2000,
              protein: clientData.protein_grams || 150,
              carbs: clientData.carbs_grams || 200,
              fats: clientData.fats_grams || 65,
              goalType: clientData.goal_type || 'maintain',
              macros: {
                protein: clientData.protein_grams || 150,
                carbs: clientData.carbs_grams || 200,
                fats: clientData.fats_grams || 65,
              },
            });
          } else {
            // Nema kalkulacija - postavi default vrijednosti
            console.log('[App] No calculations found, using defaults');
            setCalculatorResults({
              bmr: 1500,
              tdee: 2000,
              targetCalories: 2000,
              protein: 150,
              carbs: 200,
              fats: 65,
              goalType: 'maintain',
              macros: { protein: 150, carbs: 200, fats: 65 },
            });
          }
        } catch (error) {
          console.error('[App] Error fetching calculations:', error);
          // Postavi default vrijednosti
          setCalculatorResults({
            bmr: 1500,
            tdee: 2000,
            targetCalories: 2000,
            protein: 150,
            carbs: 200,
            fats: 65,
            goalType: 'maintain',
            macros: { protein: 150, carbs: 200, fats: 65 },
          });
        }
      }
      
      // Navigiraj na meal plan
      setShowClientDashboard(false);
      setShowMealPlan(true);
      saveCurrentState('mealPlan');
    };
    
    fetchCalculationsAndNavigate().catch(err => {
      console.error('[App] fetchCalculationsAndNavigate error:', err);
    });
  }, [calculatorResults, loggedInClientId, saveCurrentState]);

  // Handler za view progress
  const handleViewProgressFromDashboard = useCallback(() => {
    console.log('[App] handleViewProgressFromDashboard called');
    setShowClientDashboard(false);
    setShowProgressCharts(true);
  }, []);

  // Handler za settings
  const handleSettingsFromDashboard = useCallback(() => {
    console.log('[App] handleSettingsFromDashboard called');
    setShowClientDashboard(false);
    setShowNotificationSettings(true);
  }, []);

  // Handler za start workout
  const handleStartWorkoutFromDashboard = useCallback((sessionId: string) => {
    console.log('[App] handleStartWorkoutFromDashboard called:', sessionId);
    setSelectedSessionId(sessionId);
    setShowClientDashboard(false);
    setShowWorkoutSession(true);
  }, []);

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

  // DEBUG: Loguj trenutno stanje
  console.log('[App] Render - state:', {
    isLoading,
    showTrainerHome,
    showLogin,
    showIntakeFlow,
    showCalculator,
    showCalculationsSummary,
    showMealPlan,
  });

  // Summary ekran nakon kalkulatora
  if (showCalculationsSummary) {
    // Ako nema kalkulacija, prikaži s default vrijednostima ili vodi na calculator
    const calcs = calculatorResults || {
      bmr: 1500,
      tdee: 2000,
      targetCalories: 2000,
      macros: { protein: 150, carbs: 200, fats: 65 },
      goalType: 'maintain',
    };
    
    return (
      <CalculationsSummaryScreen
        calculations={{
          bmr: calcs.bmr,
          tdee: calcs.tdee,
          targetCalories: calcs.targetCalories,
          macros: calcs.macros,
          goalType: calcs.goalType || 'maintain',
        }}
        onGenerate={handleGenerateMealPlan}
        onBack={() => {
          setShowCalculationsSummary(false);
          // Vrati na dashboard ako je korisnik došao odatle
          if (loggedInClientId) {
            setShowClientDashboard(true);
            saveCurrentState('clientDashboard');
          } else {
            setShowCalculator(true);
            saveCurrentState('calculator');
          }
        }}
      />
    );
  }

  // Manual Mesocycle Builder ekran
  if (showManualBuilder && selectedClientId && selectedProgramId) {
    return (
      <ManualMesocycleBuilderScreen
        programId={selectedProgramId}
        onComplete={(programId: string) => {
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
        authToken={trainerToken || ''}
        clientId={selectedClientId}
        clientName={selectedClientName}
        year={selectedYear}
        onBack={handleBackFromAnnualPlan}
        onGenerateProgram={handleGenerateProgram}
        onGenerateAllPhases={async (cId, phases, onComplete) => {
          console.log('[App] Generating all phases:', phases.length, 'for client:', cId);
          const results: {phaseType: string; phaseName: string; programId: string | null; success: boolean; error?: string}[] = [];
          let previousProgramId: string | null = null;
          
          // Dohvati client podatke da dobijemo gender
          let clientGender: 'male' | 'female' = 'male'; // Default
          try {
            const clientResponse = await fetch(`${API_BASE_URL}/api/trainer/client/${cId}`, {
              headers: {
                'Authorization': `Bearer ${trainerToken || ''}`,
                'Content-Type': 'application/json',
              },
            });
            if (clientResponse.ok) {
              const clientData = await clientResponse.json();
              if (clientData.success && clientData.data?.gender) {
                // Mapiraj gender iz API response (može biti 'male', 'female', 'other')
                const gender = clientData.data.gender;
                clientGender = gender === 'female' ? 'female' : 'male'; // Default na 'male' ako je 'other'
                console.log('[App] Client gender:', clientGender);
              }
            }
          } catch (error) {
            console.error('[App] Error fetching client data for gender:', error);
            // Nastavi s default 'male'
          }
          
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
              
              const requestBody: Record<string, unknown> = {
                clientId: cId, // POPRAVKA: koristi clientId umjesto klijentId
                gender: clientGender, // DODANO: gender parametar
                cilj: cilj,
                razina: 'srednji',
                treninziTjedno: 4, // POPRAVKA: koristi treninziTjedno umjesto frekvencija
                splitTip: 'upper_lower',
                trajanjeTjedana: phase.durationWeeks,
                dostupnaOprema: ['barbell', 'dumbbell', 'cable', 'machine'],
                ...(previousProgramId && { previousProgramId }),
                phaseOrder: i + 1,
                totalPhases: phases.length,
              };
              
              console.log(`[App] Request body:`, JSON.stringify(requestBody));
              
              const response: Response = await fetch(`${API_BASE_URL}/api/training/generate`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${trainerToken || ''}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
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
              
              const data: { success?: boolean; data?: { programId?: string }; error?: string } = await response.json();
              
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
        authToken={trainerToken || ''}
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
        onViewProgram={handleViewProgram}
        onDeleteClient={() => {
          // Nakon brisanja, vrati se na trainer home
          setSelectedClientId(null);
          setSelectedClientName(null);
          setShowTrainerClientDetail(false);
          setShowTrainerHome(true);
        }}
        onStartWorkoutLog={handleStartWorkoutLog}
      />
    );
  }

  // Trainer Workout Log ekran (evidencija treninga)
  if (showTrainerWorkoutLog && workoutLogSession) {
    return (
      <TrainerWorkoutLogScreen
        authToken={trainerToken || ''}
        clientId={workoutLogSession.clientId}
        clientName={workoutLogSession.clientName}
        sessionId={workoutLogSession.sessionId}
        sessionName={workoutLogSession.sessionName}
        programId={workoutLogSession.programId}
        onBack={() => {
          setShowTrainerWorkoutLog(false);
          setWorkoutLogSession(null);
          setShowTrainerClientDetail(true);
        }}
        onComplete={() => {
          setShowTrainerWorkoutLog(false);
          setWorkoutLogSession(null);
          setShowTrainerClientDetail(true);
        }}
      />
    );
  }

  // Add Client ekran
  if (showAddClient) {
    return (
      <AddClientScreen
        authToken={trainerToken || ''}
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
        authToken={trainerToken || ''}
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
          setShowTrainingGenerator(true);
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
        onStartWorkout={handleStartWorkoutFromDashboard}
        onViewProgress={handleViewProgressFromDashboard}
        onSettings={handleSettingsFromDashboard}
        onLogout={handleClientLogout}
        onGenerateMealPlan={handleGenerateMealPlanFromDashboard}
        onViewCalculations={handleViewCalculationsFromDashboard}
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
    // Pripremi intake podatke za slanje treneru
    const preparedIntakeData = intakeFormData ? {
      name: intakeFormData.name || undefined,
      email: intakeFormData.email || undefined,
      honorific: intakeFormData.honorific || undefined,
      age: intakeFormData.age ? parseInt(intakeFormData.age) : undefined,
      weight: intakeFormData.weight?.value ? {
        value: parseFloat(intakeFormData.weight.value),
        unit: intakeFormData.weight.unit || 'kg',
      } : undefined,
      height: intakeFormData.height?.value ? {
        value: parseFloat(intakeFormData.height.value),
        unit: intakeFormData.height.unit || 'cm',
      } : undefined,
      goal: intakeFormData.goal || undefined,
      activities: intakeFormData.favoriteActivities || undefined,
      trainingFrequency: intakeFormData.trainingFrequency || undefined,
      healthConditions: intakeFormData.healthConditions || undefined,
      foodPreferences: intakeFormData.foodPreferences || undefined,
      avoidIngredients: intakeFormData.avoidIngredients || undefined,
      allergies: intakeFormData.allergies || undefined,
    } : undefined;
    
    return (
      <ConnectTrainerScreen
        authToken={CLIENT_TOKEN}
        intakeData={preparedIntakeData}
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
        authToken={trainerToken || ''}
        onBack={handleBackFromTrainerProfileEdit}
        onSaved={handleTrainerProfileSaved}
      />
    );
  }

  // Trainer Code ekran (za trenere)
  if (showTrainerCode) {
    return (
      <TrainerCodeScreen
        authToken={trainerToken || ''}
        onBack={handleBackFromTrainerCode}
      />
    );
  }

  // PRIKAŽI LOADING SCREEN PRIJE SVEGA - osigurava da se uvijek renderira nešto
  // Ako je isLoading, prikaži welcome screen (ne čekaj)
  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }]}>
        <WelcomeScreen onGetStarted={handleGetStarted} />
      </View>
    );
  }

  // Trainer Home ekran (lista klijenata)
  if (showTrainerHome) {
    return (
      <TrainerHomeScreen
        authToken={trainerToken || ''}
        onClientPress={handleTrainerClientPress}
        onNewClient={handleShowAddClient}
        onNewProgram={handleNewProgramFromTrainerHome}
        onShowCode={handleShowTrainerCode}
        onEditProfile={handleShowTrainerProfileEdit}
        onLogout={handleTrainerLogout}
      />
    );
  }

  // Generator treninga ekran
  if (showTrainingGenerator) {
    // Provjeri da li dolazi iz annual plan (ima phaseData), iz view mode, ili iz trainer home
    const onCancelHandler = viewProgramId
      ? () => {
          // View mode - vrati se na client detail
          setViewProgramId(null);
          setShowTrainingGenerator(false);
          setShowTrainerClientDetail(true);
        }
      : selectedPhaseData 
        ? () => {
            setSelectedPhaseData(null);
            setShowTrainingGenerator(false);
            setShowAnnualPlanBuilder(true);
          }
        : (showTrainerHome ? handleBackFromTrainingToTrainerHome : handleBackToMealPlan);
    
    return (
      <TrainerProgramBuilderScreen
        authToken={trainerToken || ''}
        clientId={selectedClientId || undefined}
        phaseData={selectedPhaseData || undefined}
        viewProgramId={viewProgramId || undefined}
        onComplete={(programId) => {
          setSelectedPhaseData(null);
          setViewProgramId(null);
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
          age: intakeFormData?.age ? parseInt(intakeFormData.age) : undefined,
          gender: intakeFormData?.honorific === 'mr' ? 'male' : 'female',
        }}
      />
    );
  }

  // Ako još nije login, prikaži welcome screen - bez animacije za pouzdanost
  if (!showLogin && !showOnboarding && !showIntakeFlow && !showTrainerRegister && !showTrainerHome && !showCalculator && !showCalculationsSummary && !showMealPlan && !showClientDashboard) {
    return (
      <View style={styles.container}>
        <WelcomeScreen onGetStarted={handleGetStarted} />
      </View>
    );
  }

  // Intake flow ekran (uključuje i odabir cilja)
  if (showIntakeFlow) {
    return <IntakeFlowScreen onComplete={handleIntakeComplete} onBack={handleBackFromIntake} onLogout={handleClientLogout} />;
  }

  // Onboarding ekran nakon login-a
  if (showOnboarding) {
    return <OnboardingScreen onComplete={handleOnboardingComplete} onBack={handleBackToLogin} />;
  }

  // Trainer registracija
  if (showTrainerRegister) {
    return (
      <TrainerRegisterScreen
        onRegisterSuccess={handleTrainerRegisterSuccess}
        onBack={handleTrainerRegisterBack}
      />
    );
  }

  // Login ekran - bez animacije da bude uvijek vidljiv
  if (showLogin) {
    return (
      <View style={styles.container}>
        <LoginScreen 
          onLoginSuccess={handleLoginSuccess} 
          onBack={handleBackToWelcome} 
          onTrainerRegister={handleShowTrainerRegister}
          onTrainerLoginSuccess={handleTrainerRegisterSuccess}
        />
      </View>
    );
  }

  // Fallback - ako ništa nije aktivno, prikaži WelcomeScreen
  return (
    <View style={styles.container}>
      <WelcomeScreen onGetStarted={handleGetStarted} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
