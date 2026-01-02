/**
 * Login API Endpoint
 * ==================
 * POST /api/auth/login
 * 
 * Autentificira korisnika (klijent ili trener) i vraća JWT tokene
 */

import { createServiceClient } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { generateTokens, type TokenPair } from "@/lib/auth/jwt";

// ============================================
// VALIDACIJA
// ============================================

const loginSchema = z.object({
  username: z.string().min(1, "Korisničko ime je obavezno"),
  password: z.string().min(1, "Lozinka je obavezna"),
  // Opcjonalno: za backward compatibility
  clientId: z.string().uuid().optional(),
});

// ============================================
// POST HANDLER
// ============================================

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parseResult = loginSchema.safeParse(json);
    
    if (!parseResult.success) {
      return NextResponse.json(
        { 
          ok: false, 
          message: parseResult.error.issues[0]?.message || "Nevažeći podaci" 
        },
        { status: 400 }
      );
    }
    
    const { username, password } = parseResult.data;
    const supabase = createServiceClient();
    
    // ============================================
    // 1. PROVJERI JE LI TRENER
    // ============================================
    
    const { data: trainer, error: trainerError } = await supabase
      .from("trainers")
      .select("id, name, email, trainer_code, password_hash")
      .eq("email", username)
      .single();
    
    if (trainer && !trainerError) {
      // Trener pronađen - provjeri lozinku
      if (trainer.password_hash) {
        const isPasswordValid = await bcrypt.compare(password, trainer.password_hash);
        
        if (isPasswordValid) {
          // Uspješna trener prijava
          const tokens = generateTokens({
            userId: trainer.id,
            userType: 'trainer',
            username: trainer.email,
          });
          
          // Ažuriraj last_login
          await supabase
            .from("trainers")
            .update({ last_login: new Date().toISOString() })
            .eq("id", trainer.id);
          
          return NextResponse.json({
            ok: true,
            userType: 'trainer',
            userId: trainer.id,
            username: trainer.email,
            name: trainer.name,
            trainerCode: trainer.trainer_code,
            // JWT tokeni
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresIn: tokens.expiresIn,
            // Backward compatibility
            token: tokens.accessToken,
            message: "Uspješna prijava kao trener",
          });
        }
      }
    }
    
    // ============================================
    // 2. PROVJERI JE LI KLIJENT
    // ============================================
    
    const { data: account, error: accountError } = await supabase
      .from("user_accounts")
      .select("client_id, password_hash, username")
      .eq("username", username)
      .single();

    if (accountError || !account) {
      return NextResponse.json(
        { ok: false, message: "Pogrešno korisničko ime ili lozinka" },
        { status: 401 }
      );
    }

    // Provjeri lozinku koristeći bcrypt
    const isPasswordValid = await bcrypt.compare(password, account.password_hash);
    
    if (!isPasswordValid) {
      return NextResponse.json(
        { ok: false, message: "Pogrešno korisničko ime ili lozinka" },
        { status: 401 }
      );
    }

    // Dohvati client info
    const { data: client } = await supabase
      .from("clients")
      .select("name, email, connected_trainer_id")
      .eq("id", account.client_id)
      .single();

    // Generiraj JWT tokene
    const tokens = generateTokens({
      userId: account.client_id,
      userType: 'client',
      username: account.username,
    });

    // Ažuriraj last_login
    await supabase
      .from("user_accounts")
      .update({ last_login: new Date().toISOString() })
      .eq("client_id", account.client_id);

    return NextResponse.json({
      ok: true,
      userType: 'client',
      userId: account.client_id,
      clientId: account.client_id, // Backward compatibility
      username: account.username,
      name: client?.name,
      connectedTrainerId: client?.connected_trainer_id,
      // JWT tokeni
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
      // Backward compatibility
      token: tokens.accessToken,
      message: "Uspješna prijava",
    });
    
  } catch (error) {
    console.error("[auth/login] error", error);
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Greška pri prijavi",
      },
      { status: 500 }
    );
  }
}
