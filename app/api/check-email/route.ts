import { NextResponse } from "next/server";
import { isValidSnuEmail } from "../../../lib/flow";

/**
 * POST /api/check-email
 *
 * Proxies a real-time email-availability check from the browser to the
 * Google Apps Script Web App, which looks the address up in the Google
 * Sheet (before the user completes the form).
 *
 * The Apps Script handles both `action: "check"` (lookup only) and full
 * submissions, so the sheet stays the single source of truth for dedupe.
 *
 * Env vars required:
 *   - GOOGLE_SHEETS_WEB_APP_URL : the deployed Web App URL (/exec)
 *   - GOOGLE_SHEETS_TOKEN       : shared secret, must match the Apps Script
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WEB_APP_URL = process.env.GOOGLE_SHEETS_WEB_APP_URL;
const SHARED_TOKEN = process.env.GOOGLE_SHEETS_TOKEN;

export async function POST(request: Request) {
  try {
    // 1. Parse and validate the incoming body.
    let body: { email?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { ok: false, error: "Invalid JSON body." },
        { status: 400 },
      );
    }

    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!email || !isValidSnuEmail(email)) {
      return NextResponse.json(
        { ok: false, error: "Missing or invalid 'email' value." },
        { status: 400 },
      );
    }

    // 2. Confirm the server is configured.
    if (!WEB_APP_URL || !SHARED_TOKEN) {
      console.error(
        "[check-email] Missing GOOGLE_SHEETS_WEB_APP_URL or GOOGLE_SHEETS_TOKEN env var.",
      );
      return NextResponse.json(
        {
          ok: false,
          error:
            "Google Sheets integration is not configured on the server. Set GOOGLE_SHEETS_WEB_APP_URL and GOOGLE_SHEETS_TOKEN.",
        },
        { status: 500 },
      );
    }

    // 3. Forward the availability check to the Apps Script Web App.
    let upstream: Response;
    try {
      upstream = await fetch(WEB_APP_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: SHARED_TOKEN, action: "check", email }),
        cache: "no-store",
      });
    } catch (error) {
      console.error("[check-email] Network error reaching Apps Script:", error);
      return NextResponse.json(
        {
          ok: false,
          error:
            "Could not reach the Google Apps Script Web App. Check that the URL is correct and the deployment is live.",
        },
        { status: 502 },
      );
    }

    // 4. Parse the upstream JSON and pass the result through unchanged.
    const raw = await upstream.text();
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      console.error("[check-email] Unparseable upstream response:", raw);
      return NextResponse.json(
        {
          ok: false,
          error: `Google Apps Script returned an unparseable response (HTTP ${upstream.status}).`,
          raw: raw.slice(0, 500),
        },
        { status: upstream.ok ? 500 : 502 },
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("[check-email] Unexpected error:", error);
    return NextResponse.json(
      { ok: false, error: "Unexpected server error while checking the email." },
      { status: 500 },
    );
  }
}
