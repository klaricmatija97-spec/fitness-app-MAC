/**
 * API Route: POST /api/workout-plan/generate
 * 
 * Generira personalizirani tjedni plan treninga na temelju korisničkih podataka
 */

import { NextRequest, NextResponse } from "next/server";
import { generateWorkoutPlan, getAvailablePrograms, UserInputs } from "@/lib/services/workoutPlanGeneratorV2";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validiraj obavezna polja
    const requiredFields = [
      "gender",
      "age", 
      "height",
      "weight",
      "level",
      "primaryGoal",
      "trainingDaysPerWeek",
      "sessionDuration",
      "selectedProgram",
    ];

    for (const field of requiredFields) {
      if (body[field] === undefined || body[field] === null) {
        return NextResponse.json(
          { error: `Nedostaje obavezno polje: ${field}` },
          { status: 400 }
        );
      }
    }

    // Validiraj tipove
    if (!["muško", "žensko"].includes(body.gender)) {
      return NextResponse.json(
        { error: "Spol mora biti 'muško' ili 'žensko'" },
        { status: 400 }
      );
    }

    if (!["početnik", "srednji", "napredni"].includes(body.level)) {
      return NextResponse.json(
        { error: "Razina mora biti 'početnik', 'srednji' ili 'napredni'" },
        { status: 400 }
      );
    }

    const validGoals = [
      "povećati mišićnu masu",
      "gubiti masnoću", 
      "povećati izdržljivost",
      "povećati snagu",
      "povećati brzinu",
    ];
    if (!validGoals.includes(body.primaryGoal)) {
      return NextResponse.json(
        { error: `Cilj mora biti jedan od: ${validGoals.join(", ")}` },
        { status: 400 }
      );
    }

    if (![2, 3, 4, 5, 6].includes(body.trainingDaysPerWeek)) {
      return NextResponse.json(
        { error: "Broj dana treninga mora biti između 2 i 6" },
        { status: 400 }
      );
    }

    if (![30, 45, 60, 75, 90].includes(body.sessionDuration)) {
      return NextResponse.json(
        { error: "Trajanje treninga mora biti 30, 45, 60, 75 ili 90 minuta" },
        { status: 400 }
      );
    }

    // Validiraj program prema spolu
    const availablePrograms = getAvailablePrograms(body.gender);
    const validProgramIds = availablePrograms.map(p => p.id);
    if (!validProgramIds.includes(body.selectedProgram)) {
      return NextResponse.json(
        { error: `Program mora biti jedan od: ${validProgramIds.join(", ")} za spol ${body.gender}` },
        { status: 400 }
      );
    }

    // Pripremi input
    const userInputs: UserInputs = {
      gender: body.gender,
      age: Number(body.age),
      height: Number(body.height),
      weight: Number(body.weight),
      level: body.level,
      primaryGoal: body.primaryGoal,
      secondaryGoals: body.secondaryGoals || [],
      trainingDaysPerWeek: body.trainingDaysPerWeek,
      sessionDuration: body.sessionDuration,
      selectedProgram: body.selectedProgram,
      wantsCardio: body.wantsCardio || false,
      cardioType: body.cardioType || null,
      wantsPlyometrics: body.wantsPlyometrics || false,
    };

    // Generiraj plan
    const plan = generateWorkoutPlan(userInputs);

    return NextResponse.json({
      success: true,
      plan,
    });

  } catch (error) {
    console.error("Error generating workout plan:", error);
    return NextResponse.json(
      { error: "Greška pri generiranju plana treninga" },
      { status: 500 }
    );
  }
}

/**
 * API Route: GET /api/workout-plan/generate
 * 
 * Vraća dostupne programe za određeni spol
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const gender = searchParams.get("gender");

    if (!gender || !["muško", "žensko"].includes(gender)) {
      return NextResponse.json(
        { error: "Spol mora biti 'muško' ili 'žensko'" },
        { status: 400 }
      );
    }

    const programs = getAvailablePrograms(gender as "muško" | "žensko");

    return NextResponse.json({
      success: true,
      gender,
      programs,
    });

  } catch (error) {
    console.error("Error fetching programs:", error);
    return NextResponse.json(
      { error: "Greška pri dohvaćanju programa" },
      { status: 500 }
    );
  }
}
