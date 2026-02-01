import { createServiceClient } from "@/lib/supabase";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const { email, username, newPassword } = await request.json();
    
    if (!newPassword) {
      return NextResponse.json({ error: "newPassword is required" }, { status: 400 });
    }
    
    if (!email && !username) {
      return NextResponse.json({ error: "Email or username is required" }, { status: 400 });
    }
    
    const supabase = createServiceClient();
    
    // Find client
    let client = null;
    if (email) {
      const { data } = await supabase
        .from("clients")
        .select("id")
        .eq("email", email.toLowerCase().trim())
        .single();
      client = data;
    } else if (username) {
      const { data } = await supabase
        .from("clients")
        .select("id")
        .eq("username", username.toLowerCase().trim())
        .single();
      client = data;
    }
    
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }
    
    // Find account
    const { data: account } = await supabase
      .from("user_accounts")
      .select("id, client_id, username")
      .eq("client_id", client.id)
      .single();
    
    if (!account) {
      return NextResponse.json({ error: "User account not found" }, { status: 404 });
    }
    
    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update password
    const { data: updated, error: updateError } = await supabase
      .from("user_accounts")
      .update({ password_hash: hashedPassword })
      .eq("client_id", client.id)
      .select("id, username");
    
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
    
    return NextResponse.json({
      ok: true,
      message: "Password reset successfully",
      account: updated?.[0],
    });
  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}
