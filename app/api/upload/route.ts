import { NextResponse } from "next/server";
import { uploadRateLimit, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

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

    let upstream: Response | null = null;
    let data: any;

    try {
      upstream = await fetch(DRIVE_WEB_APP_URL, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Connection": "close" 
        },
        body: JSON.stringify({ filename, mimeType, base64 }),
      });
      
      const text = await upstream.text();
      
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error("[upload] Failed to parse JSON:", text.slice(0, 500));
        return NextResponse.json({ ok: false, error: "Invalid JSON from Google Drive" }, { status: 502 });
      }
    } catch (e: any) {
      console.error(`[upload] Fetch failed:`, e.message);
      return NextResponse.json({ ok: false, error: "Network error reaching Google Drive" }, { status: 502 });
    }

    if (!upstream || !data) {
      console.error("[upload] Failed to get valid response.");
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
