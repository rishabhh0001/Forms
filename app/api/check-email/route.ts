import { NextResponse } from "next/server";
import { isValidEmail } from "../../../lib/flow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WEB_APP_URL  = process.env.GOOGLE_SHEETS_WEB_APP_URL;
const SHARED_TOKEN = process.env.GOOGLE_SHEETS_TOKEN;

export async function POST(request: Request) {
  try {
    let body: { email?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
    }

    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { ok: false, error: "Missing or invalid email address." },
        { status: 400 },
      );
    }

    if (!WEB_APP_URL || !SHARED_TOKEN) {
      return NextResponse.json(
        { ok: false, error: "Server not configured." },
        { status: 500 },
      );
    }

    let upstream: Response;
    try {
      upstream = await fetch(WEB_APP_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: SHARED_TOKEN, action: "check", email }),
        cache: "no-store",
      });
    } catch {
      return NextResponse.json(
        { ok: false, error: "Could not reach the backend service." },
        { status: 502 },
      );
    }

    const raw = await upstream.text();
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return NextResponse.json(
        { ok: false, error: "Unexpected response from backend." },
        { status: upstream.ok ? 500 : 502 },
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Unexpected server error." },
      { status: 500 },
    );
  }
}
