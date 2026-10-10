import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";

// Load environment variables from .env.local or .env
config({ path: ".env.local" });
config({ path: ".env" });

const WEB_APP_URL = process.env.GOOGLE_SHEETS_WEB_APP_URL;
const SHARED_TOKEN = process.env.GOOGLE_SHEETS_TOKEN;

async function syncToSheets() {
  if (!WEB_APP_URL || !SHARED_TOKEN) {
    console.error("Missing GOOGLE_SHEETS_WEB_APP_URL or GOOGLE_SHEETS_TOKEN");
    process.exit(1);
  }
  
  if (!process.env.DATABASE_URL) {
    console.error("Missing DATABASE_URL");
    process.exit(1);
  }

  console.log("Fetching all submissions from Neon Postgres...");
  const sql = neon(process.env.DATABASE_URL);
  const rows = await sql`
    SELECT * FROM form_submissions ORDER BY created_at ASC;
  `;

  console.log(`Found ${rows.length} submissions in Postgres.`);

  for (const row of rows) {
    const payload = {
      token: SHARED_TOKEN,
      formId: row.form_id,
      answers: row.payload,
    };

    console.log(`Syncing submission ID ${row.id} (${row.name})...`);

    try {
      const res = await fetch(WEB_APP_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.ok) {
        console.log(`✅ Success for ID ${row.id}`);
      } else if (data.status === "collision") {
        console.log(`⚠️  Already exists (collision) for ID ${row.id}`);
      } else {
        console.log(`❌ Failed for ID ${row.id}: ${data.error}`);
      }
    } catch (err: any) {
      console.error(`❌ Network error for ID ${row.id}:`, err.message);
    }

    // Wait slightly to not overload Google Apps Script
    await new Promise((r) => setTimeout(r, 1000));
  }

  console.log("Done!");
}

syncToSheets().catch(console.error);
