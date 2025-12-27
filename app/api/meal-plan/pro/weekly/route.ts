/**
 * POST /api/meal-plan/pro/weekly
 * 
 * Generiše PRO tjedni plan prehrane (7 dana) sa raznolikošću i user preferences
 * 
 * Body: { userId: string (UUID) }
 */

import { NextResponse } from "next/server";
import {
  generateWeeklyProMealPlan,
  generateWeeklyProMealPlanWithCalculations,
  saveWeeklyProMealPlanToSupabase,
} from "@/lib/services/proMealPlanGenerator";
import { loadUserCalculations } from "@/lib/utils/loadCalculations";
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
      // Unauthenticated mode - use direct calculations
      console.log(`[meal-plan/pro/weekly] Generiranje plana s direktnim kalkulacijama`);
      
      const validatedData = requestSchema.parse({ calculations: body.calculations });
      
      let weeklyPlan;
      try {
        weeklyPlan = await generateWeeklyProMealPlanWithCalculations(validatedData.calculations!);
        console.log(`[meal-plan/pro/weekly] Plan uspješno generiran`);
        
        // DEBUG: Logiraj strukturu plana
        console.log(`[meal-plan/pro/weekly] Plan struktura:`, {
          hasDays: !!weeklyPlan.days,
          daysLength: weeklyPlan.days?.length,
          firstDay: weeklyPlan.days?.[0],
          firstDayMeals: weeklyPlan.days?.[0]?.meals,
          firstDayMealsKeys: weeklyPlan.days?.[0]?.meals ? Object.keys(weeklyPlan.days[0].meals) : [],
          firstDayBreakfast: weeklyPlan.days?.[0]?.meals?.breakfast,
          firstDayBreakfastName: weeklyPlan.days?.[0]?.meals?.breakfast?.name,
          firstDayBreakfastCalories: weeklyPlan.days?.[0]?.meals?.breakfast?.calories,
        });
      } catch (genError) {
        console.error(`[meal-plan/pro/weekly] Greška pri generiranju plana:`, genError);
        console.error(`[meal-plan/pro/weekly] Error details:`, {
          message: genError instanceof Error ? genError.message : String(genError),
          stack: genError instanceof Error ? genError.stack : 'No stack trace',
          name: genError instanceof Error ? genError.name : 'Unknown',
        });
        // Ne baci error direktno - umjesto toga, vrati JSON error response
        const errorMessage = genError instanceof Error 
          ? genError.message 
          : String(genError);
        const safeErrorMessage = errorMessage.length > 500 
          ? errorMessage.substring(0, 500) + '...' 
          : errorMessage;
        
        return NextResponse.json(
          {
            ok: false,
            message: safeErrorMessage || "Greška pri generiranju PRO tjednog plana prehrane",
            error: process.env.NODE_ENV === 'development' 
              ? (genError instanceof Error ? genError.stack : undefined)
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

      // Vrati finalni plan (bez spremanja u bazu za guest korisnike)
      const response = {
        ok: true,
        message: "PRO tjedni plan prehrane je uspješno generiran",
        plan: weeklyPlan,
        weeklyAverage: weeklyPlan.weeklyAverage,
      };
      
      // DEBUG: Logiraj što se vraća
      console.log(`[meal-plan/pro/weekly] Vraćam response:`, {
        ok: response.ok,
        planHasDays: !!response.plan?.days,
        planDaysLength: response.plan?.days?.length,
        firstDayMeals: response.plan?.days?.[0]?.meals,
      });
      
      return NextResponse.json(response, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    // Authenticated mode - use userId
    const url = new URL(request.url);
    const queryUserId = url.searchParams.get("userId");
    let userId: string;

    if (queryUserId) {
      userId = queryUserId;
    } else {
      userId = body.userId;
    }

    // Validiraj userId
    if (!userId) {
      return NextResponse.json(
        {
          ok: false,
          message: "userId je obavezan (query parametar ili body) ili pošaljite calculations",
        },
        { status: 400 }
      );
    }

    const validatedData = requestSchema.parse({ userId });

    console.log(`[meal-plan/pro/weekly] Generiranje plana za korisnika: ${validatedData.userId}`);

    // Provjeri da li korisnik ima kalkulacije prije generiranja
    const calculationsResult = await loadUserCalculations(validatedData.userId!, true);
    if (!calculationsResult.success || !calculationsResult.calculations) {
      return NextResponse.json(
        {
          ok: false,
          message: calculationsResult.error || "Nema spremljenih kalkulacija – prvo popuni kalkulator.",
        },
        { status: 400 }
      );
    }

    const calc = calculationsResult.calculations;

    // Generiši PRO tjedni plan prehrane sa opcijama
    let weeklyPlan;
    try {
      // Default 5 obroka dnevno
      const mealsPerDay = 5;

      weeklyPlan = await generateWeeklyProMealPlan(validatedData.userId!, {
        mealsPerDay,
        targetCalories: calc.targetCalories,
        targetProtein: calc.targetProtein,
        targetCarbs: calc.targetCarbs,
        targetFat: calc.targetFats,
      });
      console.log(`[meal-plan/pro/weekly] Plan uspješno generiran`);
    } catch (genError) {
      console.error(`[meal-plan/pro/weekly] Greška pri generiranju plana:`, genError);
      console.error(`[meal-plan/pro/weekly] Error details:`, {
        message: genError instanceof Error ? genError.message : String(genError),
        stack: genError instanceof Error ? genError.stack : 'No stack trace',
        name: genError instanceof Error ? genError.name : 'Unknown',
      });
      // Ne baci error direktno - umjesto toga, vrati JSON error response
      const errorMessage = genError instanceof Error 
        ? genError.message 
        : String(genError);
      const safeErrorMessage = errorMessage.length > 500 
        ? errorMessage.substring(0, 500) + '...' 
        : errorMessage;
      
      return NextResponse.json(
        {
          ok: false,
          message: safeErrorMessage || "Greška pri generiranju PRO tjednog plana prehrane",
          error: process.env.NODE_ENV === 'development' 
            ? (genError instanceof Error ? genError.stack : undefined)
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

    // Spremi plan u bazu (opcionalno - ne bacaj grešku ako ne uspije)
    let savedPlan;
    try {
      savedPlan = await saveWeeklyProMealPlanToSupabase(validatedData.userId!, weeklyPlan);
      console.log(`[meal-plan/pro/weekly] Plan spremljen u bazu: ${savedPlan.id}`);
    } catch (saveError) {
      console.warn(`[meal-plan/pro/weekly] Greška pri spremanju u bazu (plan je generiran):`, saveError);
      // Nastavi bez spremanja u bazu
      savedPlan = { id: null };
    }

    // Vrati finalni plan
    return NextResponse.json({
      ok: true,
      message: "PRO tjedni plan prehrane je uspješno generiran i spremljen",
      plan: weeklyPlan,
      savedPlanId: savedPlan.id,
      weeklyAverage: weeklyPlan.weeklyAverage,
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
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

