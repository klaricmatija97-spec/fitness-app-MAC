"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useProMealPlan } from "@/lib/hooks/useProMealPlan";
import type { MealType } from "@/lib/services/proMealPlanApi";
import type { WeeklyPlan, WeeklyDay } from "@/lib/services/proMealPlanGenerator";
import { translateFoodName } from "@/lib/utils/foodTranslations";

export default function MealsPage() {
  const router = useRouter();
  const [clientId, setClientId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"daily" | "weekly">("daily");
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan | null>(null);
  const [weeklyLoading, setWeeklyLoading] = useState(false);
  const [weeklyError, setWeeklyError] = useState<string | null>(null);

  useEffect(() => {
    const id = localStorage.getItem("clientId");
    setClientId(id);
  }, []);

  const { plan, loading, error, regenerate, swapMeal } = useProMealPlan(clientId);

  const loadWeeklyPlan = async () => {
    if (!clientId) return;

    setWeeklyLoading(true);
    setWeeklyError(null);

    try {
      const res = await fetch("/api/meal-plan/pro/weekly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: clientId }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Neuspješno generiranje tjednog plana");
      }

      const data = await res.json();

      if (!data.ok || !data.plan) {
        throw new Error(data.message || "API nije vratio plan");
      }

      setWeeklyPlan(data.plan);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Greška pri učitavanju tjednog plana";
      setWeeklyError(errorMessage);
      console.error("Error loading weekly plan:", err);
    } finally {
      setWeeklyLoading(false);
    }
  };

  useEffect(() => {
    if (viewMode === "weekly" && !weeklyPlan && !weeklyLoading && !weeklyError) {
      loadWeeklyPlan();
    }
  }, [viewMode, clientId]);

  const handleSave = async () => {
    if (!clientId || !plan) return;

    try {
      await fetch("/api/meal-plan/pro/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: clientId }),
      });
      
      alert("PRO plan prehrane je spremljen!");
    } catch (error) {
      alert("Greška pri spremanju");
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12">
        <p className="text-gray-600">Učitavanje PRO plana prehrane...</p>
      </div>
    );
  }

  if (error) {
    const isCalculationsError = error.includes("Nisu pronađene kalkulacije") || error.includes("kalkulacije");
    return (
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6">
          <p className="text-red-600 mb-4">
            {isCalculationsError ? (
              <>
                <strong>Prvo popuni kalkulator da izračunamo tvoj plan.</strong>
                <br />
                <span className="text-sm mt-2 block">
                  Idi na{" "}
                  <a href="/app/calculator" className="underline font-semibold">
                    Kalkulator Kalorija
                  </a>{" "}
                  i izračunaj svoje dnevne potrebe za kalorijama i makronutrijentima.
                </span>
              </>
            ) : (
              `Greška: ${error}`
            )}
          </p>
          {!isCalculationsError && (
            <button
              onClick={() => regenerate()}
              className="rounded-full bg-red-600 px-6 py-2 text-white hover:bg-red-700"
            >
              Pokušaj ponovo
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-bold text-gray-900" style={{ fontFamily: "var(--font-montserrat), sans-serif" }}>
          PRO Plan Prehrane
        </h1>
        {plan && (
          <div className="flex gap-4 items-center">
            {/* View Mode Toggle */}
            <div className="flex rounded-full border border-gray-300 bg-white p-1">
              <button
                onClick={() => setViewMode("daily")}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  viewMode === "daily"
                    ? "bg-blue-600 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                Dnevni
              </button>
              <button
                onClick={() => setViewMode("weekly")}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  viewMode === "weekly"
                    ? "bg-blue-600 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                Tjedni
              </button>
            </div>
            {/* Regenerate Button */}
            <button
              onClick={viewMode === "daily" ? regenerate : loadWeeklyPlan}
              disabled={viewMode === "daily" ? loading : weeklyLoading}
              className="rounded-full bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-3 text-base font-semibold text-white transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {viewMode === "daily"
                ? loading
                  ? "Regeneriranje..."
                  : "🔄 Regeneriraj PRO plan"
                : weeklyLoading
                ? "Generiranje..."
                : "🔄 Generiraj tjedni plan"}
            </button>
          </div>
        )}
      </div>

      {/* Gumb za generiranje tjednog plana - UVJEK VIDLJIV NA VRHU */}
      <div className="mb-6 rounded-3xl border-2 border-purple-300 bg-gradient-to-r from-purple-50 to-purple-100 p-6 shadow-xl">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Tjedni PRO Plan Prehrane</h2>
        <p className="text-gray-600 mb-4 text-sm">
          Generiraj kompletan tjedni plan prehrane (7 dana) sa raznolikošću i optimizacijom makronutrijenata.
        </p>
        <button
          onClick={async () => {
            const userId = clientId || null; // TODO: Ako nema clientId, hardkodiraj test userId iz Supabase clients tablice
            if (!userId) {
              setWeeklyError("Prvo moraš biti prijavljen. Provjeri da li si izračunao svoje kalorije i makroe.");
              return;
            }

            setWeeklyLoading(true);
            setWeeklyError(null);

            try {
              const res = await fetch("/api/meal-plan/pro/weekly", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId }),
              });

              if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.message || "Neuspješno generiranje tjednog plana");
              }

              const data = await res.json();

              if (!data.ok || !data.plan) {
                throw new Error(data.message || "API nije vratio plan");
              }

              setWeeklyPlan(data.plan);
            } catch (err) {
              const errorMessage = err instanceof Error ? err.message : "Greška pri generiranju tjednog plana";
              setWeeklyError(errorMessage);
              console.error("Error generating weekly plan:", err);
            } finally {
              setWeeklyLoading(false);
            }
          }}
          disabled={weeklyLoading}
          className="w-full rounded-full bg-gradient-to-r from-purple-600 to-purple-700 px-8 py-4 text-lg font-bold text-white transition hover:opacity-90 hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          style={{ minHeight: '56px' }}
        >
          {weeklyLoading ? "⏳ Generiram tjedni plan..." : "✓ Generiraj tjedni plan prehrane"}
        </button>

        {/* Prikaz greške */}
        {weeklyError && (
          <div className="mt-4 p-4 rounded-lg bg-red-50 border border-red-200">
            <p className="text-sm text-red-600">{weeklyError}</p>
          </div>
        )}

        {/* Prikaz weekly plana u JSON formatu */}
        {weeklyPlan && (
          <div className="mt-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Tjedni Plan (JSON Preview)</h3>
            <pre className="mt-4 text-xs bg-black/20 p-3 rounded overflow-auto max-h-96">
              {JSON.stringify(weeklyPlan, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {plan && (
        <>
          <div className="mb-6 rounded-3xl border border-gray-200 bg-white/70 backdrop-blur-sm p-6 shadow-lg">
            <p className="text-gray-600 mb-4">
              Tvoj personalizirani PRO plan prehrane sa naprednim scoring sistemom i preciznim makronutrijentima.
              Svaki obrok je optimiziran za tvoje ciljeve i preferencije.
            </p>
            {plan.total && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-500">
                  Ukupno odstupanje: <span className="font-semibold text-gray-900">{plan.total.deviation.total}%</span>
                </p>
              </div>
            )}
      </div>

      <div className="space-y-6">
        <div className="rounded-3xl border border-gray-200 bg-white/70 backdrop-blur-sm p-6 shadow-lg">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Dnevni Plan</h2>
            
          <div className="grid gap-6 md:grid-cols-2">
            <ProMealSection
              title="Doručak"
              meal={plan.breakfast}
              mealType="breakfast"
              onSwap={() => swapMeal("breakfast")}
            />
            <ProMealSection
              title="Ručak"
              meal={plan.lunch}
              mealType="lunch"
              onSwap={() => swapMeal("lunch")}
            />
            <ProMealSection
              title="Večera"
              meal={plan.dinner}
              mealType="dinner"
              onSwap={() => swapMeal("dinner")}
            />
            <ProMealSection
              title="Užina"
              meal={plan.snack}
              mealType="snack"
              onSwap={() => swapMeal("snack")}
            />
          </div>
        </div>
      </div>

      {/* Total Summary */}
      {plan.total && (
        <div className="mt-6 rounded-3xl border border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100 p-6 shadow-lg">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Dnevni Rezime</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500">Kalorije</p>
              <p className="text-2xl font-bold text-gray-900">{plan.total.calories.toFixed(0)}</p>
              <p className="text-xs text-gray-500">Dev: {plan.total.deviation.calories}%</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Proteini</p>
              <p className="text-2xl font-bold text-gray-900">{plan.total.protein.toFixed(1)}g</p>
              <p className="text-xs text-gray-500">Dev: {plan.total.deviation.protein}%</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Ugljikohidrati</p>
              <p className="text-2xl font-bold text-gray-900">{plan.total.carbs.toFixed(1)}g</p>
              <p className="text-xs text-gray-500">Dev: {plan.total.deviation.carbs}%</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Masti</p>
              <p className="text-2xl font-bold text-gray-900">{plan.total.fat.toFixed(1)}g</p>
              <p className="text-xs text-gray-500">Dev: {plan.total.deviation.fat}%</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-300">
            <p className="text-sm text-gray-600">
              Ukupno odstupanje: <span className="text-lg font-bold text-gray-900">{plan.total.deviation.total}%</span>
            </p>
          </div>
      </div>
      )}

      <button
        onClick={handleSave}
        className="mt-6 w-full rounded-full bg-gradient-to-r from-gray-900 to-gray-700 px-8 py-4 text-base font-semibold text-white transition hover:opacity-90"
      >
        Spremi PRO Plan Prehrane
      </button>
        </>
      )}

      {/* Gumb za generiranje tjednog plana na dnu stranice - UVJEK VIDLJIV */}
      <div className="mt-8 mb-8 rounded-3xl border-2 border-purple-300 bg-gradient-to-r from-purple-50 to-purple-100 p-6 shadow-xl">
        <h2 className="text-2xl font-bold text-gray-900 mb-3">Tjedni PRO Plan Prehrane (7 dana)</h2>
        <p className="text-gray-700 mb-4 text-sm">
          Generiraj kompletan tjedni plan prehrane sa raznolikošću i optimizacijom makronutrijenata za svih 7 dana.
        </p>
        <button
          onClick={async () => {
            const userId = clientId || null;
            if (!userId) {
              setWeeklyError("Prvo moraš biti prijavljen. Provjeri da li si izračunao svoje kalorije i makroe.");
              return;
            }

            setWeeklyLoading(true);
            setWeeklyError(null);

            try {
              const res = await fetch("/api/meal-plan/pro/weekly", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId }),
              });

              if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.message || "Neuspješno generiranje tjednog plana");
              }

              const data = await res.json();

              if (!data.ok || !data.plan) {
                throw new Error(data.message || "API nije vratio plan");
              }

              setWeeklyPlan(data.plan);
            } catch (err) {
              const errorMessage = err instanceof Error ? err.message : "Greška pri generiranju tjednog plana";
              setWeeklyError(errorMessage);
              console.error("Error generating weekly plan:", err);
            } finally {
              setWeeklyLoading(false);
            }
          }}
          disabled={weeklyLoading}
          className="w-full rounded-full bg-gradient-to-r from-purple-600 to-purple-700 px-8 py-4 text-lg font-bold text-white transition hover:opacity-90 hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          style={{ minHeight: '56px' }}
        >
          {weeklyLoading ? "⏳ Generiram tjedni plan (7 dana)..." : "✓ Generiraj tjedni plan prehrane (7 dana)"}
        </button>

        {/* Prikaz greške */}
        {weeklyError && (
          <div className="mt-4 p-4 rounded-lg bg-red-50 border border-red-200">
            <p className="text-sm text-red-600">{weeklyError}</p>
          </div>
        )}

        {/* Prikaz weekly plana u JSON formatu */}
        {weeklyPlan && (
          <div className="mt-6">
            <h3 className="text-xl font-bold text-gray-900 mb-3">Tjedni Plan (7 dana) - JSON Preview</h3>
            <div className="mb-2 text-sm text-gray-600">
              <p>• Ukupno dana: {weeklyPlan.days?.length || 0}</p>
              <p>• Prosječne kalorije: {weeklyPlan.weeklyAverage?.calories?.toFixed(0) || 'N/A'} kcal</p>
              <p>• Prosječno odstupanje: {weeklyPlan.weeklyAverage?.deviation?.total?.toFixed(1) || 'N/A'}%</p>
            </div>
            <pre className="mt-4 text-xs bg-black/20 p-4 rounded-lg overflow-auto max-h-96 border border-gray-300">
              {JSON.stringify(weeklyPlan, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

interface ProMealSectionProps {
  title: string;
  meal: any;
  mealType: MealType;
  onSwap: () => void;
}

function ProMealSection({ title, meal, mealType, onSwap }: ProMealSectionProps) {
  if (!meal) return null;

  return (
    <div className="rounded-2xl bg-gray-50 p-4 border border-gray-200">
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <button
          onClick={onSwap}
          className="text-xs px-3 py-1 rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
        >
          🔄 Zamijeni
        </button>
      </div>

      <div className="mb-3">
        <p className="text-lg font-semibold text-gray-900">{translateFoodName(meal.name)}</p>
        {meal.meta?.cuisine && (
          <p className="text-xs text-gray-500 italic">{meal.meta.cuisine}</p>
        )}
        
        {/* Prikaži komponente s gramažama */}
        {(() => {
          const mealWithComponents = meal as any;
          const componentDetails = mealWithComponents.componentDetails || [];
          const componentsString = mealWithComponents.componentsString || '';
          
          interface Component {
            foodName: string;
            grams: number;
            units?: number;
            displayText: string;
          }
          let components: Component[] = componentDetails;
          
          if (components.length === 0 && componentsString) {
            components = componentsString.split(", ").map((comp: string): Component | null => {
              const unitsMatch = comp.match(/^(.+?)\s*\((\d+)\s*kom\s*≈\s*(\d+)g\)$/);
              if (unitsMatch) {
                return {
                  foodName: unitsMatch[1].trim(),
                  grams: parseInt(unitsMatch[3], 10),
                  units: parseInt(unitsMatch[2], 10),
                  displayText: comp
                };
              }
              const normalMatch = comp.match(/^(.+?)\s*\((\d+)g\)$/);
              if (normalMatch && normalMatch[1] && normalMatch[2]) {
                return {
                  foodName: normalMatch[1].trim(),
                  grams: parseInt(normalMatch[2], 10),
                  displayText: comp
                };
              }
              return null;
            }).filter((comp: Component | null): comp is Component => comp !== null);
          }
          
          if (components.length > 0) {
            return (
              <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
                <p className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Sastojci i gramaže:</p>
                <div className="space-y-2">
                  {components
                    .filter((comp: Component) => {
                      const nameLower = (comp.foodName || comp.displayText || '').toLowerCase();
                      return !nameLower.includes('voda') && !nameLower.includes('water');
                    })
                    .map((comp: Component, idx: number) => (
                      <div key={idx} className="text-sm text-gray-700 flex justify-between items-center py-1 border-b border-gray-100 last:border-0">
                        <span className="font-medium text-gray-800">{comp.foodName}</span>
                        <span className="font-bold text-purple-600 ml-2">
                          {comp.units ? `${comp.units} kom ≈ ${comp.grams}g` : `${comp.grams}g`}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            );
          }
          return null;
        })()}
      </div>

      {/* Makroi */}
      <div className="mb-3 space-y-1 text-sm">
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
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Score:</span>
            <span className="text-sm font-semibold text-blue-600">
              {(meal.score * 100).toFixed(1)}%
            </span>
          </div>
          {meal.scoreBreakdown && (
            <div className="mt-2 space-y-1 text-xs text-gray-500">
              <div className="flex justify-between">
                <span>Calorie match:</span>
                <span>{(meal.scoreBreakdown.calorieMatch * 100).toFixed(0)}%</span>
              </div>
              <div className="flex justify-between">
                <span>Macro match:</span>
                <span>{(meal.scoreBreakdown.macroMatch * 100).toFixed(0)}%</span>
              </div>
              <div className="flex justify-between">
                <span>Health bonus:</span>
                <span>{(meal.scoreBreakdown.healthBonus * 100).toFixed(0)}%</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Meta info */}
      {meal.meta && (
        <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-500">
          {meal.meta.prepTime && (
            <div className="mb-1">⏱️ Priprema: {meal.meta.prepTime} min</div>
          )}
          {meal.meta.difficulty && (
            <div className="mb-1">📊 Težina: {meal.meta.difficulty}</div>
          )}
          {meal.meta.healthScore !== null && meal.meta.healthScore !== undefined && (
            <div className="mb-1">💚 Health score: {meal.meta.healthScore}/100</div>
          )}
        </div>
      )}
    </div>
  );
}

