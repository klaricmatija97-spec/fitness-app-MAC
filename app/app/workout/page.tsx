"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Tipovi
interface AlternativeExercise {
  name: string;
  nameHr: string;
  equipment: string;
  reason: string;
}

interface ExerciseParams {
  name: string;
  nameHr: string;
  sets: number;
  reps: string;
  restSeconds: number;
  rpe: number;
  loadPercent?: string;
  equipment?: string;
  description?: string;
  musclesWorked?: string;
  tips?: string[];
  commonMistakes?: string[];
  alternatives?: AlternativeExercise[];
  // Iz wrkout baze
  wrkoutInstructions?: string[];
  primaryMuscles?: string[];
  secondaryMuscles?: string[];
  level?: string;
  force?: string;
}

interface CardioSession {
  type: "trčanje" | "hodanje";
  duration: number;
  protocol: string;
  intensity: string;
  notes?: string;
}

interface PlyometricsSession {
  exercises: {
    name: string;
    nameHr: string;
    sets: number;
    reps: string;
    rest: number;
    notes?: string;
  }[];
  totalDuration: number;
}

interface WorkoutDay {
  dayIndex: number;
  dayName: string;
  type: string;
  splitName?: string;
  exercises?: ExerciseParams[];
  cardio?: CardioSession;
  plyometrics?: PlyometricsSession;
  estimatedDuration: number;
}

interface WorkoutPlan {
  userId?: string;
  createdAt: string;
  userProfile: {
    gender: string;
    age: number;
    weight: number;
    height: number;
    level: string;
    primaryGoal: string;
  };
  programType: string;
  daysPerWeek: number;
  sessionDuration: number;
  days: WorkoutDay[];
  weeklyVolume: {
    strengthDays: number;
    cardioDays: number;
    plyometricsDays: number;
    totalMinutes: number;
  };
  recommendations: string[];
}

interface AvailableProgram {
  id: string;
  name: string;
  description: string;
}

// Oznake za tipove dana (za buduću uporabu)
const _dayTypeLabels: Record<string, string> = {
  "Push": "P",
  "Pull": "L",
  "Legs": "N",
  "Upper": "G",
  "Lower": "D",
  "Full Body A": "A",
  "Full Body B": "B",
  "Glute dominant": "🍑",
  "Legs mix": "🦿",
  "cardio": "🏃",
  "strength": "🏋️",
};

// Urbane pozadinske slike
const URBAN_IMAGES = [
  "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1920&q=80",
  "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=1920&q=80",
  "https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=1920&q=80",
  "https://images.unsplash.com/photo-1558611848-73f7eb4001a1?w=1920&q=80",
];

export default function WorkoutPage() {
  const [workoutPlan, setWorkoutPlan] = useState<WorkoutPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState(0);
  const [selectedExercise, setSelectedExercise] = useState<ExerciseParams | null>(null);
  const [planKey, setPlanKey] = useState(0);
  const [bgIndex, setBgIndex] = useState(0);
  const [clientId, setClientId] = useState<string | null>(null);
  const [userDataLoaded, setUserDataLoaded] = useState(false);
  
  // Form state za generiranje
  const [showWelcome, setShowWelcome] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [availablePrograms, setAvailablePrograms] = useState<AvailableProgram[]>([]);
  const [formData, setFormData] = useState({
    gender: "muško" as "muško" | "žensko",
    age: 30,
    height: 175,
    weight: 80,
    level: "srednji" as "početnik" | "srednji" | "napredni",
    primaryGoal: "povećati mišićnu masu",
    trainingDaysPerWeek: 3 as 2 | 3 | 4 | 5 | 6,
    sessionDuration: 60 as 30 | 45 | 60 | 75 | 90,
    selectedProgram: "",
    wantsCardio: false,
    cardioType: "trčanje" as "trčanje" | "hodanje",
    wantsPlyometrics: false,
  });

  // Dohvati clientId iz localStorage
  useEffect(() => {
    const id = localStorage.getItem("clientId");
    setClientId(id);
  }, []);

  // Dohvati korisničke podatke iz baze
  useEffect(() => {
    const fetchUserData = async () => {
      if (!clientId || userDataLoaded) return;
      try {
        const res = await fetch(`/api/workout-plan/user-data?userId=${clientId}`);
        const data = await res.json();
        if (data.success && data.userData) {
          setFormData(prev => ({
            ...prev,
            gender: data.userData.gender,
            age: data.userData.age,
            height: data.userData.height,
            weight: data.userData.weight,
            level: data.userData.level,
            primaryGoal: data.userData.primaryGoal,
            trainingDaysPerWeek: data.userData.trainingDaysPerWeek,
            sessionDuration: data.userData.sessionDuration,
          }));
          setUserDataLoaded(true);
        }
      } catch (err) {
        console.error("Error fetching user data:", err);
      }
    };
    fetchUserData();
  }, [clientId, userDataLoaded]);

  // Rotacija pozadinskih slika
  useEffect(() => {
    const interval = setInterval(() => {
      setBgIndex(prev => (prev + 1) % URBAN_IMAGES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Dohvati dostupne programe kad se spol promijeni
  useEffect(() => {
    const fetchPrograms = async () => {
      try {
        const res = await fetch(`/api/workout-plan/generate?gender=${formData.gender}`);
        const data = await res.json();
        if (data.success) {
          setAvailablePrograms(data.programs);
          if (data.programs.length > 0 && !formData.selectedProgram) {
            setFormData(prev => ({ ...prev, selectedProgram: data.programs[0].id }));
          }
        }
      } catch (err) {
        console.error("Error fetching programs:", err);
      }
    };
    fetchPrograms();
  }, [formData.gender]);

  const generateWorkoutPlan = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/workout-plan/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Greška pri generiranju plana");
      }

      setWorkoutPlan(data.plan);
      setPlanKey(prev => prev + 1);
      setSelectedDay(0);
      setShowForm(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Greška pri generiranju plana";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Urbana pozadinska slika */}
      <AnimatePresence mode="wait">
        <motion.div 
          key={bgIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.5 }}
          className="fixed inset-0 z-0"
          style={{
            backgroundImage: `url(${URBAN_IMAGES[bgIndex]})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'brightness(0.15)',
          }}
        />
      </AnimatePresence>
      
      {/* Overlay gradient */}
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-black/60 via-black/40 to-black/80" />

      {/* Top Navigation Bar */}
      <div className="sticky top-0 z-30 bg-black/80 backdrop-blur-md border-b border-white/10">
        <div className="mx-auto max-w-4xl px-4 py-4 flex items-center justify-between">
          <a 
            href="/app" 
            className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm font-medium">Natrag</span>
          </a>
          
          {/* CORPEX Logo - BIJELO */}
          <div className="absolute left-1/2 -translate-x-1/2">
            <span className="text-lg font-bold tracking-[0.2em] text-white">
              CORPEX
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            <a href="/app/meals" className="text-xs text-white/50 hover:text-white">Prehrana</a>
            <span className="text-white/20">|</span>
            <a href="/app/profile" className="text-xs text-white/50 hover:text-white">Profil</a>
          </div>
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-4xl px-4 py-8">
        {/* WELCOME SCREEN */}
        <AnimatePresence mode="wait">
          {showWelcome && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -30 }}
              className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4"
            >
              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="text-3xl md:text-5xl font-bold text-white mb-8 tracking-wide"
              >
                DOBRODOŠLI U GENERATOR TRENINGA
              </motion.h1>
              
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.8 }}
                className="max-w-2xl mb-12"
              >
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7, duration: 0.6 }}
                  className="text-white/70 text-lg md:text-xl leading-relaxed mb-6"
                >
                  Naš sustav analizira vaše ciljeve, iskustvo i preferencije te automatski izrađuje personalizirani plan treninga.
                </motion.p>
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.0, duration: 0.6 }}
                  className="text-white/60 text-base md:text-lg leading-relaxed"
                >
                  Dizajniran je da vam pomogne pri odabiru idealnog tipa treninga i pomogne vam napredovati u potpunosti samostalno, brže i učinkovitije.
                </motion.p>
              </motion.div>
              
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.4, duration: 0.5 }}
                whileHover={{ scale: 1.05, boxShadow: "0 0 40px rgba(255,255,255,0.2)" }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setShowWelcome(false);
                  setShowForm(true);
                }}
                className="px-12 py-4 bg-transparent border border-white/50 text-white font-semibold text-lg rounded-full hover:bg-white/10 transition-all duration-300"
                style={{ boxShadow: "0 0 20px rgba(255,255,255,0.1)" }}
              >
                ZAPOČNI
              </motion.button>
              
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 1.6, duration: 0.8 }}
                className="mt-16 w-32 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* PROGRAM SELECTION */}
        <AnimatePresence mode="wait">
          {showForm && !showWelcome && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            >
              {/* Header */}
              <div className="mb-10 text-center">
                <motion.h1 
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-3xl font-bold text-white mb-2"
                >
                  Odaberi Program
                </motion.h1>
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-white/50"
                >
                  Personalizirano prema tvojim podacima
                </motion.p>
              </div>

              {/* Error */}
              {error && (
                <div className="mb-6 p-4 bg-red-900/50 border border-red-500/50 rounded-xl backdrop-blur-sm">
                  <p className="text-white text-sm">{error}</p>
                </div>
              )}

              <div className="space-y-8">
                {/* Spol toggle */}
                <div className="flex justify-center gap-4">
                  <button
                    onClick={() => setFormData({ ...formData, gender: "muško", selectedProgram: "" })}
                    className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                      formData.gender === "muško"
                        ? "bg-white/80 text-black"
                        : "bg-white/10 text-white/70 hover:bg-white/15"
                    }`}
                  >
                    Muško
                  </button>
                  <button
                    onClick={() => setFormData({ ...formData, gender: "žensko", selectedProgram: "" })}
                    className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                      formData.gender === "žensko"
                        ? "bg-white/80 text-black"
                        : "bg-white/10 text-white/70 hover:bg-white/15"
                    }`}
                  >
                    Žensko
                  </button>
                </div>

                {/* Program Cards */}
                <motion.div 
                  className="grid grid-cols-1 md:grid-cols-2 gap-4"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  {availablePrograms.map((program) => (
                    <motion.div
                      key={program.id}
                      whileHover={{ scale: 1.02, y: -3 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setFormData({ ...formData, selectedProgram: program.id })}
                      className={`relative cursor-pointer rounded-2xl overflow-hidden backdrop-blur-md transition-all ${
                        formData.selectedProgram === program.id
                          ? "bg-white/10 border border-white/60 shadow-lg shadow-white/5"
                          : "bg-white/5 border border-white/15 hover:bg-white/8 hover:border-white/25"
                      }`}
                    >
                      <div className="p-7 min-h-[160px] flex flex-col justify-center">
                        <h3 className="text-lg font-semibold text-white/90 mb-3">
                          {program.name}
                        </h3>
                        <p className="text-sm text-white/50 leading-relaxed">
                          {program.description}
                        </p>
                        
                        {formData.selectedProgram === program.id && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute top-4 right-4 w-6 h-6 bg-white/80 rounded-full flex items-center justify-center"
                          >
                            <svg className="w-3.5 h-3.5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </motion.div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </motion.div>

                {/* Generate Button */}
                <motion.button
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  whileHover={{ 
                    scale: 1.02,
                    boxShadow: "0 0 25px rgba(255,255,255,0.15)"
                  }}
                  whileTap={{ 
                    scale: 0.98,
                    boxShadow: "0 0 40px rgba(255,255,255,0.25)"
                  }}
                  onClick={generateWorkoutPlan}
                  disabled={loading || !formData.selectedProgram}
                  className="w-full py-4 bg-transparent border border-white/50 text-white/90 font-semibold text-lg rounded-2xl hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  style={{ boxShadow: "0 0 15px rgba(255,255,255,0.05)" }}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Generiram...
                    </span>
                  ) : (
                    "GENERIRAJ PLAN"
                  )}
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Plan */}
        <AnimatePresence mode="wait">
          {workoutPlan && !showForm && (
            <motion.div
              key={planKey}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ type: "spring", stiffness: 300, damping: 30, mass: 0.8 }}
            >
              {/* Info kartica */}
              <motion.div 
                className="mb-4 p-4 bg-slate-800/50 border border-slate-700 rounded-xl"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Tvoj program</p>
                  <span className="text-xs px-2 py-1 rounded-full bg-violet-900/50 text-violet-400 border border-violet-800">
                    {workoutPlan.programType}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-slate-500">Cilj:</span>
                    <p className="text-white font-medium">{workoutPlan.userProfile.primaryGoal}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Razina:</span>
                    <p className="text-white font-medium capitalize">{workoutPlan.userProfile.level}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Dana tjedno:</span>
                    <p className="text-white font-medium">{workoutPlan.daysPerWeek}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Ukupno min/tjedan:</span>
                    <p className="text-white font-medium">{workoutPlan.weeklyVolume.totalMinutes}</p>
                  </div>
                </div>
              </motion.div>

              {/* Dani */}
              <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
                {workoutPlan.days.map((day, index) => (
                  <motion.button
                    key={day.dayIndex}
                    onClick={() => setSelectedDay(index)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`px-4 py-2 text-sm rounded-lg whitespace-nowrap transition-all ${
                      selectedDay === index
                        ? "bg-violet-600 text-white shadow-lg shadow-violet-500/30"
                        : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white border border-slate-700"
                    }`}
                  >
                    {day.dayName}
                  </motion.button>
                ))}
              </div>

              {/* Odabrani dan */}
              <AnimatePresence mode="wait">
                {workoutPlan.days[selectedDay] && (
                  <motion.div
                    key={selectedDay}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  >
                    {/* Dan header */}
                    <div className="flex justify-between items-center py-3 mb-4">
                      <div>
                        <h2 className="text-lg font-semibold text-white">
                          {workoutPlan.days[selectedDay].splitName || workoutPlan.days[selectedDay].type}
                        </h2>
                        <p className="text-xs text-slate-500">{workoutPlan.days[selectedDay].dayName} • {workoutPlan.days[selectedDay].estimatedDuration} min</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-white font-medium">~{workoutPlan.days[selectedDay].estimatedDuration} min</p>
                        <p className="text-xs text-slate-500">procijenjeno trajanje</p>
                      </div>
                    </div>

                    {/* Vježbe */}
                    {workoutPlan.days[selectedDay].exercises && workoutPlan.days[selectedDay].exercises!.length > 0 && (
                      <div className="mb-6">
                        <p className="text-xs text-slate-500 uppercase tracking-wide mb-3">Vježbe snage</p>
                        <motion.div 
                          className="space-y-3"
                          initial="hidden"
                          animate="visible"
                          variants={{
                            hidden: { opacity: 0 },
                            visible: {
                              opacity: 1,
                              transition: { staggerChildren: 0.08, delayChildren: 0.1 }
                            }
                          }}
                        >
                          {workoutPlan.days[selectedDay].exercises!.map((exercise, idx) => (
                            <ExerciseTile 
                              key={idx} 
                              exercise={exercise} 
                              index={idx}
                              onClick={() => setSelectedExercise(exercise)}
                            />
                          ))}
                        </motion.div>
                      </div>
                    )}

                    {/* Cardio */}
                    {workoutPlan.days[selectedDay].cardio && (
                      <div className="mb-6">
                        <p className="text-xs text-slate-500 uppercase tracking-wide mb-3">Cardio</p>
                        <div className="p-4 bg-slate-800/60 rounded-xl border border-slate-700/50">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-white font-medium capitalize">
                                {workoutPlan.days[selectedDay].cardio!.type}
                              </p>
                              <p className="text-xs text-slate-500">{workoutPlan.days[selectedDay].cardio!.intensity}</p>
                            </div>
                            <p className="text-sm text-violet-400 font-semibold">{workoutPlan.days[selectedDay].cardio!.duration} min</p>
                          </div>
                          <p className="text-sm text-slate-400 mt-3">{workoutPlan.days[selectedDay].cardio!.protocol}</p>
                          {workoutPlan.days[selectedDay].cardio!.notes && (
                            <p className="text-xs text-slate-500 mt-2">{workoutPlan.days[selectedDay].cardio!.notes}</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Pliometrija */}
                    {workoutPlan.days[selectedDay].plyometrics && (
                      <div className="mb-6">
                        <p className="text-xs text-slate-500 uppercase tracking-wide mb-3">Pliometrija • {workoutPlan.days[selectedDay].plyometrics!.totalDuration} min</p>
                        <div className="space-y-2">
                          {workoutPlan.days[selectedDay].plyometrics!.exercises.map((plyo, idx) => (
                            <div key={idx} className="p-4 bg-slate-800/60 rounded-xl border border-slate-700/50">
                              <div className="flex justify-between items-center">
                                <div>
                                  <p className="text-white font-medium">{plyo.nameHr}</p>
                                  {plyo.notes && <p className="text-xs text-slate-500">{plyo.notes}</p>}
                                </div>
                                <div className="text-right">
                                  <p className="text-sm text-violet-400 font-semibold">{plyo.sets} × {plyo.reps}</p>
                                  <p className="text-xs text-slate-500">{plyo.rest}s odmor</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Preporuke */}
              <div className="mt-8 pt-6 border-t border-slate-800">
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-3">Preporuke</p>
                <div className="space-y-2">
                  {workoutPlan.recommendations.map((rec, idx) => (
                    <p key={idx} className="text-sm text-slate-400">{rec}</p>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Modal za vježbu */}
      <AnimatePresence>
        {selectedExercise && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
              onClick={() => setSelectedExercise(null)}
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              transition={{ type: "spring", stiffness: 350, damping: 25, mass: 0.8 }}
              className="fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-lg md:max-h-[85vh] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col"
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-slate-800">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-white">{selectedExercise.name}</h3>
                    <p className="text-sm text-slate-400 mt-0.5">({selectedExercise.nameHr})</p>
                    <p className="text-xs text-violet-500 uppercase tracking-wide font-medium mt-2">{selectedExercise.equipment}</p>
                  </div>
                  <button
                    onClick={() => setSelectedExercise(null)}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-800 hover:bg-slate-700 transition-colors"
                  >
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {/* Parametri */}
                <div className="grid grid-cols-4 gap-3">
                  <div className="text-center p-3 bg-slate-800 rounded-xl border border-slate-700">
                    <p className="text-xl font-bold text-white">{selectedExercise.sets}</p>
                    <p className="text-xs text-slate-500">Serije</p>
                  </div>
                  <div className="text-center p-3 bg-slate-800 rounded-xl border border-slate-700">
                    <p className="text-xl font-bold text-violet-400">{selectedExercise.reps}</p>
                    <p className="text-xs text-slate-500">Ponavljanja</p>
                  </div>
                  <div className="text-center p-3 bg-slate-800 rounded-xl border border-slate-700">
                    <p className="text-xl font-bold text-amber-400">{selectedExercise.restSeconds}s</p>
                    <p className="text-xs text-slate-500">Odmor</p>
                  </div>
                  <div className="text-center p-3 bg-slate-800 rounded-xl border border-slate-700">
                    <p className="text-xl font-bold text-rose-400">{selectedExercise.rpe}</p>
                    <p className="text-xs text-slate-500">RPE</p>
                  </div>
                </div>

                {selectedExercise.loadPercent && (
                  <div className="p-3 bg-violet-900/30 rounded-xl border border-violet-800/50">
                    <p className="text-sm text-violet-300">💪 Preporučeno opterećenje: <strong>{selectedExercise.loadPercent}</strong></p>
                  </div>
                )}

                {/* Mišići */}
                {selectedExercise.musclesWorked && (
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Ciljani mišići</p>
                    <p className="text-slate-300 text-sm">{selectedExercise.musclesWorked}</p>
                  </div>
                )}

                {/* Opis - naš ili iz wrkout baze */}
                {(selectedExercise.description || selectedExercise.wrkoutInstructions) && (
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Kako izvesti</p>
                    {selectedExercise.description ? (
                      <p className="text-slate-300 text-sm leading-relaxed">{selectedExercise.description}</p>
                    ) : selectedExercise.wrkoutInstructions ? (
                      <ol className="space-y-2 list-decimal list-inside">
                        {selectedExercise.wrkoutInstructions.map((step, idx) => (
                          <li key={idx} className="text-sm text-slate-300 leading-relaxed">
                            {step}
                          </li>
                        ))}
                      </ol>
                    ) : null}
                  </div>
                )}

                {/* Mišići - iz wrkout baze */}
                {(selectedExercise.primaryMuscles || selectedExercise.secondaryMuscles) && (
                  <div className="flex flex-wrap gap-2">
                    {selectedExercise.primaryMuscles?.map((muscle, idx) => (
                      <span key={idx} className="px-2 py-1 bg-violet-600/20 text-violet-400 text-xs rounded-lg">
                        {muscle}
                      </span>
                    ))}
                    {selectedExercise.secondaryMuscles?.map((muscle, idx) => (
                      <span key={idx} className="px-2 py-1 bg-slate-700/50 text-slate-400 text-xs rounded-lg">
                        {muscle}
                      </span>
                    ))}
                  </div>
                )}

                {/* Savjeti */}
                {selectedExercise.tips && selectedExercise.tips.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Savjeti za izvedbu</p>
                    <ul className="space-y-1.5">
                      {selectedExercise.tips.map((tip, idx) => (
                        <li key={idx} className="text-sm text-slate-300 flex items-start gap-2">
                          <span className="text-violet-400 mt-0.5">•</span>
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Česte greške */}
                {selectedExercise.commonMistakes && selectedExercise.commonMistakes.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Izbjegavaj</p>
                    <ul className="space-y-1.5">
                      {selectedExercise.commonMistakes.map((mistake, idx) => (
                        <li key={idx} className="text-sm text-slate-400 flex items-start gap-2">
                          <span className="text-red-400 mt-0.5">×</span>
                          {mistake}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Alternativne vježbe */}
                {selectedExercise.alternatives && selectedExercise.alternatives.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-3">Alternativne vježbe</p>
                    <div className="space-y-2">
                      {selectedExercise.alternatives.map((alt, idx) => (
                        <div 
                          key={idx} 
                          className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-white font-medium">{alt.nameHr}</p>
                              <p className="text-xs text-slate-500">{alt.name} • {alt.equipment}</p>
                            </div>
                          </div>
                          <p className="text-xs text-slate-400 mt-1.5">{alt.reason}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// Exercise Tile komponenta
const exerciseCardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { type: "spring", stiffness: 260, damping: 20 }
  }
};

function ExerciseTile({ exercise, index, onClick }: { exercise: ExerciseParams; index: number; onClick: () => void }) {
  return (
    <motion.div
      variants={exerciseCardVariants}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className="p-4 bg-slate-800/60 border border-slate-700/50 rounded-xl cursor-pointer hover:bg-slate-800 hover:border-violet-500/30 transition-all"
    >
      <div className="flex items-center gap-4">
        {/* Broj vježbe */}
        <span className="w-10 h-10 flex items-center justify-center bg-violet-600/20 text-violet-400 rounded-lg text-sm font-bold flex-shrink-0">
          {index + 1}
        </span>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-white font-medium">{exercise.name}</p>
              <p className="text-xs text-slate-400">({exercise.nameHr})</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-sm text-violet-400 font-semibold">{exercise.sets} × {exercise.reps}</p>
              <p className="text-xs text-slate-500">{exercise.restSeconds}s odmor</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

