import { createServiceClient } from "@/lib/supabase";

export interface UsageLimitConfig {
  dailyRequestLimit: number;
  dailyTokenLimit: number;
  modelName?: string; // e.g., "gpt-3.5-turbo" ili "gpt-4"
}

export interface UsageCheckResult {
  canProceed: boolean;
  currentRequests: number;
  currentTokens: number;
  remainingRequests: number;
  remainingTokens: number;
  message: string;
}

/**
 * Provjerava da li korisnik može koristiti AI agenta prema postavljenim limitima
 */
export async function checkUsageLimit(
  clientId: string,
  config?: Partial<UsageLimitConfig>
): Promise<UsageCheckResult> {
  const supabase = createServiceClient();

  // Učitaj konfiguraciju iz env varijabli ili koristi default vrijednosti
  const dailyRequestLimit =
    config?.dailyRequestLimit ??
    parseInt(process.env.AI_DAILY_REQUEST_LIMIT || "50", 10);
  const dailyTokenLimit =
    config?.dailyTokenLimit ??
    parseInt(process.env.AI_DAILY_TOKEN_LIMIT || "100000", 10);

  try {
    // Pozovi Supabase funkciju za provjeru limita
    const { data, error } = await supabase.rpc("check_ai_usage_limit", {
      p_client_id: clientId,
      p_daily_request_limit: dailyRequestLimit,
      p_daily_token_limit: dailyTokenLimit,
    });

    if (error) {
      console.error("[ai-usage] Error checking limit:", error);
      // Ako funkcija ne postoji, dozvoli pristup (fallback)
      return {
        canProceed: true,
        currentRequests: 0,
        currentTokens: 0,
        remainingRequests: dailyRequestLimit,
        remainingTokens: dailyTokenLimit,
        message: "Limit check unavailable, allowing request",
      };
    }

    if (!data || data.length === 0) {
      // Ako nema podataka, dozvoli pristup
      return {
        canProceed: true,
        currentRequests: 0,
        currentTokens: 0,
        remainingRequests: dailyRequestLimit,
        remainingTokens: dailyTokenLimit,
        message: "OK",
      };
    }

    const result = data[0];
    return {
      canProceed: result.can_proceed,
      currentRequests: result.current_requests || 0,
      currentTokens: result.current_tokens || 0,
      remainingRequests: result.remaining_requests || 0,
      remainingTokens: result.remaining_tokens || 0,
      message: result.message || "OK",
    };
  } catch (error) {
    console.error("[ai-usage] Exception checking limit:", error);
    // U slučaju greške, dozvoli pristup (ne želimo blokirati korisnike zbog tehničkih problema)
    return {
      canProceed: true,
      currentRequests: 0,
      currentTokens: 0,
      remainingRequests: dailyRequestLimit,
      remainingTokens: dailyTokenLimit,
      message: "Limit check failed, allowing request",
    };
  }
}

/**
 * Ažurira usage tracking nakon uspješnog AI zahtjeva
 */
export async function updateUsageTracking(
  clientId: string,
  tokensUsed: number = 0,
  estimatedCost: number = 0
): Promise<void> {
  const supabase = createServiceClient();

  try {
    const { error } = await supabase.rpc("update_ai_usage", {
      p_client_id: clientId,
      p_tokens_used: tokensUsed,
      p_estimated_cost: estimatedCost,
    });

    if (error) {
      console.error("[ai-usage] Error updating usage:", error);
      // Ne bacaj grešku - samo logiraj
    }
  } catch (error) {
    console.error("[ai-usage] Exception updating usage:", error);
    // Ne bacaj grešku - samo logiraj
  }
}

/**
 * Izračunava procijenjeni trošak na temelju modela i broja tokena
 */
export function estimateCost(
  tokensUsed: number,
  modelName: string = "gpt-3.5-turbo"
): number {
  // Cijene po 1000 tokena (input + output prosjek)
  const pricing: Record<string, { input: number; output: number }> = {
    "gpt-3.5-turbo": { input: 0.0005, output: 0.0015 },
    "gpt-4": { input: 0.03, output: 0.06 },
    "gpt-4-turbo": { input: 0.01, output: 0.03 },
  };

  const modelPricing = pricing[modelName] || pricing["gpt-3.5-turbo"];
  // Pretpostavimo 70% input, 30% output tokena
  const inputTokens = tokensUsed * 0.7;
  const outputTokens = tokensUsed * 0.3;

  const cost =
    (inputTokens / 1000) * modelPricing.input +
    (outputTokens / 1000) * modelPricing.output;

  return cost;
}

/**
 * Dohvaća trenutnu potrošnju korisnika za danas
 */
export async function getTodayUsage(clientId: string): Promise<{
  requests: number;
  tokens: number;
  cost: number;
  lastRequestAt: string | null;
}> {
  const supabase = createServiceClient();

  try {
    const { data, error } = await supabase
      .from("ai_usage")
      .select("request_count, token_count, estimated_cost, last_request_at")
      .eq("client_id", clientId)
      .eq("date", new Date().toISOString().split("T")[0])
      .single();

    if (error || !data) {
      return {
        requests: 0,
        tokens: 0,
        cost: 0,
        lastRequestAt: null,
      };
    }

    return {
      requests: data.request_count || 0,
      tokens: data.token_count || 0,
      cost: parseFloat(data.estimated_cost || "0"),
      lastRequestAt: data.last_request_at,
    };
  } catch (error) {
    console.error("[ai-usage] Error getting today usage:", error);
    return {
      requests: 0,
      tokens: 0,
      cost: 0,
      lastRequestAt: null,
    };
  }
}

