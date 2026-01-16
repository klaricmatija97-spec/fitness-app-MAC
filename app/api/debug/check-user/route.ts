import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get("email");
    
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }
    
    const supabase = createServiceClient();
    
    // Check trainers table
    const { data: trainer, error: trainerError } = await supabase
      .from("trainers")
      .select("id, name, email, trainer_code, password_hash")
      .eq("email", email)
      .single();
    
    // Check user_accounts table
    const { data: account, error: accountError } = await supabase
      .from("user_accounts")
      .select("client_id, username, password_hash")
      .eq("username", email)
      .single();
    
    return NextResponse.json({
      trainer: trainer ? {
        found: true,
        id: trainer.id,
        name: trainer.name,
        email: trainer.email,
        trainerCode: trainer.trainer_code,
        hasPassword: !!trainer.password_hash,
        passwordHashStart: trainer.password_hash ? trainer.password_hash.substring(0, 10) + "..." : null,
      } : { found: false, error: trainerError?.message },
      account: account ? {
        found: true,
        clientId: account.client_id,
        username: account.username,
        hasPassword: !!account.password_hash,
        passwordHashStart: account.password_hash ? account.password_hash.substring(0, 10) + "..." : null,
      } : { found: false, error: accountError?.message },
    });
  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}
