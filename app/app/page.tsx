"use client";

import { useEffect, useState, useMemo, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import clsx from "clsx";
import type { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { calculateBMR, calculateTDEE, calculateTargetCalories, calculateMacros, determineGoalType, determineActivityLevel, type Gender, type ActivityLevel, type GoalType } from "@/lib/calculations";
import { healthyFoods, generateMealPlan, type Food } from "@/lib/foods";
import { generateTrainingPlan, type TrainingPlan, type TrainingSplit, type TrainingFrequency as TrainingPlanFrequency, type TrainingType } from "@/lib/training-plans";
import type { WeeklyPlan, WeeklyDay } from "@/lib/services/proMealPlanGenerator";
import { useSlides, type SlideId } from "./slide-context";
import FAQRotation from "./components/FAQRotation";
import AIChat from "./components/AIChat";
import PortfolioModal from "./components/PortfolioModal";
import LoginSlideContent from "./components/LoginSlideContent";
import EducationalOnboarding from "./components/EducationalOnboarding";
import EducationalSlide from "./components/EducationalSlide";
import EducationalWizard from "./components/EducationalWizard";
import MealPlanWelcomeScreen from "./components/MealPlanWelcomeScreen";
import CalculatorScreen, { CalcCard, CalcInput, CalcSelect, CalcButton, CalcResult, CalcInfoCard } from "./components/CalculatorScreen";
import CalcFAQRotation from "./components/CalcFAQRotation";
import HonorificSlide from "./components/HonorificSlide";

// ============================================
// DEBUG TEST FLAG (samo za development)
// ============================================
const ENABLE_MEAL_PLAN_DEBUG_TESTS = false; // set to false to disable
import {
  activityOptions,
  ageOptions,
  goalOptions,
  heightUnits,
  honorificOptions,
  weightUnits,
  trainingFrequencyOptions,
  trainingDurationOptions,
  trainingLocationOptions,
  equipmentOptions,
  experienceLevelOptions,
  mealFrequencyOptions,
  dietTypeOptions,
  biggestChallengeOptions,
  type ActivityPreference,
  type AgeBucket,
  type GoalPreference,
  type HeightUnit,
  type Honorific,
  type WeightUnit,
  type TrainingFrequency,
  type TrainingDuration,
  type TrainingLocation,
  type EquipmentPreference,
  type ExperienceLevel,
  type MealFrequency,
  type DietType,
  type BiggestChallenge,
} from "@/lib/intake-options";
import { commonQuestions } from "@/lib/common-questions";
import type { IntakePayload } from "@/lib/intake-schema";
import { runTestScenarios } from "@/lib/services/debugTestScenarios";

const slideOrder: SlideId[] = [
  "login",
  "intro",
  "honorific",
  "age",
  "weight",
  "height",
  "activities",
  "goals",
  "training-frequency",
  "experience",
  "meal-frequency",
  "allergies",
  "diet-type",
  "sleep",
  "injuries",
  "biggest-challenge",
  "nutrition",
  "calculators-intro",
  "bmr-calc",
  "tdee-calc",
  "target-calc",
  "macros",
  "contact",
  "meals",
  "training",
  "chat",
];

type IntakeFormState = {
  honorific: Honorific | "";
  ageRange: AgeBucket | "";
  weight: { value: string; unit: WeightUnit };
  height: { value: string; unit: HeightUnit };
  activities: ActivityPreference[];
  otherActivities: string;
  goals: GoalPreference[];
  otherGoals: string;
  trainingFrequency: TrainingFrequency | "";
  trainingDuration: TrainingDuration | "";
  trainingLocation: TrainingLocation | "";
  equipment: EquipmentPreference[];
  experience: ExperienceLevel | "";
  mealFrequency: MealFrequency | "";
  allergies: string;
  avoidIngredients: string;
  foodPreferences: string;
  dietType: DietType | "";
  otherDietType: string;
  sleepHours: string;
  injuries: string;
  biggestChallenge: BiggestChallenge | "";
  otherChallenge: string;
  dietCleanliness: number;
  name: string;
  email: string;
  phone: string;
  notes: string;
};

const initialIntakeForm: IntakeFormState = {
  honorific: "",
  ageRange: "",
  weight: { value: "", unit: "kg" },
  height: { value: "", unit: "cm" },
  activities: [],
  otherActivities: "",
  goals: [],
  otherGoals: "",
  trainingFrequency: "",
  trainingDuration: "",
  trainingLocation: "",
  equipment: [],
  experience: "",
  mealFrequency: "",
  allergies: "",
  avoidIngredients: "",
  foodPreferences: "",
  dietType: "",
  otherDietType: "",
  sleepHours: "",
  injuries: "",
  biggestChallenge: "",
  otherChallenge: "",
  dietCleanliness: 50,
  name: "",
  email: "",
  phone: "",
  notes: "",
};


// Olimpijska dizanja - weightlifting slike
const URBAN_SPORTS_IMAGES = [
  "https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=1920&q=80", // Olympic lift
  "https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=1920&q=80", // Snatch
  "https://images.unsplash.com/photo-1533681904393-9ab6ebd60571?w=1920&q=80", // Clean and jerk
  "https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=1920&q=80", // Barbell lift
  "https://images.unsplash.com/photo-1517963879433-6ad2b056d712?w=1920&q=80", // Weightlifting
  "https://images.unsplash.com/photo-1605296867304-46d5465a13f1?w=1920&q=80", // Olympic barbell
];

// ============================================
// PASSWORD PROTECTION SCREEN
// ============================================
const PREVIEW_PASSWORD = "corpex2024"; // Lozinka za pristup

function PasswordGate({ onSuccess }: { onSuccess: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const password = inputRef.current?.value || "";
    if (password === PREVIEW_PASSWORD) {
      sessionStorage.setItem("corpex_auth", "true");
      onSuccess();
    } else {
      setError(true);
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  };

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center z-[9999]">
      {/* Background image */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-30"
        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1920&h=1080&fit=crop&q=80')" }}
      />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`relative z-10 bg-zinc-900/90 backdrop-blur-xl p-8 rounded-2xl border border-zinc-700/50 max-w-md w-full mx-4 ${shake ? "animate-shake" : ""}`}
        style={{ animation: shake ? "shake 0.5s ease-in-out" : "none" }}
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: "var(--font-montserrat), sans-serif" }}>
            CORP<span className="text-purple-400">EX</span>
          </h1>
          <p className="text-zinc-400 text-sm">Preview verzija - zaštićeno lozinkom</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              ref={inputRef}
              type="password"
              name="password"
              onChange={() => setError(false)}
              placeholder="Unesite lozinku"
              className={`w-full px-4 py-3 bg-zinc-800/50 border ${error ? "border-red-500" : "border-zinc-600"} rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-colors`}
              autoFocus
              autoComplete="off"
            />
            {error && <p className="text-red-400 text-sm mt-2">Pogrešna lozinka</p>}
          </div>
          
          <button
            type="submit"
            className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-xl transition-colors"
          >
            Pristupi
          </button>
        </form>
        
        <p className="text-zinc-500 text-xs text-center mt-6">
          © 2024 CORPEX • Sva prava pridržana
        </p>
      </motion.div>
      
      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }
      `}</style>
    </div>
  );
}

function AppDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // TEST MODE: Dodaj ?test=true na URL da preskočiš login
  const isTestMode = searchParams.get("test") === "true";
  
  const [clientData, setClientData] = useState<any>(null);
  const [currentSlide, setCurrentSlide] = useState(isTestMode ? 1 : 0); // 1 = intro (skip login)
  const [direction, setDirection] = useState(0); // -1 for left, 1 for right
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  const [showPortfolio, setShowPortfolio] = useState(false);
  const [userInitials, setUserInitials] = useState<string>("");
  const [bgImageIndex, setBgImageIndex] = useState(0);
  
  // Rotiraj pozadinske slike svakih 8 sekundi
  useEffect(() => {
    const interval = setInterval(() => {
      setBgImageIndex((prev) => (prev + 1) % URBAN_SPORTS_IMAGES.length);
    }, 8000);
    return () => clearInterval(interval);
  }, []);
  const [portfolioData, setPortfolioData] = useState<any>(null);
  
  // State za kalkulatore
  const [showBMRCalc, setShowBMRCalc] = useState(false);
  const [showTDEECalc, setShowTDEECalc] = useState(false);
  const [showTargetCalc, setShowTargetCalc] = useState(false);
  const [showMacrosCalc, setShowMacrosCalc] = useState(false);
  
  // Status kvačica za svaki slide
  const [bmrConfirmed, setBMRConfirmed] = useState(false);
  const [tdeeConfirmed, setTDEEConfirmed] = useState(false);
  const [targetConfirmed, setTargetConfirmed] = useState(false);
  const [macrosConfirmed, setMacrosConfirmed] = useState(false);
  
  // Plan prehrane
  const [mealPlanPreference, setMealPlanPreference] = useState<"sweet" | "savory">("sweet");
  const [generatedMealPlan, setGeneratedMealPlan] = useState<any>(null);
  const [showMealPlan, setShowMealPlan] = useState(false);
  const [generatingMealPlan, setGeneratingMealPlan] = useState(false);
  const [mealPlanError, setMealPlanError] = useState<string | null>(null);
  // Tjedni plan prehrane
  const [weeklyMealPlan, setWeeklyMealPlan] = useState<any>(null);
  const [generatingWeeklyPlan, setGeneratingWeeklyPlan] = useState(false);
  const [weeklyPlanError, setWeeklyPlanError] = useState<string | null>(null);
  
  // DEMO jelovnik za test verziju
  const demoWeeklyMealPlan = useMemo(() => ({
    weekStartDate: new Date().toISOString(),
    weeklyAverage: {
      calories: 2150,
      protein: 145,
      carbs: 220,
      fat: 72,
      deviation: { calories: 3.2, protein: 2.8, carbs: 4.1, fat: 3.5, total: 3.4 }
    },
    days: [
      {
        date: new Date().toISOString(),
        total: { calories: 2180, protein: 148, carbs: 225, fat: 70 },
        meals: {
          breakfast: { name: "Zobena kaša s bananom i orasima", calories: 450, protein: 15, carbs: 65, fat: 18, ingredients: ["zobene pahuljice", "banana", "orasi", "med", "mlijeko"] },
          lunch: { name: "Pileća prsa s riže i povrćem", calories: 650, protein: 52, carbs: 60, fat: 18, ingredients: ["pileća prsa", "smeđa riža", "brokula", "mrkva", "maslinovo ulje"] },
          dinner: { name: "Losos s batatom i špinatom", calories: 580, protein: 45, carbs: 45, fat: 24, ingredients: ["losos", "batat", "špinat", "limun", "maslinovo ulje"] },
          snack: { name: "Grčki jogurt s bobičastim voćem", calories: 280, protein: 22, carbs: 35, fat: 8, ingredients: ["grčki jogurt", "borovnice", "maline", "med"] }
        }
      },
      {
        date: new Date(Date.now() + 86400000).toISOString(),
        total: { calories: 2120, protein: 142, carbs: 218, fat: 74 },
        meals: {
          breakfast: { name: "Kajgana s povrćem i tost", calories: 420, protein: 24, carbs: 35, fat: 22, ingredients: ["jaja", "paprika", "rajčica", "integralni kruh"] },
          lunch: { name: "Tuna salata s kvinojom", calories: 580, protein: 48, carbs: 45, fat: 22, ingredients: ["tuna", "kvinoja", "krastavac", "rajčica", "masline"] },
          dinner: { name: "Puretina s povrćem na žaru", calories: 520, protein: 48, carbs: 32, fat: 22, ingredients: ["pureća prsa", "tikvice", "patlidžan", "paprika"] },
          snack: { name: "Smoothie od banane i kikirikija", calories: 320, protein: 18, carbs: 42, fat: 12, ingredients: ["banana", "kikiriki maslac", "mlijeko", "med"] }
        }
      },
      {
        date: new Date(Date.now() + 172800000).toISOString(),
        total: { calories: 2200, protein: 150, carbs: 230, fat: 68 },
        meals: {
          breakfast: { name: "Smoothie bowl s granolom", calories: 480, protein: 18, carbs: 72, fat: 14, ingredients: ["banana", "bobičasto voće", "granola", "chia sjemenke"] },
          lunch: { name: "Junetina s krumpirom i salatom", calories: 680, protein: 55, carbs: 58, fat: 24, ingredients: ["juneći file", "mladi krumpir", "zelena salata", "rajčica"] },
          dinner: { name: "Piletina u curry umaku s rižom", calories: 620, protein: 48, carbs: 65, fat: 18, ingredients: ["pileće meso", "kokosovo mlijeko", "curry", "basmati riža"] },
          snack: { name: "Cottage sir s voćem", calories: 250, protein: 28, carbs: 22, fat: 6, ingredients: ["cottage sir", "ananas", "breskva"] }
        }
      },
      {
        date: new Date(Date.now() + 259200000).toISOString(),
        total: { calories: 2150, protein: 145, carbs: 220, fat: 72 },
        meals: {
          breakfast: { name: "Palačinke od zobenih s voćem", calories: 450, protein: 16, carbs: 68, fat: 14, ingredients: ["zobene pahuljice", "jaja", "banana", "jagode"] },
          lunch: { name: "Rižoto s piletinom i gljivama", calories: 620, protein: 45, carbs: 72, fat: 18, ingredients: ["arborio riža", "pileća prsa", "šampinjoni", "parmezan"] },
          dinner: { name: "Bijela riba s povrćem na pari", calories: 480, protein: 52, carbs: 28, fat: 18, ingredients: ["oslić", "brokula", "cvjetača", "limun"] },
          snack: { name: "Proteinski shake", calories: 320, protein: 32, carbs: 28, fat: 8, ingredients: ["whey protein", "banana", "mlijeko"] }
        }
      },
      {
        date: new Date(Date.now() + 345600000).toISOString(),
        total: { calories: 2180, protein: 148, carbs: 225, fat: 70 },
        meals: {
          breakfast: { name: "Avokado tost s jajima", calories: 480, protein: 22, carbs: 38, fat: 28, ingredients: ["integralni kruh", "avokado", "jaja", "rajčica"] },
          lunch: { name: "Bowl s piletinom i povrćem", calories: 650, protein: 52, carbs: 62, fat: 20, ingredients: ["pileća prsa", "smeđa riža", "edamame", "avokado", "sezam"] },
          dinner: { name: "Tjestenina s tunom i povrćem", calories: 580, protein: 42, carbs: 68, fat: 16, ingredients: ["integralna tjestenina", "tuna", "rajčica", "masline"] },
          snack: { name: "Orašasti mix s tamnom čokoladom", calories: 280, protein: 8, carbs: 22, fat: 20, ingredients: ["bademi", "orasi", "tamna čokolada"] }
        }
      },
      {
        date: new Date(Date.now() + 432000000).toISOString(),
        total: { calories: 2100, protein: 140, carbs: 215, fat: 75 },
        meals: {
          breakfast: { name: "Smoothie s proteinima", calories: 420, protein: 35, carbs: 48, fat: 12, ingredients: ["whey protein", "banana", "zobene", "maslac od badema"] },
          lunch: { name: "Biftek s povrćem i krumpirom", calories: 720, protein: 55, carbs: 52, fat: 32, ingredients: ["biftek", "pečeni krumpir", "šparoge", "maslinovo ulje"] },
          dinner: { name: "Salata s kozicama", calories: 450, protein: 38, carbs: 25, fat: 24, ingredients: ["kozice", "avokado", "rajčica", "rukola", "feta"] },
          snack: { name: "Voćna salata s jogurtom", calories: 220, protein: 12, carbs: 35, fat: 4, ingredients: ["jabuka", "naranča", "grožđe", "grčki jogurt"] }
        }
      },
      {
        date: new Date(Date.now() + 518400000).toISOString(),
        total: { calories: 2200, protein: 150, carbs: 228, fat: 70 },
        meals: {
          breakfast: { name: "Fritata s povrćem", calories: 450, protein: 28, carbs: 25, fat: 28, ingredients: ["jaja", "špinat", "paprika", "luk", "sir"] },
          lunch: { name: "Piletina na žaru s kuskusom", calories: 620, protein: 52, carbs: 58, fat: 18, ingredients: ["pileća prsa", "kuskus", "paprika", "tikvice"] },
          dinner: { name: "Curry od slanutka s rižom", calories: 580, protein: 22, carbs: 85, fat: 18, ingredients: ["slanutk", "curry pasta", "kokosovo mlijeko", "riža"] },
          snack: { name: "Hummus s povrćem", calories: 280, protein: 10, carbs: 32, fat: 14, ingredients: ["hummus", "mrkva", "krastavac", "paprika"] }
        }
      }
    ]
  }), []);
  
  // Plan treninga
  const [trainingSplit, setTrainingSplit] = useState<TrainingSplit>("push-pull-legs");
  const [trainingFrequency, setTrainingFrequency] = useState<TrainingPlanFrequency>("3-days");
  const [trainingType, setTrainingType] = useState<TrainingType>("gym");
  const [trainingGender, setTrainingGender] = useState<Gender>("male");
  const [generatedTrainingPlan, setGeneratedTrainingPlan] = useState<TrainingPlan | null>(null);
  const [showTrainingPlan, setShowTrainingPlan] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState<number | null>(null);
  const [showSlideMenu, setShowSlideMenu] = useState(false);
  
  // State za intake formu
  const [intakeForm, setIntakeForm] = useState<IntakeFormState>(initialIntakeForm);
  const [isSubmittingIntake, setIsSubmittingIntake] = useState(false);
  const [intakeSubmitted, setIntakeSubmitted] = useState(false);
  const [finalDataSubmitted, setFinalDataSubmitted] = useState(false);
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);
  const [preferencesSaved, setPreferencesSaved] = useState(false);
  const [isSubmittingFinalData, setIsSubmittingFinalData] = useState(false);
  const [finalMacros, setFinalMacros] = useState<{
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  } | null>(null);
  
  // State za educational onboarding
  const [showEducationalOnboarding, setShowEducationalOnboarding] = useState(false);
  const [educationalOnboardingCompleted, setEducationalOnboardingCompleted] = useState(false);
  
  // Funkcije za intake formu
  const updateIntakeForm = <K extends keyof IntakeFormState>(key: K, value: IntakeFormState[K]) => {
    setIntakeForm((prev) => ({ ...prev, [key]: value }));
  };

  const toggleIntakeArrayValue = (key: "activities" | "goals" | "equipment", value: string) => {
    setIntakeForm((prev) => {
      const list = prev[key].includes(value as never)
        ? prev[key].filter((item) => item !== value)
        : [...prev[key], value as never];
      return { ...prev, [key]: list };
    });
  };

  const submitIntake = async () => {
    if (isSubmittingIntake) return;
    setIsSubmittingIntake(true);

    const clientId = localStorage.getItem("clientId");
    if (!clientId) {
      alert("Niste prijavljeni. Molimo se prijavite prvo.");
      setIsSubmittingIntake(false);
      return;
    }

    const payload: IntakePayload = {
      name: intakeForm.name.trim() || "", // Opcionalno - može biti prazno
      email: intakeForm.email.trim() || "", // Opcionalno - može biti prazno
      phone: intakeForm.phone.trim() || "", // Opcionalno - može biti prazno
      honorific: intakeForm.honorific || "other",
      ageRange: intakeForm.ageRange || "other",
      weight: {
        value: parseFloat(intakeForm.weight.value),
        unit: intakeForm.weight.unit,
      },
      height: {
        value: parseFloat(intakeForm.height.value),
        unit: intakeForm.height.unit,
      },
      activities: intakeForm.activities,
      goals: intakeForm.goals,
      dietCleanliness: intakeForm.dietCleanliness,
      otherActivities: intakeForm.otherActivities.trim() || undefined,
      otherGoals: intakeForm.otherGoals.trim() || undefined,
      notes: intakeForm.notes.trim() || undefined,
      // Nova polja
      trainingFrequency: intakeForm.trainingFrequency || undefined,
      trainingDuration: intakeForm.trainingDuration || undefined,
      trainingLocation: intakeForm.trainingLocation || undefined,
      equipment: intakeForm.equipment.length > 0 ? intakeForm.equipment : undefined,
      experience: intakeForm.experience || undefined,
      mealFrequency: intakeForm.mealFrequency || undefined,
      allergies: intakeForm.allergies.trim() || undefined,
      avoidIngredients: intakeForm.avoidIngredients.trim() || undefined,
      foodPreferences: intakeForm.foodPreferences.trim() || undefined,
      dietType: intakeForm.dietType || undefined,
      otherDietType: intakeForm.otherDietType.trim() || undefined,
      sleepHours: intakeForm.sleepHours ? parseFloat(intakeForm.sleepHours) : undefined,
      injuries: intakeForm.injuries.trim() || undefined,
      biggestChallenge: intakeForm.biggestChallenge || undefined,
      otherChallenge: intakeForm.otherChallenge.trim() || undefined,
    };

    try {
      const response = await fetch("/api/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.ok && data.clientId) {
        localStorage.setItem("clientId", data.clientId);
        setClientData({ name: intakeForm.name });
        
        // Automatski izračunaj BMR, TDEE, target calories i makroe
        try {
          // Konvertuj weight i height u kg i cm
          let weightKg = payload.weight.value;
          if (payload.weight.unit === "lb") {
            weightKg = weightKg * 0.453592; // lb to kg
          }
          
          let heightCm = payload.height.value;
          if (payload.height.unit === "in") {
            heightCm = heightCm * 2.54; // inch to cm
          }
          
          // Odredi gender iz honorific (mr = male, mrs/ms = female, other = default female)
          const gender: Gender = payload.honorific === "mr" ? "male" : "female";
          
          // Odredi age iz ageRange (koristi srednju vrijednost)
          let age = 30; // default
          if (payload.ageRange && payload.ageRange !== "other") {
            const [min, max] = payload.ageRange.split("-").map(Number);
            if (min && max) {
              age = Math.floor((min + max) / 2);
            } else if (payload.ageRange.startsWith("70")) {
              age = 75;
            } else if (payload.ageRange.startsWith("10")) {
              age = 15;
            }
          }
          
          // Izračunaj BMR, TDEE, target calories i makroe
          const activityLevel = determineActivityLevel(payload.activities);
          const bmr = calculateBMR(weightKg, heightCm, age, gender);
          const tdee = calculateTDEE(bmr, activityLevel);
          const goalType = determineGoalType(payload.goals);
          const targetCalories = calculateTargetCalories(tdee, goalType);
          const macros = calculateMacros(targetCalories, goalType, weightKg);
          
          // Spremi kalkulacije u localStorage i Supabase
          try {
            const { saveUserCalculationsLocal } = await import("@/lib/utils/userCalculationsLocal");
            const calcData = {
              totalCalories: targetCalories,
              proteinGrams: macros.protein,
              carbGrams: macros.carbs,
              fatGrams: macros.fats,
              bmr,
              tdee,
              goalType,
              activityLevel,
            };
            console.log("📥 Spremam kalkulacije", calcData);
            await saveUserCalculationsLocal(calcData);
            console.log("✅ Spremljeno u localStorage i Supabase");
          } catch (newFormatError) {
            console.warn("Error saving calculations:", newFormatError);
          }

          // Spremi izračune (legacy format za kompatibilnost)
          const calculationsResponse = await fetch("/api/calculations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              clientId: data.clientId,
              bmr,
              tdee,
              targetCalories,
              goalType,
              macros,
              activityLevel,
            }),
          });

          // Spremi sve podatke iz slajdova lokalno
          const userDataResponse = await fetch("/api/user-data", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              clientId: data.clientId,
              gender: payload.honorific === "mr" ? "male" : "female",
              age: age,
              weight: weightKg,
              height: heightCm,
              calculations: {
                bmr,
                tdee,
                targetCalories,
                goalType,
                macros,
                activityLevel,
              },
              goals: payload.goals,
              activities: payload.activities,
              allergies: (() => {
                // Kombiniraj sva tri polja u format koji generator razumije
                const parts: string[] = [];
                if (payload.allergies?.trim()) {
                  parts.push(`alergije: ${payload.allergies.trim()}`);
                }
                if (payload.avoidIngredients?.trim()) {
                  parts.push(`ne želim: ${payload.avoidIngredients.trim()}`);
                }
                if (payload.foodPreferences?.trim()) {
                  parts.push(`preferiram: ${payload.foodPreferences.trim()}`);
                }
                return parts.length > 0 ? [parts.join(". ")] : [];
              })(),
              dietaryRestrictions: payload.dietType ? [payload.dietType] : [],
              injuries: payload.injuries ? [payload.injuries] : [],
              mealPreferences: {
                mealCount: payload.mealFrequency ? parseInt(payload.mealFrequency) : 3,
              },
              training: {
                frequency: payload.trainingFrequency || "",
                duration: payload.trainingDuration || "",
                location: payload.trainingLocation || "",
                type: "",
                split: "",
              },
            }),
          });
          
          const calculationsData = await calculationsResponse.json();
          
          if (calculationsResponse.ok && calculationsData.ok) {
            console.log("✅ Izračuni spremljeni u Supabase");
            
            // Generiraj plan prehrane
            const mealPlan = generateMealPlan(
              targetCalories,
              macros.protein,
              macros.carbs,
              macros.fats,
              7
            );
            
            // Spremi plan prehrane u Supabase
            const mealsResponse = await fetch("/api/meals", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                clientId: data.clientId,
                meals: mealPlan,
              }),
            });
            
            const mealsData = await mealsResponse.json();
            if (mealsResponse.ok && mealsData.ok) {
              console.log("✅ Plan prehrane spremljen u Supabase");
            } else {
              console.error("❌ Greška pri spremanju plana prehrane:", mealsData.message);
            }
            
            // Generiraj i spremi plan treninga u Supabase
            const trainingResponse = await fetch("/api/training/generate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                clientId: data.clientId,
              }),
            });
            
            const trainingData = await trainingResponse.json();
            if (trainingResponse.ok && trainingData.ok) {
              console.log("✅ Plan treninga spremljen u Supabase");
            } else {
              console.error("❌ Greška pri spremanju plana treninga:", trainingData.message);
            }
            
            // Prikaži success poruku
            setIntakeSubmitted(true);
            
            // Preusmjeri korisnika na prikaz prehrane i treninga nakon 2 sekunde
            setTimeout(() => {
        const calculatorsIntroIndex = slideOrder.indexOf("calculators-intro");
        if (calculatorsIntroIndex !== -1) {
          setCurrentSlide(calculatorsIntroIndex);
          localStorage.setItem("appCurrentSlide", calculatorsIntroIndex.toString());
        }
            }, 2000);
          } else {
            console.error("❌ Greška pri spremanju izračuna:", calculationsData.message);
            // Ipak prikaži success poruku i preusmjeri korisnika
            setIntakeSubmitted(true);
            setTimeout(() => {
              const calculatorsIntroIndex = slideOrder.indexOf("calculators-intro");
              if (calculatorsIntroIndex !== -1) {
                setCurrentSlide(calculatorsIntroIndex);
                localStorage.setItem("appCurrentSlide", calculatorsIntroIndex.toString());
              }
            }, 2000);
          }
        } catch (calcError) {
          console.error("Error calculating and generating plans:", calcError);
          // Ipak prikaži success poruku i preusmjeri korisnika čak i ako izračuni ne uspiju
          setIntakeSubmitted(true);
          setTimeout(() => {
            const calculatorsIntroIndex = slideOrder.indexOf("calculators-intro");
            if (calculatorsIntroIndex !== -1) {
              setCurrentSlide(calculatorsIntroIndex);
              localStorage.setItem("appCurrentSlide", calculatorsIntroIndex.toString());
            }
          }, 2000);
        }
      } else {
        // Ako intake nije uspio, ipak prikaži poruku
        setIntakeSubmitted(true);
        setTimeout(() => {
          const calculatorsIntroIndex = slideOrder.indexOf("calculators-intro");
          if (calculatorsIntroIndex !== -1) {
            setCurrentSlide(calculatorsIntroIndex);
            localStorage.setItem("appCurrentSlide", calculatorsIntroIndex.toString());
          }
        }, 2000);
      }
    } catch (error) {
      console.error("Error submitting intake:", error);
      // Ipak prikaži success poruku
      setIntakeSubmitted(true);
      setTimeout(() => {
        const calculatorsIntroIndex = slideOrder.indexOf("calculators-intro");
        if (calculatorsIntroIndex !== -1) {
          setCurrentSlide(calculatorsIntroIndex);
          localStorage.setItem("appCurrentSlide", calculatorsIntroIndex.toString());
        }
      }, 2000);
    } finally {
      setIsSubmittingIntake(false);
    }
  };

  // Funkcija za spremanje alergija i preferencija
  const savePreferences = async () => {
    if (isSavingPreferences) return;
    setIsSavingPreferences(true);
    setPreferencesSaved(false);

    const clientId = localStorage.getItem("clientId");
    if (!clientId) {
      alert("Niste prijavljeni. Molimo se prijavite prvo.");
      setIsSavingPreferences(false);
      return;
    }

    try {
      // Kombiniraj sva tri polja u format koji generator razumije
      const parts: string[] = [];
      if (intakeForm.allergies?.trim()) {
        parts.push(`alergije: ${intakeForm.allergies.trim()}`);
      }
      if (intakeForm.avoidIngredients?.trim()) {
        parts.push(`ne želim: ${intakeForm.avoidIngredients.trim()}`);
      }
      if (intakeForm.foodPreferences?.trim()) {
        parts.push(`preferiram: ${intakeForm.foodPreferences.trim()}`);
      }
      const combinedAllergies = parts.length > 0 ? parts.join(". ") : null;

      const response = await fetch("/api/client/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          allergies: combinedAllergies,
        }),
      });

      const data = await response.json();
      if (response.ok && data.ok) {
        setPreferencesSaved(true);
        console.log("✅ Alergije i preferencije spremljene!");
        setTimeout(() => {
          setPreferencesSaved(false);
        }, 3000);
      } else {
        const errorMessage = data.message || "Nepoznata greška";
        console.error("❌ Greška pri spremanju preferencija:", errorMessage);
        alert(`Greška pri spremanju preferencija: ${errorMessage}`);
      }
    } catch (error) {
      console.error("❌ Error saving preferences:", error);
      const errorMessage = error instanceof Error ? error.message : "Nepoznata greška";
      alert(`Greška pri spremanju preferencija: ${errorMessage}`);
    } finally {
      setIsSavingPreferences(false);
    }
  };

  // Funkcija za spremanje finalnih podataka (kalkulacije + intake) u clients tablicu
  const submitFinalData = async () => {
    if (isSubmittingFinalData) return;
    setIsSubmittingFinalData(true);

    const clientId = localStorage.getItem("clientId");
    if (!clientId) {
      alert("Niste prijavljeni. Molimo se prijavite prvo.");
      setIsSubmittingFinalData(false);
      return;
    }

    // Provjeri da li su sve kalkulacije izračunate
    if (!bmrResult || !tdeeResult || !targetResult || !macrosResult) {
      alert("Molimo izračunajte sve kalkulacije (BMR, TDEE, Target Calories, Makrosi) prije slanja podataka.");
      setIsSubmittingFinalData(false);
      return;
    }

    // Konvertuj weight i height u kg i cm
    let weightKg = parseFloat(intakeForm.weight.value);
    if (isNaN(weightKg) || weightKg <= 0) {
      alert("Neispravna vrijednost težine. Molimo unesite valjanu težinu.");
      setIsSubmittingFinalData(false);
      return;
    }
    if (intakeForm.weight.unit === "lb") {
      weightKg = weightKg * 0.453592;
    }
    
    let heightCm = parseFloat(intakeForm.height.value);
    if (isNaN(heightCm) || heightCm <= 0) {
      alert("Neispravna vrijednost visine. Molimo unesite valjanu visinu.");
      setIsSubmittingFinalData(false);
      return;
    }
    if (intakeForm.height.unit === "in") {
      heightCm = heightCm * 2.54;
    }

    // Odredi gender iz honorific
    const gender: Gender = intakeForm.honorific === "mr" ? "male" : "female";
    
    // Odredi age iz ageRange
    let age = 30;
    if (intakeForm.ageRange && intakeForm.ageRange !== "other") {
      const [min, max] = intakeForm.ageRange.split("-").map(Number);
      if (min && max) {
        age = Math.floor((min + max) / 2);
      } else if (intakeForm.ageRange.startsWith("70")) {
        age = 75;
      } else if (intakeForm.ageRange.startsWith("10")) {
        age = 15;
      }
    }

    // Odredi goalType iz kalkulatora (targetInputs ili macrosInputs)
    // Prioritet: macrosInputs.goalType > targetInputs.goalType > determineGoalType(intakeForm.goals)
    const goalType = macrosInputs.goalType || targetInputs.goalType || determineGoalType(intakeForm.goals);
    const activityLevel = determineActivityLevel(intakeForm.activities);

    // Kreiraj payload objekt za API
    const payload: any = {
      clientId,
      // Osnovni podaci
      name: intakeForm.name?.trim() || "",
      email: intakeForm.email?.trim() || "",
      phone: intakeForm.phone?.trim() || "",
      honorific: intakeForm.honorific || "other",
      // Fizički podaci
      weight: weightKg,
      height: heightCm,
      ageRange: intakeForm.ageRange || "",
      // Kalkulacije
      bmr: bmrResult,
      tdee: tdeeResult,
      target_calories: targetResult || macrosInputs.targetCalories,
      goal_type: goalType,
      activity_level: activityLevel,
      protein_grams: macrosResult.protein,
      carbs_grams: macrosResult.carbs,
      fats_grams: macrosResult.fats,
      // Dodatni podaci
      activities: intakeForm.activities || [],
      otherActivities: intakeForm.otherActivities || "",
      goals: intakeForm.goals || [],
      otherGoals: intakeForm.otherGoals || "",
      dietCleanliness: intakeForm.dietCleanliness || 0,
      notes: intakeForm.notes || "",
    };

    try {
      // Spremi sve podatke u clients tablicu
      const response = await fetch("/api/client/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      console.log("[submitFinalData] Response:", data);

      if (data.ok) {
        // Spremi kalkulacije u localStorage
        try {
          const { saveUserCalculationsLocal } = await import("@/lib/utils/userCalculationsLocal");
          const calcData = {
            totalCalories: targetResult,
            proteinGrams: macrosResult.protein,
            carbGrams: macrosResult.carbs,
            fatGrams: macrosResult.fats,
            bmr: bmrResult,
            tdee: tdeeResult,
            goalType,
            activityLevel,
          };
          console.log("📥 Spremam kalkulacije", calcData);
          await saveUserCalculationsLocal(calcData);
          console.log("✅ Spremljeno u localStorage i Supabase");
        } catch (calcError) {
          console.warn("Error saving calculations:", calcError);
        }

        setFinalDataSubmitted(true);
        alert("Podaci su uspješno spremljeni! Sada možete generirati plan prehrane.");
      } else {
        const errorMessage = data.message || "Greška pri spremanju podataka. Pokušajte ponovno.";
        console.error("[submitFinalData] Error response:", data);
        alert(`${errorMessage}${data.error ? `\n\nDetalji: ${data.error}` : ""}`);
      }
    } catch (error) {
      console.error("Error submitting final data:", error);
      const errorMessage = error instanceof Error ? error.message : "Greška pri spremanju podataka. Pokušajte ponovno.";
      alert(`Greška pri spremanju podataka: ${errorMessage}`);
    } finally {
      setIsSubmittingFinalData(false);
    }
  };
  
  // Validacija za intake slideove
  const intakeValidationMap = useMemo(() => {
    const weightValue = parseFloat(intakeForm.weight.value);
    const heightValue = parseFloat(intakeForm.height.value);
    const sleepValue = parseFloat(intakeForm.sleepHours);

    return {
      intro: true,
      honorific: Boolean(intakeForm.honorific),
      age: Boolean(intakeForm.ageRange),
      weight: Number.isFinite(weightValue) && weightValue > 0,
      height: Number.isFinite(heightValue) && heightValue > 0,
      activities: intakeForm.activities.length > 0 || intakeForm.otherActivities.trim().length > 2,
      goals: intakeForm.goals.length > 0 || intakeForm.otherGoals.trim().length > 2,
      "training-frequency": Boolean(intakeForm.trainingFrequency),
      equipment: true, // Opcionalno
      experience: Boolean(intakeForm.experience),
      "meal-frequency": Boolean(intakeForm.mealFrequency),
      allergies: true, // Opcionalno
      "diet-type": Boolean(intakeForm.dietType || intakeForm.otherDietType.trim().length > 0),
      sleep: Number.isFinite(sleepValue) && sleepValue >= 4 && sleepValue <= 10,
      injuries: true, // Opcionalno
      "biggest-challenge": Boolean(intakeForm.biggestChallenge || intakeForm.otherChallenge.trim().length > 0),
      nutrition: true,
      contact: true, // Uvijek dozvoljeno jer se podaci šalju bez imena, emaila i telefona
    } as Record<string, boolean>;
  }, [intakeForm]);
  
  // Input podaci za kalkulatore
  const [bmrInputs, setBMRInputs] = useState({ age: 30, gender: "male" as Gender, weight: 70, height: 175 });
  const [tdeeInputs, setTDEEInputs] = useState({ bmr: 1700, activityLevel: "moderate" as ActivityLevel });
  const [targetInputs, setTargetInputs] = useState({ tdee: 2500, goalType: "maintain" as GoalType });
  const [macrosInputs, setMacrosInputs] = useState({ targetCalories: 2500, goalType: "maintain" as GoalType, weight: 70 });
  
  // Rezultati
  const [bmrResult, setBMRResult] = useState<number | null>(null);
  const [tdeeResult, setTDEEResult] = useState<number | null>(null);
  const [targetResult, setTargetResult] = useState<number | null>(null);
  const [macrosResult, setMacrosResult] = useState<{ protein: number; carbs: number; fats: number } | null>(null);

  // Ref da spriječimo ponovno učitavanje iz localStorage
  const hasLoadedRef = useRef<boolean>(false);

  useEffect(() => {
    // Učitaj currentSlide iz localStorage samo jednom pri inicijalizaciji
    if (!hasLoadedRef.current) {
      const savedSlide = localStorage.getItem("appCurrentSlide");
      if (savedSlide !== null) {
        const slideIndex = parseInt(savedSlide, 10);
        if (!isNaN(slideIndex) && slideIndex >= 0 && slideIndex < slideOrder.length) {
          console.log("Loading saved slide from localStorage:", slideIndex);
          setCurrentSlide(slideIndex);
        }
      }
      hasLoadedRef.current = true;
    }
  }, []);

  // Debug testovi za meal plan generator (samo u development modu)
  useEffect(() => {
    if (ENABLE_MEAL_PLAN_DEBUG_TESTS) {
      console.log("Running internal meal plan debug scenarios...");
      // runTestScenarios će automatski učitati jela iz meal_components.json
      runTestScenarios();
    }
  }, []);

  // Sync intakeForm data to calculator inputs (da korisnik ne unosi podatke dva puta)
  useEffect(() => {
    // Parse weight from intakeForm
    let weightKg = parseFloat(intakeForm.weight.value);
    if (!isNaN(weightKg) && weightKg > 0) {
      if (intakeForm.weight.unit === "lb") {
        weightKg = weightKg * 0.453592;
      }
      // Update BMR inputs with weight from intake
      setBMRInputs(prev => ({ ...prev, weight: Math.round(weightKg) }));
      setMacrosInputs(prev => ({ ...prev, weight: Math.round(weightKg) }));
    }

    // Parse height from intakeForm
    let heightCm = parseFloat(intakeForm.height.value);
    if (!isNaN(heightCm) && heightCm > 0) {
      if (intakeForm.height.unit === "in") {
        heightCm = heightCm * 2.54;
      }
      setBMRInputs(prev => ({ ...prev, height: Math.round(heightCm) }));
    }

    // Parse age from ageRange
    if (intakeForm.ageRange && intakeForm.ageRange !== "other") {
      const [min, max] = intakeForm.ageRange.split("-").map(Number);
      if (min && max) {
        const avgAge = Math.floor((min + max) / 2);
        setBMRInputs(prev => ({ ...prev, age: avgAge }));
      } else if (intakeForm.ageRange.startsWith("70")) {
        setBMRInputs(prev => ({ ...prev, age: 75 }));
      } else if (intakeForm.ageRange.startsWith("10")) {
        setBMRInputs(prev => ({ ...prev, age: 15 }));
      }
    }

    // Parse gender from honorific
    if (intakeForm.honorific) {
      const gender = intakeForm.honorific === "mr" ? "male" : "female";
      setBMRInputs(prev => ({ ...prev, gender: gender as Gender }));
    }
  }, [intakeForm.weight.value, intakeForm.weight.unit, intakeForm.height.value, intakeForm.height.unit, intakeForm.ageRange, intakeForm.honorific]);

  useEffect(() => {
    const clientId = localStorage.getItem("clientId");
    if (clientId) {
      fetch(`/api/client/${clientId}`)
        .then((res) => res.json())
        .then((data) => {
          setClientData(data);
          // Postavi inicijale
          if (data.name) {
            const names = data.name.split(" ");
            const initials = names.map((n: string) => n[0] || "").join("").toUpperCase().slice(0, 2);
            setUserInitials(initials || "U");
          }
        })
        .catch(() => {
          setClientData({ name: "Korisnik" });
          setUserInitials("U");
        });
    } else {
      setClientData({ name: "Korisnik" });
      setUserInitials("U");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Učitaj samo jednom pri mount

  // Funkcija za učitavanje portofolio podataka
  const loadPortfolioData = async (clientId: string) => {
    try {
      // Učitaj treninge
      const trainingsRes = await fetch(`/api/trainings/${clientId}`).catch(() => null);
      const trainingsData = trainingsRes ? await trainingsRes.json().catch(() => null) : null;
      
      // Učitaj plan prehrane
      const mealsRes = await fetch(`/api/meals/${clientId}`).catch(() => null);
      const mealsData = mealsRes ? await mealsRes.json().catch(() => null) : null;
      
      // Učitaj podatke klijenta
      const clientRes = await fetch(`/api/client/${clientId}`).catch(() => null);
      const clientDataRes = clientRes ? await clientRes.json().catch(() => null) : null;
      
      // Učitaj pretplatu
      const subscriptionRes = await fetch(`/api/subscription/${clientId}`).catch(() => null);
      const subscriptionData = subscriptionRes ? await subscriptionRes.json().catch(() => null) : null;
      
      setPortfolioData({
        trainings: trainingsData?.trainings || [],
        meals: mealsData?.meals || null,
        client: clientDataRes || null,
        subscription: subscriptionData || null,
      });
    } catch (error) {
      console.error("Error loading portfolio data:", error);
    }
  };


  // Zatvori meni kada se klikne izvan njega
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showSlideMenu && !target.closest('.slide-menu-container')) {
        setShowSlideMenu(false);
      }
    };

    if (showSlideMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSlideMenu]);

  const currentId = slideOrder[currentSlide];
  const progress = ((currentSlide + 1) / slideOrder.length) * 100;
  const isLastSlide = currentSlide === slideOrder.length - 1;
  
  // TEST MODE: Automatski postavi demo jelovnik kada korisnik dođe na meals slide
  useEffect(() => {
    if (isTestMode && currentId === "meals" && !weeklyMealPlan) {
      setWeeklyMealPlan(demoWeeklyMealPlan);
    }
  }, [isTestMode, currentId, weeklyMealPlan, demoWeeklyMealPlan]);
  
  // Sync sa contextom za navigaciju u headeru
  const { setSlides: setContextSlides, setCurrentSlide: setContextSlide } = useSlides();

  const nextSlide = () => {
    if (currentSlide < slideOrder.length - 1) {
      const currentId = slideOrder[currentSlide];
      const newSlide = currentSlide + 1;
      const nextSlideId = slideOrder[newSlide];
      console.log("nextSlide: moving from", currentSlide, "(", currentId, ") to", newSlide, "(", nextSlideId, ")");
      
      // Provjeri da li je trenutni slide "intro" (drugi slajd, index 1) i da onboarding nije završen
      // U TEST MODE preskačemo onboarding
      const onboardingCompleted = localStorage.getItem("educationalOnboardingCompleted");
      if (!isTestMode && currentId === "intro" && onboardingCompleted !== "true") {
        // Nakon intro slidea, prikaži edukativni onboarding
        console.log("🚀 After intro slide, showing educational onboarding");
        console.log("Setting showEducationalOnboarding to true");
        setShowEducationalOnboarding(true);
        setEducationalOnboardingCompleted(false);
        // NE mijenjaj currentSlide sada - ostavi na intro dok se onboarding ne završi
        // Onboarding će postaviti currentSlide na honorific kada se završi
        return;
      }
      
      setDirection(1);
      setCurrentSlide(newSlide);
      localStorage.setItem("appCurrentSlide", newSlide.toString());
    } else {
      console.log("nextSlide: already at last slide", currentSlide, "/", slideOrder.length - 1);
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      const newSlide = currentSlide - 1;
      console.log("prevSlide: moving from", currentSlide, "to", newSlide);
      setDirection(-1);
      setCurrentSlide(newSlide);
      localStorage.setItem("appCurrentSlide", newSlide.toString());
    } else {
      console.log("prevSlide: already at first slide");
    }
  };

  // SCROLL MIŠEM - navigacija kroz slajdove
  const lastWheelTime = useRef<number>(0);
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      const now = Date.now();
      // Cooldown 600ms između scrollova
      if (now - lastWheelTime.current < 600) return;
      
      if (Math.abs(e.deltaY) > 30) {
        lastWheelTime.current = now;
        if (e.deltaY > 0) {
          // Scroll dolje = sljedeći slajd
          nextSlide();
        } else {
          // Scroll gore = prethodni slajd
          prevSlide();
        }
      }
    };
    
    window.addEventListener('wheel', handleWheel, { passive: true });
    return () => window.removeEventListener('wheel', handleWheel);
  }, [currentSlide]);

  // TOUCH SWIPE - jednostavna navigacija prstom
  const touchStartY = useRef<number>(0);
  const touchEndY = useRef<number>(0);
  const lastTouchTime = useRef<number>(0);
  
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      touchStartY.current = e.touches[0].clientY;
      touchEndY.current = e.touches[0].clientY;
    };
    
    const handleTouchMove = (e: TouchEvent) => {
      touchEndY.current = e.touches[0].clientY;
    };
    
    const handleTouchEnd = () => {
      const now = Date.now();
      // Cooldown 300ms između swipeova
      if (now - lastTouchTime.current < 300) return;
      
      const swipeDistance = touchStartY.current - touchEndY.current;
      const minSwipeDistance = 30; // SAMO 30px za swipe - vrlo osjetljivo
      
      if (Math.abs(swipeDistance) > minSwipeDistance) {
        lastTouchTime.current = now;
        if (swipeDistance > 0) {
          // Povuci gore = sljedeći slajd
          nextSlide();
        } else {
          // Povuci dolje = prethodni slajd
          prevSlide();
        }
      }
    };
    
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    
    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [currentSlide]);

  // FAST Slide Variants - brzi prijelazi
  const slideVariants = {
    enter: (direction: number) => ({
      y: direction > 0 ? "30%" : "-30%",
      opacity: 0.3,
    }),
    center: {
      y: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      y: direction < 0 ? "30%" : "-30%",
      opacity: 0.3,
    }),
  };

  const slides = useMemo(() => buildSlides({
    intakeForm,
    updateIntakeForm,
    toggleIntakeArrayValue,
    intakeValidationMap,
    showBMRCalc,
    setShowBMRCalc,
    showTDEECalc,
    setShowTDEECalc,
    showTargetCalc,
    setShowTargetCalc,
    showMacrosCalc,
    setShowMacrosCalc,
    bmrInputs,
    setBMRInputs,
    bmrResult,
    setBMRResult,
    tdeeInputs,
    setTDEEInputs,
    tdeeResult,
    setTDEEResult,
    targetInputs,
    setTargetInputs,
    targetResult,
    setTargetResult,
    macrosInputs,
    setMacrosInputs,
    macrosResult,
    setMacrosResult,
    bmrConfirmed,
    setBMRConfirmed,
    tdeeConfirmed,
    setTDEEConfirmed,
    targetConfirmed,
    setTargetConfirmed,
    macrosConfirmed,
    setMacrosConfirmed,
    mealPlanPreference,
    setMealPlanPreference,
    generatedMealPlan,
    setGeneratedMealPlan,
    showMealPlan,
    setShowMealPlan,
    trainingSplit,
    setTrainingSplit,
    trainingFrequency,
    setTrainingFrequency,
    trainingType,
    setTrainingType,
    trainingGender,
    setTrainingGender,
    generatedTrainingPlan,
    setGeneratedTrainingPlan,
    showTrainingPlan,
    setShowTrainingPlan,
    selectedWorkout,
    setSelectedWorkout,
    setCurrentSlide,
    prevSlide,
    intakeSubmitted,
    isSubmittingIntake,
    submitIntake,
    finalDataSubmitted,
    isSubmittingFinalData,
    submitFinalData,
    isSavingPreferences,
    preferencesSaved,
    savePreferences,
    generatingWeeklyPlan,
    setGeneratingWeeklyPlan,
    weeklyMealPlan,
    setWeeklyMealPlan,
    weeklyPlanError,
    setWeeklyPlanError,
    router,
    mealPlanError,
    setMealPlanError,
    generatingMealPlan,
    setGeneratingMealPlan,
    finalMacros,
    setFinalMacros,
  }), [intakeForm, updateIntakeForm, toggleIntakeArrayValue, intakeValidationMap, showBMRCalc, showTDEECalc, showTargetCalc, showMacrosCalc, bmrInputs, bmrResult, tdeeInputs, tdeeResult, targetInputs, targetResult, macrosInputs, macrosResult, bmrConfirmed, tdeeConfirmed, targetConfirmed, macrosConfirmed, mealPlanPreference, generatedMealPlan, showMealPlan, trainingSplit, trainingFrequency, trainingType, trainingGender, generatedTrainingPlan, showTrainingPlan, selectedWorkout, setCurrentSlide, prevSlide, intakeSubmitted, isSubmittingIntake, submitIntake, finalDataSubmitted, isSubmittingFinalData, submitFinalData, generatingWeeklyPlan, weeklyMealPlan, weeklyPlanError, router, mealPlanError, generatingMealPlan, finalMacros, setFinalMacros]);

  // Ref za praćenje prethodnih slideova da spriječimo beskonačnu petlju
  const prevSlidesRef = useRef<string>("");

  // Sync sa contextom za navigaciju u headeru - NAKON što su slides definirani
  useEffect(() => {
    const slideList = slides.map(s => ({ id: s.id, title: s.title }));
    const slidesKey = JSON.stringify(slideList.map(s => s.id));
    
    // Provjeri je li se slides array promijenio (samo ID-ovi)
    if (prevSlidesRef.current !== slidesKey) {
      prevSlidesRef.current = slidesKey;
    setContextSlides(slideList);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slides]); // slides se mijenja samo kada se dependencies u useMemo promijene
  
  // Ref za praćenje prethodnog currentSlide da spriječimo beskonačnu petlju
  const prevCurrentSlideRef = useRef<number>(-1);
  const isInitialMount = useRef<boolean>(true);
  
  useEffect(() => {
    // Preskoči na prvi render (već je postavljen iz localStorage)
    if (isInitialMount.current) {
      isInitialMount.current = false;
      prevCurrentSlideRef.current = currentSlide;
      return;
    }
    
    // Provjeri je li se currentSlide promijenio
    if (prevCurrentSlideRef.current !== currentSlide) {
      console.log("currentSlide changed from", prevCurrentSlideRef.current, "to", currentSlide);
      prevCurrentSlideRef.current = currentSlide;
    setContextSlide(currentSlide);
      // Sačuvaj currentSlide u localStorage kad god se promijeni
      localStorage.setItem("appCurrentSlide", currentSlide.toString());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSlide]); // setContextSlide je stabilna funkcija iz contexta

  // Provjeri da li je educational onboarding završen pri inicijalizaciji
  useEffect(() => {
    const onboardingCompleted = localStorage.getItem("educationalOnboardingCompleted");
    if (onboardingCompleted === "true") {
      setEducationalOnboardingCompleted(true);
      setShowEducationalOnboarding(false);
    }
  }, []);
  
  // Provjeri da li treba prikazati onboarding kada se currentSlide promijeni
  // Ovo je backup provjera - glavna logika je u nextSlide() funkciji
  useEffect(() => {
    const currentId: SlideId | undefined = slideOrder[currentSlide];
    const onboardingCompleted = localStorage.getItem("educationalOnboardingCompleted");
    
    // Ako je korisnik na intro slideu i onboarding nije završen, i showEducationalOnboarding je postavljen na true
    // to znači da je korisnik kliknuo naprijed sa intro slidea
    if (currentId && currentId === "intro" && showEducationalOnboarding && onboardingCompleted !== "true" && !educationalOnboardingCompleted) {
      console.log("📍 On intro slide with showEducationalOnboarding=true, onboarding should be visible");
      // Onboarding se već postavlja u nextSlide() funkciji
    } else if (currentId && currentId !== "intro" && currentId !== "honorific") {
      // Ako nije na intro ili honorific, sakrij onboarding
      if (showEducationalOnboarding) {
        setShowEducationalOnboarding(false);
      }
    }
  }, [currentSlide, showEducationalOnboarding, educationalOnboardingCompleted]);

  // Rukovanje educational onboarding
  const handleEducationalOnboardingComplete = () => {
    setShowEducationalOnboarding(false);
    setEducationalOnboardingCompleted(true);
    localStorage.setItem("educationalOnboardingCompleted", "true");
    // Preusmjeri na honorific slide (prvi slide upitnika)
    const honorificIndex = slideOrder.indexOf("honorific");
    if (honorificIndex !== -1) {
      setCurrentSlide(honorificIndex);
    }
  };

  const handleEducationalOnboardingSkip = () => {
    setShowEducationalOnboarding(false);
    setEducationalOnboardingCompleted(true);
    localStorage.setItem("educationalOnboardingCompleted", "true");
    // Preusmjeri na honorific slide (prvi slide upitnika)
    const honorificIndex = slideOrder.indexOf("honorific");
    if (honorificIndex !== -1) {
      setCurrentSlide(honorificIndex);
    }
  };

  // Provjeri da li treba prikazati onboarding PRIJE renderanja glavnog sadržaja
  // Ovo mora biti poslije svih useEffect-ova i funkcija
  const onboardingCompleted = typeof window !== "undefined" ? localStorage.getItem("educationalOnboardingCompleted") : null;
  
  // Provjeri da li treba prikazati onboarding:
  // Ako je showEducationalOnboarding postavljen na true (iz nextSlide ili useEffect)
  // I ako onboarding nije već završen
  // U TEST MODE preskačemo onboarding
  const shouldShowOnboarding = !isTestMode && showEducationalOnboarding && !educationalOnboardingCompleted && onboardingCompleted !== "true";
  
  console.log("🔍 Onboarding check:", {
    currentId,
    currentSlide,
    showEducationalOnboarding,
    onboardingCompleted,
    educationalOnboardingCompleted,
    shouldShowOnboarding
  });
  
  // Prikaži educational onboarding ako treba (prije honorific slidea)
  if (shouldShowOnboarding) {
    console.log("✅ Rendering EducationalOnboarding component");
    return (
      <EducationalOnboarding
        onComplete={handleEducationalOnboardingComplete}
        onSkip={handleEducationalOnboardingSkip}
      />
    );
  }

  return (
    <main className={clsx(
      "relative bg-[#0D0F10] flex flex-col",
                    currentId === "intro" || (currentId === "meals" && !showMealPlan && !weeklyMealPlan) || ["calculators-intro", "bmr-calc", "tdee-calc", "target-calc", "macros", "contact"].includes(currentId) ? "h-screen w-screen fixed inset-0 overflow-hidden" : currentId === "meals" && (showMealPlan || weeklyMealPlan) ? "min-h-screen w-screen overflow-y-auto" : "min-h-screen w-screen overflow-y-auto"
    )}>
      {/* AI Chat Bubble - Persistent on all slides */}
      <AIChat />

      {/* Main Layout - 100vh, no scroll */}
      <div className={clsx(
        "flex flex-col min-h-0",
        currentId === "intro" || (currentId === "meals" && !showMealPlan && !weeklyMealPlan) || ["calculators-intro", "bmr-calc", "tdee-calc", "target-calc", "macros", "contact"].includes(currentId) ? "h-screen w-screen overflow-hidden" : currentId === "meals" && (showMealPlan || weeklyMealPlan) ? "flex-1 overflow-y-auto" : "flex-1 overflow-y-auto"
      )}>
        {/* Header uklonjen - clean full screen design */}

        {/* Slide Content - 100vh minus header/footer - Performance Optimized */}
        <div 
          className={clsx(
          "relative",
            currentId === "intro" || currentId === "login" || (currentId === "meals" && !showMealPlan && !weeklyMealPlan) || ["calculators-intro", "bmr-calc", "tdee-calc", "target-calc", "macros", "contact"].includes(currentId) ? "fixed inset-0 z-30 h-screen w-screen overflow-hidden" : currentId === "meals" && (showMealPlan || weeklyMealPlan) ? "flex-1 pb-20 overflow-y-auto min-h-0" : "flex-1 pb-20 overflow-y-auto min-h-0"
          )}
          style={{
            willChange: "transform",
            transform: "translateZ(0)",
            contain: "layout paint",
          }}
        >
          <AnimatePresence mode="sync" custom={direction} initial={false}>
            {slides
              .filter((slide) => slide.id === currentId)
              .map((slide) => (
                <motion.div
                  key={`${slide.id}-${currentSlide}`}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{
                    duration: 0.15,
                    ease: "linear",
                  }}
                  style={{
                    willChange: "transform, opacity, filter",
                    transformStyle: "preserve-3d",
                    backfaceVisibility: "hidden",
                    WebkitBackfaceVisibility: "hidden",
                  }}
                            className={clsx(
                    "absolute inset-0 flex flex-col",
                    currentId === "intro" ? "h-full" : "",
                    currentId === "meals" && (showMealPlan || weeklyMealPlan) ? "overflow-y-auto min-h-0" : "",
                    // Performance optimizations
                    "transform-gpu",
                    "contain-layout",
                    "contain-paint"
                  )}
                >
                  {currentId === "intro" || currentId === "honorific" ? (
                    // Intro, honorific - full screen
                    <div className="h-full w-full relative">
                      {slide.render}
                  </div>
                  ) : (
                    // Other slides - CALCULATOR STYLE: full screen pozadina + centrirani sadržaj
                    <div className="relative h-full w-full bg-black overflow-hidden">
                      {/* Rotirajuće pozadinske slike - olimpijska dizanja */}
                      {URBAN_SPORTS_IMAGES.map((img, idx) => (
                        <div 
                          key={idx}
                          className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-[2500ms] ease-in-out"
                          style={{
                            backgroundImage: `url(${img})`,
                            filter: "brightness(0.3) saturate(0.7)",
                            opacity: idx === bgImageIndex ? 1 : 0,
                          }}
                        />
                      ))}
                      
                      {/* Gradient overlays */}
                      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-black/60" />

                      {/* Sadržaj - centriran */}
                      <div className={clsx(
                        "relative z-10 h-full w-full flex flex-col items-center justify-center px-8 py-12",
                        currentId === "meals" && (showMealPlan || weeklyMealPlan) ? "overflow-y-auto" : ""
                      )}>
                        {/* Centrirani sadržaj - CALCULATOR STYLE */}
                        <div className="w-full max-w-2xl text-center">
                          {/* CORPEX logo mali - bez animacije */}
                          <p className="text-xs font-light tracking-[0.5em] text-white/40 uppercase mb-8">
                            Corpex
                          </p>
                          
                          {/* Broj slajda */}
                          <p className="text-sm font-light tracking-widest text-white/30 mb-4">
                            {String(slideOrder.indexOf(slide.id) + 1).padStart(2, "0")} / {slideOrder.length}
                          </p>
                          
                          {/* Naslov */}
                          <h1
                            className="text-3xl md:text-4xl font-light text-white mb-4 tracking-wide"
                            style={{ fontFamily: "var(--font-inter), sans-serif" }}
                          >
                            {slide.title}
                          </h1>
                          
                          {/* Opis */}
                          {slide.description && (
                            <p className="text-base text-white/50 mb-8 font-light max-w-xl mx-auto">
                              {slide.description}
                            </p>
                          )}
                          
                          {/* Divider */}
                          <div className="w-16 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent mx-auto mb-8" />

                          {/* Sadržaj slajda */}
                          <div className={clsx(
                              "text-left",
                              (currentId === "meals" && (showMealPlan || weeklyMealPlan)) ? "overflow-y-auto max-h-[50vh]" : ""
                            )}
                          >
                            {slide.render}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
          </AnimatePresence>
          
          {/* Slide Progress Dots - Tamno siva antracit boja */}
          {currentId !== "intro" && (
            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex gap-1.5 z-20">
              {slideOrder.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-2 rounded-full transition-all duration-150 ${
                    idx === currentSlide
                      ? "w-7 bg-[#4B0082] shadow-lg"
                      : "w-2 bg-gray-700"
                  }`}
                />
              ))}
            </div>
          )}
          
        </div>

      </div>

      {/* Portfolio Modal */}
      <PortfolioModal
        isOpen={showPortfolio}
        onClose={() => setShowPortfolio(false)}
        portfolioData={portfolioData}
        userName={clientData?.name || "Korisnik"}
        userInitials={userInitials}
      />
    </main>
  );
}

// Komponenta za prikaz dana u tjednom planu
interface WeeklyDayCardInlineProps {
  day: WeeklyDay;
  dayNumber: number;
}

function WeeklyDayCardInline({ day, dayNumber }: WeeklyDayCardInlineProps) {
  const dayNames = ['Ponedjeljak', 'Utorak', 'Srijeda', 'Četvrtak', 'Petak', 'Subota', 'Nedjelja'];
  const dayName = dayNames[dayNumber - 1] || `Dan ${dayNumber}`;
  const date = new Date(day.date);
  const formattedDate = date.toLocaleDateString('hr-HR', { day: 'numeric', month: 'long' });

  return (
    <div className="rounded-2xl border border-gray-200 bg-white/70 backdrop-blur-sm p-4 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h5 className="text-xl font-bold text-gray-900">{dayName}</h5>
          <p className="text-sm text-gray-600">{formattedDate}</p>
        </div>
        {day.total && (
          <div className="text-right">
            <p className="text-xs text-gray-500">Ukupno</p>
            <p className="text-lg font-bold text-gray-900">{day.total.calories.toFixed(0)} kcal</p>
            <p className="text-xs text-gray-500">
              P: {day.total.protein.toFixed(1)}g | C: {day.total.carbs.toFixed(1)}g | F: {day.total.fat.toFixed(1)}g
            </p>
          </div>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <MealCardInline title="Doručak" meal={day.meals.breakfast} />
        <MealCardInline title="Ručak" meal={day.meals.lunch} />
        <MealCardInline title="Večera" meal={day.meals.dinner} />
        <MealCardInline title="Užina" meal={day.meals.snack} />
      </div>
    </div>
  );
}

interface MealCardInlineProps {
  title: string;
  meal: any;
}

function MealCardInline({ title, meal }: MealCardInlineProps) {
  if (!meal) return null;

  return (
    <div className="rounded-xl bg-gray-50 p-3 border border-gray-200">
      <h6 className="font-semibold text-gray-900 mb-2 text-sm">{title}</h6>
      
      <div className="mb-2">
        <p className="text-base font-semibold text-gray-900">{meal.name}</p>
        {meal.meta?.cuisine && (
          <p className="text-xs text-gray-500 italic">{meal.meta.cuisine}</p>
        )}
      </div>

      {/* Makroi */}
      <div className="mb-2 space-y-0.5 text-xs">
        <div className="flex justify-between">
          <span className="text-gray-600">Kalorije:</span>
          <span className="font-medium text-gray-900">{meal.calories.toFixed(0)} kcal</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Proteini:</span>
          <span className="font-medium text-gray-900">{meal.protein.toFixed(1)}g</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Ugljikohidrati:</span>
          <span className="font-medium text-gray-900">{meal.carbs.toFixed(1)}g</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Masti:</span>
          <span className="font-medium text-gray-900">{meal.fat.toFixed(1)}g</span>
        </div>
      </div>

      {/* Score */}
      {meal.score !== undefined && (
        <div className="mt-2 pt-2 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Score:</span>
            <span className="text-xs font-semibold text-blue-600">
              {(meal.score * 100).toFixed(1)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// Password Protected Wrapper
function PasswordProtectedApp() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // Provjeri da li je već autentificiran u ovoj sesiji
    const auth = sessionStorage.getItem("corpex_auth");
    if (auth === "true") {
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);
  
  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#1A1A1A]">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-white mb-4 drop-shadow-2xl" style={{ fontFamily: "var(--font-montserrat), sans-serif" }}>
            CORP<span className="text-purple-400">EX</span>
          </h1>
          <p className="text-white/70">Učitavanje...</p>
        </div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <PasswordGate onSuccess={() => setIsAuthenticated(true)} />;
  }
  
  return <AppDashboardContent />;
}

export default function AppDashboard() {
  return (
    <Suspense fallback={
      <div className="flex h-screen w-screen items-center justify-center bg-[#1A1A1A]">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-white mb-4 drop-shadow-2xl" style={{ fontFamily: "var(--font-montserrat), sans-serif" }}>
            CORP<span className="text-purple-400">EX</span>
          </h1>
          <p className="text-white/70">Učitavanje...</p>
        </div>
      </div>
    }>
      <PasswordProtectedApp />
    </Suspense>
  );
}

// Most famous quotes from world athletes
const athleteQuotes = [
  { text: "I don't count my sit-ups; I only start counting when it starts hurting.", author: "Muhammad Ali" },
  { text: "Impossible is a word to be found only in the dictionary of fools.", author: "Napoleon Bonaparte" },
  { text: "It's not whether you get knocked down, it's whether you get up.", author: "Vince Lombardi" },
  { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
  { text: "The resistance that you fight physically in the gym and the resistance that you fight in life can only build a strong character.", author: "Arnold Schwarzenegger" },
  { text: "I want to be remembered as one of the best to ever pick up the gloves.", author: "Mike Tyson" },
  { text: "Pain is temporary. It may last a minute, or an hour, or a day, or a year, but eventually it will subside and something else will take its place. If I quit, however, it lasts forever.", author: "Lance Armstrong" },
  { text: "Hard work beats talent when talent fails to work hard.", author: "Kevin Durant" },
  { text: "I don't stop when I'm tired. I stop when I'm done.", author: "Kobe Bryant" },
  { text: "No excuses, only results.", author: "Cristiano Ronaldo" },
];

// Intro Slide Component - FULL SCREEN SA ROTIRAJUĆIM PORUKAMA
function IntroSlideContent({ onNext, nextSlideIndex }: { onNext: (slide: number) => void; nextSlideIndex: number; userName?: string; currentSlide?: number }) {
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);

  // Rotiraj quotes svakih 5 sekundi
  useEffect(() => {
    setCurrentQuoteIndex(0);
    
    const quoteInterval = setInterval(() => {
      setCurrentQuoteIndex((prev) => (prev + 1) % athleteQuotes.length);
    }, 5000);

    return () => {
      clearInterval(quoteInterval);
    };
  }, []);

  const handleNext = () => {
    const onboardingCompleted = localStorage.getItem("educationalOnboardingCompleted");
    if (nextSlideIndex === slideOrder.indexOf("honorific") && onboardingCompleted !== "true") {
      console.log("IntroSlideContent: Showing educational onboarding before honorific slide");
    }
    onNext(nextSlideIndex);
  };

  return (
    <div className="absolute inset-0 bg-black">
      {/* Pozadinska slika - F1 trening/motorsport fitness */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: "url(https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=1920&h=1080&fit=crop&q=80)",
          filter: "brightness(0.3) saturate(0.8)",
        }}
      />

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/60" />

      {/* Sadržaj - centriran */}
      <div className="relative z-10 h-full w-full flex flex-col items-center justify-center px-8">
        {/* CORPEX logo - gore */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="absolute top-8 left-1/2 -translate-x-1/2 text-xs font-light tracking-[0.5em] text-white/40 uppercase"
        >
          Corpex
        </motion.p>

        <div className="w-full max-w-2xl text-center">
          
          {/* Rotirajući citati sportaša */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`quote-${currentQuoteIndex}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.6 }}
              className="text-center"
            >
              <blockquote className="text-2xl md:text-4xl font-normal text-white leading-relaxed mb-6">
                "{athleteQuotes[currentQuoteIndex >= 0 ? currentQuoteIndex : 0].text}"
              </blockquote>
              <p className="text-base text-white/70 font-light tracking-wider">
                — {athleteQuotes[currentQuoteIndex >= 0 ? currentQuoteIndex : 0].author}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Scroll hint */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2, duration: 0.5 }}
            className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          >
            <p className="text-xs text-white/50 tracking-wider">Scrollaj za nastavak</p>
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <svg className="w-5 h-5 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </motion.div>
          </motion.div>

        </div>
      </div>
    </div>
  );
}

// OptionButton component for intake form slides
type OptionButtonProps = {
  label: string;
  active: boolean;
  onClick: () => void;
  variant?: "solid" | "ghost";
};

function OptionButton({
  label,
  active,
  onClick,
  variant = "solid",
}: OptionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-no-swipe="true"
      className={clsx(
        "rounded-[12px] border-2 px-4 py-3 text-left text-sm font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4B0082]",
        variant === "solid"
          ? active
            ? "border-[#4B0082] bg-[#4B0082] text-white shadow-[0px_4px_20px_rgba(0,0,0,0.25)]"
            : "border-gray-700 bg-[rgba(255,255,255,0.08)] text-[#F4F4F4] hover:border-[#4B0082] hover:bg-[rgba(255,255,255,0.12)] shadow-md"
          : active
            ? "border-[#4B0082] bg-[#4B0082] text-white shadow-[0px_4px_20px_rgba(0,0,0,0.25)]"
            : "border-gray-700 bg-[rgba(255,255,255,0.08)] text-[#F4F4F4] hover:border-[#4B0082] hover:bg-[rgba(255,255,255,0.12)] shadow-md",
        "active:scale-[0.97]"
      )}
    >
      {label}
    </button>
  );
}

function getSlideLink(slideId: SlideId): string {
  const links: Partial<Record<SlideId, string>> = {
    "calculators-intro": "/app/calculator",
    "bmr-calc": "/app/calculator",
    "tdee-calc": "/app/calculator",
    "target-calc": "/app/calculator",
    macros: "/app/macros",
    meals: "/app/meals",
    training: "/app/training",
    chat: "/app/chat",
  };
  return links[slideId] || "/app";
}

// Funkcija za generiranje plana prehrane s preferencom (slatko/slano)
function generateMealPlanWithPreference(
  targetCalories: number,
  targetProtein: number,
  targetCarbs: number,
  targetFats: number,
  preference: "sweet" | "savory",
  days: number = 7
) {
  const meals: any[] = [];
  
  // Odaberi namirnice prema preferenci
  const sweetFoods = {
    protein: healthyFoods.filter(f => f.category === "protein" && (f.id === "greek-yogurt" || f.id === "cottage-cheese" || f.id === "eggs")),
    carbs: healthyFoods.filter(f => f.category === "carbs" && (f.id === "oats" || f.id === "sweet-potatoes" || f.id === "banana")),
    fats: healthyFoods.filter(f => f.category === "fats" && (f.id === "almonds" || f.id === "walnuts")),
    fruits: healthyFoods.filter(f => f.category === "fruits"),
  };
  
  const savoryFoods = {
    protein: healthyFoods.filter(f => f.category === "protein" && (f.id === "chicken-breast" || f.id === "turkey" || f.id === "tuna" || f.id === "salmon")),
    carbs: healthyFoods.filter(f => f.category === "carbs" && (f.id === "rice" || f.id === "potatoes" || f.id === "quinoa")),
    fats: healthyFoods.filter(f => f.category === "fats" && (f.id === "avocado" || f.id === "olive-oil")),
    vegetables: healthyFoods.filter(f => f.category === "vegetables"),
  };
  
  const selectedFoods = preference === "sweet" ? sweetFoods : savoryFoods;
  
  for (let day = 0; day < days; day++) {
    const dailyMeals = {
      day: day + 1,
      breakfast: generateMealWithPreference(targetCalories * 0.25, targetProtein * 0.25, targetCarbs * 0.25, targetFats * 0.25, selectedFoods, preference),
      lunch: generateMealWithPreference(targetCalories * 0.35, targetProtein * 0.35, targetCarbs * 0.35, targetFats * 0.35, selectedFoods, preference),
      dinner: generateMealWithPreference(targetCalories * 0.30, targetProtein * 0.30, targetCarbs * 0.30, targetFats * 0.30, selectedFoods, preference),
      snacks: generateMealWithPreference(targetCalories * 0.10, targetProtein * 0.10, targetCarbs * 0.10, targetFats * 0.10, selectedFoods, preference),
    };
    meals.push(dailyMeals);
  }
  
  return meals;
}

function generateMealWithPreference(
  targetCal: number,
  targetProt: number,
  targetCarb: number,
  targetFat: number,
  selectedFoods: any,
  preference: "sweet" | "savory"
) {
  const foods: any[] = [];
  let currentCal = 0;
  let currentProt = 0;
  let currentCarb = 0;
  let currentFat = 0;
  
  // Dodaj proteine
  const proteins = selectedFoods.protein.length > 0 ? selectedFoods.protein : healthyFoods.filter(f => f.category === "protein");
  while (currentProt < targetProt * 0.9 && proteins.length > 0) {
    const food = proteins[Math.floor(Math.random() * proteins.length)];
    const amount = Math.min(200, (targetProt - currentProt) / food.proteinPer100g * 100);
    foods.push({ ...food, amount: Math.round(amount) });
    currentCal += (food.caloriesPer100g * amount / 100);
    currentProt += (food.proteinPer100g * amount / 100);
  }
  
  // Dodaj ugljikohidrate
  const carbs = selectedFoods.carbs.length > 0 ? selectedFoods.carbs : healthyFoods.filter(f => f.category === "carbs");
  while (currentCarb < targetCarb * 0.9 && carbs.length > 0) {
    const food = carbs[Math.floor(Math.random() * carbs.length)];
    const amount = Math.min(300, (targetCarb - currentCarb) / food.carbsPer100g * 100);
    foods.push({ ...food, amount: Math.round(amount) });
    currentCal += (food.caloriesPer100g * amount / 100);
    currentCarb += (food.carbsPer100g * amount / 100);
  }
  
  // Dodaj masti
  const fats = selectedFoods.fats.length > 0 ? selectedFoods.fats : healthyFoods.filter(f => f.category === "fats");
  while (currentFat < targetFat * 0.9 && fats.length > 0) {
    const food = fats[Math.floor(Math.random() * fats.length)];
    const amount = Math.min(50, (targetFat - currentFat) / food.fatsPer100g * 100);
    foods.push({ ...food, amount: Math.round(amount) });
    currentCal += (food.caloriesPer100g * amount / 100);
    currentFat += (food.fatsPer100g * amount / 100);
  }
  
  // Dodaj voće/povrće
  if (preference === "sweet" && selectedFoods.fruits && selectedFoods.fruits.length > 0) {
    const fruit = selectedFoods.fruits[Math.floor(Math.random() * selectedFoods.fruits.length)];
    foods.push({ ...fruit, amount: 100 });
  } else if (preference === "savory" && selectedFoods.vegetables && selectedFoods.vegetables.length > 0) {
    const veg = selectedFoods.vegetables[Math.floor(Math.random() * selectedFoods.vegetables.length)];
    foods.push({ ...veg, amount: 150 });
  }
  
  return {
    foods,
    totalCalories: Math.round(currentCal),
    totalProtein: Math.round(currentProt),
    totalCarbs: Math.round(currentCarb),
    totalFats: Math.round(currentFat),
  };
}

type SlideConfig = {
  id: SlideId;
  title: string;
  description: string;
  render: ReactNode;
};

type BuildSlidesProps = {
  intakeForm: IntakeFormState;
  updateIntakeForm: <K extends keyof IntakeFormState>(key: K, value: IntakeFormState[K]) => void;
  toggleIntakeArrayValue: (key: "activities" | "goals" | "equipment", value: string) => void;
  intakeValidationMap: Record<string, boolean>;
  showBMRCalc: boolean;
  setShowBMRCalc: (show: boolean) => void;
  showTDEECalc: boolean;
  setShowTDEECalc: (show: boolean) => void;
  showTargetCalc: boolean;
  setShowTargetCalc: (show: boolean) => void;
  showMacrosCalc: boolean;
  setShowMacrosCalc: (show: boolean) => void;
  bmrInputs: { age: number; gender: Gender; weight: number; height: number };
  setBMRInputs: (inputs: { age: number; gender: Gender; weight: number; height: number }) => void;
  bmrResult: number | null;
  setBMRResult: (result: number | null) => void;
  tdeeInputs: { bmr: number; activityLevel: ActivityLevel };
  setTDEEInputs: (inputs: { bmr: number; activityLevel: ActivityLevel }) => void;
  tdeeResult: number | null;
  setTDEEResult: (result: number | null) => void;
  targetInputs: { tdee: number; goalType: GoalType };
  setTargetInputs: (inputs: { tdee: number; goalType: GoalType }) => void;
  targetResult: number | null;
  setTargetResult: (result: number | null) => void;
  macrosInputs: { targetCalories: number; goalType: GoalType; weight: number };
  setMacrosInputs: (inputs: { targetCalories: number; goalType: GoalType; weight: number }) => void;
  macrosResult: { protein: number; carbs: number; fats: number } | null;
  setMacrosResult: (result: { protein: number; carbs: number; fats: number } | null) => void;
  bmrConfirmed: boolean;
  setBMRConfirmed: (confirmed: boolean) => void;
  tdeeConfirmed: boolean;
  setTDEEConfirmed: (confirmed: boolean) => void;
  targetConfirmed: boolean;
  setTargetConfirmed: (confirmed: boolean) => void;
  macrosConfirmed: boolean;
  setMacrosConfirmed: (confirmed: boolean) => void;
  mealPlanPreference: "sweet" | "savory";
  setMealPlanPreference: (preference: "sweet" | "savory") => void;
  generatedMealPlan: any;
  setGeneratedMealPlan: (plan: any) => void;
  showMealPlan: boolean;
  setShowMealPlan: (show: boolean) => void;
  trainingSplit: TrainingSplit;
  setTrainingSplit: (split: TrainingSplit) => void;
  trainingFrequency: TrainingFrequency | TrainingPlanFrequency | "";
  setTrainingFrequency: (frequency: TrainingPlanFrequency) => void;
  trainingType: TrainingType;
  setTrainingType: (type: TrainingType) => void;
  trainingGender: Gender;
  setTrainingGender: (gender: Gender) => void;
  generatedTrainingPlan: TrainingPlan | null;
  setGeneratedTrainingPlan: (plan: TrainingPlan | null) => void;
  showTrainingPlan: boolean;
  setShowTrainingPlan: (show: boolean) => void;
  selectedWorkout: number | null;
  setSelectedWorkout: (workout: number | null) => void;
  setCurrentSlide: (slide: number) => void;
  prevSlide: () => void;
  intakeSubmitted: boolean;
  isSubmittingIntake: boolean;
  submitIntake: () => Promise<void>;
  finalDataSubmitted: boolean;
  isSubmittingFinalData: boolean;
  submitFinalData: () => Promise<void>;
  isSavingPreferences: boolean;
  preferencesSaved: boolean;
  savePreferences: () => Promise<void>;
  generatingWeeklyPlan: boolean;
  setGeneratingWeeklyPlan: (generating: boolean) => void;
  weeklyMealPlan: any;
  setWeeklyMealPlan: (plan: any) => void;
  weeklyPlanError: string | null;
  setWeeklyPlanError: (error: string | null) => void;
  router: ReturnType<typeof useRouter>;
  mealPlanError: string | null;
  setMealPlanError: (error: string | null) => void;
  generatingMealPlan: boolean;
  setGeneratingMealPlan: (generating: boolean) => void;
  finalMacros: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  } | null;
  setFinalMacros: React.Dispatch<
    React.SetStateAction<{
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
    } | null>
  >;
};

// Helper component wrapper for FAQ in buildSlides
const FAQWrapper = () => <FAQRotation />;

function buildSlides(props: BuildSlidesProps): SlideConfig[] {
  const {
    showBMRCalc,
    setShowBMRCalc,
    showTDEECalc,
    setShowTDEECalc,
    showTargetCalc,
    setShowTargetCalc,
    showMacrosCalc,
    setShowMacrosCalc,
    bmrInputs,
    setBMRInputs,
    bmrResult,
    setBMRResult,
    tdeeInputs,
    setTDEEInputs,
    tdeeResult,
    setTDEEResult,
    targetInputs,
    setTargetInputs,
    targetResult,
    setTargetResult,
    macrosInputs,
    setMacrosInputs,
    macrosResult,
    setMacrosResult,
    bmrConfirmed,
    setBMRConfirmed,
    tdeeConfirmed,
    setTDEEConfirmed,
    targetConfirmed,
    setTargetConfirmed,
    macrosConfirmed,
    setMacrosConfirmed,
    mealPlanPreference,
    setMealPlanPreference,
    generatedMealPlan,
    setGeneratedMealPlan,
    showMealPlan,
    setShowMealPlan,
    trainingSplit,
    setTrainingSplit,
    trainingFrequency,
    setTrainingFrequency,
    trainingType,
    setTrainingType,
    trainingGender,
    setTrainingGender,
    generatedTrainingPlan,
    setGeneratedTrainingPlan,
    showTrainingPlan,
    setShowTrainingPlan,
    selectedWorkout,
    setSelectedWorkout,
    setCurrentSlide,
    prevSlide,
    intakeForm,
    updateIntakeForm,
    toggleIntakeArrayValue,
    intakeValidationMap,
    intakeSubmitted,
    isSubmittingIntake,
    submitIntake,
    finalDataSubmitted,
    isSubmittingFinalData,
    submitFinalData,
    isSavingPreferences,
    preferencesSaved,
    savePreferences,
    generatingWeeklyPlan,
    setGeneratingWeeklyPlan,
    weeklyMealPlan,
    setWeeklyMealPlan,
    weeklyPlanError,
    setWeeklyPlanError,
    router,
    mealPlanError,
    setMealPlanError,
    generatingMealPlan,
    setGeneratingMealPlan,
    finalMacros,
    setFinalMacros,
  } = props;
  return [
    // LOGIN SLIDE - must be first
    {
      id: "login",
      title: "",
      description: "",
      render: <LoginSlideContent onNext={setCurrentSlide} nextSlideIndex={1} onBack={undefined} />,
    },
    // INTAKE SLIDES - must match slideOrder
    {
      id: "intro",
      title: "Upoznaj svog trenera",
      description:
        "Brzi upitnik koji će mi pomoći da sve prilagodim za tebe. Prođi kroz stranice, odaberi svoje odgovore, i personalizirat ću sve za tebe.",
      render: <IntroSlideContent onNext={setCurrentSlide} nextSlideIndex={2} userName={intakeForm.name || ""} currentSlide={slideOrder.indexOf("intro")} />,
    },
    {
      id: "honorific",
      title: "",
      description: "",
      render: (
        <HonorificSlide
          intakeForm={intakeForm}
          updateIntakeForm={(field, value) => updateIntakeForm(field as "honorific", value)}
          honorificOptions={honorificOptions}
        />
      ),
    },
    {
      id: "age",
      title: "",
      description: "",
      render: (
        <div className="w-full max-w-lg mx-auto">
          {/* Pitanje */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-2xl md:text-3xl font-light text-white text-center mb-12"
          >
            Koliko imaš godina?
          </motion.p>
          
          {/* Opcije - vertikalni popis */}
          <div className="space-y-1">
            {ageOptions.map((option, index) => (
              <motion.button
                key={option.value}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.1 + index * 0.05 }}
                onClick={() => updateIntakeForm("ageRange", option.value)}
                className={clsx(
                  "w-full py-4 text-left transition-all duration-300 border-b border-white/15 group",
                  intakeForm.ageRange === option.value
                    ? "text-white"
                    : "text-white/60 hover:text-white/80"
                )}
              >
                <span className="flex items-center justify-between">
                  <span className="text-xl font-light tracking-wide">{option.label}</span>
                  {intakeForm.ageRange === option.value && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-2 h-2 rounded-full bg-white"
                    />
                  )}
                </span>
              </motion.button>
            ))}
          </div>
        </div>
      ),
    },
    {
      id: "weight",
      title: "Trenutna težina",
      description: "Upiši broj i odaberi kilograme ili funte.",
      render: (
        <div className="space-y-4">
          <div className="flex items-end gap-4">
            <input
              type="number"
              inputMode="decimal"
              placeholder="68"
              className="flex-1 rounded-[20px] border border-[#E8E8E8] bg-white px-4 py-3 text-lg text-[#1A1A1A] placeholder:text-gray-400 focus:border-[#1A1A1A] focus:outline-none"
              value={intakeForm.weight.value}
              onChange={(event) =>
                updateIntakeForm("weight", {
                  ...intakeForm.weight,
                  value: event.target.value,
                })
              }
            />
            <div className="inline-flex rounded-[12px] border border-[rgba(255,255,255,0.2)] bg-[rgba(255,255,255,0.08)] backdrop-blur-sm p-1">
              {weightUnits.map((unit) => (
                <button
                  type="button"
                  key={unit.value}
                  className={clsx(
                    "rounded-[8px] px-3 py-2 text-sm font-semibold transition-colors",
                    intakeForm.weight.unit === unit.value
                      ? "bg-[#4B0082] text-white"
                      : "text-[#A9B1B8] hover:bg-[rgba(255,255,255,0.12)]"
                  )}
                  onClick={() =>
                    updateIntakeForm("weight", {
                      ...intakeForm.weight,
                      unit: unit.value,
                    })
                  }
                >
                  {unit.label}
                </button>
              ))}
            </div>
          </div>
          <p className="text-xs text-[#A9B1B8]" style={{ fontFamily: "var(--font-inter), sans-serif" }}>
            Bez osuđivanja—tvoja početna točka je samo podatak za bolje programiranje.
          </p>
        </div>
      ),
    },
    {
      id: "height",
      title: "Visina",
      description: "Koristimo ovo za kalibraciju prehrane i standarda pokreta.",
      render: (
        <div className="space-y-4">
          <div className="flex items-end gap-4">
            <input
              type="number"
              inputMode="decimal"
              placeholder="172"
              className="flex-1 rounded-[20px] border border-[#E8E8E8] bg-white px-4 py-3 text-lg text-[#1A1A1A] placeholder:text-gray-400 focus:border-[#1A1A1A] focus:outline-none"
              value={intakeForm.height.value}
              onChange={(event) =>
                updateIntakeForm("height", {
                  ...intakeForm.height,
                  value: event.target.value,
                })
              }
            />
            <div className="inline-flex rounded-[12px] border border-[rgba(255,255,255,0.2)] bg-[rgba(255,255,255,0.08)] backdrop-blur-sm p-1">
              {heightUnits.map((unit) => (
                <button
                  type="button"
                  key={unit.value}
                  className={clsx(
                    "rounded-[16px] px-3 py-2 text-sm font-semibold transition-colors",
                    intakeForm.height.unit === unit.value
                      ? "bg-[#1A1A1A] text-white"
                      : "text-gray-600 hover:bg-gray-100"
                  )}
                  onClick={() =>
                    updateIntakeForm("height", {
                      ...intakeForm.height,
                      unit: unit.value,
                    })
                  }
                >
                  {unit.label}
                </button>
              ))}
            </div>
          </div>
          <p className="text-xs text-gray-600">
            Ako znaš samo stope i inče, upiši samo vrijednost u inčima.
          </p>
        </div>
      ),
    },
    {
      id: "activities",
      title: "Odaberi aktivnosti koje voliš",
      description:
        "Možeš odabrati više aktivnosti koje te energiziraju. Fokusirat ćemo se na njih pri programiranju.",
      render: (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            {activityOptions.map((option) => (
              <OptionButton
                key={option.value}
                label={option.label}
                active={intakeForm.activities.includes(option.value)}
                onClick={() => toggleIntakeArrayValue("activities", option.value)}
                variant="ghost"
              />
            ))}
          </div>
          <textarea
            placeholder="Nešto drugo? Odbojka na pijesku, planinarenje, skijanje..."
            className="w-full rounded-[12px] border border-[rgba(255,255,255,0.2)] bg-[rgba(255,255,255,0.08)] px-4 py-3 text-sm text-[#F4F4F4] placeholder:text-[#A9B1B8] focus:border-[#6B46C1] focus:outline-none focus:bg-[rgba(255,255,255,0.12)] transition-all"
            value={intakeForm.otherActivities}
            onChange={(event) => updateIntakeForm("otherActivities", event.target.value)}
          />
        </div>
      ),
    },
    {
      id: "goals",
      title: "Što želiš najviše postići sada?",
      description:
        "Ciljevi se mijenjaju. Danas odaberi rezultate koje želiš osjetiti u svom tijelu i umu.",
      render: (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            {goalOptions.map((option) => (
              <OptionButton
                key={option.value}
                label={option.label}
                active={intakeForm.goals.includes(option.value)}
                onClick={() => toggleIntakeArrayValue("goals", option.value)}
                variant="ghost"
              />
            ))}
          </div>
          <textarea
            placeholder="Druge motivacije? Priprema za vjenčanje, mentalno zdravlje, proba za tim..."
            className="w-full rounded-[12px] border border-[rgba(255,255,255,0.2)] bg-[rgba(255,255,255,0.08)] px-4 py-3 text-sm text-[#F4F4F4] placeholder:text-[#A9B1B8] focus:border-[#6B46C1] focus:outline-none focus:bg-[rgba(255,255,255,0.12)] transition-all"
            value={intakeForm.otherGoals}
            onChange={(event) => updateIntakeForm("otherGoals", event.target.value)}
          />
        </div>
      ),
    },
    // NOVI SLIDEOVI - Nakon "goals", prije "nutrition"
    {
      id: "training-frequency",
      title: "Koliko puta tjedno možeš trenirati?",
      description: "Odaberi broj treninga tjedno koje možeš realno uključiti u svoj raspored.",
      render: (
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          {trainingFrequencyOptions.map((option) => (
            <OptionButton
              key={option.value}
              label={option.label}
              active={intakeForm.trainingFrequency === option.value}
              onClick={() => updateIntakeForm("trainingFrequency", option.value)}
            />
          ))}
        </div>
      ),
    },
    {
      id: "experience",
      title: "Koliko iskustva imaš u treningu?",
      description: "Pomaže mi prilagoditi kompleksnost vježbi i program.",
      render: (
        <div className="grid gap-3 sm:grid-cols-3">
          {experienceLevelOptions.map((option) => (
            <OptionButton
              key={option.value}
              label={option.label}
              active={intakeForm.experience === option.value}
              onClick={() => updateIntakeForm("experience", option.value)}
            />
          ))}
        </div>
      ),
    },
    {
      id: "meal-frequency",
      title: "Koliko obroka dnevno preferiraš?",
      description: "Koliko obroka želiš jesti tokom dana?",
      render: (
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          {mealFrequencyOptions.map((option) => (
            <OptionButton
              key={option.value}
              label={option.label}
              active={intakeForm.mealFrequency === option.value}
              onClick={() => updateIntakeForm("mealFrequency", option.value)}
            />
          ))}
        </div>
      ),
    },
    {
      id: "allergies",
      title: "",
      description: "",
      render: (
        <div className="w-full max-w-lg mx-auto">
          {/* Naslov */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-2xl md:text-3xl font-light text-white text-center mb-10"
          >
            Prilagodi prehranu
          </motion.p>

          <div className="space-y-8">
            {/* Alergije */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <label className="block text-white/70 text-xs tracking-wider mb-3 uppercase">
                Alergije i intolerancije
              </label>
              <textarea
                placeholder="laktoza, gluten, orašasti plodovi..."
                className="w-full bg-transparent border-b border-white/40 py-3 text-white text-base font-light focus:outline-none focus:border-white/80 transition-colors placeholder:text-white/40 resize-none min-h-[60px]"
                value={intakeForm.allergies}
                onChange={(event) => updateIntakeForm("allergies", event.target.value)}
              />
            </motion.div>

            {/* Ne želim jesti */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              <label className="block text-white/70 text-xs tracking-wider mb-3 uppercase">
                Ne želim jesti
              </label>
              <textarea
                placeholder="piletina, tuna, mlijeko..."
                className="w-full bg-transparent border-b border-white/40 py-3 text-white text-base font-light focus:outline-none focus:border-white/80 transition-colors placeholder:text-white/40 resize-none min-h-[60px]"
                value={intakeForm.avoidIngredients}
                onChange={(event) => updateIntakeForm("avoidIngredients", event.target.value)}
              />
            </motion.div>

            {/* Preferiram */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
            >
              <label className="block text-white/70 text-xs tracking-wider mb-3 uppercase">
                Preferiram
              </label>
              <textarea
                placeholder="junetina, losos, riža, avokado..."
                className="w-full bg-transparent border-b border-white/40 py-3 text-white text-base font-light focus:outline-none focus:border-white/80 transition-colors placeholder:text-white/40 resize-none min-h-[60px]"
                value={intakeForm.foodPreferences}
                onChange={(event) => updateIntakeForm("foodPreferences", event.target.value)}
              />
            </motion.div>
          </div>

          {/* Hint */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="text-white/50 text-xs text-center mt-8"
          >
            Odvoji namirnice zarezom
          </motion.p>
        </div>
      ),
    },
    {
      id: "diet-type",
      title: "Slijediš li neki poseban način prehrane?",
      description: "Odaberi način prehrane koji trenutno slijediš.",
      render: (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            {dietTypeOptions.map((option) => (
              <OptionButton
                key={option.value}
                label={option.label}
                active={intakeForm.dietType === option.value}
                onClick={() => updateIntakeForm("dietType", option.value)}
                variant="ghost"
              />
            ))}
          </div>
          {intakeForm.dietType === "other" && (
            <textarea
              placeholder="Opiši svoj način prehrane..."
              className="w-full rounded-[12px] border border-[rgba(255,255,255,0.2)] bg-[rgba(255,255,255,0.08)] px-4 py-3 text-sm text-[#F4F4F4] placeholder:text-[#A9B1B8] focus:border-[#6B46C1] focus:outline-none focus:bg-[rgba(255,255,255,0.12)] transition-all"
              value={intakeForm.otherDietType}
              onChange={(event) => updateIntakeForm("otherDietType", event.target.value)}
            />
          )}
        </div>
      ),
    },
    {
      id: "sleep",
      title: "Koliko sati sna prosječno imaš po noći?",
      description: "San je ključan za oporavak i rezultate. Koliko sati sna obično imaš?",
      render: (
        <div className="space-y-6">
          <div className="rounded-[20px] border border-[#E8E8E8] bg-white/80 backdrop-blur-sm p-5">
            <div className="flex items-center justify-between text-sm font-semibold text-[#1A1A1A] mb-4">
              <span>Sati sna</span>
              <span className="text-lg">{intakeForm.sleepHours || 7} sati</span>
            </div>
            <input
              type="range"
              min={4}
              max={10}
              step={0.5}
              value={intakeForm.sleepHours || 7}
              onChange={(event) => updateIntakeForm("sleepHours", event.target.value)}
              className="mt-4 h-2 w-full cursor-pointer appearance-none rounded-full bg-[#E8E8E8] accent-[#1A1A1A]"
            />
            <div className="flex justify-between text-xs text-gray-600 mt-2">
              <span>4h</span>
              <span>7h</span>
              <span>10h</span>
            </div>
          </div>
          <p className="text-xs text-gray-600">
            Preporučeno je 7-9 sati sna za optimalan oporavak i performanse.
          </p>
        </div>
      ),
    },
    {
      id: "injuries",
      title: "Imaš li trenutne ozljede ili ograničenja u pokretu?",
      description: "Opiši sve trenutne ozljede, bolove ili ograničenja koje imaš (leđa, koljena, ramena, itd.).",
      render: (
        <div className="space-y-4">
          <textarea
            placeholder="Npr. problemi s donjim dijelom leđa, bolovi u koljenima pri čučnjevima, ozljeda ramena..."
            className="w-full rounded-[20px] border border-[#E8E8E8] bg-white px-4 py-3 text-sm text-[#1A1A1A] placeholder:text-gray-400 focus:border-[#1A1A1A] focus:outline-none min-h-[120px]"
            value={intakeForm.injuries}
            onChange={(event) => updateIntakeForm("injuries", event.target.value)}
          />
          <p className="text-xs text-gray-600">
            Ako nemaš ozljeda ili ograničenja, možeš ostaviti prazno. Ovo mi pomaže dizajnirati siguran program.
          </p>
        </div>
      ),
    },
    {
      id: "biggest-challenge",
      title: "Što ti je trenutno najveći izazov?",
      description: "Što te najviše sprečava da postigneš svoje ciljeve?",
      render: (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            {biggestChallengeOptions.map((option) => (
              <OptionButton
                key={option.value}
                label={option.label}
                active={intakeForm.biggestChallenge === option.value}
                onClick={() => updateIntakeForm("biggestChallenge", option.value)}
                variant="ghost"
              />
            ))}
          </div>
          {intakeForm.biggestChallenge === "other" && (
            <textarea
              placeholder="Opiši svoj najveći izazov..."
              className="w-full rounded-[12px] border border-[rgba(255,255,255,0.2)] bg-[rgba(255,255,255,0.08)] px-4 py-3 text-sm text-[#F4F4F4] placeholder:text-[#A9B1B8] focus:border-[#6B46C1] focus:outline-none focus:bg-[rgba(255,255,255,0.12)] transition-all"
              value={intakeForm.otherChallenge}
              onChange={(event) => updateIntakeForm("otherChallenge", event.target.value)}
            />
          )}
        </div>
      ),
    },
    {
      id: "nutrition",
      title: "Koliko čisto jedeš?",
      description:
        "Pomakni klizač da označiš % čiste hrane naspram udobne hrane. Ovo mi pomaže dizajnirati planove prehrane koje možeš stvarno slijediti.",
      render: (
        <div className="space-y-6">
          <div className="rounded-[20px] border border-[#E8E8E8] bg-white/80 backdrop-blur-sm p-5">
            <div className="flex items-center justify-between text-sm font-semibold text-[#1A1A1A]">
              <span>{intakeForm.dietCleanliness}% čisto</span>
              <span>{100 - intakeForm.dietCleanliness}% fleksibilno</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={intakeForm.dietCleanliness}
              onChange={(event) => updateIntakeForm("dietCleanliness", Number(event.target.value))}
              className="mt-4 h-2 w-full cursor-pointer appearance-none rounded-full bg-[#E8E8E8] accent-[#1A1A1A]"
            />
          </div>
          <textarea
            placeholder="Napiši sve preferencije hrane, alergije ili žudnje ovdje."
            className="w-full rounded-[12px] border border-[rgba(255,255,255,0.2)] bg-[rgba(255,255,255,0.08)] px-4 py-3 text-sm text-[#F4F4F4] placeholder:text-[#A9B1B8] focus:border-[#6B46C1] focus:outline-none focus:bg-[rgba(255,255,255,0.12)] transition-all"
            value={intakeForm.notes}
            onChange={(event) => updateIntakeForm("notes", event.target.value)}
          />
        </div>
      ),
    },
    // CALCULATOR SLIDES
    {
      id: "calculators-intro",
      title: "Kalkulatori Kalorija",
      description: "Upoznaj se s alatima za izračun kalorija. Svaki kalkulator ima svoju ulogu.",
      render: (
        <CalculatorScreen
          title="KALKULATORI KALORIJA"
          subtitle="Precizni alati za izračun vaših dnevnih potreba"
          onBack={prevSlide}
        >
          <div className="space-y-8">
            {/* Animated Messages Section */}
            <div className="mb-8">
              <CalcFAQRotation />
            </div>

            {/* Calculator Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <CalcCard>
                <div className="text-3xl font-light text-white/30 mb-4">01</div>
                <h3 className="text-lg font-medium text-white mb-2">BMR Kalkulator</h3>
                <p className="text-sm text-white/50 leading-relaxed">
                  Bazalna metabolička stopa - kalorije koje tijelo sagori u potpunom mirovanju.
                </p>
              </CalcCard>
              
              <CalcCard>
                <div className="text-3xl font-light text-white/30 mb-4">02</div>
                <h3 className="text-lg font-medium text-white mb-2">TDEE Kalkulator</h3>
                <p className="text-sm text-white/50 leading-relaxed">
                  Ukupne dnevne potrebe za energijom uključujući sve aktivnosti.
                </p>
              </CalcCard>
              
              <CalcCard>
                <div className="text-3xl font-light text-white/30 mb-4">03</div>
                <h3 className="text-lg font-medium text-white mb-2">Target Kalorije</h3>
                <p className="text-sm text-white/50 leading-relaxed">
                  Ciljani unos kalorija prema vašem cilju - gubitak, održavanje ili dobitak.
                </p>
              </CalcCard>
            </div>

            {/* Next Button */}
            <div className="pt-4">
              <CalcButton onClick={() => setCurrentSlide(slideOrder.indexOf("bmr-calc"))}>
                Započni s izračunom →
              </CalcButton>
            </div>
          </div>
        </CalculatorScreen>
      ),
    },
    {
      id: "bmr-calc",
      title: "BMR Kalkulator",
      description: "Izračunaj svoju bazalnu metaboličku stopu.",
      render: (
        <CalculatorScreen
          title="BMR KALKULATOR"
          subtitle="Bazalna metabolička stopa - temelj za sve izračune"
          step={1}
          totalSteps={4}
          onBack={prevSlide}
        >
          <AnimatePresence mode="wait">
            {!showBMRCalc ? (
              <motion.div
                key="info"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                {/* Info Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <CalcInfoCard title="Što je BMR?">
                    Broj kalorija koje tijelo sagori u potpunom mirovanju - samo za osnovne životne funkcije.
                  </CalcInfoCard>
                  <CalcInfoCard title="Kako se koristi?">
                    Unesi dob, spol, visinu i težinu. Koristimo Mifflin-St Jeor formulu za precizni izračun.
                  </CalcInfoCard>
                  <CalcInfoCard title="Zašto je važno?">
                    BMR je osnova za sve ostale izračune - TDEE, ciljane kalorije i makronutrijente.
                  </CalcInfoCard>
                </div>
                <CalcButton onClick={() => setShowBMRCalc(true)}>
                  Pokreni kalkulator
                </CalcButton>
              </motion.div>
            ) : (
              <motion.div
                key="calc"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <CalcCard highlighted>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <CalcInput
                      label="Dob"
                      type="number"
                      value={bmrInputs.age}
                      onChange={(v) => setBMRInputs({ ...bmrInputs, age: parseInt(v) || 0 })}
                      unit="godina"
                    />
                    <CalcSelect
                      label="Spol"
                      value={bmrInputs.gender}
                      onChange={(v) => setBMRInputs({ ...bmrInputs, gender: v as Gender })}
                      options={[
                        { value: "male", label: "Muškarac" },
                        { value: "female", label: "Žena" },
                      ]}
                    />
                    <CalcInput
                      label="Težina"
                      type="number"
                      value={bmrInputs.weight}
                      onChange={(v) => setBMRInputs({ ...bmrInputs, weight: parseFloat(v) || 0 })}
                      unit="kg"
                    />
                    <CalcInput
                      label="Visina"
                      type="number"
                      value={bmrInputs.height}
                      onChange={(v) => setBMRInputs({ ...bmrInputs, height: parseFloat(v) || 0 })}
                      unit="cm"
                    />
                  </div>
                  <div className="mt-6">
                    <CalcButton onClick={() => {
                      const result = calculateBMR(bmrInputs.weight, bmrInputs.height, bmrInputs.age, bmrInputs.gender);
                      setBMRResult(Math.round(result));
                    }}>
                      Izračunaj BMR
                    </CalcButton>
                  </div>
                </CalcCard>

                {bmrResult !== null && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-4"
                  >
                    <CalcResult
                      label="Tvoj BMR"
                      value={bmrResult}
                      unit="kalorija/dan"
                      highlight
                    />
                    <CalcButton
                      variant={bmrConfirmed ? "success" : "primary"}
                      onClick={() => {
                        setBMRConfirmed(true);
                        setTDEEInputs({ ...tdeeInputs, bmr: bmrResult });
                        setMacrosInputs({ ...macrosInputs, weight: bmrInputs.weight || macrosInputs.weight });
                        setCurrentSlide(slideOrder.indexOf("tdee-calc"));
                      }}
                    >
                      {bmrConfirmed ? "✓ Potvrđeno" : "Potvrdi i nastavi →"}
                    </CalcButton>
                  </motion.div>
                )}

                <button
                  onClick={() => setShowBMRCalc(false)}
                  className="text-white/40 hover:text-white/70 text-sm transition-colors"
                >
                  ← Natrag na informacije
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </CalculatorScreen>
      ),
    },
    {
      id: "tdee-calc",
      title: "TDEE Kalkulator",
      description: "Izračunaj svoje ukupne dnevne potrebe za kalorijama.",
      render: (
        <CalculatorScreen
          title="TDEE KALKULATOR"
          subtitle="Ukupna dnevna potrošnja energije"
          step={2}
          totalSteps={4}
          onBack={prevSlide}
        >
          <AnimatePresence mode="wait">
            {!showTDEECalc ? (
              <motion.div
                key="info"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <CalcInfoCard title="Što je TDEE?">
                    Ukupan broj kalorija koje tijelo sagori tijekom dana, uključujući sve aktivnosti.
                  </CalcInfoCard>
                  <CalcInfoCard title="Zašto je važan?">
                    TDEE određuje koliko kalorija trebaš jesti za gubitak, održavanje ili dobitak težine.
                  </CalcInfoCard>
                </div>
                
                <CalcCard>
                  <h4 className="text-white/90 font-medium mb-3">Aktivnostni multiplikatori</h4>
                  <div className="space-y-2 text-sm text-white/50">
                    <div className="flex justify-between"><span>Sjedilački</span><span className="text-white/70">× 1.2</span></div>
                    <div className="flex justify-between"><span>Lagana aktivnost</span><span className="text-white/70">× 1.375</span></div>
                    <div className="flex justify-between"><span>Umjerena aktivnost</span><span className="text-white/70">× 1.55</span></div>
                    <div className="flex justify-between"><span>Visoka aktivnost</span><span className="text-white/70">× 1.725</span></div>
                    <div className="flex justify-between"><span>Vrlo visoka aktivnost</span><span className="text-white/70">× 1.9</span></div>
                  </div>
                </CalcCard>
                
                <CalcButton onClick={() => setShowTDEECalc(true)}>
                  Pokreni kalkulator
                </CalcButton>
              </motion.div>
            ) : (
              <motion.div
                key="calc"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <CalcCard highlighted>
                  <div className="space-y-4">
                    <CalcInput
                      label="BMR (iz prethodnog koraka)"
                      type="number"
                      value={tdeeInputs.bmr}
                      onChange={(v) => setTDEEInputs({ ...tdeeInputs, bmr: parseInt(v) || 0 })}
                      unit="kcal"
                    />
                    <CalcSelect
                      label="Razina aktivnosti"
                      value={tdeeInputs.activityLevel}
                      onChange={(v) => setTDEEInputs({ ...tdeeInputs, activityLevel: v as ActivityLevel })}
                      options={[
                        { value: "sedentary", label: "Sjedilački (× 1.2)" },
                        { value: "light", label: "Lagana aktivnost (× 1.375)" },
                        { value: "moderate", label: "Umjerena aktivnost (× 1.55)" },
                        { value: "active", label: "Visoka aktivnost (× 1.725)" },
                        { value: "very_active", label: "Vrlo visoka aktivnost (× 1.9)" },
                      ]}
                    />
                  </div>
                  <div className="mt-6">
                    <CalcButton onClick={() => {
                      const result = calculateTDEE(tdeeInputs.bmr, tdeeInputs.activityLevel);
                      setTDEEResult(result);
                    }}>
                      Izračunaj TDEE
                    </CalcButton>
                  </div>
                </CalcCard>

                {tdeeResult !== null && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-4"
                  >
                    <CalcResult
                      label="Tvoj TDEE"
                      value={tdeeResult}
                      unit="kalorija/dan"
                      highlight
                    />
                    <CalcButton
                      variant={tdeeConfirmed ? "success" : "primary"}
                      onClick={() => {
                        setTDEEConfirmed(true);
                        setTargetInputs({ ...targetInputs, tdee: tdeeResult });
                        setCurrentSlide(slideOrder.indexOf("target-calc"));
                      }}
                    >
                      {tdeeConfirmed ? "✓ Potvrđeno" : "Potvrdi i nastavi →"}
                    </CalcButton>
                  </motion.div>
                )}

                <button
                  onClick={() => setShowTDEECalc(false)}
                  className="text-white/40 hover:text-white/70 text-sm transition-colors"
                >
                  ← Natrag na informacije
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </CalculatorScreen>
      ),
    },
    {
      id: "target-calc",
      title: "Target Calories Kalkulator",
      description: "Odredi koliko kalorija trebaš jesti da postigneš svoj cilj.",
      render: (
        <CalculatorScreen
          title="CILJANE KALORIJE"
          subtitle="Prilagođeni unos prema vašem cilju"
          step={3}
          totalSteps={4}
          onBack={prevSlide}
        >
          <AnimatePresence mode="wait">
            {!showTargetCalc ? (
              <motion.div
                key="info"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <CalcInfoCard title="Što su ciljane kalorije?">
                  Broj kalorija prilagođen vašem cilju - gubitak, održavanje ili dobitak težine.
                </CalcInfoCard>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <CalcCard>
                    <div className="text-center">
                      <div className="text-2xl text-white/30 mb-2">−500</div>
                      <div className="text-white/90 font-medium">Gubitak</div>
                      <div className="text-xs text-white/40 mt-1">~0.5 kg/tjedan</div>
                    </div>
                  </CalcCard>
                  <CalcCard>
                    <div className="text-center">
                      <div className="text-2xl text-white/30 mb-2">=</div>
                      <div className="text-white/90 font-medium">Održavanje</div>
                      <div className="text-xs text-white/40 mt-1">Stabilna težina</div>
                    </div>
                  </CalcCard>
                  <CalcCard>
                    <div className="text-center">
                      <div className="text-2xl text-white/30 mb-2">+500</div>
                      <div className="text-white/90 font-medium">Dobitak</div>
                      <div className="text-xs text-white/40 mt-1">~0.5 kg/tjedan</div>
                    </div>
                  </CalcCard>
                </div>
                
                <CalcButton onClick={() => setShowTargetCalc(true)}>
                  Pokreni kalkulator
                </CalcButton>
              </motion.div>
            ) : (
              <motion.div
                key="calc"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <CalcCard highlighted>
                  <div className="space-y-4">
                    <CalcInput
                      label="TDEE (iz prethodnog koraka)"
                      type="number"
                      value={targetInputs.tdee}
                      onChange={(v) => setTargetInputs({ ...targetInputs, tdee: parseInt(v) || 0 })}
                      unit="kcal"
                    />
                    <CalcSelect
                      label="Cilj"
                      value={targetInputs.goalType}
                      onChange={(v) => setTargetInputs({ ...targetInputs, goalType: v as GoalType })}
                      options={[
                        { value: "lose", label: "Gubitak težine (−500 kcal)" },
                        { value: "maintain", label: "Održavanje težine (= TDEE)" },
                        { value: "gain", label: "Povećanje težine (+500 kcal)" },
                      ]}
                    />
                  </div>
                  <div className="mt-6">
                    <CalcButton onClick={() => {
                      const result = calculateTargetCalories(targetInputs.tdee, targetInputs.goalType);
                      setTargetResult(result);
                    }}>
                      Izračunaj ciljane kalorije
                    </CalcButton>
                  </div>
                </CalcCard>

                {targetResult !== null && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-4"
                  >
                    <CalcResult
                      label={`Ciljane kalorije (${targetInputs.goalType === "lose" ? "Gubitak" : targetInputs.goalType === "gain" ? "Dobitak" : "Održavanje"})`}
                      value={targetResult}
                      unit="kalorija/dan"
                      highlight
                    />
                    <CalcButton
                      variant={targetConfirmed ? "success" : "primary"}
                      onClick={() => {
                        setTargetConfirmed(true);
                        setMacrosInputs({ 
                          ...macrosInputs, 
                          targetCalories: targetResult || macrosInputs.targetCalories,
                          goalType: targetInputs.goalType 
                        });
                        setCurrentSlide(slideOrder.indexOf("macros"));
                      }}
                    >
                      {targetConfirmed ? "✓ Potvrđeno" : "Potvrdi i nastavi →"}
                    </CalcButton>
                  </motion.div>
                )}

                <button
                  onClick={() => setShowTargetCalc(false)}
                  className="text-white/40 hover:text-white/70 text-sm transition-colors"
                >
                  ← Natrag na informacije
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </CalculatorScreen>
      ),
    },
    {
      id: "macros",
      title: "Makrosi (Makronutrijenti)",
      description: "Proteini, ugljikohidrati i masti - tri ključna elementa tvoje prehrane.",
      render: (
        <CalculatorScreen
          title="MAKRONUTRIJENTI"
          subtitle="Proteini, ugljikohidrati i masti - temelji prehrane"
          step={4}
          totalSteps={4}
          onBack={prevSlide}
        >
          <AnimatePresence mode="wait">
            {!showMacrosCalc ? (
              <motion.div
                key="info"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <CalcCard>
                    <div className="text-center">
                      <div className="text-3xl mb-2">🥩</div>
                      <h4 className="text-white/90 font-medium mb-2">Proteini</h4>
                      <div className="text-xs text-white/50">1g = 4 kcal</div>
                      <div className="text-xs text-white/40 mt-1">1.9-2.2g/kg</div>
                    </div>
                  </CalcCard>
                  <CalcCard>
                    <div className="text-center">
                      <div className="text-3xl mb-2">🍚</div>
                      <h4 className="text-white/90 font-medium mb-2">Ugljikohidrati</h4>
                      <div className="text-xs text-white/50">1g = 4 kcal</div>
                      <div className="text-xs text-white/40 mt-1">Ostatak kalorija</div>
                    </div>
                  </CalcCard>
                  <CalcCard>
                    <div className="text-center">
                      <div className="text-3xl mb-2">🥑</div>
                      <h4 className="text-white/90 font-medium mb-2">Masti</h4>
                      <div className="text-xs text-white/50">1g = 9 kcal</div>
                      <div className="text-xs text-white/40 mt-1">0.8-1.0g/kg</div>
                    </div>
                  </CalcCard>
                </div>
                
                <CalcButton onClick={() => setShowMacrosCalc(true)}>
                  Pokreni kalkulator
                </CalcButton>
              </motion.div>
            ) : (
              <motion.div
                key="calc"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <CalcCard highlighted>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <CalcInput
                      label="Ciljane kalorije"
                      type="number"
                      value={macrosInputs.targetCalories}
                      onChange={(v) => setMacrosInputs({ ...macrosInputs, targetCalories: parseInt(v) || 0 })}
                      unit="kcal"
                    />
                    <CalcInput
                      label="Težina"
                      type="number"
                      value={macrosInputs.weight}
                      onChange={(v) => setMacrosInputs({ ...macrosInputs, weight: parseFloat(v) || 0 })}
                      unit="kg"
                    />
                    <CalcSelect
                      label="Cilj"
                      value={macrosInputs.goalType}
                      onChange={(v) => setMacrosInputs({ ...macrosInputs, goalType: v as GoalType })}
                      options={[
                        { value: "lose", label: "Gubitak težine" },
                        { value: "maintain", label: "Održavanje" },
                        { value: "gain", label: "Dobitak mase" },
                      ]}
                    />
                  </div>
                  <div className="mt-6">
                    <CalcButton onClick={() => {
                      const result = calculateMacros(macrosInputs.targetCalories, macrosInputs.goalType, macrosInputs.weight);
                      setMacrosResult(result);
                      setFinalMacros({
                        calories: macrosInputs.targetCalories,
                        protein: result.protein,
                        carbs: result.carbs,
                        fat: result.fats,
                      });
                    }}>
                      Izračunaj makronutrijente
                    </CalcButton>
                  </div>
                </CalcCard>

                {macrosResult && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-4"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <CalcResult
                        label="Proteini"
                        value={`${macrosResult.protein}g`}
                        unit={macrosInputs.weight > 0 ? `${(macrosResult.protein / macrosInputs.weight).toFixed(1)}g/kg` : ""}
                      />
                      <CalcResult
                        label="Ugljikohidrati"
                        value={`${macrosResult.carbs}g`}
                        unit={macrosInputs.targetCalories > 0 ? `${Math.round((macrosResult.carbs * 4 / macrosInputs.targetCalories) * 100)}% kcal` : ""}
                      />
                      <CalcResult
                        label="Masti"
                        value={`${macrosResult.fats}g`}
                        unit={macrosInputs.weight > 0 ? `${(macrosResult.fats / macrosInputs.weight).toFixed(1)}g/kg` : ""}
                      />
                    </div>
                    
                    <CalcResult
                      label="Ukupno kalorija iz makrosa"
                      value={macrosResult.protein * 4 + macrosResult.carbs * 4 + macrosResult.fats * 9}
                      unit={`od ${macrosInputs.targetCalories} ciljanih`}
                      highlight
                    />
                    
                    <CalcButton
                      variant={macrosConfirmed ? "success" : "primary"}
                      onClick={() => {
                        setMacrosConfirmed(true);
                        setCurrentSlide(slideOrder.indexOf("contact"));
                      }}
                    >
                      {macrosConfirmed ? "✓ Potvrđeno" : "Potvrdi i nastavi →"}
                    </CalcButton>
                  </motion.div>
                )}

                <button
                  onClick={() => setShowMacrosCalc(false)}
                  className="text-white/40 hover:text-white/70 text-sm transition-colors"
                >
                  ← Natrag na informacije
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </CalculatorScreen>
      ),
    },
    {
      id: "contact",
      title: "Sažetak Kalkulacija",
      description: "Pregledaj svoje kalkulacije i spremi podatke.",
      render: (
        <CalculatorScreen
          title="SAŽETAK KALKULACIJA"
          subtitle="Vaši personalizirani rezultati"
          onBack={prevSlide}
        >
          <AnimatePresence mode="wait">
            {finalDataSubmitted ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-12 text-center"
              >
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  className="w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center mb-6"
                >
                  <svg className="w-10 h-10 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </motion.div>
                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-2xl md:text-3xl font-light text-white mb-4"
                >
                  Podaci su spremljeni!
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="text-white/50 mb-8"
                >
                  Sada možete generirati personalizirani plan prehrane.
                </motion.p>
                <CalcButton
                  onClick={() => setCurrentSlide(slideOrder.indexOf("meals"))}
                >
                  Idi na plan prehrane →
                </CalcButton>
              </motion.div>
            ) : (
              <motion.div
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                {/* Calculation Results Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <CalcResult
                    label="BMR"
                    value={bmrResult ? bmrResult.toFixed(0) : "—"}
                    unit="kcal"
                  />
                  <CalcResult
                    label="TDEE"
                    value={tdeeResult ? tdeeResult.toFixed(0) : "—"}
                    unit="kcal"
                  />
                  <CalcResult
                    label="Ciljane"
                    value={targetResult ? targetResult.toFixed(0) : "—"}
                    unit="kcal"
                    highlight
                  />
                  <CalcResult
                    label="Proteini"
                    value={macrosResult ? `${macrosResult.protein.toFixed(0)}g` : "—"}
                  />
                </div>

                {/* Macros breakdown */}
                {macrosResult && (
                  <CalcCard>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-light text-white">{macrosResult.protein.toFixed(0)}g</div>
                        <div className="text-xs text-white/40 mt-1">Proteini</div>
                      </div>
                      <div>
                        <div className="text-2xl font-light text-white">{macrosResult.carbs.toFixed(0)}g</div>
                        <div className="text-xs text-white/40 mt-1">Ugljikohidrati</div>
                      </div>
                      <div>
                        <div className="text-2xl font-light text-white">{macrosResult.fats.toFixed(0)}g</div>
                        <div className="text-xs text-white/40 mt-1">Masti</div>
                      </div>
                    </div>
                  </CalcCard>
                )}

                {/* Warning if not all calculated */}
                {(!bmrResult || !tdeeResult || !targetResult || !macrosResult) && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-center">
                    <p className="text-red-400 text-sm">
                      Molimo izračunajte sve kalkulacije prije spremanja podataka.
                    </p>
                  </div>
                )}

                {/* Submit Button */}
                <motion.button
                  onClick={submitFinalData}
                  disabled={isSubmittingFinalData || !bmrResult || !tdeeResult || !targetResult || !macrosResult}
                  whileHover={{ scale: 1.02, boxShadow: "0 0 30px rgba(255,255,255,0.2)" }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-4 bg-gradient-to-r from-white/10 to-white/5 border-2 border-white/40 text-white font-medium rounded-xl 
                             hover:border-white/60 hover:from-white/15 hover:to-white/10
                             disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100
                             transition-all duration-300"
                >
                  {isSubmittingFinalData ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Spremam...
                    </span>
                  ) : (
                    "Spremi podatke i nastavi →"
                  )}
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </CalculatorScreen>
      ),
    },
    {
      id: "meals",
      title: "Plan Prehrane",
      description: "Personalizirani tjedni meni prilagođen tvojim kalorijama i makrosima.",
      render: (
        <div className="flex flex-col h-full w-full min-h-0 overflow-y-auto">
          {weeklyMealPlan ? (
            // Prikaz samo plana prehrane
            <div className="flex-1 overflow-y-auto pb-32 px-1 min-h-0" style={{ paddingBottom: '10rem', height: '100%', maxHeight: 'none' }}>
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-3xl font-bold text-gray-900">Plan Prehrane</h2>
                <button
                  onClick={() => {
                    setWeeklyMealPlan(null);
                    setWeeklyPlanError(null);
                  }}
                  className="rounded-full bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-3 text-base font-semibold text-white transition hover:opacity-90 hover:shadow-xl"
                >
                  🆕 Novi plan prehrane
                </button>
              </div>

              {/* Prikaz tjednog plana */}
              <div className="space-y-6 pb-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-2xl font-bold text-gray-900 mb-2">Sedmodnevni Plan Prehrane</h4>
                    <p className="text-gray-600 text-sm">
                      Tjedan: {new Date(weeklyMealPlan.weekStartDate).toLocaleDateString('hr-HR', { 
                        day: 'numeric', 
                        month: 'long', 
                        year: 'numeric' 
                      })} - {new Date(new Date(weeklyMealPlan.weekStartDate).getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString('hr-HR', { 
                        day: 'numeric', 
                        month: 'long', 
                        year: 'numeric' 
                      })}
                    </p>
                  </div>
                </div>

                {/* Tjedni prosjek */}
                {weeklyMealPlan.weeklyAverage && (
                  <div className="rounded-2xl border border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100 p-4 shadow-lg">
                    <h5 className="text-lg font-semibold text-gray-900 mb-3">Tjedni Prosjek</h5>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-gray-500">Kalorije</p>
                        <p className="text-xl font-bold text-gray-900">{weeklyMealPlan.weeklyAverage.calories.toFixed(0)}</p>
                        <p className="text-xs text-gray-500">Dev: {weeklyMealPlan.weeklyAverage.deviation.calories.toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Proteini</p>
                        <p className="text-xl font-bold text-gray-900">{weeklyMealPlan.weeklyAverage.protein.toFixed(1)}g</p>
                        <p className="text-xs text-gray-500">Dev: {weeklyMealPlan.weeklyAverage.deviation.protein.toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Ugljikohidrati</p>
                        <p className="text-xl font-bold text-gray-900">{weeklyMealPlan.weeklyAverage.carbs.toFixed(1)}g</p>
                        <p className="text-xs text-gray-500">Dev: {weeklyMealPlan.weeklyAverage.deviation.carbs.toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Masti</p>
                        <p className="text-xl font-bold text-gray-900">{weeklyMealPlan.weeklyAverage.fat.toFixed(1)}g</p>
                        <p className="text-xs text-gray-500">Dev: {weeklyMealPlan.weeklyAverage.deviation.fat.toFixed(1)}%</p>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-300">
                      <p className="text-xs text-gray-600">
                        Ukupno odstupanje: <span className="text-base font-bold text-gray-900">{weeklyMealPlan.weeklyAverage.deviation.total.toFixed(1)}%</span>
                      </p>
                    </div>
                  </div>
                )}

                {/* Plan za svaki dan */}
                {weeklyMealPlan.days && weeklyMealPlan.days.length > 0 ? (
                  <div className="space-y-4">
                    {weeklyMealPlan.days.map((day: any, index: number) => {
                      const dayNames = ['Ponedjeljak', 'Utorak', 'Srijeda', 'Četvrtak', 'Petak', 'Subota', 'Nedjelja'];
                      const dayName = dayNames[index] || `Dan ${index + 1}`;
                      const date = day.date ? new Date(day.date).toLocaleDateString('hr-HR', { day: 'numeric', month: 'long' }) : '';
                      
                      const mealsArray = day.meals ? [
                        { name: 'Doručak', meal: day.meals.breakfast },
                        { name: 'Ručak', meal: day.meals.lunch },
                        { name: 'Večera', meal: day.meals.dinner },
                        { name: 'Užina', meal: day.meals.snack }
                      ].filter(item => item.meal) : [];

                      return (
                        <div key={day.date || `day-${index}`} className="p-4 rounded-lg border border-gray-200 bg-white/70 backdrop-blur-sm shadow-lg space-y-3">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="font-semibold text-lg text-gray-900">{dayName}</h3>
                            {date && <p className="text-sm text-gray-600">{date}</p>}
                            {day.total && (
                              <div className="text-right">
                                <p className="text-xs text-gray-500">Ukupno</p>
                                <p className="text-base font-bold text-gray-900">{day.total.calories?.toFixed(0) || 0} kcal</p>
                                <p className="text-xs text-gray-500">
                                  P: {day.total.protein?.toFixed(1) || 0}g | C: {day.total.carbs?.toFixed(1) || 0}g | M: {day.total.fat?.toFixed(1) || 0}g
                                </p>
                              </div>
                            )}
                          </div>
                          
                          <div className="grid gap-3 md:grid-cols-2">
                            {mealsArray.map((item, mealIndex) => (
                              item.meal && (
                                <div key={mealIndex} className="border border-gray-200 p-3 rounded-md bg-gray-50">
                                  <div className="font-medium text-gray-900 mb-2">{item.name}: {item.meal.name || 'N/A'}</div>
                                  <div className="text-sm text-gray-600 space-y-1">
                                    <div className="flex justify-between">
                                      <span>Kalorije:</span>
                                      <span className="font-medium">{item.meal.calories?.toFixed(0) || 0} kcal</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Proteini:</span>
                                      <span className="font-medium">{item.meal.protein?.toFixed(1) || 0}g</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Ugljikohidrati:</span>
                                      <span className="font-medium">{item.meal.carbs?.toFixed(1) || 0}g</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Masti:</span>
                                      <span className="font-medium">{item.meal.fat?.toFixed(1) || 0}g</span>
                                    </div>
                                  </div>
                                  {item.meal.score !== undefined && (
                                    <div className="mt-2 pt-2 border-t border-gray-200">
                                      <div className="flex justify-between text-xs">
                                        <span className="text-gray-500">Score:</span>
                                        <span className="font-semibold text-blue-600">{(item.meal.score * 100).toFixed(1)}%</span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </div>
          ) : !showMealPlan ? (
            <MealPlanWelcomeScreen 
              onNavigate={() => router.push("/app/meals")} 
              onBack={() => prevSlide()}
            />
          ) : (
            <div className="flex-1 overflow-y-auto pb-32 px-1 min-h-0 h-full" style={{ paddingBottom: '10rem', height: '100%', maxHeight: 'none' }}>
              <div className="rounded-[24px] bg-white/80 backdrop-blur-sm border-2 border-[#1A1A1A] p-6 shadow-xl flex flex-col w-full">
              <div className="flex justify-between items-center mb-4 flex-shrink-0">
                <h3 className="text-2xl font-semibold text-[#1A1A1A]">PRO Plan Prehrane</h3>
                <button
                  onClick={() => {
                    setShowMealPlan(false);
                    setGeneratedMealPlan(null);
                    setMealPlanError(null);
                  }}
                  className="text-gray-500 hover:text-[#1A1A1A] text-xl transition"
                >
                  ×
                </button>
              </div>
              
              {generatedMealPlan && (
                <div className="space-y-4">
                  {/* PRO Plan Format */}
                  {generatedMealPlan.breakfast ? (
                    <>
                      {/* Breakfast */}
                      <div className="rounded-[16px] bg-gray-50 p-4">
                        <h4 className="font-semibold text-gray-900 mb-3">🍳 Doručak: {generatedMealPlan.breakfast.name}</h4>
                        <div className="text-xs text-gray-600 mb-2">
                          {generatedMealPlan.breakfast.calories.toFixed(0)} kcal | P: {generatedMealPlan.breakfast.protein.toFixed(1)}g | U: {generatedMealPlan.breakfast.carbs.toFixed(1)}g | M: {generatedMealPlan.breakfast.fat.toFixed(1)}g
                        </div>
                        {generatedMealPlan.breakfast.score !== undefined && (
                          <div className="text-xs text-gray-500">
                            Score: {(generatedMealPlan.breakfast.score * 100).toFixed(1)}%
                          </div>
                        )}
                      </div>
                      
                      {/* Lunch */}
                      <div className="rounded-[16px] bg-gray-50 p-4">
                        <h4 className="font-semibold text-gray-900 mb-3">🍽️ Ručak: {generatedMealPlan.lunch.name}</h4>
                        <div className="text-xs text-gray-600 mb-2">
                          {generatedMealPlan.lunch.calories.toFixed(0)} kcal | P: {generatedMealPlan.lunch.protein.toFixed(1)}g | U: {generatedMealPlan.lunch.carbs.toFixed(1)}g | M: {generatedMealPlan.lunch.fat.toFixed(1)}g
                        </div>
                        {generatedMealPlan.lunch.score !== undefined && (
                          <div className="text-xs text-gray-500">
                            Score: {(generatedMealPlan.lunch.score * 100).toFixed(1)}%
                          </div>
                        )}
                      </div>
                      
                      {/* Dinner */}
                      <div className="rounded-[16px] bg-gray-50 p-4">
                        <h4 className="font-semibold text-gray-900 mb-3">🍲 Večera: {generatedMealPlan.dinner.name}</h4>
                        <div className="text-xs text-gray-600 mb-2">
                          {generatedMealPlan.dinner.calories.toFixed(0)} kcal | P: {generatedMealPlan.dinner.protein.toFixed(1)}g | U: {generatedMealPlan.dinner.carbs.toFixed(1)}g | M: {generatedMealPlan.dinner.fat.toFixed(1)}g
                        </div>
                        {generatedMealPlan.dinner.score !== undefined && (
                          <div className="text-xs text-gray-500">
                            Score: {(generatedMealPlan.dinner.score * 100).toFixed(1)}%
                          </div>
                        )}
                      </div>
                      
                      {/* Snack */}
                      <div className="rounded-[16px] bg-gray-50 p-4">
                        <h4 className="font-semibold text-gray-900 mb-3">🍎 Užina: {generatedMealPlan.snack.name}</h4>
                        <div className="text-xs text-gray-600 mb-2">
                          {generatedMealPlan.snack.calories.toFixed(0)} kcal | P: {generatedMealPlan.snack.protein.toFixed(1)}g | U: {generatedMealPlan.snack.carbs.toFixed(1)}g | M: {generatedMealPlan.snack.fat.toFixed(1)}g
                        </div>
                        {generatedMealPlan.snack.score !== undefined && (
                          <div className="text-xs text-gray-500">
                            Score: {(generatedMealPlan.snack.score * 100).toFixed(1)}%
                          </div>
                        )}
                      </div>
                      
                      {/* Total Summary */}
                      {generatedMealPlan.total && (
                        <div className="rounded-[16px] bg-[#1A1A1A] text-white p-4 mt-4">
                          <h4 className="font-semibold mb-3">📊 Ukupno dnevno</h4>
                          <div className="text-sm mb-2">
                            {generatedMealPlan.total.calories.toFixed(0)} kcal | P: {generatedMealPlan.total.protein.toFixed(1)}g | U: {generatedMealPlan.total.carbs.toFixed(1)}g | M: {generatedMealPlan.total.fat.toFixed(1)}g
                          </div>
                          {generatedMealPlan.total.deviation && (
                            <div className="text-xs text-gray-300">
                              Odstupanje: {generatedMealPlan.total.deviation.total.toFixed(1)}%
                            </div>
                          )}
                        </div>
                      )}
                      
                      <div className="text-center mt-4">
                        <button
                          onClick={() => {
                            const clientId = localStorage.getItem("clientId");
                            if (clientId) {
                              window.location.href = `/app/meals`;
                            }
                          }}
                          className="rounded-[16px] bg-[#1A1A1A] px-6 py-3 text-white font-semibold transition hover:bg-[#2A2A2A]"
                        >
                          Pregledaj Kompletan Plan →
                        </button>
                      </div>
                    </>
                  ) : (
                    // Legacy format (fallback)
                    <>
                  {generatedMealPlan.slice(0, 3).map((day: any, idx: number) => (
                    <div key={idx} className="rounded-[16px] bg-gray-50 p-4">
                      <h4 className="font-semibold text-gray-900 mb-3">Dan {day.day}</h4>
                      <div className="space-y-3 text-sm">
                        <div>
                          <span className="font-medium text-gray-700">Doručak: </span>
                          <span className="text-gray-600">{day.breakfast.foods.map((f: any) => `${f.name} (${f.amount}g)`).join(", ")}</span>
                          <div className="text-xs text-gray-500 mt-1">
                            {day.breakfast.totalCalories} kcal | P: {day.breakfast.totalProtein}g | U: {day.breakfast.totalCarbs}g | M: {day.breakfast.totalFats}g
                          </div>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Ručak: </span>
                          <span className="text-gray-600">{day.lunch.foods.map((f: any) => `${f.name} (${f.amount}g)`).join(", ")}</span>
                          <div className="text-xs text-gray-500 mt-1">
                            {day.lunch.totalCalories} kcal | P: {day.lunch.totalProtein}g | U: {day.lunch.totalCarbs}g | M: {day.lunch.totalFats}g
                          </div>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Večera: </span>
                          <span className="text-gray-600">{day.dinner.foods.map((f: any) => `${f.name} (${f.amount}g)`).join(", ")}</span>
                          <div className="text-xs text-gray-500 mt-1">
                            {day.dinner.totalCalories} kcal | P: {day.dinner.totalProtein}g | U: {day.dinner.totalCarbs}g | M: {day.dinner.totalFats}g
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="text-xs text-gray-500 text-center">
                    (Prikazano prvih 3 dana. Kompletan plan ima 7 dana)
                  </div>
                    </>
                  )}
                  
                  <p className="text-lg font-semibold text-gray-900 text-center mt-4" style={{ fontFamily: "var(--font-montserrat), sans-serif" }}>
                    Dobar tek! 🍽️
                  </p>
                </div>
              )}
            </div>
            </div>
          )}

          {/* Gumb za otvaranje stranice plana prehrane - SAKRIVEN KADA JE PLAN GENERIRAN */}
          {!weeklyMealPlan && (
            <div className="mt-6 mb-4 px-1">
              <button
                onClick={() => {
                  if (typeof window !== "undefined" && router) {
                    router.push("/app/meals");
                  } else {
                    window.location.href = "/app/meals";
                  }
                }}
                className="w-full rounded-[16px] px-6 py-4 text-lg font-bold text-white bg-[#1A1A1A] hover:bg-[#2A2A2A] transition hover:-translate-y-0.5 hover:shadow-xl"
                style={{ minHeight: '56px' }}
              >
                📋 Generiraj plan
              </button>
            </div>
          )}

          {/* Gumb za generiranje tjednog plana prehrane (7 dana) - SAKRIVEN KADA JE PLAN GENERIRAN */}
          {!weeklyMealPlan && (
          <div className="mt-6 mb-4 rounded-[24px] bg-gradient-to-r from-purple-50 to-purple-100 border-2 border-purple-300 p-6 shadow-xl flex-shrink-0" id="weekly-plan-generator">
            <h3 className="text-xl font-bold text-[#1A1A1A] mb-3">Tjedni PRO Plan Prehrane (7 dana)</h3>
                <p className="text-sm text-gray-700 mb-4">
                  Generiraj kompletan tjedni plan prehrane (7 dana) sa raznolikošću i optimizacijom makronutrijenata sukladno tvojim unesenim vrijednostima.
                </p>
                <button
                  onClick={async () => {
                    const clientId = localStorage.getItem("clientId");
                    if (!clientId) {
                      setWeeklyPlanError("Prvo moraš izračunati svoje kalorije i makroe. Provjeri da li si prijavljen.");
                      return;
                    }

                    setGeneratingWeeklyPlan(true);
                    setWeeklyPlanError(null);

                    try {
                      const response = await fetch("/api/meal-plan/pro/weekly", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ userId: clientId }),
                      });

                      if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}));
                        throw new Error(errorData.message || "Greška pri generiranju tjednog plana");
                      }

                      const data = await response.json();

                      console.log("📦 API Response:", data);
                      console.log("📋 Plan data:", data.plan);
                      console.log("📊 Plan days:", data.plan?.days?.length);

                      if (!data.ok || !data.plan) {
                        throw new Error(data.message || "Tjedni plan nije generiran");
                      }

                      setWeeklyMealPlan(data.plan);
                      console.log("✅ Plan postavljen u state:", data.plan);
                    } catch (error) {
                      console.error("Error generating weekly meal plan:", error);
                      setWeeklyPlanError(error instanceof Error ? error.message : "Greška pri generiranju tjednog plana");
                    } finally {
                      setGeneratingWeeklyPlan(false);
                    }
                  }}
                  disabled={generatingWeeklyPlan}
                  className={clsx(
                    "w-full rounded-[16px] px-6 py-4 text-lg font-bold text-white transition hover:-translate-y-0.5 hover:shadow-xl",
                    generatingWeeklyPlan
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
                  )}
                  style={{ minHeight: '56px' }}
                >
                  {generatingWeeklyPlan ? "⏳ Generiram tjedni plan (7 dana)..." : "✓ Generiraj tjedni plan prehrane (7 dana)"}
                </button>

                {/* Prikaz greške */}
                {weeklyPlanError && (
                  <div className="mt-4 p-4 rounded-[12px] bg-red-50 border border-red-200">
                    {weeklyPlanError.includes("Nisu pronađene kalkulacije") || weeklyPlanError.includes("kalkulacije") ? (
                      <div>
                        <p className="text-sm font-semibold text-red-700 mb-2">
                          Prvo popuni kalkulator da izračunamo tvoj plan.
                        </p>
                        <p className="text-xs text-red-600 mb-3">
                          Idi na{" "}
                          <a href="/app/calculator" className="underline font-semibold">
                            Kalkulator Kalorija
                          </a>{" "}
                          i izračunaj svoje dnevne potrebe za kalorijama i makronutrijentima.
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-red-600">{weeklyPlanError}</p>
                    )}
                  </div>
                )}
              </div>
          )}

        </div>
      ),
    },
    {
      id: "training",
      title: "Plan Treninga",
      description: "Personalizirani plan treninga prilagođen tvojim ciljevima i aktivnostima.",
      render: (
        <div className="h-full overflow-y-auto flex flex-col min-h-0">
          {!showTrainingPlan ? (
            <div className="flex-1 overflow-y-auto space-y-6">
              <div className="rounded-[24px] bg-white/80 backdrop-blur-sm border border-[#E8E8E8] p-6 shadow-lg">
                <h3 className="text-xl font-semibold text-[#1A1A1A] mb-3">Što uključuje</h3>
                <ul className="space-y-2 text-sm text-gray-600 mb-4">
                  <li>• <strong>Zagrijavanje</strong> - 3 opcije (treadmill, bike, bodyweight)</li>
                  <li>• <strong>Vježbe</strong> - s mogućnošću slikanja sprava, ponavljanjima, setovima i odmorom</li>
                  <li>• <strong>Alternative</strong> - zamjenske vježbe za svaku vježbu</li>
                  <li>• <strong>4 serije do otkaza</strong> - za sve vježbe</li>
                  <li>• <strong>Trbuh na kraju</strong> - svaki trening završava s trbušnjacima</li>
                  <li>• <strong>Procijenjene kalorije</strong> - koliko sagoriš po treningu</li>
                </ul>
              </div>

              <div className="rounded-[24px] bg-white/80 backdrop-blur-sm border border-[#E8E8E8] p-6 shadow-lg">
                <h3 className="text-xl font-semibold text-[#1A1A1A] mb-3">Tipovi treninga</h3>
                <ul className="space-y-2 text-sm text-gray-600 mb-4">
                  <li>• <strong>Push/Pull/Legs</strong> - Split za teretanu (3 ili 5 dana)</li>
                  <li>• <strong>Kružni trening - Teretana</strong> - Po spravama</li>
                  <li>• <strong>Kružni trening - Vlastito tijelo</strong> - Bodyweight + Tabata</li>
                </ul>
              </div>

              {/* Odabir opcija za plan treninga */}
              <div className="rounded-[24px] bg-white/80 backdrop-blur-sm border-2 border-[#1A1A1A] p-6 shadow-xl">
                <div className="space-y-4">
                  <div className="text-center">
                    <h3 className="text-xl font-semibold text-[#1A1A1A] mb-2">Kreiraj Plan Treninga</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Odaberi tip treninga, split, učestalost i spol.
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-[#1A1A1A] mb-2">Tip Treninga</label>
                    <div className="grid grid-cols-3 gap-3">
                      <button
                        onClick={() => setTrainingType("gym")}
                        className={`rounded-[16px] border-2 p-3 text-center transition ${
                          trainingType === "gym"
                            ? "border-[#1A1A1A] bg-[#1A1A1A] text-white"
                            : "border-[#E8E8E8] bg-white text-[#1A1A1A] hover:border-[#1A1A1A]"
                        }`}
                      >
                        <div className="font-semibold text-sm">Teretana</div>
                        <div className="text-xs mt-1 opacity-80">Split</div>
                      </button>
                      <button
                        onClick={() => setTrainingType("circuit-gym")}
                        className={`rounded-[16px] border-2 p-3 text-center transition ${
                          trainingType === "circuit-gym"
                            ? "border-[#1A1A1A] bg-[#1A1A1A] text-white"
                            : "border-[#E8E8E8] bg-white text-[#1A1A1A] hover:border-[#1A1A1A]"
                        }`}
                      >
                        <div className="font-semibold text-sm">Kružni</div>
                        <div className="text-xs mt-1 opacity-80">Sprave</div>
                      </button>
                      <button
                        onClick={() => setTrainingType("circuit-bodyweight")}
                        className={`rounded-[16px] border-2 p-3 text-center transition ${
                          trainingType === "circuit-bodyweight"
                            ? "border-[#1A1A1A] bg-[#1A1A1A] text-white"
                            : "border-[#E8E8E8] bg-white text-[#1A1A1A] hover:border-[#1A1A1A]"
                        }`}
                      >
                        <div className="font-semibold text-sm">Kružni</div>
                        <div className="text-xs mt-1 opacity-80">Tijelo</div>
                      </button>
                    </div>
                  </div>

                  {trainingType === "gym" && (
                      <div>
                      <div>
                        <label className="block text-sm font-medium text-[#1A1A1A] mb-2">Split</label>
                        <select
                          value={trainingSplit}
                          onChange={(e) => setTrainingSplit(e.target.value as TrainingSplit)}
                          className="w-full rounded-[16px] border border-[#E8E8E8] bg-white px-4 py-3 text-[#1A1A1A] focus:border-[#1A1A1A] focus:outline-none transition-colors"
                        >
                          <option value="push-pull-legs">Push/Pull/Legs</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-[#1A1A1A] mb-2">Učestalost</label>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            onClick={() => setTrainingFrequency("3-days")}
                            className={`rounded-[16px] border-2 p-3 text-center transition ${
                              trainingFrequency === "3-days"
                                ? "border-gray-900 bg-gray-900 text-white"
                                : "border-gray-300 bg-white text-gray-900 hover:border-gray-400"
                            }`}
                          >
                            <div className="font-semibold">3 dana</div>
                          </button>
                          <button
                            onClick={() => setTrainingFrequency("5-days")}
                            className={`rounded-[16px] border-2 p-3 text-center transition ${
                              trainingFrequency === "5-days"
                                ? "border-gray-900 bg-gray-900 text-white"
                                : "border-gray-300 bg-white text-gray-900 hover:border-gray-400"
                            }`}
                          >
                            <div className="font-semibold">5 dana</div>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-[#1A1A1A] mb-2">Spol</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setTrainingGender("male")}
                        className={`rounded-[16px] border-2 p-3 text-center transition ${
                          trainingGender === "male"
                            ? "border-[#1A1A1A] bg-[#1A1A1A] text-white"
                            : "border-[#E8E8E8] bg-white text-[#1A1A1A] hover:border-[#1A1A1A]"
                        }`}
                      >
                        <div className="font-semibold">Muškarac</div>
                      </button>
                      <button
                        onClick={() => setTrainingGender("female")}
                        className={`rounded-[16px] border-2 p-3 text-center transition ${
                          trainingGender === "female"
                            ? "border-[#1A1A1A] bg-[#1A1A1A] text-white"
                            : "border-[#E8E8E8] bg-white text-[#1A1A1A] hover:border-[#1A1A1A]"
                        }`}
                      >
                        <div className="font-semibold">Žena</div>
                      </button>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => {
                      const plan = generateTrainingPlan(
                        trainingSplit,
                        typeof trainingFrequency === "string" && (trainingFrequency === "3-days" || trainingFrequency === "5-days") ? trainingFrequency : "3-days",
                        trainingType,
                        trainingGender
                      );
                      setGeneratedTrainingPlan(plan);
                      setShowTrainingPlan(true);
                      setSelectedWorkout(0);
                    }}
                    className="w-full rounded-[16px] bg-[#1A1A1A] px-6 py-3 text-white font-semibold transition hover:-translate-y-0.5 hover:shadow-lg"
                  >
                    ✓ Generiraj Plan Treninga
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-[24px] bg-white/80 backdrop-blur-sm border-2 border-[#1A1A1A] p-6 shadow-xl h-full overflow-y-auto flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-2xl font-semibold text-[#1A1A1A]">{generatedTrainingPlan?.nameHr}</h3>
                <button
                  onClick={() => {
                    setShowTrainingPlan(false);
                    setSelectedWorkout(null);
                  }}
                  className="text-gray-500 hover:text-[#1A1A1A] text-xl transition"
                >
                  ×
                </button>
              </div>
              
              {generatedTrainingPlan && (
                <div className="space-y-4">
                  {/* Odabir treninga */}
                  <div>
                    <label className="block text-sm font-medium text-[#1A1A1A] mb-2">Odaberi Trening</label>
                    <div className="grid grid-cols-3 gap-2">
                      {generatedTrainingPlan.workouts.map((workout, idx) => (
                        <button
                          key={workout.id}
                          onClick={() => setSelectedWorkout(idx)}
                          className={`rounded-[16px] border-2 p-3 text-center transition ${
                            selectedWorkout === idx
                              ? "border-gray-900 bg-gray-900 text-white"
                              : "border-gray-300 bg-white text-gray-900 hover:border-gray-400"
                          }`}
                        >
                          <div className="font-semibold text-sm">{workout.nameHr}</div>
                          <div className="text-xs mt-1 opacity-80">Dan {workout.day}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Prikaz odabranog treninga */}
                  {selectedWorkout !== null && generatedTrainingPlan.workouts[selectedWorkout] && (
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {(() => {
                        const workout = generatedTrainingPlan.workouts[selectedWorkout];
                        return (
                          <div>
                            <div className="rounded-[16px] bg-gray-50 p-4">
                              <h4 className="font-semibold text-gray-900 mb-2">Zagrijavanje</h4>
                              <p className="text-sm text-gray-600">
                                {workout.warmup.type === "treadmill" && "🏃 Treadmill"}
                                {workout.warmup.type === "bike" && "🚴 Bicikl"}
                                {workout.warmup.type === "bodyweight" && "🤸 Bodyweight"}
                                {" - "}{workout.warmup.duration} minuta
                              </p>
                            </div>

                            <div>
                              <h4 className="font-semibold text-gray-900 mb-3">Vježbe</h4>
                              <div className="space-y-3">
                                {workout.exercises.map((ex, idx) => (
                                  <div key={idx} className="rounded-[16px] bg-gray-50 p-4 border border-gray-200">
                                    <div className="flex justify-between items-start mb-2">
                                      <div>
                                        <h5 className="font-semibold text-gray-900">{ex.exercise.nameHr}</h5>
                                        <p className="text-xs text-gray-500">{ex.exercise.muscleGroupHr} · {ex.exercise.equipmentHr}</p>
                                      </div>
                                      <button
                                        className="text-xs text-gray-500 hover:text-gray-900 underline"
                                        onClick={() => {
                                          // TODO: Implementirati upload slike sprave
                                          alert("Funkcionalnost za slikanje sprave će biti dodana.");
                                        }}
                                      >
                                        📷 Slikaj spravu
                                      </button>
                                    </div>
                                    <div className="text-sm text-gray-600 space-y-1">
                                      <p>{ex.sets} serije × {ex.reps}</p>
                                      <p>Odmor: {ex.restSeconds} sekundi</p>
                                    </div>
                                    {ex.alternatives.length > 0 && (
                                      <div className="mt-2">
                                        <p className="text-xs font-medium text-gray-700 mb-1">Alternative:</p>
                                        <div className="flex flex-wrap gap-2">
                                          {ex.alternatives.map((alt, altIdx) => (
                                            <span key={altIdx} className="text-xs bg-gray-200 px-2 py-1 rounded">
                                              {alt.nameHr}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div>
                              <h4 className="font-semibold text-gray-900 mb-3">Trbuh</h4>
                              <div className="space-y-3">
                                {workout.coreExercises.map((ex, idx) => (
                                  <div key={idx} className="rounded-[16px] bg-gray-50 p-4 border border-gray-200">
                                    <div className="flex justify-between items-start mb-2">
                                      <div>
                                        <h5 className="font-semibold text-gray-900">{ex.exercise.nameHr}</h5>
                                        <p className="text-xs text-gray-500">{ex.exercise.muscleGroupHr}</p>
                                      </div>
                                    </div>
                                    <div className="text-sm text-gray-600 space-y-1">
                                      <p>{ex.sets} serije × {ex.reps}</p>
                                      <p>Odmor: {ex.restSeconds} sekundi</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="rounded-[16px] bg-gray-900 text-white p-4 text-center">
                              <div className="text-sm opacity-80 mb-1">Procijenjene kalorije</div>
                              <div className="text-2xl font-bold">{workout.estimatedCalories}</div>
                              <div className="text-xs opacity-70 mt-1">kcal</div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      ),
    },
    {
      id: "chat",
      title: "AI Chat",
      description: "Pitaj bilo što o prehrani, treningu i zdravom načinu života.",
      render: (
        <div className="space-y-6">
          <div className="rounded-[16px] bg-white/60 backdrop-blur-sm border border-gray-200 p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Kako funkcionira</h3>
            <p className="text-gray-600 text-sm mb-4">
              AI asistent je dostupan 24/7 da odgovori na tvoja pitanja. Koristi tvoje podatke 
              (ciljeve, aktivnosti, izračune) da ti da personalizirane odgovore.
            </p>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• Pitanja o kalorijama i makrosima</li>
              <li>• Savjeti za trening i oporavak</li>
              <li>• Prehrambene preporuke</li>
              <li>• Odgovori na specifična pitanja</li>
            </ul>
          </div>

          <div className="rounded-[16px] bg-white/60 backdrop-blur-sm border border-gray-200 p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Povijest razgovora</h3>
            <p className="text-gray-600 text-sm mb-4">
              Svi razgovori se spremaju, tako da možeš lako pronaći prethodne odgovore i 
              pratiti svoj napredak kroz vrijeme.
            </p>
          </div>

          <div className="rounded-[16px] bg-gradient-to-r from-gray-900 to-gray-700 p-6 text-white">
            <h3 className="text-xl font-semibold mb-3">Gotovo!</h3>
            <p className="text-sm opacity-90 mb-4">
              Uspješno si prošao/la kroz sve alate i funkcionalnosti. Sada možeš nastaviti s 
              plaćanjem i postavljanjem računa za pristup aplikaciji.
            </p>
            <p className="text-xs opacity-70">
              Klikni "Dalje → Plaćanje" da nastaviš s plaćanjem i aktivacijom računa.
            </p>
          </div>
        </div>
      ),
    },
  ];
}
