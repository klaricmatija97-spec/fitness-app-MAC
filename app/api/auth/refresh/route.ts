/**
 * Refresh Token API Endpoint
 * ==========================
 * POST /api/auth/refresh
 * 
 * Osvježava access token koristeći refresh token
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { 
  verifyRefreshToken, 
  generateAccessToken,
  type JWTPayload,
} from "@/lib/auth/jwt";

// ============================================
// VALIDACIJA
// ============================================

const refreshSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token je obavezan"),
});

// ============================================
// POST HANDLER
// ============================================

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parseResult = refreshSchema.safeParse(json);
    
    if (!parseResult.success) {
      return NextResponse.json(
        { 
          ok: false, 
          message: "Refresh token je obavezan",
          code: "INVALID_REQUEST",
        },
        { status: 400 }
      );
    }
    
    const { refreshToken } = parseResult.data;
    
    // Verificiraj refresh token
    const result = verifyRefreshToken(refreshToken);
    
    if (!result.valid || !result.payload) {
      return NextResponse.json(
        { 
          ok: false, 
          message: result.error || "Nevažeći refresh token",
          code: result.expired ? "TOKEN_EXPIRED" : "INVALID_TOKEN",
        },
        { status: 401 }
      );
    }
    
    // Generiraj novi access token
    const newAccessToken = generateAccessToken({
      userId: result.payload.userId,
      userType: result.payload.userType,
      username: result.payload.username,
    });
    
    return NextResponse.json({
      ok: true,
      accessToken: newAccessToken,
      // Backward compatibility
      token: newAccessToken,
      expiresIn: 15 * 60, // 15 minuta
      message: "Token osvježen",
    });
    
  } catch (error) {
    console.error("[auth/refresh] error", error);
    return NextResponse.json(
      {
        ok: false,
        message: "Greška pri osvježavanju tokena",
        code: "SERVER_ERROR",
      },
      { status: 500 }
    );
  }
}

