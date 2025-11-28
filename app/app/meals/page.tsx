"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

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

// Upute za pripremu
const preparationInstructions: Record<string, string> = {
  "Jaja s bjelanjkom i zobenom kašom": "Skuhaj zobene u mlijeku 5 min. Isprži jaja i bjelanjke na tavi s malo ulja. Posluži zajedno s narezanom bananom.",
  "Zobena kaša s wheyem i bananom": "Skuhaj zobene u mlijeku, ohladi i umiješaj whey protein. Dodaj narezanu bananu i bademe na vrh.",
  "Omlet s povrćem i purećom salamom": "Umuti jaja, dodaj narezane gljive i luk. Isprži na tavi, dodaj pureću salamu. Posluži s tostom.",
  "Skyr s wheyem i smrznutim voćem": "Umiješaj whey u skyr dok ne postane kremasto. Dodaj smrznuto voće i bananu na vrh.",
  "Toast s purećom salamom i grčkim jogurtom": "Toastiraj kruh, posloži pureću salamu. Posluži s grčkim jogurtom i bananom sa strane.",
  "Zrnati sir s voćem i bademima": "Posloži zrnati sir u zdjelu, dodaj narezanu bananu, borovnice i bademe na vrh.",
  "Rižini krekeri s kikiriki maslacem i bananom": "Namazi kikiriki maslac na rižine krekere. Posluži s narezanom bananom i grčkim jogurtom.",
  "Grčki jogurt bowl sa zobenim i voćem": "Stavi grčki jogurt u zdjelu, dodaj zobene, narezanu bananu, borovnice i indijske oraščiće.",
  "Proteinski doručak za masu": "Isprži jaja, toastiraj kruh i namazi kikiriki maslacem. Dodaj pureću salamu. Popij s mlijekom.",
  "Whey shake sa zobenim i bananom": "Blendaj whey, mlijeko, zobene i bananu dok ne postane glatko.",
  "Jaja na oko s tostom i skyrom": "Isprži jaja na oko, toastiraj kruh. Posluži sa skyrom i bananom.",
  "Zobena kaša s indijskim oraščićima": "Skuhaj zobene u mlijeku, umiješaj whey. Dodaj narezanu bananu i indijske oraščiće na vrh.",
  "Piletina s tjesteninom i salatom": "Skuhaj tjesteninu al dente. Isprži pileća prsa na tavi. Posluži s zelenom salatom i rajčicom.",
  "Piletina s pire krumpirom i krastavcima": "Skuhaj krumpir i izgnječi u pire. Isprži piletinu. Posluži s narezanim krastavcima i salatom.",
  "Puretina s kuhanim krumpirom i salatom": "Skuhaj krumpir. Isprži pureća prsa. Posluži s zelenom salatom i rajčicom.",
  "Losos s kuhanim krumpirom i povrćem": "Ispeci losos u pećnici 15 min na 200°C. Skuhaj krumpir. Posluži s krastavcima i salatom.",
  "Tuna s tjesteninom i kukuruzom": "Skuhaj tjesteninu. Ociedi tunu iz konzerve. Pomiješaj s kukuruzom i krastavcima.",
  "Pečeno pile s krumpirom i salatom": "Ispeci pile u pećnici 40 min na 180°C. Skuhaj krumpir. Posluži sa salatom i rajčicom.",
  "Piletina s hajdinskom kašom i salatom": "Skuhaj heljdu 15 min. Isprži piletinu. Posluži s zelenom salatom i rajčicom.",
  "Tjestenina s piletinom i vrhnjem": "Skuhaj tjesteninu. Isprži piletinu, dodaj vrhnje i kratko prokuhaj. Posluži sa salatom.",
  "Losos s tjesteninom i povrćem": "Ispeci losos, skuhaj tjesteninu. Pomiješaj i posluži s rajčicom i salatom.",
  "Puretina s hajdinskom kašom i krastavcima": "Skuhaj heljdu. Isprži puretinu. Posluži s narezanim krastavcima i rajčicom.",
  "Piletina s pire krumpirom i rajčicom": "Skuhaj i izgnječi krumpir. Isprži piletinu. Posluži s narezanom rajčicom i salatom.",
  "Tuna salata s kukuruzom i krastavcima": "Ociedi tunu, pomiješaj s kukuruzom, krastavcima, salatom i rajčicom.",
  "Tuna salata s krastavcima": "Ociedi tunu, pomiješaj s narezanim krastavcima i salatom. Posluži s rižinim krekerima.",
  "Grčki jogurt s wheyem i voćem": "Umiješaj whey u grčki jogurt. Dodaj borovnice i narezanu bananu na vrh.",
  "Losos s povrćem i avokadom": "Ispeci losos. Nasjeckaj avokado, krastavce i salatu. Posluži zajedno.",
  "Zrnati sir s rižinim krekerima i voćem": "Posloži zrnati sir u zdjelu, dodaj borovnice i bananu. Posluži s rižinim krekerima.",
  "Jaja s avokadom i salatom": "Isprži jaja. Nasjeckaj avokado. Posluži sa zelenom salatom i rajčicom.",
  "Tuna s rižinim krekerima i salatom": "Ociedi tunu, posluži sa salatom, krastavcima i rižinim krekerima.",
  "Skyr protein bowl": "Umiješaj whey u skyr. Dodaj borovnice i narezanu bananu na vrh.",
  "Losos s krastavcima i kikiriki maslacem": "Ispeci losos. Posluži s narezanim krastavcima i rižinim krekerima s kikiriki maslacem.",
  "Zrnati sir s kikiriki maslacem i bananom": "Stavi zrnati sir u zdjelu, dodaj žlicu kikiriki maslaca i narezanu bananu.",
  "Grčki jogurt s avokadom i borovnicama": "Umiješaj whey u jogurt. Dodaj nasjeckani avokado i borovnice.",
  "Whey shake s bananom i borovnicama": "Blendaj whey, mlijeko, bananu i borovnice dok ne postane glatko.",
  "Skyr s bananom": "Stavi skyr u zdjelu i dodaj narezanu bananu.",
  "Grčki jogurt s wheyem i voćem": "Umiješaj whey u grčki jogurt. Dodaj borovnice na vrh.",
  "Banana s bademima": "Nasjeckaj bananu i posluži s bademima.",
  "Rižini krekeri s kikiriki maslacem": "Namazi kikiriki maslac na rižine krekere. Posluži s narezanom bananom.",
  "Whey protein shake": "Blendaj whey s mlijekom dok ne postane glatko.",
  "Skyr s borovnicama": "Stavi skyr u zdjelu i dodaj borovnice.",
  "Grčki jogurt s bananom i bademima": "Stavi jogurt u zdjelu, dodaj narezanu bananu i bademe.",
  "Rižini krekeri sa zrnatim sirom": "Posloži zrnati sir na rižine krekere i posluži.",
  "Protein smoothie s voćem": "Blendaj whey, mlijeko, bananu i borovnice.",
};

function getPreparationInstructions(mealName: string): string {
  return preparationInstructions[mealName] || "Pripremi sastojke prema gramažama. Kombiniraj i posluži.";
}

// Tekućine - prikazuju se u ml umjesto g
const LIQUID_INGREDIENTS = [
  "mlijeko", "milk", "voda", "water", "sok", "juice", 
  "vrhnje", "cream", "jogurt tekući", "kefir", "smoothie"
];

function isLiquid(ingredientName: string): boolean {
  const nameLower = ingredientName.toLowerCase();
  return LIQUID_INGREDIENTS.some(liquid => nameLower.includes(liquid));
}

function formatAmount(name: string, grams: number): string {
  if (isLiquid(name)) {
    return `${grams} ml`;
  }
  return `${grams}g`;
}

export default function MealsPage() {
  const [clientId, setClientId] = useState<string | null>(null);
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyMealPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState(0);
  const [selectedMeal, setSelectedMeal] = useState<{ title: string; meal: GeneratedMeal } | null>(null);

  useEffect(() => {
    const id = localStorage.getItem("clientId");
    setClientId(id);
  }, []);

  const generateWeeklyPlan = async () => {
    if (!clientId) {
      setError("Nisi prijavljen. Molimo prijavi se prvo.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/meal-plan/weekly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: clientId }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.message || "Greška pri generiranju plana");
      }

      setWeeklyPlan(data.plan);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Greška pri generiranju plana";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (clientId && !weeklyPlan && !loading) {
      generateWeeklyPlan();
    }
  }, [clientId]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tjedni Plan Prehrane</h1>
            <p className="text-sm text-gray-500 mt-1">Personalizirani plan sa 5 obroka dnevno</p>
          </div>
          <button
            onClick={generateWeeklyPlan}
            disabled={loading}
            className="px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {loading ? "Generiram..." : "Novi plan"}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-gray-100 border border-gray-200 rounded-lg">
            <p className="text-gray-700 text-sm">{error}</p>
          </div>
        )}

        {/* Loading */}
        {loading && !weeklyPlan && (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-gray-900"></div>
            <p className="mt-3 text-gray-500 text-sm">Generiram tvoj plan prehrane...</p>
          </div>
        )}

        {/* Plan */}
        {weeklyPlan && (
          <>
            {/* Ciljevi */}
            <div className="mb-6 p-4 bg-white border border-gray-200 rounded-lg">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Dnevni ciljevi</p>
              <div className="flex gap-6 text-sm">
                <div><span className="font-semibold text-gray-900">{weeklyPlan.userTargets.calories}</span> <span className="text-gray-500">kcal</span></div>
                <div><span className="font-semibold text-gray-900">{weeklyPlan.userTargets.protein}g</span> <span className="text-gray-500">proteina</span></div>
                <div><span className="font-semibold text-gray-900">{weeklyPlan.userTargets.carbs}g</span> <span className="text-gray-500">UH</span></div>
                <div><span className="font-semibold text-gray-900">{weeklyPlan.userTargets.fat}g</span> <span className="text-gray-500">masti</span></div>
              </div>
            </div>

            {/* Dani */}
            <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
              {weeklyPlan.days.map((day, index) => (
                <button
                  key={day.date}
                  onClick={() => setSelectedDay(index)}
                  className={`px-4 py-2 text-sm rounded-lg whitespace-nowrap transition-all ${
                    selectedDay === index
                      ? "bg-gray-900 text-white"
                      : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                  }`}
                >
                  {day.dayName}
                </button>
              ))}
            </div>

            {/* Odabrani dan */}
            <AnimatePresence mode="wait">
              {weeklyPlan.days[selectedDay] && (
                <motion.div
                  key={selectedDay}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  {/* Dan header */}
                  <div className="flex justify-between items-center py-3 mb-4">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">{weeklyPlan.days[selectedDay].dayName}</h2>
                      <p className="text-xs text-gray-400">{weeklyPlan.days[selectedDay].date}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-gray-900">{weeklyPlan.days[selectedDay].dailyTotals.calories} kcal</p>
                      <p className="text-xs text-gray-400">
                        P: {weeklyPlan.days[selectedDay].dailyTotals.protein}g · C: {weeklyPlan.days[selectedDay].dailyTotals.carbs}g · F: {weeklyPlan.days[selectedDay].dailyTotals.fat}g
                      </p>
                    </div>
                  </div>

                  {/* Grid obroka */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <MealTile 
                      title="Doručak" 
                      meal={weeklyPlan.days[selectedDay].meals.breakfast}
                      onClick={() => setSelectedMeal({ title: "Doručak", meal: weeklyPlan.days[selectedDay].meals.breakfast })}
                      delay={0}
                    />
                    <MealTile 
                      title="Međuobrok" 
                      meal={weeklyPlan.days[selectedDay].meals.snack1}
                      onClick={() => setSelectedMeal({ title: "Međuobrok 1", meal: weeklyPlan.days[selectedDay].meals.snack1 })}
                      delay={0.03}
                    />
                    <MealTile 
                      title="Ručak" 
                      meal={weeklyPlan.days[selectedDay].meals.lunch}
                      onClick={() => setSelectedMeal({ title: "Ručak", meal: weeklyPlan.days[selectedDay].meals.lunch })}
                      delay={0.06}
                    />
                    <MealTile 
                      title="Međuobrok" 
                      meal={weeklyPlan.days[selectedDay].meals.snack2}
                      onClick={() => setSelectedMeal({ title: "Međuobrok 2", meal: weeklyPlan.days[selectedDay].meals.snack2 })}
                      delay={0.09}
                    />
                    <MealTile 
                      title="Večera" 
                      meal={weeklyPlan.days[selectedDay].meals.dinner}
                      onClick={() => setSelectedMeal({ title: "Večera", meal: weeklyPlan.days[selectedDay].meals.dinner })}
                      delay={0.12}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Tjedni prosjek */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Tjedni prosjek</p>
              <div className="flex gap-6 text-sm">
                <div><span className="font-semibold text-gray-900">{weeklyPlan.weeklyTotals.avgCalories}</span> <span className="text-gray-500">kcal</span></div>
                <div><span className="font-semibold text-gray-900">{weeklyPlan.weeklyTotals.avgProtein}g</span> <span className="text-gray-500">P</span></div>
                <div><span className="font-semibold text-gray-900">{weeklyPlan.weeklyTotals.avgCarbs}g</span> <span className="text-gray-500">C</span></div>
                <div><span className="font-semibold text-gray-900">{weeklyPlan.weeklyTotals.avgFat}g</span> <span className="text-gray-500">F</span></div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modal s Mac-style animacijom */}
      <AnimatePresence>
        {selectedMeal && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
              onClick={() => setSelectedMeal(null)}
            />
            
            {/* Modal - Mac style zoom animation */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              transition={{ 
                type: "spring",
                stiffness: 350,
                damping: 25,
                mass: 0.8
              }}
              className="fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-lg md:max-h-[85vh] bg-white rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col"
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-gray-100">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide">{selectedMeal.title}</p>
                    <h3 className="text-xl font-semibold text-gray-900 mt-1">{selectedMeal.meal.name}</h3>
                  </div>
                  <button
                    onClick={() => setSelectedMeal(null)}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                  >
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Modal Body - Scrollable */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {/* Placeholder za sliku */}
                <div className="w-full h-48 bg-gray-100 rounded-xl flex items-center justify-center">
                  <svg className="w-16 h-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>

                {/* Makroi */}
                <div className="grid grid-cols-4 gap-3">
                  <div className="text-center p-3 bg-gray-50 rounded-xl">
                    <p className="text-xl font-bold text-gray-900">{selectedMeal.meal.totals.calories}</p>
                    <p className="text-xs text-gray-500">kcal</p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-xl">
                    <p className="text-xl font-bold text-gray-900">{selectedMeal.meal.totals.protein}g</p>
                    <p className="text-xs text-gray-500">Proteini</p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-xl">
                    <p className="text-xl font-bold text-gray-900">{selectedMeal.meal.totals.carbs}g</p>
                    <p className="text-xs text-gray-500">UH</p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-xl">
                    <p className="text-xl font-bold text-gray-900">{selectedMeal.meal.totals.fat}g</p>
                    <p className="text-xs text-gray-500">Masti</p>
                  </div>
                </div>

                {/* Sastojci */}
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">Sastojci</p>
                  <div className="space-y-2">
                    {selectedMeal.meal.components.map((comp, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 + idx * 0.05 }}
                        className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded-lg"
                      >
                        <span className="text-gray-700">{comp.name}</span>
                        <span className="text-gray-900 font-semibold tabular-nums">{formatAmount(comp.name, comp.grams)}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Priprema */}
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">Priprema</p>
                  <p className="text-gray-600 leading-relaxed">
                    {getPreparationInstructions(selectedMeal.meal.name)}
                  </p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// Meal Tile - mala kartica za grid
function MealTile({ title, meal, onClick, delay }: { title: string; meal: GeneratedMeal; onClick: () => void; delay: number }) {
  if (!meal || !meal.components || meal.components.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2, delay }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="bg-white border border-gray-200 rounded-xl p-4 cursor-pointer hover:shadow-lg hover:border-gray-300 transition-shadow"
    >
      {/* Placeholder za sliku */}
      <div className="w-full h-24 bg-gray-100 rounded-lg mb-3 flex items-center justify-center">
        <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
      
      <p className="text-xs text-gray-400 uppercase tracking-wide">{title}</p>
      <p className="font-medium text-gray-900 text-sm mt-0.5 line-clamp-2">{meal.name}</p>
      <p className="text-xs text-gray-500 mt-1">{meal.totals.calories} kcal</p>
    </motion.div>
  );
}
