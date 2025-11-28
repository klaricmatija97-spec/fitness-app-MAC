import { createServiceClient } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const supabase = createServiceClient();
    
    const { data, error } = await supabase
      .from("client_calculations")
      .select("*")
      .eq("client_id", id)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { ok: false, message: "Izračuni nisu pronađeni" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      ...data,
    });
  } catch (error) {
    console.error("[calculations] error", error);
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Greška",
      },
      { status: 400 }
    );
  }
}

