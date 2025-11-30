import { intakeSchema } from "@/lib/intake-schema";
import { createServiceClient } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const payload = intakeSchema.parse(json);
    let clientId: string | null = null;

    try {
      const supabase = createServiceClient();
      
      console.log("[intake] Pokušavam spremiti podatke u Supabase...");
      console.log("[intake] URL:", process.env.SUPABASE_URL);
      console.log("[intake] Key exists:", !!process.env.SUPABASE_SERVICE_ROLE_KEY);
      
      const { data, error } = await supabase
        .from("clients")
        .insert({
          name: payload.name,
          email: payload.email,
          phone: payload.phone,
          honorific: payload.honorific,
          age_range: payload.ageRange,
          weight_value: payload.weight.value,
          weight_unit: payload.weight.unit,
          height_value: payload.height.value,
          height_unit: payload.height.unit,
          activities: payload.activities,
          goals: payload.goals,
          diet_cleanliness: payload.dietCleanliness,
          notes: payload.notes ?? null,
          other_activities: payload.otherActivities ?? null,
          other_goals: payload.otherGoals ?? null,
          // Nova polja
          training_frequency: payload.trainingFrequency ?? null,
          training_duration: payload.trainingDuration ?? null,
          training_location: payload.trainingLocation ?? null,
          equipment: payload.equipment ?? null,
          experience: payload.experience ?? null,
          meal_frequency: payload.mealFrequency ?? null,
          allergies: (() => {
            // Kombiniraj sva tri polja u format koji generator razumije
            const parts: string[] = [];
            if (payload.allergies?.trim()) {
              parts.push(`alergije: ${payload.allergies.trim()}`);
            }
            if (payload.avoidIngredients?.trim()) {
              parts.push(`ne želim: ${payload.avoidIngredients.trim()}`);
            }
            if (payload.foodPreferences?.trim()) {
              parts.push(`preferiram: ${payload.foodPreferences.trim()}`);
            }
            return parts.length > 0 ? parts.join(". ") : null;
          })(),
          diet_type: payload.dietType ?? null,
          other_diet_type: payload.otherDietType ?? null,
          sleep_hours: payload.sleepHours ?? null,
          injuries: payload.injuries ?? null,
          biggest_challenge: payload.biggestChallenge ?? null,
          other_challenge: payload.otherChallenge ?? null,
        })
        .select("id")
        .single();

      if (error) {
        console.error("[intake] Supabase error:", error);
        console.error("[intake] Error code:", error.code);
        console.error("[intake] Error message:", error.message);
        console.error("[intake] Error details:", error.details);
        console.error("[intake] Error hint:", error.hint);
        throw error;
      }

      console.log("[intake] Podaci uspješno spremljeni! Client ID:", data?.id);
      clientId = data?.id ?? null;
    } catch (error) {
      console.error(
        "[intake] Supabase connection failed:",
        error instanceof Error ? error.message : error,
      );
      console.table(payload);
    }

    return NextResponse.json(
      {
        ok: true,
        clientId,
        message: clientId
          ? "Tvoji odgovori su sigurno spremljeni. Očekuj poruku od mene uskoro!"
          : "Spremljeno lokalno. Molimo dodaj Supabase environment ključeve prije objave.",
      },
      { status: clientId ? 200 : 202 },
    );
  } catch (error) {
    console.error("[intake] submission error", error);
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error ? error.message : "Nismo mogli spremiti odgovore.",
      },
      { status: 400 },
    );
  }
}

