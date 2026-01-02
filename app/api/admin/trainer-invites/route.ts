import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Jednostavna admin autentikacija (za produkciju koristiti bolji sustav)
function isAdmin(request: NextRequest): boolean {
  const adminKey = request.headers.get("x-admin-key");
  return adminKey === process.env.ADMIN_SECRET_KEY;
}

// GET - dohvati sve zahtjeve (pending, approved, etc.)
export async function GET(request: NextRequest) {
  if (!isAdmin(request)) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "pending";

    const { data: invites, error } = await supabase
      .from("trainer_invites")
      .select("*")
      .eq("status", status)
      .order("created_at", { ascending: status === "pending" });

    if (error) throw error;

    return NextResponse.json({
      ok: true,
      invites: invites || [],
      count: invites?.length || 0,
    });

  } catch (error) {
    console.error("[AdminInvites] GET Error:", error);
    return NextResponse.json(
      { ok: false, message: "Greška pri dohvaćanju zahtjeva" },
      { status: 500 }
    );
  }
}

// POST - odobri ili odbij zahtjev
export async function POST(request: NextRequest) {
  if (!isAdmin(request)) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { inviteId, action, adminNotes } = body;

    if (!inviteId || !action) {
      return NextResponse.json(
        { ok: false, message: "inviteId i action su obavezni" },
        { status: 400 }
      );
    }

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { ok: false, message: "action mora biti 'approve' ili 'reject'" },
        { status: 400 }
      );
    }

    // Dohvati zahtjev
    const { data: invite, error: fetchError } = await supabase
      .from("trainer_invites")
      .select("*")
      .eq("id", inviteId)
      .single();

    if (fetchError || !invite) {
      return NextResponse.json(
        { ok: false, message: "Zahtjev nije pronađen" },
        { status: 404 }
      );
    }

    if (invite.status !== "pending") {
      return NextResponse.json(
        { ok: false, message: `Zahtjev je već ${invite.status}` },
        { status: 400 }
      );
    }

    if (action === "approve") {
      // Odobri zahtjev - trigger će automatski postaviti expires_at
      const { data: updatedInvite, error: updateError } = await supabase
        .from("trainer_invites")
        .update({
          status: "approved",
          approved_by: "admin",
          admin_notes: adminNotes || invite.admin_notes,
        })
        .eq("id", inviteId)
        .select()
        .single();

      if (updateError) throw updateError;

      // Pošalji email s kodom
      const emailSent = await sendApprovalEmail(
        invite.email,
        invite.name,
        updatedInvite.invite_code
      );

      return NextResponse.json({
        ok: true,
        message: `Zahtjev odobren. ${emailSent ? "Email poslan." : "Email NIJE poslan - provjeri Resend konfiguraciju."}`,
        invite: updatedInvite,
        emailSent,
      });

    } else {
      // Odbij zahtjev
      const { error: updateError } = await supabase
        .from("trainer_invites")
        .update({
          status: "rejected",
          admin_notes: adminNotes || invite.admin_notes,
        })
        .eq("id", inviteId);

      if (updateError) throw updateError;

      // Opcionalno: pošalji email o odbijanju
      await sendRejectionEmail(invite.email, invite.name);

      return NextResponse.json({
        ok: true,
        message: "Zahtjev odbijen.",
      });
    }

  } catch (error) {
    console.error("[AdminInvites] POST Error:", error);
    return NextResponse.json(
      { ok: false, message: "Greška pri obradi zahtjeva" },
      { status: 500 }
    );
  }
}

// Email funkcije (koriste Resend)
async function sendApprovalEmail(email: string, name: string, inviteCode: string): Promise<boolean> {
  const resendApiKey = process.env.RESEND_API_KEY;
  
  if (!resendApiKey) {
    console.warn("[Email] RESEND_API_KEY nije postavljen - email nije poslan");
    return false;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || "Corpex <noreply@corpex.hr>",
        to: email,
        subject: "🎉 Vaš Corpex pozivni kod",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #8B5CF6;">Dobrodošli u Corpex!</h1>
            <p>Pozdrav ${name},</p>
            <p>Vaš zahtjev za pristup Corpex platformi je <strong>odobren</strong>!</p>
            
            <div style="background: linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%); 
                        padding: 30px; border-radius: 12px; text-align: center; margin: 30px 0;">
              <p style="color: rgba(255,255,255,0.8); margin: 0 0 10px 0; font-size: 14px;">Vaš pozivni kod:</p>
              <h2 style="color: white; font-size: 32px; letter-spacing: 4px; margin: 0;">
                ${inviteCode}
              </h2>
            </div>
            
            <p><strong>⚠️ Važno:</strong></p>
            <ul>
              <li>Kod vrijedi <strong>48 sati</strong></li>
              <li>Kod možete koristiti samo jednom</li>
              <li>Kod je vezan za ovaj email: ${email}</li>
            </ul>
            
            <p>Otvorite Corpex aplikaciju i dovršite registraciju koristeći ovaj kod.</p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #666; font-size: 12px;">
              Ako niste zatražili pristup, ignorirajte ovaj email.
            </p>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("[Email] Resend error:", error);
      return false;
    }

    console.log(`[Email] Approval email sent to ${email}`);
    return true;

  } catch (error) {
    console.error("[Email] Error sending approval email:", error);
    return false;
  }
}

async function sendRejectionEmail(email: string, name: string): Promise<boolean> {
  const resendApiKey = process.env.RESEND_API_KEY;
  
  if (!resendApiKey) {
    return false;
  }

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || "Corpex <noreply@corpex.hr>",
        to: email,
        subject: "Corpex - Status zahtjeva",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #8B5CF6;">Corpex</h1>
            <p>Pozdrav ${name},</p>
            <p>Nažalost, vaš zahtjev za pristup Corpex platformi nije odobren u ovom trenutku.</p>
            <p>Za više informacija, kontaktirajte nas na <a href="mailto:support@corpex.hr">support@corpex.hr</a>.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #666; font-size: 12px;">Corpex tim</p>
          </div>
        `,
      }),
    });

    return true;
  } catch {
    return false;
  }
}

