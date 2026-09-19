import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DRIVE_WEB_APP_URL = process.env.GOOGLE_DRIVE_WEB_APP_URL;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { filename, mimeType, base64 } = body;

    if (!filename || !mimeType || !base64) {
      return NextResponse.json({ ok: false, error: "Missing required fields" }, { status: 400 });
    }

    if (!DRIVE_WEB_APP_URL) {
      console.error("[upload] Missing GOOGLE_DRIVE_WEB_APP_URL");
      return NextResponse.json(
        { ok: false, error: "Google Drive integration not configured" }, 
        { status: 500 }
      );
    }

    const upstream = await fetch(DRIVE_WEB_APP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename, mimeType, base64 }),
    });

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
