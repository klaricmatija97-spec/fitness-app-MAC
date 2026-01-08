"use client";

import { useState } from "react";
import mealData from "@/lib/data/meal_components.json";
import { getMealImageUrl } from "@/lib/utils/mealImageGenerator";

type MealSlot = "breakfast" | "lunch" | "dinner" | "snack";

interface MealComponent {
  food: string;
  grams: number;
  displayName?: string;
}

interface Meal {
  id: string;
  name: string;
  description?: string;
  preparationTip?: string;
  components: MealComponent[];
  tags?: string[];
  suitableFor?: string[];
}

const SLOT_LABELS: Record<MealSlot, string> = {
  breakfast: "🌅 Doručak",
  lunch: "☀️ Ručak",
  dinner: "🌙 Večera",
  snack: "🍎 Užina",
};

const SLOT_COLORS: Record<MealSlot, string> = {
  breakfast: "from-amber-500 to-orange-600",
  lunch: "from-sky-500 to-blue-600",
  dinner: "from-violet-500 to-purple-600",
  snack: "from-emerald-500 to-green-600",
};

export default function PregledJelaPage() {
  const [activeSlot, setActiveSlot] = useState<MealSlot>("breakfast");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [filter, setFilter] = useState<"all" | "lose" | "maintain" | "gain">("all");

  const meals = (mealData[activeSlot] as Meal[]) || [];
  
  const filteredMeals = filter === "all" 
    ? meals 
    : meals.filter(m => m.suitableFor?.includes(filter));

  const currentMeal = filteredMeals[currentIndex];

  const goToNext = () => {
    if (currentIndex < filteredMeals.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const goToPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const changeSlot = (slot: MealSlot) => {
    setActiveSlot(slot);
    setCurrentIndex(0);
  };

  if (!currentMeal) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <p>Nema jela za prikaz</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-zinc-900/95 backdrop-blur border-b border-zinc-800 p-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-4 text-center">📋 Pregled Jela</h1>
          
          {/* Slot tabs */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
            {(Object.keys(SLOT_LABELS) as MealSlot[]).map((slot) => (
              <button
                key={slot}
                onClick={() => changeSlot(slot)}
                className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
                  activeSlot === slot
                    ? `bg-gradient-to-r ${SLOT_COLORS[slot]} text-white shadow-lg`
                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                }`}
              >
                {SLOT_LABELS[slot]} ({(mealData[slot] as Meal[])?.length || 0})
              </button>
            ))}
          </div>

          {/* Filter */}
          <div className="flex gap-2 items-center">
            <span className="text-zinc-400 text-sm">Filter:</span>
            {(["all", "lose", "maintain", "gain"] as const).map((f) => (
              <button
                key={f}
                onClick={() => { setFilter(f); setCurrentIndex(0); }}
                className={`px-3 py-1 rounded text-sm ${
                  filter === f
                    ? "bg-white text-black"
                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                }`}
              >
                {f === "all" ? "Svi" : f === "lose" ? "🔥 Lose" : f === "maintain" ? "⚖️ Maintain" : "💪 Gain"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="max-w-4xl mx-auto px-4 py-2">
        <div className="flex items-center justify-between text-sm text-zinc-400 mb-2">
          <span>Jelo {currentIndex + 1} od {filteredMeals.length}</span>
          <span>{Math.round(((currentIndex + 1) / filteredMeals.length) * 100)}%</span>
        </div>
        <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
          <div 
            className={`h-full bg-gradient-to-r ${SLOT_COLORS[activeSlot]} transition-all`}
            style={{ width: `${((currentIndex + 1) / filteredMeals.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Meal Card */}
      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
          {/* Meal Image */}
          <div className="relative h-48 md:h-64 overflow-hidden">
            <img 
              src={getMealImageUrl(currentMeal, activeSlot)}
              alt={currentMeal.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback na generičku sliku ako slika ne učita
                (e.target as HTMLImageElement).src = `https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&h=400&fit=crop&q=80`;
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/50 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <div className="text-sm opacity-80 mb-1">#{currentMeal.id}</div>
              <h2 className="text-2xl font-bold">{currentMeal.name}</h2>
            </div>
            {/* Slot badge */}
            <div className={`absolute top-4 left-4 px-3 py-1 rounded-full text-sm font-medium bg-gradient-to-r ${SLOT_COLORS[activeSlot]}`}>
              {SLOT_LABELS[activeSlot]}
            </div>
          </div>

          {/* Tags */}
          {currentMeal.tags && currentMeal.tags.length > 0 && (
            <div className="px-6 py-3 border-b border-zinc-800">
              <div className="flex flex-wrap gap-2">
                {currentMeal.tags.map((tag) => (
                  <span key={tag} className="px-2 py-1 bg-zinc-800 rounded text-sm text-zinc-300">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Suitable For */}
          {currentMeal.suitableFor && (
            <div className="px-6 py-3 bg-zinc-800/50 border-b border-zinc-800">
              <span className="text-zinc-400 text-sm">Pogodno za: </span>
              {currentMeal.suitableFor.map((goal) => (
                <span key={goal} className="ml-2 px-2 py-1 bg-zinc-700 rounded text-sm">
                  {goal === "lose" ? "🔥 Mršavljenje" : goal === "maintain" ? "⚖️ Održavanje" : "💪 Dobivanje mase"}
                </span>
              ))}
            </div>
          )}

          {/* Components */}
          <div className="p-6 border-b border-zinc-800">
            <h3 className="text-lg font-semibold mb-3 text-zinc-300">📦 Sastojci:</h3>
            <div className="grid gap-2">
              {currentMeal.components.map((comp, i) => (
                <div key={i} className="flex justify-between items-center py-2 px-3 bg-zinc-800/50 rounded-lg">
                  <span className="text-white">
                    {comp.displayName || comp.food}
                  </span>
                  <span className="text-zinc-400 text-sm">
                    {comp.grams}g
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Description */}
          {currentMeal.description && (
            <div className="p-6 border-b border-zinc-800">
              <h3 className="text-lg font-semibold mb-3 text-zinc-300">📝 Opis:</h3>
              <p className="text-zinc-300 leading-relaxed whitespace-pre-wrap">
                {currentMeal.description}
              </p>
            </div>
          )}

          {/* Preparation Tip */}
          {currentMeal.preparationTip && (
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-3 text-zinc-300">👨‍🍳 Upute za pripremu:</h3>
              <div className="text-zinc-300 leading-relaxed whitespace-pre-wrap bg-zinc-800/30 p-4 rounded-lg">
                {currentMeal.preparationTip}
              </div>
            </div>
          )}

          {/* No description/tip warning */}
          {!currentMeal.description && !currentMeal.preparationTip && (
            <div className="p-6 bg-red-500/10 border-t border-red-500/30">
              <p className="text-red-400">⚠️ Ovo jelo nema opis niti upute za pripremu!</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex gap-4 mt-6">
          <button
            onClick={goToPrev}
            disabled={currentIndex === 0}
            className="flex-1 py-4 bg-zinc-800 rounded-xl font-semibold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-700 transition-colors"
          >
            ← Prethodno
          </button>
          <button
            onClick={goToNext}
            disabled={currentIndex === filteredMeals.length - 1}
            className={`flex-1 py-4 rounded-xl font-semibold disabled:opacity-30 disabled:cursor-not-allowed transition-colors bg-gradient-to-r ${SLOT_COLORS[activeSlot]} hover:opacity-90`}
          >
            Sljedeće →
          </button>
        </div>

        {/* Quick jump */}
        <div className="mt-6 p-4 bg-zinc-900 rounded-xl">
          <label className="text-sm text-zinc-400 block mb-2">Skoči na jelo:</label>
          <select 
            value={currentIndex}
            onChange={(e) => setCurrentIndex(Number(e.target.value))}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white"
          >
            {filteredMeals.map((meal, i) => (
              <option key={meal.id} value={i}>
                {i + 1}. {meal.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

