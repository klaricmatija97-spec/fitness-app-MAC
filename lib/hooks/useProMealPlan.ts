/**
 * useProMealPlan Hook
 * 
 * Custom React hook za upravljanje PRO planom prehrane
 */

import { useState, useEffect, useCallback } from "react";
import {
  fetchProMealPlan,
  swapMeal,
  type ProMealPlan,
  type MealType,
} from "../services/proMealPlanApi";
import { hasCalculations } from "../utils/loadCalculationsClient";

export function useProMealPlan(userId: string | null) {
  const [plan, setPlan] = useState<ProMealPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPlan = useCallback(async () => {
    if (!userId) return;

    // Provjeri da li korisnik ima kalkulacije prije poziva
    const hasCalc = await hasCalculations(userId);
    if (!hasCalc) {
      setError("Nema spremljenih kalkulacija – prvo popuni kalkulator.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await fetchProMealPlan(userId);
      setPlan(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Greška pri učitavanju plana";
      setError(errorMessage);
      console.error("Error loading PRO meal plan:", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const regenerate = useCallback(async () => {
    return loadPlan();
  }, [loadPlan]);

  const swapMealInPlan = useCallback(
    async (mealType: MealType) => {
      if (!userId || !plan) return;

      try {
        const data = await swapMeal(userId, mealType);

        if (data.ok && data.meal) {
          // Ažuriraj plan sa novim obrokom
          setPlan((prev) => {
            if (!prev) return prev;

            return {
              ...prev,
              [mealType]: data.meal,
              // Ažuriraj total ako je dostupan
              total: data.total || prev.total,
            };
          });
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Greška pri zamjeni obroka";
        setError(errorMessage);
        console.error("Error swapping meal:", err);
      }
    },
    [userId, plan]
  );

  useEffect(() => {
    if (userId) {
      loadPlan();
    }
  }, [userId, loadPlan]);

  return {
    plan,
    loading,
    error,
    regenerate,
    swapMeal: swapMealInPlan,
  };
}

