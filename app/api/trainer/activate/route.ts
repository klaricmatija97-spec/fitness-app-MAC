import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { z } from "zod";
import { generateTokens } from "@/lib/auth/jwt";

const ActivateSchema = z.object({
  code: z.string().min(6, "Kod je prekratak"),
  email: z.string().email("Nevažeća email adresa"),
});

// Generiraj jedinstveni trainer code
function generateTrainerCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = ActivateSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { ok: false, message: parseResult.error.issues[0].message },
        { status: 400 }
      );
    }

    const { code, email } = parseResult.data;
    const supabase = createServiceClient();

    // Pronađi invite s ovim kodom i emailom
    const { data: invite, error: inviteError } = await supabase
      .from("trainer_invites")
      .select("*")
      .eq("invite_code", code.toUpperCase())
      .eq("email", email.toLowerCase())
      .eq("status", "approved")
      .single();

    if (inviteError || !invite) {
      return NextResponse.json(
        { ok: false, message: "Nevažeći kod ili email. Provjerite podatke." },
        { status: 400 }
      );
    }

    // Provjeri je li istekao
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return NextResponse.json(
        { ok: false, message: "Kod je istekao. Kontaktirajte podršku." },
        { status: 400 }
      );
    }

    // Provjeri ima li lozinku
    if (!invite.password_hash) {
      return NextResponse.json(
        { ok: false, message: "Greška: nedostaje lozinka. Registrirajte se ponovo." },
        { status: 400 }
      );
    }

    // Generiraj trainer code
    const trainerCode = generateTrainerCode();

    // Kreiraj trenera
    const { data: trainer, error: trainerError } = await supabase
      .from("trainers")
      .insert({
        name: invite.name,
        email: invite.email,
        phone: invite.phone,
        password_hash: invite.password_hash,
        trainer_code: trainerCode,
        created_at: new Date().toISOString(),
      })
      .select("id, name, email, trainer_code")
      .single();

    if (trainerError) {
      console.error("[Activate] Error creating trainer:", trainerError);
      
      if (trainerError.code === "23505") {
        return NextResponse.json(
          { ok: false, message: "Račun s ovim emailom već postoji. Prijavite se." },
          { status: 409 }
        );
      }
      
      return NextResponse.json(
        { ok: false, message: "Greška pri kreiranju računa." },
        { status: 500 }
      );
    }

    // Označi invite kao iskorišten
    await supabase
      .from("trainer_invites")
      .update({
        status: "used",
        used_at: new Date().toISOString(),
        trainer_id: trainer.id,
      })
      .eq("id", invite.id);

    // Generiraj JWT tokene
    const tokens = generateTokens({
      userId: trainer.id,
      userType: 'trainer',
      username: trainer.email,
    });

    return NextResponse.json({
      ok: true,
      message: "Račun aktiviran!",
      trainer: {
        id: trainer.id,
        name: trainer.name,
        email: trainer.email,
        trainerCode: trainer.trainer_code,
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
    });

  } catch (error) {
    console.error("[Activate] Error:", error);
    return NextResponse.json(
      { ok: false, message: "Interna greška servera" },
      { status: 500 }
    );
  }
}

