import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { z } from "zod";
import bcrypt from "bcryptjs";

const RequestAccessSchema = z.object({
  name: z.string().min(2, "Ime mora imati najmanje 2 znaka"),
  email: z.string().email("Nevažeća email adresa"),
  phone: z.string().optional(),
  password: z.string()
    .min(8, "Lozinka mora imati najmanje 8 znakova")
    .regex(/[A-Z]/, "Lozinka mora sadržavati barem jedno veliko slovo")
    .regex(/[a-z]/, "Lozinka mora sadržavati barem jedno malo slovo")
    .regex(/[0-9]/, "Lozinka mora sadržavati barem jedan broj"),
  message: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = RequestAccessSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { ok: false, message: parseResult.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, email, phone, password, message } = parseResult.data;

    const supabase = createServiceClient();
    
    // Hashiraj lozinku odmah
    const passwordHash = await bcrypt.hash(password, 10);

    // Provjeri postoji li već zahtjev s ovim emailom
    const { data: existingRequest } = await supabase
      .from("trainer_invites")
      .select("id, status")
      .eq("email", email.toLowerCase())
      .single();

    if (existingRequest) {
      if (existingRequest.status === "pending") {
        return NextResponse.json(
          { ok: false, message: "Zahtjev s ovim emailom već postoji i čeka odobrenje." },
          { status: 409 }
        );
      }
      if (existingRequest.status === "approved") {
        return NextResponse.json(
          { ok: false, message: "Već imate odobren pozivni kod. Provjerite email." },
          { status: 409 }
        );
      }
      if (existingRequest.status === "used") {
        return NextResponse.json(
          { ok: false, message: "Već ste registrirani kao trener. Prijavite se." },
          { status: 409 }
        );
      }
    }

    // Provjeri postoji li već registrirani trener s ovim emailom
    const { data: existingTrainer } = await supabase
      .from("trainers")
      .select("id")
      .eq("email", email.toLowerCase())
      .single();

    if (existingTrainer) {
      return NextResponse.json(
        { ok: false, message: "Trener s ovim emailom već postoji. Prijavite se." },
        { status: 409 }
      );
    }

    // Kreiraj zahtjev za pristup (s hashiranom lozinkom)
    const { data: invite, error } = await supabase
      .from("trainer_invites")
      .insert({
        name,
        email: email.toLowerCase(),
        phone: phone || null,
        password_hash: passwordHash,
        admin_notes: message || null,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      console.error("[RequestAccess] Error creating invite:", error);
      return NextResponse.json(
        { ok: false, message: "Greška pri slanju zahtjeva. Pokušajte ponovo." },
        { status: 500 }
      );
    }

    // TODO: Pošalji notifikaciju adminu (email ili push)

    return NextResponse.json({
      ok: true,
      message: "Zahtjev uspješno poslan! Javit ćemo vam se u najkraćem roku.",
      requestId: invite.id,
    });

  } catch (error) {
    console.error("[RequestAccess] Error:", error);
    return NextResponse.json(
      { ok: false, message: "Interna greška servera" },
      { status: 500 }
    );
  }
}

// GET - dohvati status zahtjeva po emailu
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        { ok: false, message: "Email je obavezan" },
        { status: 400 }
      );
    }

    const { data: invite } = await supabase
      .from("trainer_invites")
      .select("status, created_at, approved_at, expires_at")
      .eq("email", email.toLowerCase())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!invite) {
      return NextResponse.json({
        ok: true,
        status: "none",
        message: "Nema zahtjeva s ovim emailom",
      });
    }

    return NextResponse.json({
      ok: true,
      status: invite.status,
      createdAt: invite.created_at,
      approvedAt: invite.approved_at,
      expiresAt: invite.expires_at,
    });

  } catch (error) {
    console.error("[RequestAccess] GET Error:", error);
    return NextResponse.json(
      { ok: false, message: "Greška pri dohvaćanju statusa" },
      { status: 500 }
    );
  }
}

