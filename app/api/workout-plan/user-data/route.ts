/**
 * API Route: GET /api/workout-plan/user-data
 * 
 * Dohvaća korisničke podatke iz baze za workout generator
 * Mapira podatke iz upitnika na format koji generator očekuje
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

// Mapiranje ciljeva iz upitnika na workout ciljeve
const goalMapping: Record<string, string> = {
  "lose-weight": "gubiti masnoću",
  "gain-muscle": "povećati mišićnu masu",
  "improve-endurance": "povećati izdržljivost",
  "improve-strength": "povećati snagu",
  "improve-speed": "povećati brzinu",
  "maintain": "povećati mišićnu masu", // default
  "tone": "gubiti masnoću",
  "flexibility": "povećati izdržljivost",
};

// Parsiranje dobne grupe u srednju dob
function parseAgeRange(ageRange: string): number {
  if (!ageRange || ageRange === "other") return 30;
  
  const parts = ageRange.split("-").map(Number);
  if (parts.length === 2 && parts[0] && parts[1]) {
    return Math.floor((parts[0] + parts[1]) / 2);
  }
  
  if (ageRange.startsWith("70")) return 75;
  if (ageRange.startsWith("10")) return 15;
  
  return 30;
}

// Određivanje razine na temelju aktivnosti
function determineLevel(activities: string[], trainingFrequency?: string): "početnik" | "srednji" | "napredni" {
  // Ako ima definiranu frekvenciju treninga
  if (trainingFrequency) {
    const freq = parseInt(trainingFrequency);
    if (freq >= 5) return "napredni";
    if (freq >= 3) return "srednji";
    return "početnik";
  }
  
  // Inače po broju aktivnosti
  if (!activities || activities.length === 0) return "početnik";
  if (activities.length >= 4) return "napredni";
  if (activities.length >= 2) return "srednji";
  return "početnik";
}

// Određivanje broja treninga tjedno
function determineTrainingDays(trainingFrequency?: string, activities?: string[]): 2 | 3 | 4 | 5 | 6 {
  if (trainingFrequency) {
    const freq = parseInt(trainingFrequency);
    if (freq >= 6) return 6;
    if (freq >= 5) return 5;
    if (freq >= 4) return 4;
    if (freq >= 3) return 3;
    return 3;
  }
  
  // Default na temelju aktivnosti
  if (activities && activities.length >= 4) return 4;
  if (activities && activities.length >= 2) return 3;
  return 3;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId je obavezan parametar" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Dohvati podatke iz clients tablice
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select(`
        honorific,
        age_range,
        weight_value,
        weight_unit,
        height_value,
        height_unit,
        activities,
        goals,
        training_frequency
      `)
      .eq("id", userId)
      .single();

    if (clientError || !client) {
      console.error("Error fetching client:", clientError);
      return NextResponse.json(
        { error: "Korisnik nije pronađen" },
        { status: 404 }
      );
    }

    // Mapiranje podataka
    const gender: "muško" | "žensko" = client.honorific === "mr" ? "muško" : "žensko";
    
    const age = parseAgeRange(client.age_range);
    
    // Konvertuj težinu u kg ako je u lb
    let weight = client.weight_value || 70;
    if (client.weight_unit === "lb") {
      weight = Math.round(weight * 0.453592);
    }
    
    // Konvertuj visinu u cm ako je u inches
    let height = client.height_value || 170;
    if (client.height_unit === "in") {
      height = Math.round(height * 2.54);
    }
    
    // Mapiraj ciljeve
    const clientGoals = client.goals || [];
    let primaryGoal = "povećati mišićnu masu"; // default
    if (clientGoals.length > 0) {
      const firstGoal = clientGoals[0];
      primaryGoal = goalMapping[firstGoal] || "povećati mišićnu masu";
    }
    
    const activities = client.activities || [];
    const level = determineLevel(activities, client.training_frequency);
    const trainingDaysPerWeek = determineTrainingDays(client.training_frequency, activities);

    const userData = {
      gender,
      age,
      weight,
      height,
      level,
      primaryGoal,
      trainingDaysPerWeek,
      sessionDuration: 60, // Default 60 min
    };

    console.log(`✅ User data loaded for ${userId}:`, userData);

    return NextResponse.json({
      success: true,
      userData,
    });

  } catch (error) {
    console.error("Error loading user data:", error);
    return NextResponse.json(
      { error: "Greška pri dohvaćanju korisničkih podataka" },
      { status: 500 }
    );
  }
}

