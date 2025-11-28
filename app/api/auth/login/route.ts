import { createServiceClient } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";

const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
  clientId: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const { username, password, clientId } = loginSchema.parse(json);

    // TEST MODE: Omogući testiranje bez Supabase
    // Ako je username "test" i password "uzimijehladno", omogući pristup
    if (username === "test" && password === "uzimijehladno") {
      const testClientId = clientId || "00000000-0000-0000-0000-000000000000";
      const token = Buffer.from(`${testClientId}:${Date.now()}`).toString("base64");
      
      return NextResponse.json({
        ok: true,
        token,
        clientId: testClientId,
        message: "Test prijava uspješna",
      });
    }

    const supabase = createServiceClient();
    
    // Pronađi user account
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

    // Ažuriraj last_login
    await supabase
      .from("user_accounts")
      .update({ last_login: new Date().toISOString() })
      .eq("client_id", account.client_id);

    // Generiraj jednostavan token (u produkciji koristi JWT)
    const token = Buffer.from(`${account.client_id}:${Date.now()}`).toString("base64");

    return NextResponse.json({
      ok: true,
      token,
      clientId: account.client_id,
      username: account.username, // Vrati username u response-u
      message: "Uspješna prijava",
    });
  } catch (error) {
    console.error("[auth/login] error", error);
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Greška pri prijavi",
      },
      { status: 400 }
    );
  }
}

