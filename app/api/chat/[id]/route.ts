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
      .from("chat_messages")
      .select("*")
      .eq("client_id", id)
      .order("created_at", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ ok: true, messages: data || [] });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Greška" },
      { status: 400 }
    );
  }
}

