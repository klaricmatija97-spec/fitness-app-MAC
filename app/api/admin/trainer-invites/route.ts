import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

// Jednostavna admin autentikacija (za produkciju koristiti bolji sustav)
function isAdmin(request: NextRequest): boolean {
  const adminKey = request.headers.get("x-admin-key");
  // Fallback za development ako env nije učitan
  const envKey = process.env.ADMIN_SECRET_KEY || 'corpex-admin-2024';
  console.log('[Admin] Received key:', adminKey);
  console.log('[Admin] Expected key:', envKey);
  return adminKey === envKey;
}

// Generiraj jedinstveni trainer code
function generateTrainerCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// GET - dohvati sve zahtjeve (pending, approved, etc.)
export async function GET(request: NextRequest) {
  if (!isAdmin(request)) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createServiceClient();
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

    if (!["approve", "reject", "resend_email"].includes(action)) {
      return NextResponse.json(
        { ok: false, message: "action mora biti 'approve', 'reject' ili 'resend_email'" },
        { status: 400 }
      );
    }
    
    const supabase = createServiceClient();
    
    // Resend email za već odobrene zahtjeve
    if (action === "resend_email") {
      const { data: invite } = await supabase
        .from("trainer_invites")
        .select("*")
        .eq("id", inviteId)
        .eq("status", "approved")
        .single();
        
      if (!invite) {
        return NextResponse.json(
          { ok: false, message: "Zahtjev nije pronađen ili nije odobren" },
          { status: 404 }
        );
      }
      
      const emailSent = await sendApprovalEmail(invite.email, invite.name, invite.invite_code);
      return NextResponse.json({
        ok: true,
        message: emailSent ? "Email uspješno poslan!" : "Greška pri slanju emaila",
        emailSent,
      });
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
      // Provjeri ima li lozinku
      if (!invite.password_hash) {
        return NextResponse.json(
          { ok: false, message: "Zahtjev nema lozinku - stariji format. Trener mora ponovo podnijeti zahtjev." },
          { status: 400 }
        );
      }

      // Ažuriraj invite status na "approved" (račun se kreira tek kad trener upiše kod)
      const { data: updatedInvite, error: updateError } = await supabase
        .from("trainer_invites")
        .update({
          status: "approved",
          approved_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // 48h
          approved_by: "admin",
          admin_notes: adminNotes || invite.admin_notes,
        })
        .eq("id", inviteId)
        .select()
        .single();

      if (updateError) throw updateError;

      // Pošalji email s kodom
      const emailSent = await sendApprovalEmailWithCode(
        invite.email,
        invite.name,
        updatedInvite.invite_code
      );

      return NextResponse.json({
        ok: true,
        message: `Zahtjev odobren! ${emailSent ? "Email s kodom poslan." : "Email NIJE poslan."}`,
        invite: {
          email: updatedInvite.email,
          name: updatedInvite.name,
          invite_code: updatedInvite.invite_code,
        },
        emailSent,
      });

    } else if (action === "reject") {
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
async function sendApprovalEmailWithCode(email: string, name: string, inviteCode: string): Promise<boolean> {
  const resendApiKey = process.env.RESEND_API_KEY || 're_LAVdTSto_LkTanz66kQLWD88SgAVnCPzH';
  
  if (!resendApiKey) {
    console.warn("[Email] RESEND_API_KEY nije postavljen");
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
        from: process.env.EMAIL_FROM || "onboarding@resend.dev",
        to: email,
        subject: "Corpex - Vaš aktivacijski kod",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #8B5CF6;">🎉 Zahtjev odobren!</h1>
            <p>Pozdrav ${name},</p>
            <p>Vaš zahtjev za pristup Corpex platformi je <strong>odobren</strong>!</p>
            
            <div style="background: linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%); 
                        padding: 30px; border-radius: 12px; text-align: center; margin: 30px 0;">
              <p style="color: rgba(255,255,255,0.8); margin: 0 0 10px 0; font-size: 14px;">Vaš aktivacijski kod:</p>
              <h2 style="color: white; font-size: 32px; letter-spacing: 4px; margin: 0;">
                ${inviteCode}
              </h2>
            </div>
            
            <p><strong>Sljedeći korak:</strong></p>
            <ol>
              <li>Otvorite Corpex aplikaciju</li>
              <li>Kliknite "Registracija trenera"</li>
              <li>Unesite ovaj kod da aktivirate račun</li>
            </ol>
            
            <p style="color: #888; font-size: 13px;">⚠️ Kod vrijedi 48 sati.</p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #666; font-size: 12px;">Corpex tim</p>
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

async function sendWelcomeEmail(email: string, name: string, trainerCode: string): Promise<boolean> {
  const resendApiKey = process.env.RESEND_API_KEY || 're_LAVdTSto_LkTanz66kQLWD88SgAVnCPzH';
  
  if (!resendApiKey) {
    console.warn("[Email] RESEND_API_KEY nije postavljen");
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
        from: process.env.EMAIL_FROM || "onboarding@resend.dev",
        to: email,
        subject: "Corpex - Vaš račun je kreiran!",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #8B5CF6;">🎉 Dobrodošli u Corpex!</h1>
            <p>Pozdrav ${name},</p>
            <p>Vaš trenerski račun je uspješno kreiran!</p>
            
            <div style="background: linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%); 
                        padding: 30px; border-radius: 12px; text-align: center; margin: 30px 0;">
              <p style="color: rgba(255,255,255,0.8); margin: 0 0 10px 0; font-size: 14px;">Vaš trener kod (za klijente):</p>
              <h2 style="color: white; font-size: 32px; letter-spacing: 4px; margin: 0;">
                ${trainerCode}
              </h2>
            </div>
            
            <p><strong>Što dalje?</strong></p>
            <ul>
              <li>Otvorite Corpex aplikaciju</li>
              <li>Prijavite se s emailom i lozinkom koju ste unijeli pri zahtjevu</li>
              <li>Podijelite svoj trener kod (${trainerCode}) s klijentima</li>
            </ul>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #666; font-size: 12px;">Corpex tim</p>
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
        from: process.env.EMAIL_FROM || "onboarding@resend.dev",
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

