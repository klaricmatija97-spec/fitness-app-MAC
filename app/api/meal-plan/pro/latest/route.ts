/**
 * GET /api/meal-plan/pro/latest
 * 
 * Dohvaća zadnji spremljeni PRO plan prehrane za klijenta
 * 
 * Query: userId (UUID)
 */

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { z } from "zod";

const querySchema = z.object({
  userId: z.string().uuid("userId mora biti validan UUID"),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    // Validiraj userId
    if (!userId) {
      return NextResponse.json(
        {
          ok: false,
          message: "userId je obavezan query parametar",
        },
        { status: 400 }
      );
    }

    const validatedData = querySchema.parse({ userId });

    const supabase = createServiceClient();

    // Dohvati zadnji PRO plan prehrane za klijenta
    const { data, error } = await supabase
      .from("meal_plans")
      .select("*")
      .eq("client_id", validatedData.userId)
      .eq("plan_type", "pro")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw error;
    }

    // Ako nema zapisa
    if (!data) {
      return NextResponse.json(
        {
          ok: false,
          message: "Nije pronađen PRO plan prehrane za ovog klijenta",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      plan: data,
    });
  } catch (error) {
    console.error("[meal-plan/pro/latest] error:", error);

    // Ako je validacijska greška
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          ok: false,
          message: "Neispravni podaci",
          errors: error.issues,
        },
        { status: 400 }
      );
    }

    // Opća greška
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "Greška pri dohvaćanju PRO plana prehrane",
      },
      { status: 500 }
    );
  }
}

