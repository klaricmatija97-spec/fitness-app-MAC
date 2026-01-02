/**
 * Trainer Registration API
 * ========================
 * POST /api/auth/register-trainer
 * 
 * Registrira novog trenera s hashiranom lozinkom
 */

import { createServiceClient } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { generateTokens } from "@/lib/auth/jwt";

// ============================================
// VALIDACIJA
// ============================================

const registerTrainerSchema = z.object({
  name: z.string()
    .min(2, "Ime mora imati najmanje 2 znaka")
    .max(100, "Ime je predugačko"),
  email: z.string()
    .email("Neispravan email format")
    .max(255, "Email je predugačak"),
  password: z.string()
    .min(8, "Lozinka mora imati najmanje 8 znakova")
    .max(100, "Lozinka je predugačka")
    .regex(/[A-Z]/, "Lozinka mora sadržavati barem jedno veliko slovo")
    .regex(/[a-z]/, "Lozinka mora sadržavati barem jedno malo slovo")
    .regex(/[0-9]/, "Lozinka mora sadržavati barem jedan broj"),
  phone: z.string()
    .min(6, "Broj telefona je prekratak")
    .max(20, "Broj telefona je predugačak")
    .optional(),
  // Opcijski: kod za validaciju (može se koristiti za invite-only registraciju)
  inviteCode: z.string().optional(),
});

// ============================================
// HELPER: Generiraj jedinstveni trainer code
// ============================================

function generateTrainerCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// ============================================
// POST HANDLER
// ============================================

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parseResult = registerTrainerSchema.safeParse(json);

    if (!parseResult.success) {
      const firstError = parseResult.error.issues[0];
      return NextResponse.json(
        {
          ok: false,
          message: firstError?.message || "Nevažeći podaci",
          field: firstError?.path?.[0] || null,
        },
        { status: 400 }
      );
    }

    const { name, email, password, phone, inviteCode } = parseResult.data;
    const supabase = createServiceClient();

    // ============================================
    // 1. PROVJERI INVITE CODE IZ BAZE
    // ============================================
    
    if (!inviteCode) {
      return NextResponse.json(
        { ok: false, message: "Pozivni kod je obavezan. Zatražite pristup putem aplikacije." },
        { status: 403 }
      );
    }

    // Provjeri kod u bazi - mora biti vezan za ovaj email
    const { data: invite, error: inviteError } = await supabase
      .from("trainer_invites")
      .select("*")
      .eq("invite_code", inviteCode.toUpperCase())
      .eq("email", email.toLowerCase().trim())
      .eq("status", "approved")
      .single();

    if (inviteError || !invite) {
      return NextResponse.json(
        { ok: false, message: "Nevažeći pozivni kod ili email. Provjerite da koristite isti email na koji ste dobili kod." },
        { status: 403 }
      );
    }

    // Provjeri je li kod istekao
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return NextResponse.json(
        { ok: false, message: "Pozivni kod je istekao. Zatražite novi pristup." },
        { status: 403 }
      );
    }

    // ============================================
    // 2. PROVJERI POSTOJI LI EMAIL
    // ============================================

    const { data: existingTrainer } = await supabase
      .from("trainers")
      .select("id")
      .eq("email", email.toLowerCase().trim())
      .single();

    if (existingTrainer) {
      return NextResponse.json(
        { ok: false, message: "Email je već registriran" },
        { status: 409 }
      );
    }

    // ============================================
    // 3. HASHIRAJ LOZINKU
    // ============================================

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // ============================================
    // 4. GENERIRAJ JEDINSTVENI TRAINER CODE
    // ============================================

    let trainerCode = generateTrainerCode();
    let codeExists = true;
    let attempts = 0;
    const maxAttempts = 10;

    while (codeExists && attempts < maxAttempts) {
      const { data: existing } = await supabase
        .from("trainers")
        .select("id")
        .eq("trainer_code", trainerCode)
        .single();
      
      if (!existing) {
        codeExists = false;
      } else {
        trainerCode = generateTrainerCode();
        attempts++;
      }
    }

    if (attempts >= maxAttempts) {
      return NextResponse.json(
        { ok: false, message: "Greška pri generiranju koda. Pokušaj ponovo." },
        { status: 500 }
      );
    }

    // ============================================
    // 5. KREIRAJ TRENERA
    // ============================================

    const { data: trainer, error: insertError } = await supabase
      .from("trainers")
      .insert({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password_hash: passwordHash,
        phone: phone?.trim() || null,
        trainer_code: trainerCode,
        created_at: new Date().toISOString(),
      })
      .select("id, name, email, trainer_code")
      .single();

    if (insertError) {
      console.error("[auth/register-trainer] Insert error:", insertError);
      
      if (insertError.code === "23505") {
        return NextResponse.json(
          { ok: false, message: "Email ili kod trenera već postoji" },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { ok: false, message: "Greška pri kreiranju računa" },
        { status: 500 }
      );
    }

    // ============================================
    // 6. OZNAČI POZIVNICU KAO ISKORIŠTENU
    // ============================================

    await supabase
      .from("trainer_invites")
      .update({
        status: "used",
        used_at: new Date().toISOString(),
        trainer_id: trainer.id,
      })
      .eq("id", invite.id);

    // ============================================
    // 7. GENERIRAJ JWT TOKENE
    // ============================================

    const tokens = generateTokens({
      userId: trainer.id,
      userType: 'trainer',
      username: trainer.email,
    });

    // ============================================
    // 8. VRATI USPJEŠAN ODGOVOR
    // ============================================

    return NextResponse.json({
      ok: true,
      message: "Račun trenera uspješno kreiran",
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
    console.error("[auth/register-trainer] Unexpected error:", error);
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Greška pri registraciji",
      },
      { status: 500 }
    );
  }
}

