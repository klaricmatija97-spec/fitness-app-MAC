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
    
    const { password } = parseResult.data;
    // VAŽNO: Normaliziraj username na lowercase i ukloni razmake
    // Korisnik može unijeti "Matija Matic" ali username u bazi je "matijamatic"
    let username = parseResult.data.username.trim().toLowerCase();
    // Ukloni sve razmake i posebne znakove (osim donje crte) za username lookup
    const usernameForLookup = username.replace(/\s+/g, '').replace(/[^a-z0-9_]/g, '');
    const supabase = createServiceClient();
    
    console.log("[auth/login] Attempting login for:", username);
    console.log("[auth/login] Normalized username for lookup:", usernameForLookup);
    
    // ============================================
    // 1. PROVJERI JE LI TRENER
    // ============================================
    
    // Traži trenera po emailu (username je već normaliziran na lowercase)
    const { data: trainer, error: trainerError } = await supabase
      .from("trainers")
      .select("id, name, email, trainer_code, password_hash")
      .eq("email", username.toLowerCase().trim())
      .single();
    
    console.log("[auth/login] Trainer lookup result:", {
      found: !!trainer,
      error: trainerError?.message,
      email: username.toLowerCase().trim()
    });
    
    if (trainer && !trainerError) {
      console.log("[auth/login] Trainer found:", trainer.email);
      // Trener pronađen - provjeri lozinku
      if (trainer.password_hash) {
        console.log("[auth/login] Trainer has password_hash, verifying...");
        const isPasswordValid = await bcrypt.compare(password, trainer.password_hash);
        console.log("[auth/login] Password valid:", isPasswordValid);
        
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
          
          console.log("[auth/login] Trainer login successful");
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
        } else {
          console.log("[auth/login] Trainer password invalid");
        }
      } else {
        console.log("[auth/login] Trainer has no password_hash");
      }
    } else {
      console.log("[auth/login] Trainer not found or error:", trainerError?.message);
    }
    
    // ============================================
    // 2. PROVJERI JE LI KLIJENT
    // ============================================
    
    // Prvo pokušaj pronaći po username
    let account = null;
    let accountError = null;
    
    // Pokušaj pronaći po normaliziranom username-u (bez razmaka)
    let accountByUsername = null;
    let usernameError = null;
    
    // Prvo pokušaj s normaliziranim username-om (bez razmaka)
    const { data: accountByNormalized, error: normalizedError } = await supabase
      .from("user_accounts")
      .select("client_id, password_hash, username")
      .eq("username", usernameForLookup)
      .single();
    
    if (accountByNormalized && !normalizedError) {
      accountByUsername = accountByNormalized;
    } else {
      // Ako nije pronađen, pokušaj s originalnim username-om (lowercase, ali s razmacima)
      console.log("[auth/login] Trying with original username (with spaces):", username);
      const { data: accountByOriginal, error: originalError } = await supabase
        .from("user_accounts")
        .select("client_id, password_hash, username")
        .eq("username", username)
        .single();
      
      if (accountByOriginal && !originalError) {
        accountByUsername = accountByOriginal;
      } else {
        usernameError = originalError || normalizedError;
      }
    }
    
    if (accountByUsername && !usernameError) {
      account = accountByUsername;
      console.log("[auth/login] Found account by username:", accountByUsername.username);
    } else {
      // Ako nije pronađen po username, pokušaj pronaći po emailu
      // Prvo pronađi klijenta po emailu
      console.log("[auth/login] Username not found, trying email lookup...");
      const { data: clientByEmail } = await supabase
        .from("clients")
        .select("id")
        .eq("email", username)
        .single();
      
      if (clientByEmail) {
        // Pronađi account za tog klijenta
        const { data: accountByEmail, error: emailError } = await supabase
          .from("user_accounts")
          .select("client_id, password_hash, username")
          .eq("client_id", clientByEmail.id)
          .single();
        
        if (accountByEmail && !emailError) {
          account = accountByEmail;
          console.log("[auth/login] Found account via email lookup");
        }
      }
    }

    if (!account) {
      console.log("[auth/login] Account not found for:", username);
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
      .select("name, email, trainer_id, connected_trainer_id")
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

    // Koristi trainer_id kao primarni izvor (connected_trainer_id je legacy)
    const trainerId = client?.trainer_id || client?.connected_trainer_id || null;

    return NextResponse.json({
      ok: true,
      userType: 'client',
      userId: account.client_id,
      clientId: account.client_id, // Backward compatibility
      username: account.username,
      name: client?.name,
      connectedTrainerId: trainerId,
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
