import { NextResponse } from "next/server";

/**
 * POST /api/submit
 *
 * Proxies form answers to the Google Apps Script Web App which writes them
 * into Google Sheets (one tab per form, controlled by formId).
 *
 * Body schema:
 *   {
 *     formId:  "bcon" | "test" | ""    (optional — used to pick the sheet tab)
 *     answers: { goal, name, email, … }
 *   }
 *
 * Env vars:
 *   GOOGLE_SHEETS_WEB_APP_URL   — deployed Apps Script /exec URL (required)
 *   GOOGLE_SHEETS_TOKEN         — shared secret matching the Apps Script (required)
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WEB_APP_URL  = process.env.GOOGLE_SHEETS_WEB_APP_URL;
const SHARED_TOKEN = process.env.GOOGLE_SHEETS_TOKEN;

export async function POST(request: Request) {
  try {
    // 1. Parse body.
    let body: { formId?: unknown; answers?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
    }

    const answers = body.answers;
    if (!answers || typeof answers !== "object" || Array.isArray(answers)) {
      return NextResponse.json(
        { ok: false, error: "Missing or invalid 'answers' object." },
        { status: 400 },
      );
    }

    // formId is optional; defaults to "" (maps to the default sheet tab).
    const formId = typeof body.formId === "string" ? body.formId.trim() : "";

    // 2. Server must be configured.
    if (!WEB_APP_URL || !SHARED_TOKEN) {
      console.error("[submit] Missing GOOGLE_SHEETS_WEB_APP_URL or GOOGLE_SHEETS_TOKEN env var.");
      return NextResponse.json(
        {
          ok: false,
          error: "Google Sheets integration is not configured on the server. Set GOOGLE_SHEETS_WEB_APP_URL and GOOGLE_SHEETS_TOKEN.",
        },
        { status: 500 },
      );
    }

    // 3. Forward to Apps Script, including formId so it writes to the right tab.
    let upstream: Response;
    try {
      upstream = await fetch(WEB_APP_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: SHARED_TOKEN, formId, answers }),
        cache: "no-store",
      });
    } catch (err) {
      console.error("[submit] Network error reaching Apps Script:", err);
      return NextResponse.json(
        { ok: false, error: "Could not reach the Google Apps Script Web App. Check that the URL is correct and the deployment is live." },
        { status: 502 },
      );
    }

    // 4. Parse upstream response.
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

    // 5. Surface any "collision" (safe-append refused to overwrite a cell).
    if (data.status === "collision") {
      console.error("[submit] Row collision detected — Apps Script refused to overwrite:", data);
    }

    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    console.error("[submit] Unexpected error:", err);
    return NextResponse.json(
      { ok: false, error: "Unexpected server error while submitting the form." },
      { status: 500 },
    );
  }
}
