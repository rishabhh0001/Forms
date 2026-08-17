# Forms Platform

A cinematic, motion-driven, multi-step form engine designed to elevate standard data collection into a premium user experience. Built with modern web technologies, this platform trades rigid surveys for fluid, conversational data intake.

## Project Philosophy

Forms are often the highest-friction point in any digital journey. The goal of this platform is to **remove friction through design**. By isolating one question per screen, employing hardware-accelerated transitions, and providing instant inline validation, the cognitive load on the user is drastically reduced.

### Key Pillars
1. **Focus**: One question at a time. No scrolling, no overwhelming fields.
2. **Motion**: Every interaction—from keystrokes to form submission—is choreographed using physical spring physics to feel organic and responsive.
3. **Resilience**: The frontend seamlessly debounces and queues network requests, while the backend leverages a custom Google Apps Script pipeline with "safe-append" collision detection to ensure zero data loss.
4. **Accessibility**: Full keyboard navigation support (e.g., `1-9` keys for multiple choice, `Enter` to continue, `Escape` to go back) and reduced-motion preferences respected at the OS level.

## Architecture

The platform is split into two distinct tiers:

### 1. The Frontend Application (Next.js 16)
- **Framework**: Built on React 19 and the Next.js App Router.
- **Styling**: 100% Vanilla CSS. We bypass heavy CSS-in-JS runtimes and utility-class frameworks to maintain absolute control over the cascade, CSS variables, and layout engines. 
- **Animation Engine**: `framer-motion` handles complex layout projections, exit animations, and sequenced timeline orchestrations (like the multi-stage submit sequence).
- **Edge Routing**: API Routes (`/api/submit`, `/api/check-email`) proxy requests from the client to the database, protecting API keys and preventing CORS overhead on the client.

### 2. The Database Layer (Google Sheets as a Backend)
- **Infrastructure**: We use Google Sheets as a lightweight, instantly-accessible CRM.
- **Middleware**: A custom Google Apps Script (`Code.gs`) acts as the REST endpoint.
- **Concurrency Handling**: Standard `appendRow()` operations are prone to race conditions and data overwrites under heavy concurrent load. This project uses a custom `findFirstEmptyRow_()` algorithm that scans the sheet programmatically, guaranteeing atomic writes into empty cells regardless of traffic spikes.
- **Multi-tenancy**: The script routes data into different tabs (e.g., `BCon Responses`, `Test Responses`) based on the `formId` passed from the frontend API.

## Design Systems & Theming

The platform supports multiple distinct brand identities operating from the same core engine.

### The Global Theme (Dummy Form)
- **Variables**: Driven by robust CSS variables (`--bg`, `--ink`, `--muted`).
- **Dark/Light Mode**: Full support for OS-level and user-toggled theme switching, dynamically recoloring the UI and swapping SVG filter blends.
- **Typography**: Geometric and highly legible combinations of *Montserrat*, *Playfair Display*, and *DM Mono*.

### The BCon 2026 Theme (Business Conclave)
- **Custom Branding**: Fully localized design system overriding the global theme specifically for the `/bcon` route.
- **Colorway**: Deep regal purple (`#2D1147`) combined with gold accents (`#cfaf89`) and a magenta/violet gradient (`#c664db`).
- **Typography**: Uses *Cinzel* for dramatic, cinematic headers and *Libre Baskerville* for elegant supporting text.
- **Logo Animation**: The "2026" logo features a custom SVG/Image composition with a pure CSS radiant glow behind it to ensure visibility and contrast against the dark background.

## The Flow Engine

The core logic of the form lives in `lib/flow.ts`. It is a deterministic state machine that manages:
- **Branching Logic**: The `nextStep` property can be a static string (next question ID) or a function that evaluates the current answer to dynamically alter the user's path.
- **State Management**: React state holds the answer map, history stack (for the 'Back' button), and the current active question index.
- **Real-time Validation**: Validates inputs instantly before allowing the user to proceed. For instance, the email field debounces checks against the backend to verify uniqueness before submission.

---

## License & Open Source Terms

This project is licensed under the **MIT License**.

The MIT License is a permissive free software license originating at the Massachusetts Institute of Technology (MIT). It puts very limited restriction on reuse and has, therefore, high license compatibility.

### Terms and Conditions

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

1. **Attribution**: The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software. You must give appropriate credit, provide a link to the license, and indicate if changes were made.
2. **Commercial Use**: You are free to use this software for commercial purposes. You can integrate this form engine into paid products, enterprise applications, or freelance client work.
3. **Modification**: You may alter, transform, or build upon this software. You are encouraged to fork the design system and build your own custom themes, flows, and animations.
4. **Distribution**: You may distribute the original or modified software.

### Disclaimer of Warranty

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

*By utilizing this codebase, you acknowledge the open-source philosophy of shared knowledge and are encouraged to contribute architectural improvements, accessibility enhancements, or performance optimizations back to the broader community.*
