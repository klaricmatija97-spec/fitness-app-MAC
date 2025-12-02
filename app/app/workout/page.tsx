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
  imageUrl?: string;
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

// Ikone za tipove dana
const dayTypeIcons: Record<string, string> = {
  "Push": "🏋️",
  "Pull": "💪",
  "Legs": "🦵",
  "Upper": "👆",
  "Lower": "👇",
  "Full Body A": "🔥",
  "Full Body B": "⚡",
  "Glute dominant": "🍑",
  "Legs mix": "🦿",
  "cardio": "🏃",
  "strength": "🏋️",
};

export default function WorkoutPage() {
  const [workoutPlan, setWorkoutPlan] = useState<WorkoutPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState(0);
  const [selectedExercise, setSelectedExercise] = useState<ExerciseParams | null>(null);
  const [planKey, setPlanKey] = useState(0);
  
  // Form state za generiranje
  const [showForm, setShowForm] = useState(true);
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

  // Dohvati dostupne programe kad se spol promijeni
  useEffect(() => {
    const fetchPrograms = async () => {
      try {
        const res = await fetch(`/api/workout-plan/generate?gender=${formData.gender}`);
        const data = await res.json();
        if (data.success) {
          setAvailablePrograms(data.programs);
          // Postavi prvi program kao default
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
    <div className="min-h-screen bg-slate-950">
      {/* Top Navigation Bar */}
      <div className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800">
        <div className="mx-auto max-w-4xl px-4 py-3 flex items-center justify-between">
          <a 
            href="/app" 
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm font-medium">Natrag</span>
          </a>
          
          {/* CORPEX Logo */}
          <div className="absolute left-1/2 -translate-x-1/2">
            <span className="text-xl font-black tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-purple-500">
              CORPEX
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            <a href="/app/meals" className="text-xs text-slate-500 hover:text-slate-300">Prehrana</a>
            <span className="text-slate-700">|</span>
            <a href="/app/profile" className="text-xs text-slate-500 hover:text-slate-300">Profil</a>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Plan Treninga</h1>
            <p className="text-sm text-slate-400 mt-1">Personalizirani tjedni program vježbanja</p>
          </div>
          {workoutPlan && (
            <button
              onClick={() => setShowForm(true)}
              className="px-5 py-2.5 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-500 transition-colors shadow-lg shadow-violet-500/20"
            >
              Novi plan
            </button>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-800 rounded-lg">
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        {/* Form za generiranje */}
        <AnimatePresence mode="wait">
          {showForm && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Osobni podaci */}
              <div className="p-6 bg-slate-800/50 border border-slate-700 rounded-xl">
                <h3 className="text-sm text-slate-400 uppercase tracking-wide mb-4">Osobni podaci</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Spol</label>
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value as "muško" | "žensko", selectedProgram: "" })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500"
                    >
                      <option value="muško">Muško</option>
                      <option value="žensko">Žensko</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Dob</label>
                    <input
                      type="number"
                      value={formData.age}
                      onChange={(e) => setFormData({ ...formData, age: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Visina (cm)</label>
                    <input
                      type="number"
                      value={formData.height}
                      onChange={(e) => setFormData({ ...formData, height: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Težina (kg)</label>
                    <input
                      type="number"
                      value={formData.weight}
                      onChange={(e) => setFormData({ ...formData, weight: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500"
                    />
                  </div>
                </div>
              </div>

              {/* Razina i cilj */}
              <div className="p-6 bg-slate-800/50 border border-slate-700 rounded-xl">
                <h3 className="text-sm text-slate-400 uppercase tracking-wide mb-4">Razina i cilj</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Razina iskustva</label>
                    <select
                      value={formData.level}
                      onChange={(e) => setFormData({ ...formData, level: e.target.value as "početnik" | "srednji" | "napredni" })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500"
                    >
                      <option value="početnik">Početnik</option>
                      <option value="srednji">Srednji</option>
                      <option value="napredni">Napredni</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Primarni cilj</label>
                    <select
                      value={formData.primaryGoal}
                      onChange={(e) => setFormData({ ...formData, primaryGoal: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500"
                    >
                      <option value="povećati mišićnu masu">💪 Povećati mišićnu masu</option>
                      <option value="gubiti masnoću">🔥 Gubiti masnoću</option>
                      <option value="povećati snagu">🏋️ Povećati snagu</option>
                      <option value="povećati izdržljivost">❤️ Povećati izdržljivost</option>
                      <option value="povećati brzinu">⚡ Povećati brzinu</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Raspored */}
              <div className="p-6 bg-slate-800/50 border border-slate-700 rounded-xl">
                <h3 className="text-sm text-slate-400 uppercase tracking-wide mb-4">Raspored treninga</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Dana tjedno</label>
                    <select
                      value={formData.trainingDaysPerWeek}
                      onChange={(e) => setFormData({ ...formData, trainingDaysPerWeek: Number(e.target.value) as 2 | 3 | 4 | 5 | 6 })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500"
                    >
                      <option value={2}>2 dana</option>
                      <option value={3}>3 dana</option>
                      <option value={4}>4 dana</option>
                      <option value={5}>5 dana</option>
                      <option value={6}>6 dana</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Trajanje treninga</label>
                    <select
                      value={formData.sessionDuration}
                      onChange={(e) => setFormData({ ...formData, sessionDuration: Number(e.target.value) as 30 | 45 | 60 | 75 | 90 })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500"
                    >
                      <option value={30}>30 minuta</option>
                      <option value={45}>45 minuta</option>
                      <option value={60}>60 minuta</option>
                      <option value={75}>75 minuta</option>
                      <option value={90}>90 minuta</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Program */}
              <div className="p-6 bg-slate-800/50 border border-slate-700 rounded-xl">
                <h3 className="text-sm text-slate-400 uppercase tracking-wide mb-4">Odaberi program</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {availablePrograms.map((program) => (
                    <motion.button
                      key={program.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setFormData({ ...formData, selectedProgram: program.id })}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        formData.selectedProgram === program.id
                          ? "bg-violet-600/20 border-violet-500 shadow-lg shadow-violet-500/20"
                          : "bg-slate-900 border-slate-700 hover:border-slate-600"
                      }`}
                    >
                      <p className={`font-semibold ${formData.selectedProgram === program.id ? "text-violet-400" : "text-white"}`}>
                        {program.name}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">{program.description}</p>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Dodatne opcije */}
              <div className="p-6 bg-slate-800/50 border border-slate-700 rounded-xl">
                <h3 className="text-sm text-slate-400 uppercase tracking-wide mb-4">Dodatne opcije</h3>
                <div className="space-y-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.wantsCardio}
                      onChange={(e) => setFormData({ ...formData, wantsCardio: e.target.checked })}
                      className="w-5 h-5 rounded border-slate-600 bg-slate-900 text-violet-500 focus:ring-violet-500"
                    />
                    <div>
                      <span className="text-white">🏃 Uključi cardio</span>
                      <p className="text-xs text-slate-500">Dodaj trčanje ili hodanje u plan</p>
                    </div>
                  </label>
                  
                  {formData.wantsCardio && (
                    <div className="ml-8">
                      <select
                        value={formData.cardioType}
                        onChange={(e) => setFormData({ ...formData, cardioType: e.target.value as "trčanje" | "hodanje" })}
                        className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500"
                      >
                        <option value="trčanje">Trčanje</option>
                        <option value="hodanje">Hodanje</option>
                      </select>
                    </div>
                  )}
                  
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.wantsPlyometrics}
                      onChange={(e) => setFormData({ ...formData, wantsPlyometrics: e.target.checked })}
                      className="w-5 h-5 rounded border-slate-600 bg-slate-900 text-violet-500 focus:ring-violet-500"
                    />
                    <div>
                      <span className="text-white">⚡ Uključi pliometriju</span>
                      <p className="text-xs text-slate-500">Dodaj eksplozivne vježbe (skokovi, sprintovi)</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Generate button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={generateWorkoutPlan}
                disabled={loading || !formData.selectedProgram}
                className="w-full py-4 bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold rounded-xl hover:from-violet-500 hover:to-purple-500 disabled:opacity-50 transition-all shadow-lg shadow-violet-500/30"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Generiram plan...
                  </span>
                ) : (
                  "🏋️ Generiraj plan treninga"
                )}
              </motion.button>
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
                    <span className="mr-1">{dayTypeIcons[day.splitName || day.type] || "📅"}</span>
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
                        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                          <span className="text-2xl">{dayTypeIcons[workoutPlan.days[selectedDay].splitName || "strength"]}</span>
                          {workoutPlan.days[selectedDay].splitName || workoutPlan.days[selectedDay].type}
                        </h2>
                        <p className="text-xs text-slate-500">{workoutPlan.days[selectedDay].dayName}</p>
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
                        <div className="p-4 bg-gradient-to-r from-blue-900/30 to-cyan-900/30 rounded-xl border border-blue-800/50">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-2xl">🏃</span>
                            <div>
                              <p className="text-white font-medium capitalize">
                                {workoutPlan.days[selectedDay].cardio!.type} - {workoutPlan.days[selectedDay].cardio!.duration} min
                              </p>
                              <p className="text-xs text-blue-400">{workoutPlan.days[selectedDay].cardio!.intensity}</p>
                            </div>
                          </div>
                          <p className="text-sm text-slate-300 mt-2">{workoutPlan.days[selectedDay].cardio!.protocol}</p>
                          {workoutPlan.days[selectedDay].cardio!.notes && (
                            <p className="text-xs text-slate-400 mt-2">💓 {workoutPlan.days[selectedDay].cardio!.notes}</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Pliometrija */}
                    {workoutPlan.days[selectedDay].plyometrics && (
                      <div className="mb-6">
                        <p className="text-xs text-slate-500 uppercase tracking-wide mb-3">Pliometrija (~{workoutPlan.days[selectedDay].plyometrics!.totalDuration} min)</p>
                        <div className="space-y-2">
                          {workoutPlan.days[selectedDay].plyometrics!.exercises.map((plyo, idx) => (
                            <div key={idx} className="p-3 bg-gradient-to-r from-amber-900/30 to-orange-900/30 rounded-xl border border-amber-800/50">
                              <div className="flex justify-between items-center">
                                <div>
                                  <p className="text-white font-medium">⚡ {plyo.nameHr}</p>
                                  {plyo.notes && <p className="text-xs text-amber-400">{plyo.notes}</p>}
                                </div>
                                <div className="text-right">
                                  <p className="text-sm text-white">{plyo.sets}×{plyo.reps}</p>
                                  <p className="text-xs text-slate-400">odmor {plyo.rest}s</p>
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
                    <p className="text-xs text-violet-500 uppercase tracking-wide font-medium">{selectedExercise.equipment}</p>
                    <h3 className="text-xl font-semibold text-white mt-1">{selectedExercise.nameHr}</h3>
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
                {/* Slika vježbe */}
                {selectedExercise.imageUrl && (
                  <div className="w-full h-48 bg-slate-800 rounded-xl overflow-hidden">
                    <img 
                      src={selectedExercise.imageUrl} 
                      alt={selectedExercise.nameHr}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

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

                {/* Opis */}
                {selectedExercise.description && (
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Kako izvesti</p>
                    <p className="text-slate-300 text-sm leading-relaxed">{selectedExercise.description}</p>
                  </div>
                )}

                {/* Savjeti */}
                {selectedExercise.tips && selectedExercise.tips.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">✅ Savjeti</p>
                    <ul className="space-y-2">
                      {selectedExercise.tips.map((tip, idx) => (
                        <li key={idx} className="text-sm text-green-400 flex items-start gap-2">
                          <span className="text-green-500 mt-0.5">•</span>
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Česte greške */}
                {selectedExercise.commonMistakes && selectedExercise.commonMistakes.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">⚠️ Česte greške</p>
                    <ul className="space-y-2">
                      {selectedExercise.commonMistakes.map((mistake, idx) => (
                        <li key={idx} className="text-sm text-red-400 flex items-start gap-2">
                          <span className="text-red-500 mt-0.5">•</span>
                          {mistake}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Alternativne vježbe */}
                {selectedExercise.alternatives && selectedExercise.alternatives.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-3">🔄 Alternativne vježbe</p>
                    <div className="space-y-2">
                      {selectedExercise.alternatives.map((alt, idx) => (
                        <div 
                          key={idx} 
                          className="p-3 bg-gradient-to-r from-slate-800 to-slate-800/50 rounded-xl border border-slate-700 hover:border-violet-500/50 transition-colors"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-white font-medium">{alt.nameHr}</p>
                              <p className="text-xs text-slate-500">{alt.equipment}</p>
                            </div>
                          </div>
                          <p className="text-xs text-violet-400 mt-2">💡 {alt.reason}</p>
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
      whileHover={{ scale: 1.02, x: 5 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl cursor-pointer hover:bg-slate-800 hover:border-violet-500/50 transition-colors"
    >
      <div className="flex items-center gap-4">
        {/* Thumbnail slika */}
        {exercise.imageUrl ? (
          <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
            <img 
              src={exercise.imageUrl} 
              alt={exercise.nameHr}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <span className="w-16 h-16 flex items-center justify-center bg-violet-600/20 text-violet-400 rounded-lg text-lg font-bold flex-shrink-0">
            {index + 1}
          </span>
        )}
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-white font-medium truncate">{exercise.nameHr}</p>
              <p className="text-xs text-slate-500">{exercise.equipment}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-sm text-white font-medium">{exercise.sets}×{exercise.reps}</p>
              <p className="text-xs text-slate-500">odmor {exercise.restSeconds}s</p>
            </div>
          </div>
          {exercise.musclesWorked && (
            <p className="text-xs text-slate-400 mt-1 line-clamp-1">💪 {exercise.musclesWorked}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

