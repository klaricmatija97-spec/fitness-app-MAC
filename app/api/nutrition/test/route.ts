/**
 * API Route: GET /api/nutrition/test
 * 
 * Testira Edamam API konekciju
 */

import { NextResponse } from "next/server";
import { testEdamamConnection, analyzeNutritionFromText } from "@/lib/services/edamamService";

export async function GET() {
  try {
    console.log("🧪 Testing Edamam API connection...");
    
    // Test s jednostavnim jelom
    const testResult = await analyzeNutritionFromText(
      "100g chicken breast, 150g cooked rice, 100g steamed broccoli",
      "Test Meal - Piletina s rižom"
    );

    if (testResult) {
      return NextResponse.json({
        success: true,
        message: "Edamam API radi!",
        testMeal: "100g piletina, 150g riža, 100g brokula",
        nutrition: {
          calories: testResult.calories,
          protein: testResult.protein,
          carbs: testResult.carbs,
          fat: testResult.fat,
          fiber: testResult.fiber,
        },
        micronutrients: {
          vitaminC: testResult.vitaminC,
          vitaminD: testResult.vitaminD,
          calcium: testResult.calcium,
          iron: testResult.iron,
          potassium: testResult.potassium,
        },
      });
    } else {
      return NextResponse.json({
        success: false,
        message: "Edamam API nije vratio rezultat",
        hint: "Provjeri EDAMAM_APP_ID i EDAMAM_APP_KEY u .env.local",
      }, { status: 500 });
    }

  } catch (error) {
    console.error("Edamam test error:", error);
    return NextResponse.json({
      success: false,
      message: "Greška pri testiranju Edamam API",
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}

