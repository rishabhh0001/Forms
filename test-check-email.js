require("dotenv").config();
const fetch = require("node-fetch"); // or use native fetch if node >= 18

async function testCheckEmail() {
  const email = "test@example.com";
  const formId = "bcon";
  const WEB_APP_URL = process.env.GOOGLE_SHEETS_WEB_APP_URL;
  const SHARED_TOKEN = process.env.GOOGLE_SHEETS_TOKEN;

  console.log("URL:", WEB_APP_URL);
  
  try {
    const upstream = await fetch(WEB_APP_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: SHARED_TOKEN, action: "check", email, formId }),
    });

    const raw = await upstream.text();
    console.log("Status:", upstream.status);
    console.log("Response:", raw);
  } catch (err) {
    console.error("Error:", err);
  }
}

testCheckEmail();
