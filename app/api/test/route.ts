import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "Backend radi!",
    timestamp: new Date().toISOString(),
  });
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    return NextResponse.json({
      ok: true,
      message: "POST request primljen!",
      received: json,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      message: "Greška pri parsiranju JSON-a",
      error: error instanceof Error ? error.message : String(error),
    }, { status: 400 });
  }
}


