import { createServiceClient } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { z } from "zod";

const mealsSchema = z.object({
  clientId: z.string().uuid(),
  meals: z.array(z.any()),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const { clientId, meals } = mealsSchema.parse(json);

    const supabase = createServiceClient();
    
    // Izračunaj ukupne vrijednosti
    const totalCalories = meals.reduce((sum: number, day: any) => 
      sum + day.breakfast.totalCalories + day.lunch.totalCalories + day.dinner.totalCalories + day.snacks.totalCalories, 0
    ) / 7;
    
    const totalProtein = meals.reduce((sum: number, day: any) => 
      sum + day.breakfast.totalProtein + day.lunch.totalProtein + day.dinner.totalProtein + day.snacks.totalProtein, 0
    ) / 7;
    
    const totalCarbs = meals.reduce((sum: number, day: any) => 
      sum + day.breakfast.totalCarbs + day.lunch.totalCarbs + day.dinner.totalCarbs + day.snacks.totalCarbs, 0
    ) / 7;
    
    const totalFats = meals.reduce((sum: number, day: any) => 
      sum + day.breakfast.totalFats + day.lunch.totalFats + day.dinner.totalFats + day.snacks.totalFats, 0
    ) / 7;

    // Spremi plan prehrane
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Ponedjeljak

    const { error } = await supabase
      .from("meal_plans")
      .insert({
        client_id: clientId,
        week_start_date: weekStart.toISOString().split("T")[0],
        meals: meals,
        total_calories: Math.round(totalCalories),
        total_protein: Math.round(totalProtein),
        total_carbs: Math.round(totalCarbs),
        total_fats: Math.round(totalFats),
      });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      ok: true,
      message: "Plan prehrane je spremljen",
    });
  } catch (error) {
    console.error("[meals] error", error);
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Greška pri spremanju",
      },
      { status: 400 }
    );
  }
}

