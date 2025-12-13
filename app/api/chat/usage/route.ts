import { createServiceClient } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getTodayUsage, checkUsageLimit } from "@/lib/ai-usage-limits";

const usageSchema = z.object({
  clientId: z.string().uuid(),
});

export async function POST(request: Request) {
  try {
    const { clientId } = usageSchema.parse(await request.json());

    // Dohvati trenutnu potrošnju
    const usage = await getTodayUsage(clientId);

    // Provjeri limite za izračun preostalih vrijednosti
    const limitCheck = await checkUsageLimit(clientId);

    // Izračunaj postotak iskorištenosti
    const dailyRequestLimit =
      parseInt(process.env.AI_DAILY_REQUEST_LIMIT || "50", 10) || 50;
    const dailyTokenLimit =
      parseInt(process.env.AI_DAILY_TOKEN_LIMIT || "100000", 10) || 100000;

    const requestPercentage = (usage.requests / dailyRequestLimit) * 100;
    const tokenPercentage = (usage.tokens / dailyTokenLimit) * 100;

    // Provjeri da li je blizu limita (80% ili više)
    const isNearLimit =
      requestPercentage >= 80 || tokenPercentage >= 80;
    const isAtLimit = !limitCheck.canProceed;

    return NextResponse.json({
      ok: true,
      usage: {
        requests: usage.requests,
        tokens: usage.tokens,
        cost: usage.cost,
        lastRequestAt: usage.lastRequestAt,
        remainingRequests: limitCheck.remainingRequests,
        remainingTokens: limitCheck.remainingTokens,
        requestPercentage: Math.round(requestPercentage),
        tokenPercentage: Math.round(tokenPercentage),
        isNearLimit,
        isAtLimit,
        dailyRequestLimit,
        dailyTokenLimit,
      },
    });
  } catch (error) {
    console.error("[chat/usage] error", error);
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Greška",
        usage: null,
      },
      { status: 400 }
    );
  }
}

