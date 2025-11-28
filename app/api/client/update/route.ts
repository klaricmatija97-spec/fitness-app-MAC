import { createServiceClient } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { z } from "zod";

const updateClientSchema = z.object({
  clientId: z.string().uuid(),
  // Osnovni podaci
  name: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  honorific: z.string().optional(),
  // Fizički podaci
  weight: z.number().optional(),
  height: z.number().optional(),
  ageRange: z.string().optional(),
  // Kalkulacije
  bmr: z.number().optional(),
  tdee: z.number().optional(),
  target_calories: z.number().optional(),
  goal_type: z.enum(["lose", "maintain", "gain"]).optional(),
  activity_level: z.string().optional(),
  protein_grams: z.number().optional(),
  carbs_grams: z.number().optional(),
  fats_grams: z.number().optional(),
  // Dodatni podaci
  activities: z.array(z.string()).optional(),
  otherActivities: z.string().optional(),
  goals: z.array(z.string()).optional(),
  otherGoals: z.string().optional(),
  dietCleanliness: z.number().optional(),
  notes: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    console.log("[client/update] Received data:", JSON.stringify(json, null, 2));
    
    const data = updateClientSchema.parse(json);
    console.log("[client/update] Parsed data:", JSON.stringify(data, null, 2));

    const supabase = createServiceClient();

    // Prvo dohvatiti postojećeg klijenta
    const { data: existingClient, error: fetchError } = await supabase
      .from("clients")
      .select("*")
      .eq("id", data.clientId)
      .single();

    if (fetchError && fetchError.code !== "PGRST116") {
      console.error("[client/update] Error fetching client:", fetchError);
      return NextResponse.json(
        { ok: false, message: fetchError.message },
        { status: 500 }
      );
    }

    // Pripremi podatke za update - koristi postojeće vrijednosti ako frontend ne šalje nove
    const weight_value = data.weight ?? existingClient?.weight_value;
    const weight_unit = data.weight !== undefined ? "kg" : (existingClient?.weight_unit ?? "kg");
    const height_value = data.height ?? existingClient?.height_value;
    const height_unit = data.height !== undefined ? "cm" : (existingClient?.height_unit ?? "cm");

    // Složi objekt za update - NIKAD ne koristi null/undefined za obavezna polja
    const clientUpdate: any = {
      id: data.clientId,
      name: data.name ?? existingClient?.name,
      email: data.email ?? existingClient?.email,
      phone: data.phone ?? existingClient?.phone,
      honorific: data.honorific ?? existingClient?.honorific,
      weight_value: weight_value,
      weight_unit: weight_unit,
      height_value: height_value,
      height_unit: height_unit,
      age_range: data.ageRange ?? existingClient?.age_range,
      activities: data.activities ?? existingClient?.activities,
      other_activities: data.otherActivities ?? existingClient?.other_activities,
      goals: data.goals ?? existingClient?.goals,
      other_goals: data.otherGoals ?? existingClient?.other_goals,
      diet_cleanliness: data.dietCleanliness ?? existingClient?.diet_cleanliness,
      notes: data.notes ?? existingClient?.notes,
    };

    // Provjeri da name postoji (obavezno polje)
    if (!clientUpdate.name) {
      return NextResponse.json(
        { ok: false, message: "Client name is required but missing." },
        { status: 400 }
      );
    }

    // Ažuriraj ili kreiraj klijenta koristeći upsert
    const { error: clientUpdateError } = await supabase
      .from("clients")
      .upsert(clientUpdate);

    if (clientUpdateError) {
      console.error("[client/update] Supabase Error:", clientUpdateError);
      return NextResponse.json(
        { ok: false, message: clientUpdateError.message },
        { status: 500 }
      );
    }

    // Spremi kalkulacije u client_calculations tablicu
    if (data.bmr !== undefined || data.tdee !== undefined || data.target_calories !== undefined) {
      const calcUpdateData: any = {
        client_id: data.clientId,
      };
      
      if (data.bmr !== undefined) calcUpdateData.bmr = data.bmr;
      if (data.tdee !== undefined) calcUpdateData.tdee = data.tdee;
      if (data.target_calories !== undefined) calcUpdateData.target_calories = data.target_calories;
      if (data.goal_type !== undefined) calcUpdateData.goal_type = data.goal_type;
      // Napomena: activity_level se ne sprema u client_calculations - aktivnosti su u clients tablici
      if (data.protein_grams !== undefined) calcUpdateData.protein_grams = data.protein_grams;
      if (data.carbs_grams !== undefined) calcUpdateData.carbs_grams = data.carbs_grams;
      if (data.fats_grams !== undefined) calcUpdateData.fats_grams = data.fats_grams;

      // Provjeri da goal_type postoji (obavezno polje u tablici)
      if (!calcUpdateData.goal_type) {
        // Ako nije poslano, pokušaj dohvatiti iz postojećih kalkulacija
        const { data: existingCalc } = await supabase
          .from("client_calculations")
          .select("goal_type")
          .eq("client_id", data.clientId)
          .single();
        
        if (existingCalc?.goal_type) {
          calcUpdateData.goal_type = existingCalc.goal_type;
        } else {
          // Default vrijednost ako ništa ne postoji
          calcUpdateData.goal_type = "maintain";
        }
      }

      const { error: calcError } = await supabase
        .from("client_calculations")
        .upsert(calcUpdateData, {
          onConflict: "client_id",
        });

      if (calcError) {
        console.error("[client/update] Error saving calculations:", calcError);
        return NextResponse.json(
          { ok: false, message: calcError.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ ok: true, message: "Client updated" });
  } catch (error) {
    console.error("[client/update] Error:", error);
    if (error instanceof z.ZodError) {
      console.error("[client/update] Zod validation errors:", JSON.stringify(error.issues, null, 2));
      const errorMessages = error.issues.map(issue => 
        `${issue.path.join(".")}: ${issue.message}`
      ).join(", ");
      return NextResponse.json(
        { 
          ok: false, 
          message: `Neispravni podaci: ${errorMessages}`,
          errors: error.issues 
        },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { ok: false, message: "Greška pri ažuriranju podataka" },
      { status: 500 }
    );
  }
}
