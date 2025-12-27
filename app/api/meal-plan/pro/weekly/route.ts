/**
 * POST /api/meal-plan/pro/weekly
 * 
 * Generiše PRO tjedni plan prehrane (7 dana) sa raznolikošću i user preferences
 * KORISTI LOKALNI GENERATOR (bez Supabase)
 * 
 * Body: { calculations: { targetCalories, targetProtein, targetCarbs, targetFat, goalType } }
 */

import { NextResponse } from "next/server";
import { generateWeeklyMealPlanLocal } from "@/lib/services/localMealPlanGenerator";
import { z } from "zod";

const requestSchema = z.object({
  userId: z.string().uuid("userId mora biti validan UUID").optional(),
  calculations: z.object({
    targetCalories: z.number().positive(),
    targetProtein: z.number().positive(),
    targetCarbs: z.number().positive(),
    targetFat: z.number().positive(),
    goalType: z.enum(["lose", "maintain", "gain"]),
    bmr: z.number().optional(),
    tdee: z.number().optional(),
    preferences: z.object({
      allergies: z.string().optional(),
      foodPreferences: z.string().optional(),
      avoidIngredients: z.string().optional(),
      trainingFrequency: z.string().optional(),
    }).optional(),
  }).optional(),
});

// Export runtime config za Next.js
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Wrapper funkcija koja osigurava da se UVJEK vraća JSON
async function handleRequest(request: Request) {
  // GLOBALNI ERROR HANDLER - osiguraj da se UVJEK vraća JSON, nikad HTML
  try {
    // Osiguraj da se JSON parsira pravilno
    let body: any = {};
    try {
      body = await request.json();
    } catch (jsonError) {
      console.warn("[meal-plan/pro/weekly] Neuspješno parsiranje JSON body-a, koristim prazan objekt");
      body = {};
    }
    
    // Provjeri da li su poslane direktne kalkulacije
    if (body.calculations) {
      // LOKALNI GENERATOR - bez Supabase
      console.log(`[meal-plan/pro/weekly] Generiranje plana s LOKALNIM generatorom`);
      
      const validatedData = requestSchema.parse({ calculations: body.calculations });
      const calc = validatedData.calculations!;
      
      let weeklyPlan;
      try {
        weeklyPlan = await generateWeeklyMealPlanLocal(
          {
            targetCalories: calc.targetCalories,
            targetProtein: calc.targetProtein,
            targetCarbs: calc.targetCarbs,
            targetFat: calc.targetFat,
            goalType: calc.goalType,
            bmr: calc.bmr,
            tdee: calc.tdee,
          },
          calc.preferences
        );
        console.log(`[meal-plan/pro/weekly] Plan uspješno generiran (lokalno)`);
      } catch (genError) {
        console.error(`[meal-plan/pro/weekly] Greška pri generiranju plana:`, genError);
        const errorMessage = genError instanceof Error 
          ? genError.message 
          : String(genError);
        const safeErrorMessage = errorMessage.length > 500 
          ? errorMessage.substring(0, 500) + '...' 
          : errorMessage;
        
        return NextResponse.json(
          {
            ok: false,
            message: safeErrorMessage || "Greška pri generiranju plana prehrane",
            error: process.env.NODE_ENV === 'development' 
              ? (genError instanceof Error ? genError.stack : undefined)
              : undefined,
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        ok: true,
        message: "Tjedni plan prehrane uspješno generiran (lokalno)",
        plan: weeklyPlan,
        weeklyAverage: weeklyPlan.weeklyAverage,
      });
    }

    // LOKALNI GENERATOR - calculations su obavezni
    // userId nije podržan u lokalnom načinu rada
    return NextResponse.json(
      {
        ok: false,
        message: "calculations objekt je obavezan. Lokalni generator ne podržava userId autentikaciju.",
        example: {
          calculations: {
            targetCalories: 2000,
            targetProtein: 150,
            targetCarbs: 200,
            targetFat: 67,
            goalType: "maintain"
          }
        }
      },
      { status: 400 }
    );
  } catch (error) {
    console.error("[meal-plan/pro/weekly] error:", error);
    console.error("[meal-plan/pro/weekly] error stack:", error instanceof Error ? error.stack : 'No stack trace');
    console.error("[meal-plan/pro/weekly] error message:", error instanceof Error ? error.message : String(error));
    console.error("[meal-plan/pro/weekly] error name:", error instanceof Error ? error.name : 'Unknown');

    // Ako je validacijska greška
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          ok: false,
          message: "Neispravni podaci",
          errors: error.issues,
        },
        { status: 400 }
      );
    }

    // Opća greška - UVIJEK vraćaj JSON, nikad HTML
    const errorMessage = error instanceof Error 
      ? error.message 
      : String(error);
    
    // Ograniči duljinu error message-a da ne bude predugačak
    const safeErrorMessage = errorMessage.length > 500 
      ? errorMessage.substring(0, 500) + '...' 
      : errorMessage;

    return NextResponse.json(
      {
        ok: false,
        message: safeErrorMessage || "Greška pri generiranju PRO tjednog plana prehrane",
        error: process.env.NODE_ENV === 'development' 
          ? (error instanceof Error ? error.stack : undefined)
          : undefined, // Stack trace samo u dev modu
      },
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}

// Export POST funkcije s dodatnom zaštitom
export async function POST(request: Request) {
  try {
    return await handleRequest(request);
  } catch (outerError) {
    // Apsolutna posljednja linija obrane - ako se greška dogodi čak i u error handleru
    console.error("[meal-plan/pro/weekly] CRITICAL: Greška u error handleru:", outerError);
    return NextResponse.json(
      {
        ok: false,
        message: "Kritična greška na serveru. Molimo pokušajte ponovno.",
        error: process.env.NODE_ENV === 'development' 
          ? (outerError instanceof Error ? outerError.message : String(outerError))
          : undefined,
      },
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}

