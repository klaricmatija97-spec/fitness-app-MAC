import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase";
import { requireTrainer } from "@/lib/api/auth-helpers";

const supabase = createServiceClient();

const CreateClientSchema = z.object({
  name: z.string().min(1, { message: "Ime je obavezno" }).max(255),
  email: z.string().email({ message: "Email mora biti validan" }),
  phone: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

/**
 * POST /api/trainer/clients
 * Kreira novog klijenta i dodjeljuje ga treneru
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[trainer/clients] POST request received');
    
    // Provjeri autentifikaciju
    const auth = requireTrainer(request);
    if (!auth) {
      console.error('[trainer/clients] Unauthorized - no auth');
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
          code: "UNAUTHORIZED",
        },
        { status: 401 },
      );
    }

    console.log('[trainer/clients] Trainer authenticated:', auth.userId);

    const body = await request.json();
    console.log('[trainer/clients] Request body:', body);
    const parseResult = CreateClientSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Validacija nije prošla",
          detalji: parseResult.error.issues,
          code: "VALIDATION_ERROR",
        },
        { status: 400 },
      );
    }

    const { name, email, phone, notes } = parseResult.data;
    const trainerId = auth.userId;

    // Provjeri da li email već postoji
    const { data: existingClient, error: existingError } = await supabase
      .from("clients")
      .select("id, email")
      .eq("email", email.toLowerCase())
      .maybeSingle();

    if (existingError && existingError.code !== "PGRST116") {
      // PGRST116 = no rows returned
      console.error(
        "[trainer/clients] Error checking existing client:",
        existingError,
      );
      return NextResponse.json(
        {
          success: false,
          error: existingError.message,
          code: "DB_ERROR",
        },
        { status: 500 },
      );
    }

    if (existingClient) {
      // Email već postoji - provjeri da li je već dodijeljen ovom treneru
      const { data: clientTrainer, error: trainerError } = await supabase
        .from("clients")
        .select("trainer_id")
        .eq("id", existingClient.id)
        .single();

      if (trainerError) {
        console.error(
          "[trainer/clients] Error checking client trainer:",
          trainerError,
        );
      }

      if (clientTrainer?.trainer_id === trainerId) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Klijent s ovom email adresom već postoji i već vam je dodijeljen",
            code: "CLIENT_ALREADY_ASSIGNED",
            data: { clientId: existingClient.id },
          },
          { status: 409 },
        );
      }

      // Email postoji, ali klijent nije dodijeljen ovom treneru
      // Možemo ažurirati trainer_id ili vratiti grešku
      // Za sada, vraćamo grešku
      return NextResponse.json(
        {
          success: false,
          error: "Klijent s ovom email adresom već postoji",
          code: "EMAIL_EXISTS",
        },
        { status: 409 },
      );
    }

    // Kreiraj objekt za insert - dodaj trainer_id samo ako stupac postoji
    const insertData: any = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone?.trim() || null,
      notes: notes?.trim() || null,
      // Default vrijednosti za obavezna polja
      honorific: "other",
      age_range: "other",
      weight_value: 70, // Default težina u kg
      weight_unit: "kg",
      height_value: 170, // Default visina u cm
      height_unit: "cm",
      activities: [],
      goals: [],
      diet_cleanliness: 50, // Default 50%
    };

    // Dodaj trainer_id ako stupac postoji (dodat će se ako postoji, ignorirat će se ako ne postoji)
    insertData.trainer_id = trainerId;

    // Kreiraj novog klijenta s default vrijednostima za obavezna polja
    const { data: newClient, error: insertError } = await supabase
      .from("clients")
      .insert(insertData)
      .select("id, name, email, phone, trainer_id, created_at")
      .single();

    if (insertError) {
      console.error("[trainer/clients] Error creating client:", insertError);
      console.error(
        "[trainer/clients] Error details:",
        JSON.stringify(insertError, null, 2),
      );

      // Provjeri da li je greška zbog unique constraint-a (email)
      if (insertError.code === "23505") {
        return NextResponse.json(
          {
            success: false,
            error: "Klijent s ovom email adresom već postoji",
            code: "EMAIL_EXISTS",
          },
          { status: 409 },
        );
      }

      // Provjeri da li je greška zbog nedostajućeg stupca (trainer_id)
      if (
        insertError.code === "42703" ||
        insertError.message?.includes("trainer_id")
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "trainer_id stupac ne postoji u bazi. Molimo pokrenite SQL migraciju: supabase-add-trainer-id.sql",
            code: "MISSING_COLUMN",
            details: insertError.message,
          },
          { status: 500 },
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: insertError.message || "Nije moguće dodati klijenta",
          code: "DB_ERROR",
          details: insertError.code || "Unknown error",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: newClient.id,
        name: newClient.name,
        email: newClient.email,
        phone: newClient.phone,
        trainerId: newClient.trainer_id,
        createdAt: newClient.created_at,
      },
      message: "Klijent je uspješno dodan",
    });
  } catch (error) {
    console.error("[trainer/clients] Unexpected error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        code: "SERVER_ERROR",
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/trainer/clients
 * Dohvaća sve klijente dodijeljene treneru
 */
export async function GET(request: NextRequest) {
  try {
    // DEBUG: Provjeri token
    const authHeader = request.headers.get('authorization');
    console.log('[trainer/clients] GET - Authorization header present:', !!authHeader);
    if (authHeader) {
      const tokenPreview = authHeader.substring(0, 50);
      console.log('[trainer/clients] GET - Token preview:', tokenPreview + '...');
    }
    
    // Provjeri autentifikaciju
    const auth = requireTrainer(request);
    if (!auth) {
      console.error('[trainer/clients] GET - No auth returned from requireTrainer');
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
          code: "UNAUTHORIZED",
        },
        { status: 401 },
      );
    }

    const trainerId = auth.userId;
    console.log('[trainer/clients] GET - Trainer ID:', trainerId);
    console.log('[trainer/clients] GET - Trainer ID type:', typeof trainerId);
    console.log('[trainer/clients] GET - Trainer ID length:', trainerId?.length);
    console.log('[trainer/clients] GET - Auth object:', {
      userId: auth.userId,
      userType: auth.userType,
      username: auth.username,
    });

    // Validiraj da je trainerId validan UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(trainerId)) {
      console.error('[trainer/clients] Invalid trainer ID format (not UUID):', trainerId?.substring(0, 50));
      return NextResponse.json(
        {
          success: false,
          error: "Invalid trainer authentication. Please log in again.",
          code: "INVALID_TOKEN",
        },
        { status: 401 }
      );
    }

    // Dohvati sve klijente dodijeljene ovom treneru
    const { data: clients, error: clientsError } = await supabase
      .from("clients")
      .select("id, name, email, phone, trainer_id, connected_at")
      .eq("trainer_id", trainerId)
      .order("name");

    console.log('[trainer/clients] GET - Clients found:', clients?.length || 0);
    if (clients && clients.length > 0) {
      console.log('[trainer/clients] GET - Client IDs:', clients.map(c => ({ id: c.id, name: c.name, trainer_id: c.trainer_id })));
    }
    if (clientsError) {
      console.error('[trainer/clients] GET - Error:', clientsError);
    }

    if (clientsError) {
      console.error("[trainer/clients] Error fetching clients:", clientsError);
      return NextResponse.json(
        {
          success: false,
          error: clientsError.message,
          code: "DB_ERROR",
        },
        { status: 500 },
      );
    }

    // Za svakog klijenta, dohvatimo trenutni program
    const clientsWithPrograms = await Promise.all(
      (clients || []).map(async (client) => {
        // Dohvati aktivan program za klijenta
        const { data: program } = await supabase
          .from("training_programs")
          .select("id, name, status, client_id")
          .eq("client_id", client.id)
          .in("status", ["draft", "active"])
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        let adherence = null;
        let lastSessionDate = null;
        let needsAttention = false;

        if (program) {
          // Dohvati adherence (completed sessions / total sessions)
          const { data: sessions } = await supabase
            .from("program_sessions")
            .select("id")
            .eq("program_id", program.id);

          const totalSessions = sessions?.length || 0;

          // Dohvati completed sessions iz workout_logs
          const { count: completedSessionsCount } = await supabase
            .from('workout_logs')
            .select('id', { count: 'exact', head: true })
            .eq('program_id', program.id)
            .eq('status', 'completed');

          const completedSessions = completedSessionsCount || 0;

          adherence =
            totalSessions > 0
              ? Math.round((completedSessions / totalSessions) * 100)
              : 0;

          // Dohvati last session date iz workout_logs
          const { data: lastSession } = await supabase
            .from('workout_logs')
            .select('started_at')
            .eq('program_id', program.id)
            .order('started_at', { ascending: false })
            .limit(1)
            .single();

          const lastSessionDate = lastSession?.started_at || null;

          // Needs attention ako adherence < 70% ili nema sessiona u 7 dana
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          const hasRecentSession = lastSessionDate 
            ? new Date(lastSessionDate) > sevenDaysAgo 
            : false;
          
          needsAttention = adherence < 70 || !hasRecentSession;
        }

        return {
          id: client.id,
          name: client.name,
          email: client.email,
          phone: client.phone || undefined,
          avatar: undefined, // TODO: dodati avatar_url stupac u clients tablicu
          currentProgram: program
            ? {
                id: program.id,
                name: program.name,
                status: program.status as 'draft' | 'active' | 'archived',
                adherence: adherence || 0,
                lastSessionDate,
                needsAttention,
              }
            : null,
        };
      }),
    );

    return NextResponse.json({
      success: true,
      data: {
        clients: clientsWithPrograms,
        stats: {
          totalClients: clientsWithPrograms.length,
          activePrograms: clientsWithPrograms.filter(
            (c) => c.currentProgram?.status === "active",
          ).length,
          draftPrograms: clientsWithPrograms.filter(
            (c) => c.currentProgram?.status === "draft",
          ).length,
          needsAttention: clientsWithPrograms.filter(
            (c) => c.currentProgram?.needsAttention,
          ).length,
        },
      },
    });
  } catch (error) {
    console.error("[trainer/clients] Unexpected error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        code: "SERVER_ERROR",
      },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/trainer/clients?clientId=...
 * Briše klijenta (samo ako pripada treneru)
 */
export async function DELETE(request: NextRequest) {
  try {
    // Provjeri autentifikaciju
    const auth = requireTrainer(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const trainerId = auth.userId;
    
    // Dohvati clientId iz URL query parametra
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    
    if (!clientId) {
      return NextResponse.json(
        { success: false, error: "clientId je obavezan", code: "MISSING_CLIENT_ID" },
        { status: 400 }
      );
    }

    // Provjeri da klijent pripada ovom treneru
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id, name, trainer_id")
      .eq("id", clientId)
      .single();

    if (clientError || !client) {
      return NextResponse.json(
        { success: false, error: "Klijent nije pronađen", code: "CLIENT_NOT_FOUND" },
        { status: 404 }
      );
    }

    if (client.trainer_id !== trainerId) {
      return NextResponse.json(
        { success: false, error: "Nemate pravo brisati ovog klijenta", code: "FORBIDDEN" },
        { status: 403 }
      );
    }

    // Obriši sve povezane podatke (kaskadno)
    // 1. Obriši workout_logs
    await supabase.from("workout_logs").delete().eq("client_id", clientId);
    
    // 2. Obriši program_sessions (preko programa)
    const { data: programs } = await supabase
      .from("training_programs")
      .select("id")
      .eq("client_id", clientId);
    
    if (programs && programs.length > 0) {
      const programIds = programs.map(p => p.id);
      await supabase.from("program_sessions").delete().in("program_id", programIds);
    }
    
    // 3. Obriši training_programs
    await supabase.from("training_programs").delete().eq("client_id", clientId);
    
    // 4. Obriši meal_plans
    await supabase.from("meal_plans").delete().eq("client_id", clientId);
    
    // 5. Obriši user_accounts (ako postoji)
    await supabase.from("user_accounts").delete().eq("client_id", clientId);
    
    // 6. Konačno obriši klijenta
    const { error: deleteError } = await supabase
      .from("clients")
      .delete()
      .eq("id", clientId);

    if (deleteError) {
      console.error("[trainer/clients] Error deleting client:", deleteError);
      return NextResponse.json(
        { success: false, error: deleteError.message, code: "DELETE_ERROR" },
        { status: 500 }
      );
    }

    console.log(`[trainer/clients] Client ${clientId} (${client.name}) deleted by trainer ${trainerId}`);

    return NextResponse.json({
      success: true,
      message: `Klijent ${client.name} je uspješno obrisan`,
    });
  } catch (error) {
    console.error("[trainer/clients] DELETE error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error", code: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
