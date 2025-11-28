/**
 * Server-only helper za spremanje i dohvat korisničkih kalkulacija
 * 
 * Koristi Supabase za spremanje podataka
 */

import { createServiceClient } from "../supabase";
import type { UserCalculations } from "../types/userCalculations";

/**
 * Spremi korisničke kalkulacije u Supabase
 */
export async function saveUserCalculations(
  userId: string,
  calc: UserCalculations
): Promise<void> {
  const supabase = createServiceClient();

  // Pokušaj spremiti u user_calculations (novi format)
  // Ako tablica ne postoji, koristi client_calculations (legacy)
  let error = null;
  
  try {
    const { error: newError } = await supabase
      .from("user_calculations")
      .upsert(
        {
          user_id: userId,
          total_calories: calc.totalCalories,
          protein_grams: calc.proteinGrams,
          carb_grams: calc.carbGrams,
          fat_grams: calc.fatGrams,
          bmr: calc.bmr || null,
          tdee: calc.tdee || null,
          goal_type: calc.goalType || null,
          activity_level: calc.activityLevel || null,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id",
        }
      );
    
    if (!newError) {
      return; // Uspješno spremljeno
    }
    error = newError;
  } catch (tableError: any) {
    // Ako tablica ne postoji, koristi legacy tablicu
    if (tableError.code === "42P01" || tableError.message?.includes("does not exist")) {
      console.log("user_calculations tablica ne postoji, koristim client_calculations");
      
      const { error: legacyError } = await supabase
        .from("client_calculations")
        .upsert(
          {
            client_id: userId,
            bmr: calc.bmr || 0,
            tdee: calc.tdee || 0,
            target_calories: calc.totalCalories,
            goal_type: calc.goalType || "maintain",
            protein_grams: calc.proteinGrams,
            carbs_grams: calc.carbGrams,
            fats_grams: calc.fatGrams,
            activity_level: calc.activityLevel || "moderate",
          },
          {
            onConflict: "client_id",
          }
        );
      
      if (legacyError) {
        console.error("Error saving user calculations to Supabase (legacy):", legacyError);
        throw new Error(`Greška pri spremanju kalkulacija: ${legacyError.message}`);
      }
      return; // Uspješno spremljeno u legacy tablicu
    }
    throw tableError;
  }

  if (error) {
    console.error("Error saving user calculations to Supabase:", error);
    throw new Error(`Greška pri spremanju kalkulacija: ${error.message}`);
  }
}

/**
 * Dohvati korisničke kalkulacije iz Supabase
 */
export async function getUserCalculations(
  userId: string
): Promise<UserCalculations | null> {
  const supabase = createServiceClient();

  // Pokušaj učitati iz user_calculations (novi format)
  try {
    const { data, error } = await supabase
      .from("user_calculations")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (!error && data) {
      return {
        totalCalories: parseFloat(data.total_calories) || 0,
        proteinGrams: parseFloat(data.protein_grams) || 0,
        carbGrams: parseFloat(data.carb_grams) || 0,
        fatGrams: parseFloat(data.fat_grams) || 0,
        bmr: data.bmr ? parseFloat(data.bmr) : undefined,
        tdee: data.tdee ? parseFloat(data.tdee) : undefined,
        goalType: data.goal_type as "lose" | "maintain" | "gain" | undefined,
        activityLevel: data.activity_level || undefined,
      };
    }

    if (error && error.code !== "PGRST116" && error.code !== "42P01") {
      // Ako nije "not found" ili "table doesn't exist", baci grešku
      throw error;
    }
  } catch (tableError: any) {
    // Ako tablica ne postoji, pokušaj legacy tablicu
    if (tableError.code === "42P01" || tableError.message?.includes("does not exist")) {
      console.log("user_calculations tablica ne postoji, koristim client_calculations");
    } else {
      throw tableError;
    }
  }

  // Fallback na legacy tablicu (client_calculations)
  const { data, error } = await supabase
    .from("client_calculations")
    .select("*")
    .eq("client_id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // Nema zapisa
      return null;
    }
    console.error("Error fetching user calculations from Supabase (legacy):", error);
    throw new Error(`Greška pri dohvatu kalkulacija: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return {
    totalCalories: parseFloat(data.target_calories) || 0,
    proteinGrams: parseFloat(data.protein_grams) || 0,
    carbGrams: parseFloat(data.carbs_grams) || 0,
    fatGrams: parseFloat(data.fats_grams) || 0,
    bmr: data.bmr ? parseFloat(data.bmr) : undefined,
    tdee: data.tdee ? parseFloat(data.tdee) : undefined,
    goalType: data.goal_type as "lose" | "maintain" | "gain" | undefined,
    activityLevel: data.activity_level || undefined,
  };
}

