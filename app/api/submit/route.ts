import { NextResponse } from "next/server";

/**
 * POST /api/submit
 *
 * Proxies the final form answers from the browser to the Google Apps Script
 * Web App that writes them into Google Sheets.
 *
 * Why a proxy?
 *   - Google Apps Script Web Apps cannot send CORS headers, so a browser
 *     cannot call them directly.
 *   - It keeps the shared secret token on the server, out of the client
 *     bundle, so visitors cannot forge or spam submissions.
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
    let body: { answers?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { ok: false, error: "Invalid JSON body." },
        { status: 400 },
      );
    }

    const answers = body.answers;
    if (!answers || typeof answers !== "object" || Array.isArray(answers)) {
      return NextResponse.json(
        { ok: false, error: "Missing or invalid 'answers' object." },
        { status: 400 },
      );
    }

    // 2. Confirm the server is configured.
    if (!WEB_APP_URL || !SHARED_TOKEN) {
      console.error(
        "[submit] Missing GOOGLE_SHEETS_WEB_APP_URL or GOOGLE_SHEETS_TOKEN env var.",
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

    // 3. Forward to the Apps Script Web App with the shared token.
    let upstream: Response;
    try {
      upstream = await fetch(WEB_APP_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: SHARED_TOKEN, answers }),
        cache: "no-store",
      });
    } catch (error) {
      console.error("[submit] Network error reaching Apps Script:", error);
      return NextResponse.json(
        {
          ok: false,
          error:
            "Could not reach the Google Apps Script Web App. Check that the URL is correct and the deployment is live.",
        },
        { status: 502 },
      );
    }

    // 4. Parse the upstream JSON. Apps Script Web Apps normally respond with
    //    HTTP 200 and a JSON body, even for business errors (e.g. duplicate).
    const raw = await upstream.text();
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      console.error("[submit] Unparseable upstream response:", raw);
      return NextResponse.json(
        {
          ok: false,
          error: `Google Apps Script returned an unparseable response (HTTP ${upstream.status}). Verify the Web App deployment.`,
          raw: raw.slice(0, 500),
        },
        { status: upstream.ok ? 500 : 502 },
      );
    }

    // 5. Return the upstream result to the client. The client decides what to
    //    do based on data.ok / data.status (e.g. "created" vs "duplicate").
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("[submit] Unexpected error:", error);
    return NextResponse.json(
      { ok: false, error: "Unexpected server error while submitting the form." },
      { status: 500 },
    );
  }
}

