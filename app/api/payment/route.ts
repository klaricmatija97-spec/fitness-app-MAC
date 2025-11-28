import { createServiceClient } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { z } from "zod";

const paymentSchema = z.object({
  clientId: z.string().uuid(),
  paymentMethod: z.enum(["card", "bank"]),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const { clientId, paymentMethod } = paymentSchema.parse(json);

    const supabase = createServiceClient();
    
    // Generiraj username (prvo ime + random broj)
    const { data: client } = await supabase
      .from("clients")
      .select("name")
      .eq("id", clientId)
      .single();

    if (!client) {
      return NextResponse.json(
        { ok: false, message: "Klijent nije pronađen" },
        { status: 404 }
      );
    }

    const firstName = client.name.split(" ")[0].toLowerCase();
    const randomNum = Math.floor(Math.random() * 1000);
    const username = `${firstName}${randomNum}`;
    
    // Generiraj privremenu lozinku
    const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8).toUpperCase();

    // Ažuriraj klijenta
    await supabase
      .from("clients")
      .update({
        has_paid: true,
        payment_date: new Date().toISOString(),
        subscription_active: true,
        username,
        temp_password: tempPassword,
      })
      .eq("id", clientId);

    // Kreiraj user account (za sada jednostavno, kasnije hash password)
    await supabase
      .from("user_accounts")
      .insert({
        client_id: clientId,
        username,
        password_hash: tempPassword, // U produkciji koristi bcrypt
      });

    return NextResponse.json({
      ok: true,
      username,
      tempPassword,
      message: "Plaćanje uspješno obrađeno",
    });
  } catch (error) {
    console.error("[payment] error", error);
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Greška pri plaćanju",
      },
      { status: 400 }
    );
  }
}

