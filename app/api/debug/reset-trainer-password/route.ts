import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const { email, newPassword } = await request.json();
    
    if (!email || !newPassword) {
      return NextResponse.json({ error: "Email and newPassword are required" }, { status: 400 });
    }
    
    const supabase = createServiceClient();
    
    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update trainer password
    const { data, error } = await supabase
      .from("trainers")
      .update({ password_hash: hashedPassword })
      .eq("email", email)
      .select("id, email, name");
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    if (!data || data.length === 0) {
      return NextResponse.json({ error: "Trainer not found" }, { status: 404 });
    }
    
    return NextResponse.json({
      ok: true,
      message: "Password reset successfully",
      trainer: data[0],
    });
  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}
