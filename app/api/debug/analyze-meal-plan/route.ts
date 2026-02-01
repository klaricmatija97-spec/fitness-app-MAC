import { createServiceClient } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");
    const email = searchParams.get("email");
    
    if (!clientId && !email) {
      return NextResponse.json({ error: "Provide clientId or email" }, { status: 400 });
    }
    
    const supabase = createServiceClient();
    
    // Find client
    let client = null;
    if (email) {
      const { data } = await supabase
        .from("clients")
        .select("id, name, email")
        .eq("email", email.toLowerCase().trim())
        .single();
      client = data;
    } else if (clientId) {
      const { data } = await supabase
        .from("clients")
        .select("id, name, email")
        .eq("id", clientId)
        .single();
      client = data;
    }
    
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }
    
    // Get calculations
    const { data: calculations } = await supabase
      .from("client_calculations")
      .select("*")
      .eq("client_id", client.id)
      .single();
    
    // Get latest meal plan
    const { data: mealPlan } = await supabase
      .from("meal_plans")
      .select("*")
      .eq("client_id", client.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (!mealPlan) {
      return NextResponse.json({
        ok: true,
        client,
        calculations,
        mealPlan: null,
        message: "No meal plan found",
      });
    }
    
    // Analyze meal plan
    const analysis: any = {
      client,
      calculations: {
        targetCalories: calculations?.target_calories,
        targetProtein: calculations?.protein_grams,
        targetCarbs: calculations?.carbs_grams,
        targetFat: calculations?.fats_grams,
      },
      mealPlan: {
        id: mealPlan.id,
        planType: mealPlan.plan_type,
        weekStart: mealPlan.week_start_date,
        totalCalories: mealPlan.total_calories,
        totalProtein: mealPlan.total_protein,
        totalCarbs: mealPlan.total_carbs,
        totalFats: mealPlan.total_fats,
      },
      dailyAnalysis: [],
    };
    
    // Analyze each day if meals exist
    if (mealPlan.meals && Array.isArray(mealPlan.meals)) {
      for (let dayIndex = 0; dayIndex < mealPlan.meals.length; dayIndex++) {
        const day = mealPlan.meals[dayIndex];
        if (!day) continue;
        
        let dayCalories = 0;
        let dayProtein = 0;
        let dayCarbs = 0;
        let dayFat = 0;
        
        // Sum all meals
        const meals = ['breakfast', 'lunch', 'dinner', 'snacks', 'snack'];
        for (const mealType of meals) {
          if (day[mealType]) {
            if (Array.isArray(day[mealType])) {
              // Array of items
              for (const item of day[mealType]) {
                dayCalories += item.calories || 0;
                dayProtein += item.protein || 0;
                dayCarbs += item.carbs || 0;
                dayFat += item.fat || 0;
              }
            } else if (day[mealType].items && Array.isArray(day[mealType].items)) {
              // Object with items array
              for (const item of day[mealType].items) {
                dayCalories += item.calories || 0;
                dayProtein += item.protein || 0;
                dayCarbs += item.carbs || 0;
                dayFat += item.fat || 0;
              }
            } else if (day[mealType].totals) {
              // Object with totals
              dayCalories += day[mealType].totals.calories || 0;
              dayProtein += day[mealType].totals.protein || 0;
              dayCarbs += day[mealType].totals.carbs || 0;
              dayFat += day[mealType].totals.fat || 0;
            }
          }
        }
        
        const calDiff = dayCalories - (calculations?.target_calories || 0);
        const proteinDiff = dayProtein - (calculations?.protein_grams || 0);
        const carbsDiff = dayCarbs - (calculations?.carbs_grams || 0);
        const fatDiff = dayFat - (calculations?.fats_grams || 0);
        
        analysis.dailyAnalysis.push({
          day: dayIndex + 1,
          calories: Math.round(dayCalories),
          protein: Math.round(dayProtein * 10) / 10,
          carbs: Math.round(dayCarbs * 10) / 10,
          fat: Math.round(dayFat * 10) / 10,
          calDiff: Math.round(calDiff),
          proteinDiff: Math.round(proteinDiff * 10) / 10,
          carbsDiff: Math.round(carbsDiff * 10) / 10,
          fatDiff: Math.round(fatDiff * 10) / 10,
          calDiffPercent: calculations?.target_calories 
            ? Math.round((calDiff / calculations.target_calories) * 1000) / 10 
            : 0,
        });
      }
    }
    
    // Calculate average and max deviation
    if (analysis.dailyAnalysis.length > 0) {
      const calDiffs = analysis.dailyAnalysis.map(d => Math.abs(d.calDiff));
      analysis.summary = {
        avgCalDiff: Math.round(calDiffs.reduce((a, b) => a + b, 0) / calDiffs.length),
        maxCalDiff: Math.max(...calDiffs),
        minCalDiff: Math.min(...calDiffs),
        avgCalDiffPercent: Math.round(
          analysis.dailyAnalysis.reduce((sum, d) => sum + Math.abs(d.calDiffPercent), 0) / 
          analysis.dailyAnalysis.length
        ),
      };
    }
    
    return NextResponse.json({
      ok: true,
      ...analysis,
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
