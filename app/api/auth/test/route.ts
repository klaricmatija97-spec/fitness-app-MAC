import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export async function GET() {
  try {
    console.log("[auth/test] ===== TEST ENDPOINT CALLED =====");
    
    // Provjeri environment varijable
    const hasUrl = !!process.env.SUPABASE_URL;
    const hasKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    console.log("[auth/test] Environment check:", { hasUrl, hasKey });
    
    if (!hasUrl || !hasKey) {
      return NextResponse.json({
        ok: false,
        message: "Missing environment variables",
        hasUrl,
        hasKey,
      }, { status: 500 });
    }
    
    // Test Supabase konekciju
    try {
      const supabase = createServiceClient();
      console.log("[auth/test] Supabase client created");
      
      // Test query
      const { data, error } = await supabase
        .from("clients")
        .select("id")
        .limit(1);
      
      if (error) {
        console.error("[auth/test] Supabase query error:", error);
        return NextResponse.json({
          ok: false,
          message: "Database query failed",
          error: error.message,
          code: error.code,
        }, { status: 500 });
      }
      
      console.log("[auth/test] ✅ All tests passed");
      return NextResponse.json({
        ok: true,
        message: "Backend is working correctly",
        databaseConnected: true,
      });
    } catch (supabaseError) {
      console.error("[auth/test] Supabase error:", supabaseError);
      return NextResponse.json({
        ok: false,
        message: "Failed to connect to database",
        error: supabaseError instanceof Error ? supabaseError.message : String(supabaseError),
      }, { status: 500 });
    }
  } catch (error) {
    console.error("[auth/test] Unexpected error:", error);
    return NextResponse.json({
      ok: false,
      message: "Unexpected error",
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}


