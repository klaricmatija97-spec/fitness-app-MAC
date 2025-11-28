import { createServiceClient } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";

const changePasswordSchema = z.object({
  clientId: z.string().uuid(),
  tempPassword: z.string(),
  newPassword: z.string().min(6),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const { clientId, tempPassword, newPassword } = changePasswordSchema.parse(json);

    // TEST MODE: Omogući testiranje bez Supabase
    // Ako je tempPassword "uzimijehladno", omogući promjenu lozinke
    if (tempPassword === "uzimijehladno") {
      return NextResponse.json({
        ok: true,
        message: "Lozinka je uspješno postavljena (test mod)",
      });
    }

    const supabase = createServiceClient();
    
    // Provjeri da temp password odgovara
    const { data: account } = await supabase
      .from("user_accounts")
      .select("password_hash")
      .eq("client_id", clientId)
      .single();

    if (!account) {
      return NextResponse.json(
        { ok: false, message: "Korisnički račun nije pronađen" },
        { status: 404 }
      );
    }

    // Provjeri privremenu lozinku koristeći bcrypt
    const isTempPasswordValid = await bcrypt.compare(tempPassword, account.password_hash);
    
    if (!isTempPasswordValid) {
      return NextResponse.json(
        { ok: false, message: "Pogrešna privremena lozinka" },
        { status: 401 }
      );
    }

    // Hashiraj novu lozinku
    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Ažuriraj lozinku sa hashiranom verzijom
    const { error: updateError } = await supabase
      .from("user_accounts")
      .update({ password_hash: newPasswordHash })
      .eq("client_id", clientId);

    if (updateError) {
      console.error("[auth/change-password] Update error:", updateError);
      return NextResponse.json(
        { ok: false, message: "Greška pri ažuriranju lozinke" },
        { status: 500 }
      );
    }

    // Označi da je lozinka promijenjena
    await supabase
      .from("clients")
      .update({ password_changed: true })
      .eq("id", clientId);

    return NextResponse.json({
      ok: true,
      message: "Lozinka je uspješno promijenjena",
    });
  } catch (error) {
    console.error("[auth/change-password] error", error);
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Greška pri promjeni lozinke",
      },
      { status: 400 }
    );
  }
}

