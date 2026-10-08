import { NextResponse } from "next/server";
import { submitRateLimit, getClientIp } from "@/lib/rate-limit";

/**
 * POST /api/submit
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const WEB_APP_URL = process.env.GOOGLE_SHEETS_WEB_APP_URL;
const SHARED_TOKEN = process.env.GOOGLE_SHEETS_TOKEN;

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    if (!submitRateLimit.check(ip)) {
      return NextResponse.json({ ok: false, error: "Too many requests. Please try again later." }, { status: 429, headers: { "Retry-After": "60" } });
    }

    let body: { formId?: unknown; answers?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
    }

    const answers = body.answers;
    if (!answers || typeof answers !== "object" || Array.isArray(answers)) {
      return NextResponse.json({ ok: false, error: "Missing or invalid 'answers' object." }, { status: 400 });
    }

    // Limit number of answers to prevent memory exhaustion
    if (Object.keys(answers).length > 50) {
      return NextResponse.json({ ok: false, error: "Too many answer fields." }, { status: 400 });
    }

    // Validate each answer string length
    for (const [key, val] of Object.entries(answers)) {
      if (typeof val !== "string" || val.length > 5000) {
        return NextResponse.json({ ok: false, error: `Invalid or excessively long value for field ${key}` }, { status: 400 });
      }
    }

    const formId = typeof body.formId === "string" ? body.formId.trim().slice(0, 50) : "";

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
    const maxRetries = 5;
    let upstream: Response | null = null;
    let lastErr: any;
    let data: Record<string, unknown> | null = null;

    for (let i = 0; i < maxRetries; i++) {
      try {
        upstream = await fetch(WEB_APP_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: SHARED_TOKEN, formId, answers }),
          cache: "no-store",
        });

        const raw = await upstream.text();

        try {
          data = JSON.parse(raw) as Record<string, unknown>;
        } catch (err) {
          throw new Error(`Failed to parse response as JSON. Status: ${upstream.status}, Text: ${raw.slice(0, 100)}`);
        }

        if (upstream.ok || upstream.status < 500) {
          break;
        } else {
          throw new Error(`Upstream returned ${upstream.status}`);
        }
      } catch (err: any) {
        lastErr = err;
        console.error(`[submit] Network error reaching Apps Script on attempt ${i + 1}:`, err.message);
        if (i < maxRetries - 1) {
          const jitter = Math.random() * 1000;
          await new Promise(r => setTimeout(r, 1500 * (i + 1) + jitter));
        }
      }
    }

    if (!upstream || !data) {
      console.error("[submit] Failed to get valid response after retries. Last error:", lastErr?.message);
      return NextResponse.json(
        { ok: false, error: `Could not reach the Google Apps Script Web App after ${maxRetries} attempts. Verify the Web App deployment.` },
        { status: 502 },
      );
    }

    // 5. Surface any "collision" (safe-append refused to overwrite a cell).
    if (data.status === "collision") {
      console.error("[submit] Row collision detected — Apps Script refused to overwrite:", data);
    }

    if (data.ok === false) {
      console.error("[submit] Upstream reported an error:", data.error);
      return NextResponse.json(data, { status: 400 });
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
