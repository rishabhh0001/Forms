# Offset Form — Information Form 2026

> A cinematic, one-question-at-a-time form experience built with **Next.js 16 (App Router)**, **React 19**, **TypeScript**, and **Framer Motion** — now wired to push every completed response straight into **Google Sheets** via a **Google Apps Script** Web App.

This document is the complete guide to the project: how it is structured, how the form logic works, how the motion system is built, how the Google Sheets pipeline is wired end-to-end, how to customize it, how to deploy it, and how to troubleshoot it.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Feature Set](#2-feature-set)
3. [Tech Stack](#3-tech-stack)
4. [Project Structure](#4-project-structure)
5. [The Form Experience](#5-the-form-experience)
   - 5.1 The Welcome Screen
   - 5.2 Question Flow & Branching
   - 5.3 The Completion Screen
6. [Form Logic Deep-Dive](#6-form-logic-deep-dive)
   - 6.1 The Question Schema
   - 6.2 Branching & `nextStep` Rules
   - 6.3 Validation Rules
   - 6.4 Answer Storage & Persistence
7. [Design System](#7-design-system)
   - 7.1 Typography
   - 7.2 Color Palette & CSS Variables
   - 7.3 Dark / Light Theme
   - 7.4 Layout & Stage
   - 7.5 Motion & Animation Architecture
   - 7.6 Reduced Motion & the Effects Toggle
8. [Google Sheets Integration](#8-google-sheets-integration)
   - 8.1 Architecture Overview
   - 8.2 Why a Proxy Route?
   - 8.3 Step-by-Step Setup
     - Step 1 — Create the Sheet
     - Step 2 — Open Apps Script
     - Step 3 — Paste the Apps Script
     - Step 4 — Configure the Token
     - Step 5 — Deploy as a Web App
     - Step 6 — Configure the Next.js Environment
   - 8.4 The `/api/submit` API Reference
   - 8.5 Apps Script Response Contract
   - 8.6 Duplicate-Email Protection
   - 8.7 Security Considerations
   - 8.8 Quotas, Rate Limits & Alternatives
   - 8.9 Real-Time Email Availability Check (`/api/check-email`)
9. [Environment Variables Reference](#9-environment-variables-reference)
10. [Customization Guide](#10-customization-guide)
    - 10.1 Changing Questions
    - 10.2 Changing Options
    - 10.3 Changing Branching
    - 10.4 Changing Validation
    - 10.5 Changing the Completion Copy
11. [Accessibility](#11-accessibility)
12. [Performance](#12-performance)
13. [Browser Support](#13-browser-support)
14. [Deployment](#14-deployment)
15. [Troubleshooting & FAQ](#15-troubleshooting--faq)
16. [Privacy & Data Handling](#16-privacy--data-handling)
17. [License & Credits](#17-license--credits)

---

## 1. Overview

**Offset Form** is a single-page, conversational form interface. Instead of showing every field at once, it asks **one question per screen**, animates between questions, remembers the user's place, and — after the last question — plays a "transmission" animation before showing a completion screen.

Every answer collected across the journey is stored in React state and in `localStorage` (so a refresh does not lose progress). On completion, the entire set of answers is serialized and POSTed to a Next.js API route, which forwards it to a Google Apps Script Web App that appends a **timestamped row** to a Google Sheet.

The form is intentionally a **dummy / test** checkout flow ("Business Conclave 2026"), but the Google Sheets pipeline is production-ready and can be dropped into any real form.

---

## 2. Feature Set

| Area | Details |
|---|---|
| **One-at-a-time UX** | A single question is rendered per step; answers animate in and out with cinematic motion. |
| **Branching logic** | The path depends on the first answer: **Digital order**, **Physical product**, or **Subscription** each take a different route. |
| **Smart progress bar** | Progress is computed from the actual journey length (`4` or `6` steps depending on the chosen branch). |
| **Validation** | Required questions are enforced; email fields are validated against a regex. Inline error messages appear under the input. |
| **Back navigation** | A Back button + `Esc` key return to previous questions; history is tracked as an index stack. |
| **Keyboard-first** | `Enter` starts the form and continues, `1–3` selects multiple-choice options, `Shift+Enter` creates a newline in the textarea, `Esc` goes back. |
| **Auto-save** | Answers are written to `localStorage` on every change and restored on reload. |
| **Dark / Light themes** | A header toggle flips the entire design system via a `data-theme` attribute on `<html>`. |
| **Reduced-motion support** | Respects `prefers-reduced-motion`; users can also force motion on/off with the ⚡ toggle. |
| **Cinematic submit** | A "Sending your answers" transition plays between the last question and the completion screen. |
| **Google Sheets sink** | Completed responses are POSTed to `/api/submit`, proxied to a Google Apps Script Web App, and appended to a Google Sheet with a timestamp. |
| **Duplicate protection** | The Apps Script rejects submissions whose normalized email already exists in the sheet — both in real time while typing (`/api/check-email`) and again at submit time. |
| **Token-protected endpoint** | The Apps Script only accepts payloads carrying the shared secret token. |

---

## 3. Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 16](https://nextjs.org/) (App Router, `"use client"` components) |
| UI library | [React 19](https://react.dev/) |
| Language | [TypeScript](https://www.typescriptlang.org/) (strict mode) |
| Animation | [Framer Motion](https://www.framer.com/motion/) 11 |
| Styling | Global CSS + CSS variables; Tailwind CSS configured but largely unused for this form |
| Fonts | Google Fonts: **Work Sans**, **Montserrat**, **Playfair Display**, **DM Mono** |
| Backend | Next.js Route Handler (`app/api/submit/route.ts`) |
| Data sink | Google Sheets + Google Apps Script (Web App deployment) |
| Hosting (recommended) | Vercel |

---

## 4. Project Structure

```
Forms/
├─ app/
│  ├─ api/
│  │  ├─ check-email/
│  │  │  └─ route.ts          # Real-time email availability proxy
│  │  └─ submit/
│  │     └─ route.ts          # POST proxy -> Google Apps Script
│  ├─ globals.css             # Design system, themes, animations
│  ├─ layout.tsx              # Root layout + metadata
│  ├─ motion-overrides.css    # Motion toggle + reduced-motion overrides
│  └─ page.tsx                # Renders <TypeformFlow />
├─ components/
│  └─ typeform-flow.tsx       # The entire form experience
├─ lib/
│  └─ flow.ts                 # Question schema, types, validation, branching
├─ .env.example               # Documented environment variables
├─ .env.local                 # Local secrets (gitignored)
├─ package.json
├─ tailwind.config.ts
├─ tsconfig.json
├─ next.config.mjs
└─ README.md                  # This document
```

> The Google Apps Script lives **inside your Google Sheet** (Extensions → Apps Script),
> not in this repository. The full, copy-paste-ready script is embedded in
> [Section 8.3 — Step 3](#step-3--paste-the-apps-script). This keeps the
> GitHub repo clean and only containing the Next.js app that Vercel builds.

---

## 5. The Form Experience

### 5.1 The Welcome Screen

The intro screen features:

- A rotating "sculpture" made of CSS ring elements and a pulsing core.
- The eyebrow label **WELCOME**, the headline **Business Conclave 2026**, and a short description.
- A 3D **Start form ↗** button with a rotating orbital ring and a layered shadow.
- A hint: **`Enter` to start**.

Pressing `Enter` anywhere on this screen also begins the form.

### 5.2 Question Flow & Branching

There are **seven questions** in the schema, but not all are shown to every user:

| # | id | Type | Prompt | Shown on path |
|---|---|---|---|---|
| 1 | `goal` | multipleChoice | What are you testing in this dummy checkout flow? | All paths |
| 2 | `capacity` | multipleChoice | How fast should the dummy delivery arrive? | Physical product only |
| 3 | `timeline` | multipleChoice | Any delivery instructions for the test order? | Physical product only |
| 4 | `cadence` | multipleChoice | How often should this dummy checkout repeat? | Subscription only |
| 5 | `name` | text | What name should appear on the dummy order? | All paths |
| 6 | `email` | email | Where should the confirmation email be sent? | All paths |
| 7 | `story` | textarea | Anything else we should test before completing? | All paths |

**Branch map:**

```
                    ┌─ Digital order ─┐
                    │                 │
    goal ───────────┼─ Physical ─> capacity ─> timeline ─┐
                    │                                     ├─> name ─> email ─> story ─> SUBMIT
                    └─ Subscription ─> cadence ──────────┘
```

- The **Digital order** path is the shortest: `goal → name → email → story` (**4 steps**).
- The **Physical product** path adds `capacity` and `timeline`: 6 steps total.
- The **Subscription** path adds `cadence`: 5 steps total.

The progress bar reflects the actual journey length: `currentStep / journeyLength × 100`.

### 5.3 The Completion Screen

After the last answer is submitted, a full-screen transition plays:

1. A 12-cell **conversion grid** expands.
2. The Submit button **flies from its on-screen position** to the center of the screen and shrinks away.
3. **Ten travel dots** spiral into a loading core.
4. The label **"Sending your answers"** appears.

Then the **Completion screen** renders with orbiting rings, a springy ✓ core, the headline **"We got it."**, and a **Start again ↗** button.

During that transition, the answers are being sent to Google Sheets in the background.

---

## 6. Form Logic Deep-Dive

All form logic lives in **`lib/flow.ts`**.

### 6.1 The Question Schema

Each question is typed as:

```ts
type Question = {
  id: QuestionId;              // "goal" | "capacity" | ... | "story"
  type: QuestionType;          // "text" | "multipleChoice" | "email" | "textarea"
  prompt: string;              // Big headline
  helper: string;              // Sub-text
  required?: boolean;
  options?: ChoiceOption[];    // For multipleChoice
  placeholder?: string;
  nextStep?: NextStepRule;     // Branching rule (see below)
  multiline?: boolean;         // Renders a <textarea>
  inputMode?: "text" | "email" | "numeric" | "tel" | "search" | "url";
};
```

Answers are stored as a flat map:

```ts
type AnswerMap = Record<string, string>; // e.g. { goal: "digital_order", name: "Alex" }
```

### 6.2 Branching & `nextStep` Rules

A question can declare its `nextStep` in three ways:

1. **A string** — always jump to that question:
   ```ts
   nextStep: "email",
   ```
2. **A function** — compute the next question from the current answer and all prior answers:
   ```ts
   nextStep: (value) => {
     if (value === "digital_order") return "name";
     if (value === "physical_product") return "capacity";
     if (value === "subscription") return "cadence";
     return null;
   },
   ```
3. **`null`** — the form ends here and submission begins:
   ```ts
   nextStep: null, // "story"
   ```

`resolveNextQuestionIndex(currentIndex, value, answers)` converts a resolved question id back into an index via the `questionIdToIndex` lookup, or returns `null` when the flow is complete.

### 6.3 Validation Rules

`validateQuestion(question, value)`:

- **Required** questions reject empty/whitespace-only input with:
  > _This question needs an answer before you can continue._
- **Email** questions reject values that fail `/^[^\s@]+@snu\.edu\.in$/i` (case-insensitive, `@snu.edu.in` only) with:
  > _Enter a valid email address ending with '@snu.edu.in'._
- Optional questions always pass.

Errors render under the input with the `.is-error` class (danger color) and are cleared as soon as the user types.

### 6.4 Answer Storage & Persistence

- Every keystroke / selection calls `setAnswers`, which stores the answer under the question id.
- A `useEffect` mirrors `answers` into `localStorage` under the key `typeform-flow-demo`.
- On mount, saved answers are restored (including the active theme and the motion preference).
- Starting fresh (`begin()`) or returning to welcome (`returnToWelcome()`) clears stored answers.

---

## 7. Design System

### 7.1 Typography

Four font families are loaded from Google Fonts:

| Font | Usage |
|---|---|
| **Work Sans** | Body copy, default UI font |
| **Playfair Display** | Headlines (`h1`) — elegant serif with negative letter-spacing |
| **Montserrat** | Text inputs (`500`, slightly condensed) |
| **DM Mono** | Micro-labels, buttons, eyebrow text, wordmark, footer — monospaced, uppercase, letter-spaced |

### 7.2 Color Palette & CSS Variables

All colors are defined as CSS custom properties on `:root` (dark theme) and overridden under `:root[data-theme="light"]`:

```css
:root {
  --bg: #080808;              /* page background */
  --ink: #f6f5f0;             /* primary text / accents */
  --muted: #9d9c96;           /* secondary text */
  --faint: #20201e;           /* hairlines, grid lines */
  --panel: rgba(255,255,255,.025);
  --line: rgba(255,255,255,.14);
  --inverse: #111;            /* text color on "ink" buttons */
  --danger: #ff8578;          /* validation errors */
}
```

The light theme inverts these values (`--bg: #f6f5f0`, `--ink: #11110f`, …). Changing themes is instant because the component toggles `document.documentElement.dataset.theme`.

### 7.3 Dark / Light Theme

The **◐ / ◑** toggle in the header:

- Sets `data-theme` on `<html>` (drives all CSS variables).
- Persists the choice in `localStorage` under `typeform-flow-theme`.
- Restores it on reload.

`color-scheme` is also flipped so native form controls and scrollbars match the theme.

### 7.4 Layout & Stage

- The page is a **100dvh grid** centered on the "stage".
- Behind the stage: a faint **grid pattern** (`--faint` lines with a radial mask), **concentric rings**, and two slowly **floating orbs**.
- The stage is a bordered panel with an inner inset hairline, a header, a 2px progress line, a centered content area, and a footer.
- Responsive breakpoints collapse the shell on small screens (`≤640px`) and compress vertical rhythm on short screens (`≤720px` and `≤540px`).

### 7.5 Motion & Animation Architecture

Framer Motion drives every transition:

- **Page transitions** — each question uses a `slide` variant (blur + vertical slide) with a custom direction (`1` forward, `-1` backward). `AnimatePresence mode="wait"` swaps screens cleanly.
- **Choice entrances** — options fade/slide in with staggered delays (`0.14 + index × 0.07`).
- **Hover / tap** — choices slide `x: 4` on hover; the start button lifts in 3D (`rotateX`, `rotateY`, `scale`).
- **Progress bar** — width animates with an ease-out cubic-bezier.
- **Submit transition** — multi-stage choreography (grid, flying button, spiral dots, pulsing core) described in §5.3.
- **Completion** — spring physics (`stiffness: 120, damping: 15`) with a keyframed core pop.

### 7.6 Reduced Motion & the Effects Toggle

- The component reads `useReducedMotion()` from Framer Motion.
- When the OS prefers reduced motion (and the user hasn't forced it on), all durations collapse to `0` and infinite animations are disabled.
- A **⚡ Effects Enabled / — Effects Disabled** toggle lets users override the OS setting. It adds/removes a `force-motion` class on `<html>` and persists the preference.
- `app/motion-overrides.css` re-enables animations under `prefers-reduced-motion` when `.force-motion` is present.

---

## 8. Google Sheets Integration

This is the heart of the "send responses to Google Sheets" feature. It involves three moving parts:

1. **Client** (`components/typeform-flow.tsx`) — POSTs the final answers to the app's own API.
2. **Proxy** (`app/api/submit/route.ts`) — a Next.js Route Handler that forwards the payload to Google.
3. **Collector** (Google Apps Script inside your Sheet) — a Web App that validates the token, checks for duplicate emails, and appends a row. The full copy-paste-ready script is embedded in [Step 3](#step-3--paste-the-apps-script) below.

### 8.1 Architecture Overview

```
┌─────────────┐   POST /api/submit   ┌────────────────────┐   HTTPS POST    ┌─────────────────────────┐
│   Browser   │ ───────────────────> │ Next.js Route      │ ──────────────> │ Google Apps Script Web  │
│ (component) │                      │ Handler (proxy)    │                 │ App (doPost)            │
└─────────────┘                      └────────────────────┘                 └────────────┬────────────┘
                                     • reads env vars                                  │ appendRow
                                     • injects the token                              ▼
                                     • never exposes secrets               ┌─────────────────────────┐
                                                                           │      Google Sheet       │
                                                                           │ (timestamped rows)      │
                                                                           └─────────────────────────┘
```

### 8.2 Why a Proxy Route?

Google Apps Script Web Apps **cannot send CORS headers**. A browser-side `fetch()` directly to the `/exec` URL would be blocked by the browser's same-origin policy.

The Next.js proxy solves this:

- The browser calls `/api/submit` on the **same origin** (no CORS).
- The server performs the cross-origin call to Google (servers are not subject to CORS).
- The shared secret token lives **only on the server** (in `.env.local`), so it never ships to the client bundle. This prevents visitors from forging or spamming submissions.

### 8.3 Step-by-Step Setup

#### Step 1 — Create the Sheet

1. Go to [sheets.new](https://sheets.new).
2. Rename the default tab to **`Responses`** (or set `SHEET_NAME` in `Code.gs` to your tab name).
3. Optionally add a header row — the script creates it automatically if the sheet is empty:

   ```
   timestamp | goal | capacity | timeline | cadence | name | email | story
   ```

#### Step 2 — Open Apps Script

Inside the sheet: **Extensions → Apps Script**. A new editor tab opens. Delete the default `function myFunction() {}`.

#### Step 3 — Add `Code.gs` & the Manifest

Paste the entire contents of **`google-apps-script/Code.gs`** into the editor.

Then open **Project Settings → Show appsscript.json** (the manifest) and make sure it matches **`google-apps-script/appsscript.json`** — specifically:

```json
{
  "timeZone": "Asia/Kolkata",
  "webapp": {
    "executeAs": "USER_DEPLOYING",
    "access": "ANYONE_ANONYMOUS"
  }
}
```

- `executeAs: "USER_DEPLOYING"` — writes happen under **your** Google account, so you do not need to share the sheet with anonymous users.
- `access: "ANYONE_ANONYMOUS"` — the Web App URL can be called without Google sign-in (required because the Next.js server is not signed in).

#### Step 4 — Configure the Token

The Apps Script looks for the shared secret in two places, in this order:

1. A **Script Property** named `GOOGLE_SHEETS_TOKEN`:
   **Project Settings → Script properties → Add property** with key `GOOGLE_SHEETS_TOKEN` and your secret as the value.
2. The fallback `CONFIG.TOKEN` constant in `Code.gs`.

> **Security note:** Prefer the Script Property. Hard-coding a secret in `Code.gs` means it lives in source control.

Generate a strong secret with:

```bash
openssl rand -hex 32
```

#### Step 5 — Deploy as a Web App

1. In the Apps Script editor: **Deploy → New deployment**.
2. Select type **Web app**.
3. Give it a description (e.g. "Offset form collector").
4. **Execute as:** *Me*.
5. **Who has access:** *Anyone*.
6. Click **Deploy** and authorize the requested scopes (Spreadsheet access, etc.).
7. Copy the **Web app URL** — it ends in `/exec`:

   ```
   https://script.google.com/macros/s/AKfycb<...>/exec
   ```

> If you redeploy later, the URL stays the same unless you create a *new* deployment. Test it in the browser — a `GET` should return `{"ok":true,"status":"ok",...}`.

#### Step 6 — Configure the Next.js Environment

Copy `.env.example` to `.env.local` and fill it in:

```bash
cp .env.example .env.local
```

```env
GOOGLE_SHEETS_WEB_APP_URL=https://script.google.com/macros/s/AKfycb<...>/exec
GOOGLE_SHEETS_TOKEN=<same secret as the Script Property>
```

`.env.local` is gitignored, so secrets never reach the repository.

### 8.4 The `/api/submit` API Reference

**Endpoint:** `POST /api/submit`

**Request body:**

```json
{
  "answers": {
    "goal": "physical_product",
    "capacity": "express",
    "timeline": "door",
    "name": "Alex Rivera",
    "email": "alex@studio.com",
    "story": "Test notes..."
  }
}
```

**Responses:**

| Status | Body | Meaning |
|---|---|---|
| `200` | `{ "ok": true, "status": "created", "row": 42, ... }` | Saved |
| `200` | `{ "ok": false, "status": "duplicate", "error": "This email has already submitted a response." }` | Email already in sheet |
| `200` | `{ "ok": false, "status": "forbidden", "error": "Invalid or missing token." }` | Token mismatch |
| `400` | `{ "ok": false, "error": "Missing or invalid 'answers' object." }` | Bad payload |
| `500` | `{ "ok": false, "error": "Google Sheets integration is not configured..." }` | Missing env vars |
| `502` | `{ "ok": false, "error": "Could not reach the Google Apps Script Web App..." }` | Network/deployment failure |

The route is `dynamic = "force-dynamic"` and runs on the Node.js runtime so it can read server-only env vars.

### 8.5 Apps Script Response Contract

`Code.gs` returns JSON in a consistent shape:

}
```

- `executeAs: "USER_DEPLOYING"` — writes happen under **your** Google account, so you do not need to share the sheet with anonymous users.
- `access: "ANYONE_ANONYMOUS"` — the Web App URL can be called without Google sign-in (required because the Next.js server is not signed in).
```json
{
  "ok": true,
  "status": "created",
  "error": null,
  "row": 42,
  "message": "Response saved to Google Sheets."
}
```

Flow inside `doPost(e)`:

1. Parse the JSON body.
2. Compare `payload.token` with the Script Property / fallback token.
3. Validate that `answers.email` exists (normalized to lowercase).
4. Get (or create) the `Responses` sheet and ensure the header row.
5. **Dedupe** — scan the email column; if the email already exists, return `status: "duplicate"` and do **not** append.
6. Append a row: `[new Date(), goal, capacity, timeline, cadence, name, email, story]`.
7. Return the success payload with the appended row number.

`doGet()` returns a simple health-check JSON so you can verify the deployment is live from a browser.

### 8.6 Duplicate-Email Protection

The requirement is that **the same email cannot submit twice**. `findEmailRow_(sheet, email)`:

- Reads every value in the email column (column `7` = `G`), from row 2 to the last row.
- Normalizes both sides with `String(...).trim().toLowerCase()`.
- Returns the matching row number, or `-1`.

If a match is found, `doPost` immediately returns `{ ok: false, status: "duplicate", ... }` and nothing is written. The Next.js proxy passes this through unchanged; the client logs a warning (the completion screen still shows, so the user experience is unaffected).

**Real-time availability check.** While the user is on the email question, the client debounces keystrokes (450ms) and POSTs to `/api/check-email`, which forwards `{ token, action: "check", email }` to the same Web App. The Apps Script returns `{ ok: true, exists: false }` when the address is free, or `{ ok: true, exists: true }` when it has already registered. The UI shows "Checking email availability…", "Email is available ✓", or "This email has already been used for a registration." and blocks advancing if the email is taken. The proxy fails open (network errors degrade to no status), so the form is never blocked by a failed lookup. The `google-apps-script/Code.gs` file in this repo already implements `action: "check"` — paste it into your Apps Script editor and redeploy to enable the lookup.

### 8.7 Security Considerations

| Concern | Mitigation |
|---|---|
| Token exposure | Token lives in `.env.local` (server-only) and in a Script Property; never in the client bundle. |
| Token brute-force | Use a long random hex secret (e.g. `openssl rand -hex 32`). |
| Unauthorized writes to the sheet | The sheet is never shared publicly; writes happen as the script owner (`executeAs: USER_DEPLOYING`). |
| Spam / bots | The token gate blocks unauthenticated POSTs. For stronger protection, add reCAPTCHA or honeypot fields and check them in `Code.gs`. |
| CORS | Direct browser→Apps Script calls are impossible (no CORS headers); all traffic flows through the same-origin proxy. |
| Rate limits | The proxy is stateless; adding simple in-memory rate limiting or a third-party bot guard is recommended for public deployments. |
| Secret in source control | `Code.gs` falls back to `CONFIG.TOKEN` only if the Script Property is missing. Keep `CONFIG.TOKEN` empty. |

### 8.8 Quotas, Rate Limits & Alternatives

- **Apps Script quotas** (consumer Google accounts): ~20,000 URL fetch calls/day, ~30 script executions/minute per user. For a small form, this is plenty.
- **Sheet quotas**: 10M cells per spreadsheet; each submission is a single row append.
- **Alternatives** if you outgrow the Apps Script route:
  - **Zapier / Make** — connect the `/api/submit` webhook (or the Apps Script URL) to a Google Sheets step with drag-and-drop logic.
  - **Sheet.best** — a hosted service that turns a Google Sheet into a REST API (supports `POST` inserts and CORS) — remove the proxy and call it directly if you accept a third-party dependency.
  - **n8n** — self-hosted workflow automation that can watch a webhook and append to Sheets.
  - **Google Forms** — if you do not need the custom UI, Google Forms writes to a sheet natively (but without the cinematic experience).

### 8.9 Real-Time Email Availability Check (`/api/check-email`)

**Endpoint:** `POST /api/check-email`

Fired from the email question while the user types (debounced 450ms). The client only queries when the value already passes the `@snu.edu.in` format check.

**Request body:**

```json
{
  "email": "rj910@snu.edu.in"
}
```

**Responses:**

| Status | Body | Meaning |
|---|---|---|
| `200` | `{ "ok": true, "exists": false }` | Email is available |
| `200` | `{ "ok": true, "exists": true }` | Email already registered |
| `400` | `{ "ok": false, "error": "Missing or invalid 'email' value." }` | Bad payload / wrong format |
| `500` | `{ "ok": false, "error": "Google Sheets integration is not configured..." }` | Missing env vars |
| `502` | `{ "ok": false, "error": "Could not reach the Google Apps Script Web App..." }` | Network/deployment failure |

The route is `dynamic = "force-dynamic"` and runs on the Node.js runtime, same as `/api/submit`. Like the submit proxy, it keeps the shared token server-side and forwards `{ token, action: "check", email }` to the Apps Script.

> **Important:** The real-time lookup requires the new `google-apps-script/Code.gs` (which handles `action: "check"`). If your deployed Web App is still running the old script without that branch, the proxy will receive a fallback response and the client will simply stay in the "idle" state — the form still works, it just cannot show availability.

---

## 9. Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `GOOGLE_SHEETS_WEB_APP_URL` | Yes (to persist) | The deployed Apps Script Web App URL ending in `/exec`. |
| `GOOGLE_SHEETS_TOKEN` | Yes (to persist) | Shared secret. Must match the Apps Script Script Property `GOOGLE_SHEETS_TOKEN`. |

If either is missing, `/api/submit` returns `500` with a clear message, and the client logs a warning — the form still completes locally so the UI never breaks.

---

## 10. Customization Guide

### 10.1 Changing Questions

Edit the `questionSchema` array in **`lib/flow.ts`**. Each entry needs a unique `id` (add new ids to the `QuestionId` union), a `prompt`, a `helper`, a `type`, and usually a `nextStep`.

Example — add a phone number question between email and story:

```ts
{
  id: "phone",
  prompt: "What is the best number to reach you?",
  helper: "Used only for follow-up on your order.",
  type: "text",
  required: true,
  placeholder: "+1 (555) 000-0000",
  inputMode: "tel",
  nextStep: "story",
},
```

Then change `email`'s `nextStep` from `"story"` to `"phone"`.

> If you add questions, also add a matching column in the Google Sheet header **and** map the new answer in the `row` array inside `Code.gs` (`answers.phone || ""`).

### 10.2 Changing Options

Options are `{ label, description, value }` objects. The label is the bold title, description the muted sub-line, and `value` is what gets stored in the answer map and sent to the sheet.

### 10.3 Changing Branching

Edit the `nextStep` function of the `goal` question, or any other `nextStep` field. The signature is `(value: string, answers: AnswerMap) => QuestionId | null`. Return `null` to end the flow.

### 10.4 Changing Validation

Edit `validateQuestion` in **`lib/flow.ts`**. You can add custom rules per `question.id`, stricter email patterns, min/max lengths, etc.

### 10.5 Changing the Completion Copy

The completion screen lives in the `Completion` component inside **`components/typeform-flow.tsx`**. Edit the `<p>` copy, the eyebrow, or the headline. The intro copy is in the `Intro` component; the wordmark and footer are in the main return block.

---

## 11. Accessibility

- **Focus management** — the input is focused automatically on each new question (`inputRef` + a 330ms delay for the transition).
- **Keyboard support** — the entire flow is operable with `Enter`, `1–3`, `Shift+Enter`, and `Esc`.
- **ARIA** — the stage has `aria-label="Interactive order form"`; inputs carry `aria-label` matching their prompt; toggle buttons use `aria-pressed` / `aria-label`; the progress bar is `aria-hidden`.
- **Reduced motion** — `prefers-reduced-motion` collapses durations to 0 and disables loops; the ⚡ toggle lets users override.
- **Color contrast** — muted text and hairlines are tuned per theme; validation errors use a distinct danger color in both themes.
- **Focus visibility** — `button:focus-visible`, `input:focus-visible`, and `textarea:focus-visible` draw a 2px ink outline with a 4px offset.

---

## 12. Performance

- **Single client component** — no heavy per-question chunking is needed for a small form; the bundle is tiny.
- **Local first** — answers persist to `localStorage` synchronously; submission is async and non-blocking.
- **Fire-and-forget submission** — the Google Sheets call never blocks the completion animation; failures degrade to console warnings.
- **CSS-driven decoration** — orbs, rings, and grids are pure CSS (no images).
- **Reduced-motion shortcuts** — when motion is disabled, all animation timers collapse, including the 2.2s submit transition (drops to 0).

---

## 13. Browser Support

Targets modern evergreen browsers:

- Chrome / Edge (latest 2)
- Firefox (latest 2)
- Safari (latest 2)

The code relies on modern CSS (`color-mix`, `mask-image`, `dvh`, `aspect-ratio`) and modern JS (optional chaining, `Array.prototype.at`, logical assignment). Older browsers will still render the form but may lose some decorative effects.

---

## 14. Deployment

### Vercel (recommended)

1. Push the repository to GitHub.
2. Import the repo in Vercel.
3. Use the default Next.js settings.
4. In **Project → Settings → Environment Variables**, add `GOOGLE_SHEETS_WEB_APP_URL` and `GOOGLE_SHEETS_TOKEN` (and their production/preview scopes as needed).
5. Deploy.

### Other platforms

- Any Node.js host that supports Next.js Route Handlers works (e.g. Railway, Render, Fly.io). Ensure env vars are set there too.
- Static export (`next export`) will **not** work for the submission feature, because `/api/submit` is a server route — keep the deployment dynamic.

---

## 15. Troubleshooting & FAQ

**Q: Nothing appears in the sheet after submitting.**
Check, in order: (1) the browser console for a `[sheets]` warning; (2) that `.env.local` exists with both values; (3) that the Apps Script is deployed (not a draft) and the URL ends in `/exec`; (4) that the Script Property token matches; (5) that the sheet tab is named `Responses` (or matches `SHEET_NAME`); (6) the Apps Script **Executions** log for errors.

**Q: The proxy returns 502 "Could not reach the Google Apps Script Web App."**
The `/exec` URL is wrong, the deployment was deleted, or the service is temporarily unavailable. Re-deploy and re-copy the URL.

**Q: I get `"status":"forbidden"`.**
The token in `.env.local` does not match the Script Property (or `CONFIG.TOKEN`) on the Apps Script side.

**Q: `"status":"duplicate"` — but I want to allow resubmissions.**
Remove the `findEmailRow_` check (and the duplicate branch) in `Code.gs`, then redeploy.

**Q: CORS errors in the browser.**
This should not happen — the browser only ever talks to `/api/submit` (same origin). If you see CORS errors, something else is calling the `/exec` URL directly from the browser.

**Q: The form works locally but not in production.**
You probably forgot to set the env vars in the production host (Vercel → Settings → Environment Variables).

**Q: Can I see submissions in real time?**
Yes — the row is appended the moment the script runs. Open the sheet; new rows appear within seconds. You can also set up a **Google Sheets onEdit trigger** in Apps Script to send email notifications on new submissions.

**Q: How do I add an email notification on new rows?**
In Apps Script, add a function and an installable `onChange` / `onEdit` trigger that reads the last row and calls `MailApp.sendEmail(...)`.

**Q: Why does the Apps Script take a few seconds?**
Cold starts and authorization checks add latency; typical sub-second after warm-up. The UI hides this behind the submit animation.

---

## 16. Privacy & Data Handling

- Submitted answers (name, email, free-text notes) are stored in **your Google Sheet**, owned by the account that deployed the Apps Script.
- The shared token is the only credential; it is stored in server env vars and a Script Property.
- No analytics or third-party tracking is added by the form itself.
- If you make the form public, add a privacy notice and, where required by law (e.g. GDPR), a consent checkbox and a data-retention policy. The duplicate-email check keeps only one row per email.

---

## 17. License & Credits

Built by **Rishabh** ([rishabhj.in](https://www.rishabhj.in)). Icons and fonts remain property of their respective owners. The form is a demo concept ("Business Conclave 2026") and the submission pipeline is MIT-style reusable — adapt it freely for your own projects.

