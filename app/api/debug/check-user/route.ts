import { createServiceClient } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');
  const username = searchParams.get('username');
  
  if (!email && !username) {
    return NextResponse.json({ error: "Provide email or username" }, { status: 400 });
  }
  
  const supabase = createServiceClient();
  
  // Check clients table
  let clientQuery = supabase.from("clients").select("id, name, email, username");
  if (email) clientQuery = clientQuery.eq("email", email);
  if (username) clientQuery = clientQuery.eq("username", username);
  const { data: clients, error: clientError } = await clientQuery;
  
  // Check user_accounts table
  let accountQuery = supabase.from("user_accounts").select("id, client_id, username");
  if (username) accountQuery = accountQuery.eq("username", username);
  const { data: accounts, error: accountError } = await accountQuery;
  
  // If we found a client by email, also check their account
  let accountByClientId = null;
  if (clients && clients.length > 0) {
    const { data: accByClient } = await supabase
      .from("user_accounts")
      .select("id, client_id, username")
      .eq("client_id", clients[0].id);
    accountByClientId = accByClient;
  }
  
  return NextResponse.json({
    query: { email, username },
    clients: clients || [],
    clientError: clientError?.message,
    accounts: accounts || [],
    accountError: accountError?.message,
    accountByClientId: accountByClientId || [],
  });
}
