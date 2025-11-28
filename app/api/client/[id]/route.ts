import { createServiceClient } from "@/lib/supabase";
import { truncateSync } from "fs";
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
    const { data: accountData, error: accountError } = await supabase
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

    return NextResponse.json({
      ok: true,
      ...data,
      username: username || null, // Vrati username iz user_accounts (glavni izvor)
      showEducationalOnboarding: true,
      shouldShowOnboarding: true,
      educationalOnboardingCompleted: false,
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

