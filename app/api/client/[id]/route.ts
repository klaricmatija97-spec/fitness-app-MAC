import { createServiceClient } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const supabase = createServiceClient();
    
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { ok: false, message: "Klijent nije pronađen" },
        { status: 404 }
      );
    }

    // Učitaj username iz user_accounts (tamo je glavni izvor)
    let username = null;
    const { data: accountData } = await supabase
      .from("user_accounts")
      .select("username")
      .eq("client_id", id)
      .single();
    
    if (accountData && accountData.username) {
      username = accountData.username;
    } else if (data.username) {
      // Fallback na username iz clients tablice ako postoji
      username = data.username;
    }

    // Provjeri ima li klijent kalkulacije (BMR, TDEE, kalorije)
    const { data: calculations } = await supabase
      .from("client_calculations")
      .select("bmr, tdee, target_calories")
      .eq("client_id", id)
      .single();

    // Određivanje je li intake završen
    // Intake je završen ako:
    // 1. Ima kalkulacije (BMR/TDEE/target_calories) - prošao je calculator
    // 2. ILI ima popunjene ključne podatke koji nisu default (training_frequency, activities, goals)
    const hasCalculations = Boolean(
      calculations?.bmr || 
      calculations?.tdee || 
      calculations?.target_calories ||
      data.target_calories
    );
    
    const hasIntakeData = Boolean(
      data.training_frequency ||
      (data.activities && data.activities.length > 0) ||
      (data.goals && data.goals.length > 0) ||
      data.allergies ||
      data.injuries
    );

    // Intake je završen ako ima kalkulacije ILI značajne intake podatke
    const intakeCompleted = hasCalculations || hasIntakeData;

    return NextResponse.json({
      ok: true,
      ...data,
      username: username || null,
      // Novo: status intake-a
      intakeCompleted,
      hasCalculations,
      // Kalkulacije ako postoje
      calculations: calculations || null,
      // Legacy polja (za kompatibilnost)
      showEducationalOnboarding: !intakeCompleted,
      shouldShowOnboarding: !intakeCompleted,
      educationalOnboardingCompleted: intakeCompleted,
    });
  } catch (error) {
    console.error("[client] error", error);
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Greška",
      },
      { status: 400 }
    );
  }
}

