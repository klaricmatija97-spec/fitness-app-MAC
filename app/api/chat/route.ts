import { createServiceClient } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  checkUsageLimit,
  updateUsageTracking,
  estimateCost,
} from "@/lib/ai-usage-limits";

const chatSchema = z.object({
  clientId: z.string().uuid(),
  message: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const { clientId, message } = chatSchema.parse(await request.json());
    const supabase = createServiceClient();

    // Provjeri limit potrošnje prije nego što generiramo odgovor
    const usageCheck = await checkUsageLimit(clientId);
    if (!usageCheck.canProceed) {
      return NextResponse.json(
        {
          ok: false,
          message: usageCheck.message,
          limitExceeded: true,
          usage: {
            currentRequests: usageCheck.currentRequests,
            currentTokens: usageCheck.currentTokens,
            remainingRequests: usageCheck.remainingRequests,
            remainingTokens: usageCheck.remainingTokens,
          },
        },
        { status: 429 } // Too Many Requests
      );
    }
    
    // Dohvati podatke klijenta za kontekst
    const { data: client } = await supabase
      .from("clients")
      .select("name, goals, activities, weight_value, height_value")
      .eq("id", clientId)
      .single();

    // Dohvati izračune ako postoje
    const { data: calculations } = await supabase
      .from("client_calculations")
      .select("*")
      .eq("client_id", clientId)
      .single();

    // Generiraj AI odgovor
    // Za sada koristimo samo fallback odgovore
    // OpenAI integracija će biti dodana kasnije kada se paket instalira
    const response = generateFallbackResponse(message, client, calculations);

    // Procijeni token usage (za fallback odgovore, koristimo aproksimaciju)
    // Kada se doda OpenAI, koristiti stvarni broj tokena iz API odgovora
    const estimatedTokens = Math.ceil(
      (message.length + response.length) / 4
    ); // ~4 karaktera = 1 token
    const estimatedCost = estimateCost(estimatedTokens, "gpt-3.5-turbo");

    // Ažuriraj usage tracking
    await updateUsageTracking(clientId, estimatedTokens, estimatedCost);
    
    // Spremi poruku i odgovor
    await supabase.from("chat_messages").insert({
        client_id: clientId,
        message,
        response,
      });

    return NextResponse.json({
      ok: true,
      response,
      usage: {
        remainingRequests: usageCheck.remainingRequests - 1,
        remainingTokens: usageCheck.remainingTokens - estimatedTokens,
      },
    });
  } catch (error) {
    console.error("[chat] error", error);
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Greška" },
      { status: 400 }
    );
  }
}

function generateFallbackResponse(
  message: string,
  client?: { name?: string; goals?: string[]; activities?: string[] } | null,
  calculations?: any
): string {
  // Fallback odgovori ako OpenAI nije dostupan
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes("kalorije") || lowerMessage.includes("kalorija")) {
    if (calculations?.target_calories) {
      return `Prema tvojim izračunima, tvoja dnevna potreba za kalorijama je ${calculations.target_calories} kcal. Ova vrijednost je prilagođena tvojim ciljevima i razini aktivnosti.`;
    }
    return "Za izračun kalorija, koristi kalkulator kalorija u aplikaciji. On uzima u obzir tvoju dob, spol, visinu, težinu i razinu aktivnosti.";
  }
  
  if (lowerMessage.includes("protein") || lowerMessage.includes("proteini")) {
    if (calculations?.protein_grams) {
      return `Prema tvojim izračunima, trebao bi unijeti ${calculations.protein_grams}g proteina dnevno. Proteini su važni za rast i popravak mišića.`;
    }
    return "Proteini su važni za rast i popravak mišića. Preporučena količina je 1.6-2.2g po kg tjelesne težine, ovisno o tvojim ciljevima.";
  }
  
  if (lowerMessage.includes("trening") || lowerMessage.includes("vježbanje")) {
    return "Tvoj plan treninga je prilagođen tvojim ciljevima. Slijedi vježbe redom, održavaj pravilnu formu i ne preskači odmor između setova.";
  }
  
  if (lowerMessage.includes("makrosi") || lowerMessage.includes("makro")) {
    if (calculations) {
      return `Tvoji dnevni makrosi: ${calculations.protein_grams}g proteina, ${calculations.carbs_grams}g ugljikohidrata, ${calculations.fats_grams}g masti. Ove vrijednosti su prilagođene tvojim ciljevima.`;
    }
    return "Makrosi su važni za postizanje tvojih ciljeva. Provjeri svoj plan makrosa u aplikaciji za detaljne informacije.";
  }
  
  return "Hvala na pitanju! Za detaljnije informacije o prehrani i treningu, provjeri svoje planove u aplikaciji ili me kontaktiraj direktno.";
}

