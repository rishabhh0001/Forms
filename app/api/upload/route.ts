import { NextResponse } from "next/server";
import { uploadRateLimit, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DRIVE_WEB_APP_URL = process.env.GOOGLE_DRIVE_WEB_APP_URL;

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    if (!uploadRateLimit.check(ip)) {
      return NextResponse.json({ ok: false, error: "Too many requests. Please try again later." }, { status: 429, headers: { "Retry-After": "60" } });
    }

    const body = await request.json();
    const { filename, mimeType, base64 } = body;

    if (!filename || !mimeType || !base64) {
      return NextResponse.json({ ok: false, error: "Missing required fields" }, { status: 400 });
    }

    if (typeof filename !== "string" || filename.length > 200 || !/^[a-zA-Z0-9_\-\.]+$/.test(filename)) {
      return NextResponse.json({ ok: false, error: "Invalid filename" }, { status: 400 });
    }

    if (typeof mimeType !== "string" || !["image/jpeg", "image/png", "image/webp"].includes(mimeType)) {
      return NextResponse.json({ ok: false, error: "Invalid or unsupported file type" }, { status: 400 });
    }

    if (typeof base64 !== "string" || base64.length > 5 * 1024 * 1024) { // ~5MB base64 limit
      return NextResponse.json({ ok: false, error: "File too large. Maximum size is ~3.5MB." }, { status: 413 });
    }

    if (!DRIVE_WEB_APP_URL) {
      console.error("[upload] Missing GOOGLE_DRIVE_WEB_APP_URL");
      return NextResponse.json(
        { ok: false, error: "Google Drive integration not configured" }, 
        { status: 500 }
      );
    }

    const maxRetries = 3;
    let upstream: Response | null = null;
    let lastErr: any;

    for (let i = 0; i < maxRetries; i++) {
      try {
        upstream = await fetch(DRIVE_WEB_APP_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename, mimeType, base64 }),
        });
        if (upstream.ok || upstream.status < 500) {
          break; // Stop retrying if successful or a client error (4xx) occurs
        }
      } catch (e: any) {
        lastErr = e;
        console.error(`[upload] Fetch attempt ${i + 1} failed:`, e.message);
        if (i < maxRetries - 1) {
          await new Promise(r => setTimeout(r, 1500 * (i + 1))); // Exponential backoff
        }
      }
    }

    if (!upstream) {
      throw new Error(`Failed to reach Google Drive after ${maxRetries} attempts. Last error: ${lastErr?.message}`);
    }

    const text = await upstream.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error("[upload] Failed to parse upstream response as JSON. Received text:", text.slice(0, 200));
      return NextResponse.json(
        { ok: false, error: "Received invalid response from Google Drive integration" }, 
        { status: 502 }
      );
    }

    if (!upstream.ok || !data.ok) {
      return NextResponse.json(
        { ok: false, error: data.error || "Failed to upload to Google Drive" }, 
        { status: 502 }
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    console.error("[upload] Unexpected error:", err);
    return NextResponse.json(
      { ok: false, error: "Unexpected server error while uploading the file." }, 
      { status: 500 }
    );
  }
}
