/**
 * API endpoint za spremanje i učitavanje korisničkih podataka iz slajdova
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import {
  saveUserProfile,
  getUserData,
  updateUserBasicData,
  updateUserGoalsAndActivities,
  updateUserTraining,
  updateUserCalculations,
  type UserProfile,
} from "@/lib/data/userData";

const userDataSchema = z.object({
  clientId: z.string().uuid(),
  // Osnovni podaci
  gender: z.enum(["male", "female"]).optional(),
  age: z.number().optional(),
  weight: z.number().optional(),
  height: z.number().optional(),
  
  // Kalkulacije
  calculations: z.object({
    bmr: z.number(),
    tdee: z.number(),
    targetCalories: z.number(),
    goalType: z.enum(["lose", "maintain", "gain"]),
    macros: z.object({
      protein: z.number(),
      carbs: z.number(),
      fats: z.number(),
    }),
    activityLevel: z.string(),
  }).optional(),
  
  // Ciljevi i preferencije
  goals: z.array(z.string()).optional(),
  activities: z.array(z.string()).optional(),
  allergies: z.array(z.string()).optional(),
  dietaryRestrictions: z.array(z.string()).optional(),
  injuries: z.array(z.string()).optional(),
  
  // Prehrana
  mealPreferences: z.object({
    sweet: z.boolean().optional(),
    savory: z.boolean().optional(),
    mealCount: z.number().optional(),
  }).optional(),
  
  // Trening
  training: z.object({
    frequency: z.string().optional(),
    duration: z.string().optional(),
    location: z.string().optional(),
    type: z.string().optional(),
    split: z.string().optional(),
  }).optional(),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const data = userDataSchema.parse(json);

    // Ako su poslani kalkulacije, spremi ih
    if (data.calculations) {
      updateUserCalculations(data.clientId, data.calculations);
    }

    // Ažuriraj osnovne podatke ako su poslani
    if (data.gender || data.age || data.weight || data.height) {
      updateUserBasicData(data.clientId, {
        gender: data.gender,
        age: data.age,
        weight: data.weight,
        height: data.height,
      });
    }

    // Ažuriraj ciljeve i aktivnosti ako su poslani
    if (data.goals || data.activities) {
      updateUserGoalsAndActivities(
        data.clientId,
        data.goals || [],
        data.activities || []
      );
    }

    // Ažuriraj trening ako je poslan
    if (data.training) {
      updateUserTraining(data.clientId, data.training);
    }

    // Ako je poslan kompletan profil, spremi ga
    const existingProfile = getUserData(data.clientId);
    if (existingProfile) {
      const updatedProfile: UserProfile = {
        ...existingProfile,
        ...(data.gender && { gender: data.gender }),
        ...(data.age && { age: data.age }),
        ...(data.weight && { weight: data.weight }),
        ...(data.height && { height: data.height }),
        ...(data.goals && { goals: data.goals }),
        ...(data.activities && { activities: data.activities }),
        ...(data.allergies && { allergies: data.allergies }),
        ...(data.dietaryRestrictions && { dietaryRestrictions: data.dietaryRestrictions }),
        ...(data.injuries && { injuries: data.injuries }),
        ...(data.mealPreferences && { mealPreferences: { ...existingProfile.mealPreferences, ...data.mealPreferences } }),
        ...(data.training && { training: { ...existingProfile.training, ...data.training } }),
      };
      saveUserProfile(updatedProfile);
    } else {
      // Kreiraj novi profil
      const newProfile: UserProfile = {
        clientId: data.clientId,
        gender: data.gender || "male",
        age: data.age || 30,
        weight: data.weight || 70,
        height: data.height || 175,
        calculations: data.calculations || null,
        goals: data.goals || [],
        activities: data.activities || [],
        allergies: data.allergies || [],
        dietaryRestrictions: data.dietaryRestrictions || [],
        injuries: data.injuries || [],
        mealPreferences: {
          sweet: data.mealPreferences?.sweet || false,
          savory: data.mealPreferences?.savory || false,
          mealCount: data.mealPreferences?.mealCount || 3,
        },
        training: {
          frequency: data.training?.frequency || "",
          duration: data.training?.duration || "",
          location: data.training?.location || "",
          type: data.training?.type || "",
          split: data.training?.split || "",
        },
        lastUpdated: new Date().toISOString(),
      };
      saveUserProfile(newProfile);
    }

    return NextResponse.json({
      ok: true,
      message: "Podaci su spremljeni",
    });
  } catch (error) {
    console.error("[user-data] error", error);
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Greška pri spremanju",
      },
      { status: 400 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");

    if (!clientId) {
      return NextResponse.json(
        { ok: false, message: "clientId je obavezan" },
        { status: 400 }
      );
    }

    const userData = getUserData(clientId);

    if (!userData) {
      return NextResponse.json(
        { ok: false, message: "Korisnik nije pronađen" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      data: userData,
    });
  } catch (error) {
    console.error("[user-data] error", error);
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Greška pri učitavanju",
      },
      { status: 400 }
    );
  }
}



