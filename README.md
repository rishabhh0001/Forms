# Forms Platform

A multi-form platform built with **Next.js**, **React 19**, **TypeScript**, and **Framer Motion**. Responses are written to **Google Sheets** via a Google Apps Script Web App.

## Routes

| Route | Description |
|---|---|
| `/` | Landing page — links to all active forms |
| `/bcon` | Business Conclave 2026 registration form |
| `/test` | Dummy form for testing the flow engine |

## Tech Stack

- **Next.js 16** (App Router)
- **React 19**
- **TypeScript**
- **Framer Motion** — page transitions, submit animation
- **Vanilla CSS** — no Tailwind, no CSS-in-JS
- **Google Apps Script** — Sheets backend

## Setup

### 1. Environment variables

Copy `.env.example` to `.env` and fill in the values:

```
GOOGLE_SHEETS_WEB_APP_URL=   # Your deployed Apps Script /exec URL
GOOGLE_SHEETS_TOKEN=         # Shared secret (set the same value in the Script Property)
NEXT_PUBLIC_BASE_URL=        # Your deployment URL (e.g. https://forms.rishabhj.in)
```

### 2. Google Apps Script

- Open your Google Sheet → **Extensions → Apps Script**
- Paste the contents of `google-apps-script/Code.gs`
- Deploy as a Web App: **Execute as: Me**, **Access: Anyone**
- Copy the `/exec` URL into `GOOGLE_SHEETS_WEB_APP_URL`
- Set a Script Property `GOOGLE_SHEETS_TOKEN` to any secret string and use the same value in `.env`

### 3. Run locally

```bash
npm install
npm run dev
```

### 4. Deploy

Push to GitHub and deploy on Vercel. Set the three env vars in the Vercel project settings.

## Sheet tabs

| `formId` | Sheet tab |
|---|---|
| `bcon` | BCon Responses |
| `test` | Test Responses |
| *(none)* | Responses |

## Notes

- Responses are **never overwritten** — the script scans for the first genuinely empty row before writing.
- Duplicate emails within the same sheet are rejected at submission time.
- Confirmation emails can be enabled by setting `SEND_CONFIRMATION_EMAIL: true` in `Code.gs`.
