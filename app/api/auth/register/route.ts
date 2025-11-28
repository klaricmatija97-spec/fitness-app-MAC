import { createServiceClient } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";

// Stroža validacija emaila - provjerava format, domenu i strukturu
const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

const registerSchema = z.object({
  name: z.string().min(2, "Ime mora imati najmanje 2 znaka").max(100, "Ime je predugačko"),
  username: z.string()
    .min(3, "Korisničko ime mora imati najmanje 3 znaka")
    .max(30, "Korisničko ime je predugačko")
    .regex(/^[a-zA-Z0-9_]+$/, "Korisničko ime može sadržavati samo slova, brojeve i donju crtu"),
  email: z.string()
    .min(5, "Email mora imati najmanje 5 znakova")
    .max(255, "Email je predugačak")
    .email("Neispravan email format")
    .refine((val) => {
      const trimmed = val.trim().toLowerCase();
      // Provjeri osnovnu strukturu
      if (!trimmed.includes("@")) return false;
      if (!trimmed.includes(".")) return false;
      
      const parts = trimmed.split("@");
      if (parts.length !== 2) return false;
      
      const [localPart, domain] = parts;
      
      // Provjeri lokalni dio (prije @)
      if (localPart.length === 0 || localPart.length > 64) return false;
      if (localPart.startsWith(".") || localPart.endsWith(".")) return false;
      if (localPart.includes("..")) return false;
      
      // Provjeri domenu (nakon @)
      if (domain.length === 0 || domain.length > 255) return false;
      if (!domain.includes(".")) return false;
      if (domain.startsWith(".") || domain.endsWith(".")) return false;
      if (domain.startsWith("-") || domain.endsWith("-")) return false;
      
      // Provjeri da domena ima barem jednu točku i barem 2 znaka nakon zadnje točke
      const domainParts = domain.split(".");
      if (domainParts.length < 2) return false;
      const tld = domainParts[domainParts.length - 1];
      if (tld.length < 2) return false;
      
      // Provjeri regex
      return emailRegex.test(trimmed);
    }, {
      message: "Neispravan email format. Email mora biti u formatu: ime@domena.com",
    }),
  phone: z.string()
    .min(6, "Telefon mora imati najmanje 6 znakova")
    .max(20, "Telefon je predugačak"),
  password: z.string()
    .min(6, "Lozinka mora imati najmanje 6 znakova")
    .max(100, "Lozinka je predugačka"),
});

export async function POST(request: Request) {
  // Osiguraj da se uvijek vraća response
  try {
    console.log("[auth/register] ===== REGISTER REQUEST RECEIVED =====");
    console.log("[auth/register] Timestamp:", new Date().toISOString());
    // Provjeri environment varijable prije bilo čega
    console.log("[auth/register] Checking environment variables...");
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error("[auth/register] ❌ Missing environment variables");
      console.error("[auth/register] SUPABASE_URL:", !!process.env.SUPABASE_URL);
      console.error("[auth/register] SUPABASE_SERVICE_ROLE_KEY:", !!process.env.SUPABASE_SERVICE_ROLE_KEY);
      
      return NextResponse.json(
        {
          ok: false,
          message: "Server nije pravilno konfiguriran. Molimo kontaktiraj administratora.",
        },
        { status: 500 }
      );
    }
    console.log("[auth/register] ✅ Environment variables OK");
    
    // Provjeri da li request ima body
    let json;
    try {
      json = await request.json();
    } catch (parseError) {
      console.error("[auth/register] JSON parse error:", parseError);
      return NextResponse.json(
        {
          ok: false,
          message: "Neispravan format podataka. Molimo provjeri sva polja.",
        },
        { status: 400 }
      );
    }
    
    if (!json) {
      return NextResponse.json(
        {
          ok: false,
          message: "Nedostaju podaci za registraciju.",
        },
        { status: 400 }
      );
    }
    
    console.log("[auth/register] Parsing and validating data...");
    console.log("[auth/register] Raw JSON received:", JSON.stringify(json, null, 2));
    
    let parsed;
    try {
      parsed = registerSchema.parse(json);
      console.log("[auth/register] ✅ Data validated successfully");
    } catch (validationError) {
      console.error("[auth/register] ❌ Validation error:", validationError);
      // Re-throw da se obradi u catch bloku
      throw validationError;
    }
    
    // Normaliziraj email (lowercase) i username (lowercase)
    const name = parsed.name.trim();
    const username = parsed.username.trim().toLowerCase();
    const email = parsed.email.trim().toLowerCase();
    const phone = parsed.phone.trim();
    const password = parsed.password;
    
    console.log("[auth/register] Normalized data:", { name, username, email, phone: phone.substring(0, 3) + "***" });

    // Provjeri Supabase konekciju
    console.log("[auth/register] Creating Supabase client...");
    let supabase;
    try {
      supabase = createServiceClient();
      console.log("[auth/register] ✅ Supabase client created successfully");
    } catch (supabaseError) {
      console.error("[auth/register] ❌ Supabase client creation error:", supabaseError);
      return NextResponse.json(
        {
          ok: false,
          message: "Greška pri povezivanju s bazom podataka. Provjeri konfiguraciju servera.",
        },
        { status: 500 }
      );
    }

    // Provjeri postoji li već korisnik s tim emailom (ne koristi .single() jer može vratiti error ako ne postoji)
    let existingClientsByEmail;
    let emailCheckError;
    
    try {
      const result = await supabase
      .from("clients")
      .select("id, email")
        .eq("email", email);
      
      existingClientsByEmail = result.data;
      emailCheckError = result.error;
      
      if (emailCheckError && emailCheckError.code !== "PGRST116") {
        // PGRST116 je "no rows returned" - to je OK
        console.error("[auth/register] Email check error:", emailCheckError);
        // Ako je kritična greška (npr. tablica ne postoji), vrati grešku
        if (emailCheckError.code === "42P01" || emailCheckError.message?.includes("does not exist")) {
          return NextResponse.json(
            {
              ok: false,
              message: "Greška pri pristupu bazi podataka. Tablica možda ne postoji.",
            },
            { status: 500 }
          );
        }
      }
    } catch (dbError) {
      console.error("[auth/register] Database connection error:", dbError);
      return NextResponse.json(
        {
          ok: false,
          message: "Greška pri pristupu bazi podataka. Molimo pokušaj ponovno.",
        },
        { status: 500 }
      );
    }

    if (existingClientsByEmail && existingClientsByEmail.length > 0) {
      return NextResponse.json(
        { 
          ok: false, 
          message: `Email "${email}" je već registriran. Koristi drugi email ili se prijavi s ovim računom.`,
          field: "email",
        },
        { status: 400 }
      );
    }

    // Provjeri postoji li već korisnik s tim korisničkim imenom u user_accounts
    let existingAccountsByUsername;
    let usernameCheckError;
    
    try {
      const result = await supabase
        .from("user_accounts")
        .select("id, username")
        .eq("username", username);
      
      existingAccountsByUsername = result.data;
      usernameCheckError = result.error;
      
      if (usernameCheckError && usernameCheckError.code !== "PGRST116") {
        console.error("[auth/register] Username check error:", usernameCheckError);
        if (usernameCheckError.code === "42P01" || usernameCheckError.message?.includes("does not exist")) {
          return NextResponse.json(
            {
              ok: false,
              message: "Greška pri pristupu bazi podataka. Tablica možda ne postoji.",
            },
            { status: 500 }
          );
        }
      }
    } catch (dbError) {
      console.error("[auth/register] Database connection error:", dbError);
      return NextResponse.json(
        {
          ok: false,
          message: "Greška pri pristupu bazi podataka. Molimo pokušaj ponovno.",
        },
        { status: 500 }
      );
    }

    if (existingAccountsByUsername && existingAccountsByUsername.length > 0) {
      return NextResponse.json(
        { 
          ok: false, 
          message: `Korisničko ime "${username}" je već zauzeto. Odaberi drugo korisničko ime.`,
          field: "username",
        },
        { status: 400 }
      );
    }

    // Provjeri postoji li već korisnik s tim korisničkim imenom u clients (za backward compatibility)
    let existingClientsByUsername;
    let clientUsernameCheckError;
    
    try {
      const result = await supabase
      .from("clients")
      .select("id, username")
        .eq("username", username);
      
      existingClientsByUsername = result.data;
      clientUsernameCheckError = result.error;
      
      if (clientUsernameCheckError && clientUsernameCheckError.code !== "PGRST116") {
        console.error("[auth/register] Client username check error:", clientUsernameCheckError);
        if (clientUsernameCheckError.code === "42P01" || clientUsernameCheckError.message?.includes("does not exist")) {
          return NextResponse.json(
            {
              ok: false,
              message: "Greška pri pristupu bazi podataka. Tablica možda ne postoji.",
            },
            { status: 500 }
          );
        }
      }
    } catch (dbError) {
      console.error("[auth/register] Database connection error:", dbError);
      return NextResponse.json(
        {
          ok: false,
          message: "Greška pri pristupu bazi podataka. Molimo pokušaj ponovno.",
        },
        { status: 500 }
      );
    }

    if (existingClientsByUsername && existingClientsByUsername.length > 0) {
      return NextResponse.json(
        { 
          ok: false, 
          message: `Korisničko ime "${username}" je već zauzeto. Odaberi drugo korisničko ime.`,
          field: "username",
        },
        { status: 400 }
      );
    }

    // Hashiraj lozinku prije spremanja
    let passwordHash;
    try {
      const saltRounds = 10;
      passwordHash = await bcrypt.hash(password, saltRounds);
    } catch (hashError) {
      console.error("[auth/register] Password hash error:", hashError);
      return NextResponse.json(
        {
          ok: false,
          message: "Greška pri obradi lozinke. Molimo pokušaj ponovno.",
        },
        { status: 500 }
      );
    }

    // Kreiraj klijenta
    let client;
    let clientError;
    
    try {
      const result = await supabase
      .from("clients")
      .insert({
        name,
        email,
        phone,
        username,
          // Obavezna polja koja nisu dio registracije - default vrijednosti
          honorific: "other",
          age_range: "other",
          weight_value: 70, // Default težina u kg
          weight_unit: "kg",
          height_value: 170, // Default visina u cm
          height_unit: "cm",
          activities: [], // Prazan array (ima default '{}' u bazi)
          goals: [], // Prazan array (ima default '{}' u bazi)
          diet_cleanliness: 50, // Default 50% (srednja vrijednost)
          // Ne spremaj lozinku u clients tablicu - samo u user_accounts
      })
      .select("id")
      .single();
      
      client = result.data;
      clientError = result.error;
    } catch (dbError) {
      console.error("[auth/register] Client creation database error:", dbError);
      return NextResponse.json(
        {
          ok: false,
          message: "Greška pri kreiranju računa. Molimo pokušaj ponovno.",
        },
        { status: 500 }
      );
    }

    if (clientError || !client) {
      console.error("[auth/register] Client creation error:", clientError);
      
      // Provjeri specifične greške
      let errorMessage = "Greška pri kreiranju računa";
      
      if (clientError?.code === "23505") {
        // Unique constraint violation
        if (clientError?.message?.includes("email")) {
          errorMessage = `Email "${email}" je već registriran. Koristi drugi email.`;
        } else if (clientError?.message?.includes("username")) {
          errorMessage = `Korisničko ime "${username}" je već zauzeto. Odaberi drugo korisničko ime.`;
        } else {
          errorMessage = "Podaci već postoje u bazi. Provjeri email i korisničko ime.";
        }
      } else if (clientError?.message) {
        errorMessage = clientError.message;
      }
      
      return NextResponse.json(
        { 
          ok: false, 
          message: errorMessage,
          details: clientError?.details || null,
          code: clientError?.code || null,
        },
        { status: 500 }
      );
    }

    const clientId = client.id;

    // Kreiraj user account sa hashiranom lozinkom
    let accountError;
    
    try {
      const result = await supabase
      .from("user_accounts")
      .insert({
        client_id: clientId,
        username,
          password_hash: passwordHash, // Hashirana lozinka
        });
      
      accountError = result.error;
    } catch (dbError) {
      console.error("[auth/register] Account creation database error:", dbError);
      // Pokušaj obrisati klijenta ako account kreiranje ne uspije
      try {
        await supabase.from("clients").delete().eq("id", clientId);
      } catch (deleteError) {
        console.error("[auth/register] Failed to delete client after account creation error:", deleteError);
      }
      
      return NextResponse.json(
        {
          ok: false,
          message: "Greška pri kreiranju korisničkog računa. Molimo pokušaj ponovno.",
        },
        { status: 500 }
      );
    }

    if (accountError) {
      console.error("[auth/register] Account creation error:", accountError);
      // Pokušaj obrisati klijenta ako account kreiranje ne uspije
      await supabase.from("clients").delete().eq("id", clientId);
      
      // Provjeri specifične greške
      let errorMessage = "Greška pri kreiranju korisničkog računa";
      
      if (accountError?.code === "23505") {
        // Unique constraint violation
        if (accountError?.message?.includes("username")) {
          errorMessage = `Korisničko ime "${username}" je već zauzeto. Odaberi drugo korisničko ime.`;
        } else {
          errorMessage = "Korisnički račun s ovim podacima već postoji.";
        }
      } else if (accountError?.message) {
        errorMessage = accountError.message;
      }
      
      return NextResponse.json(
        { 
          ok: false, 
          message: errorMessage,
          details: accountError?.details || null,
          code: accountError?.code || null,
        },
        { status: 500 }
      );
    }

    // Generiraj jednostavan token (u produkciji koristi JWT)
    console.log("[auth/register] Generating token...");
    const token = Buffer.from(`${clientId}:${Date.now()}`).toString("base64");

    console.log("[auth/register] ✅ Registration successful!");
    console.log("[auth/register] Client ID:", clientId);
    console.log("[auth/register] ===== REGISTER REQUEST COMPLETED =====");

    return NextResponse.json({
      ok: true,
      token,
      clientId,
      username,
      message: "Registracija uspješna",
    });
  } catch (error) {
    console.error("[auth/register] ===== ERROR OCCURRED =====");
    console.error("[auth/register] Error:", error);
    console.error("[auth/register] Error type:", error instanceof Error ? error.constructor.name : typeof error);
    console.error("[auth/register] Error message:", error instanceof Error ? error.message : String(error));
    console.error("[auth/register] Error stack:", error instanceof Error ? error.stack : "No stack");
    
    // Osiguraj da uvijek vraćamo JSON odgovor
    try {
    if (error instanceof z.ZodError) {
        // Pronađi prvu grešku i formatiraj poruku
        const firstError = error.issues[0];
        const fieldName = firstError?.path?.[0] || "polje";
        
        // Mapiranje imena polja na hrvatski
        const fieldNames: Record<string, string> = {
          name: "Ime",
          username: "Korisničko ime",
          email: "Email",
          phone: "Telefon",
          password: "Lozinka",
        };
        
        const croatianFieldName = fieldNames[fieldName as string] || String(fieldName);
        
        // Formatiraj poruku greške
        let errorMessage = firstError?.message || "Neispravni podaci";
        
        // Ako je poruka generička, dodaj ime polja
        if (!errorMessage.includes(croatianFieldName)) {
          errorMessage = `${croatianFieldName}: ${errorMessage}`;
        }
        
      return NextResponse.json(
        {
          ok: false,
            message: errorMessage,
            field: fieldName,
            allErrors: error.issues.map(e => {
              const field = e.path[0];
              const croatianName = fieldNames[field as string] || field;
              return {
                field: field,
                fieldName: croatianName,
                message: e.message,
              };
            }),
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Greška pri registraciji",
          error: error instanceof Error ? error.stack : String(error),
      },
      { status: 400 }
    );
    } catch (responseError) {
      // Ako i vraćanje greške ne uspije, vrati osnovnu grešku
      console.error("[auth/register] Response error:", responseError);
      return new Response(
        JSON.stringify({
          ok: false,
          message: "Kritična greška pri registraciji. Molimo kontaktiraj podršku.",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }
}

