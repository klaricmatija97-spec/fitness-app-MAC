/**
 * POST /api/debug/create-client-accounts
 * 
 * Kreira user_accounts zapise za sve klijente koji ih nemaju
 * Ovo omogućuje prijavu za klijente koji su dodani od strane trenera
 */

import { createServiceClient } from "@/lib/supabase";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function POST() {
  try {
    const supabase = createServiceClient();
    
    // Dohvati sve klijente
    const { data: allClients, error: clientsError } = await supabase
      .from("clients")
      .select("id, name, email, phone");
    
    if (clientsError) {
      return NextResponse.json({ 
        ok: false, 
        error: clientsError.message 
      }, { status: 500 });
    }
    
    if (!allClients || allClients.length === 0) {
      return NextResponse.json({ 
        ok: true, 
        message: "Nema klijenata u bazi",
        created: 0 
      });
    }
    
    // Dohvati sve postojeće user_accounts
    const { data: existingAccounts } = await supabase
      .from("user_accounts")
      .select("client_id");
    
    const existingClientIds = new Set(existingAccounts?.map(a => a.client_id) || []);
    
    // Pronađi klijente bez user_accounts
    const clientsWithoutAccounts = allClients.filter(c => !existingClientIds.has(c.id));
    
    if (clientsWithoutAccounts.length === 0) {
      return NextResponse.json({ 
        ok: true, 
        message: "Svi klijenti već imaju user_accounts",
        created: 0,
        total: allClients.length
      });
    }
    
    const results: any[] = [];
    
    for (const client of clientsWithoutAccounts) {
      // Generiraj username iz emaila
      const emailPrefix = client.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const generatedUsername = `${emailPrefix}_${randomSuffix}`;
      
      // Generiraj privremenu lozinku
      const phoneSuffix = client.phone?.replace(/\D/g, '').slice(-4) || '1234';
      const temporaryPassword = `corpex${phoneSuffix}`;
      const passwordHash = await bcrypt.hash(temporaryPassword, 10);
      
      // Kreiraj user_account
      const { error: insertError } = await supabase
        .from("user_accounts")
        .insert({
          client_id: client.id,
          username: generatedUsername,
          password_hash: passwordHash,
        });
      
      results.push({
        clientId: client.id,
        name: client.name,
        email: client.email,
        username: generatedUsername,
        temporaryPassword: temporaryPassword,
        success: !insertError,
        error: insertError?.message,
      });
    }
    
    const successCount = results.filter(r => r.success).length;
    
    return NextResponse.json({
      ok: true,
      message: `Kreirano ${successCount}/${clientsWithoutAccounts.length} user_accounts zapisa`,
      created: successCount,
      total: allClients.length,
      results,
    });
    
  } catch (error) {
    console.error("[debug/create-client-accounts] error:", error);
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}

export async function GET() {
  // GET samo prikazuje status, ne kreira ništa
  try {
    const supabase = createServiceClient();
    
    // Dohvati sve klijente
    const { data: allClients } = await supabase
      .from("clients")
      .select("id, name, email");
    
    // Dohvati sve postojeće user_accounts
    const { data: existingAccounts } = await supabase
      .from("user_accounts")
      .select("client_id, username");
    
    const existingClientIds = new Set(existingAccounts?.map(a => a.client_id) || []);
    
    const clientsWithAccounts = allClients?.filter(c => existingClientIds.has(c.id)) || [];
    const clientsWithoutAccounts = allClients?.filter(c => !existingClientIds.has(c.id)) || [];
    
    return NextResponse.json({
      ok: true,
      totalClients: allClients?.length || 0,
      withAccounts: clientsWithAccounts.length,
      withoutAccounts: clientsWithoutAccounts.length,
      clientsWithoutAccounts: clientsWithoutAccounts.map(c => ({
        id: c.id,
        name: c.name,
        email: c.email,
      })),
      clientsWithAccounts: clientsWithAccounts.map(c => {
        const account = existingAccounts?.find(a => a.client_id === c.id);
        return {
          id: c.id,
          name: c.name,
          email: c.email,
          username: account?.username,
        };
      }),
    });
    
  } catch (error) {
    console.error("[debug/create-client-accounts] error:", error);
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}
