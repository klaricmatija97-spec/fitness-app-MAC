import { createServiceClient } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const name = searchParams.get('name');
    
    const supabase = createServiceClient();
    
    // Get all clients
    let query = supabase
      .from("clients")
      .select("id, name, email, username, created_at");
    
    if (email) {
      query = query.ilike("email", `%${email}%`);
    }
    if (name) {
      query = query.ilike("name", `%${name}%`);
    }
    
    const { data: clients, error: clientsError } = await query.order("created_at", { ascending: false }).limit(50);
    
    // Get all user_accounts
    const { data: accounts, error: accountsError } = await supabase
      .from("user_accounts")
      .select("id, client_id, username, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    
    // Match clients with accounts
    const clientsWithAccounts = (clients || []).map(client => {
      const account = (accounts || []).find(acc => acc.client_id === client.id);
      return {
        ...client,
        account: account || null,
        hasAccount: !!account,
      };
    });
    
    return NextResponse.json({
      ok: true,
      clients: clientsWithAccounts,
      totalClients: clients?.length || 0,
      totalAccounts: accounts?.length || 0,
      clientsError: clientsError?.message,
      accountsError: accountsError?.message,
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
