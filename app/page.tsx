import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import localFont from 'next/font/local';
import { Spotlight } from "@/components/home/spotlight";
import "./home.css";

const borel = localFont({ src: '../public/Borel-Regular.ttf', variable: '--font-borel', display: 'swap' });

export const metadata: Metadata = {
  title: { absolute: "Forms — Register for Business Conclave 2026" },
  description:
    "Register for Business Conclave 2026 in under two minutes. Pick a pass, answer one question at a time, pay by UPI and get your confirmation by email.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Register for Business Conclave 2026",
    description: "Pick a pass, answer one question at a time, pay by UPI, get confirmed by email.",
    url: "/",
  },
};

const PASSES = [
  { name: "1 Pass", people: "Just you", price: 499, perHead: 499, save: 0 },
  { name: "2 Passes", people: "You + a friend", price: 899, perHead: 450, save: 99, featured: true },
  { name: "4 Passes", people: "Bring the squad", price: 1599, perHead: 400, save: 397 },
];

const STEPS = [
  { n: "01", title: "Pick your pass", body: "One, two or four attendees. Group passes cost less per person." },
  { n: "02", title: "Answer a few questions", body: "One question per screen. On group passes you add every attendee on the same screen." },
  { n: "03", title: "Pay by UPI", body: "Scan a QR code, pay, and upload the screenshot of your receipt." },
  { n: "04", title: "Get confirmed", body: "Each attendee gets their own confirmation email." },
];

const FEATURES = [
  { icon: "↵", title: "Keyboard-first", body: "Press Enter to move on and 1–3 to pick an option. You never have to touch the mouse." },
  { icon: "◷", title: "Saves as you go", body: "Close the tab halfway through. Your answers will still be there when you come back." },
  { icon: "⧉", title: "Group passes", body: "Add up to four attendees in one go, each with their own details." },
  { icon: "✉", title: "Instant confirmation", body: "A confirmation email goes out as soon as your registration is saved." },
  { icon: "▯", title: "Built for phones", body: "Large tap targets and no tiny fields. It works the same in any mobile browser." },
  { icon: "⛨", title: "Private by default", body: "Your details go straight to the organisers. There is no account to create and nothing is sold." },
];

const FAQS = [
  { q: "Do I need to create an account?", a: "No. Open the form, fill it in and you're done." },
  { q: "I closed the tab halfway. Do I start over?", a: "No. Your answers are saved in your browser. Reopen the form on the same device and pick up where you left off." },
  { q: "On a group pass, does everyone get an email?", a: "Yes. Each attendee gets a confirmation at the email address you entered for them." },
  { q: "I didn't get a confirmation email.", a: "Check your spam or promotions folder first. If it isn't there, email rj910@snu.edu.in with your payment screenshot and we'll sort it out." },
];

export default function LandingPage() {
  return (
    <div className={`hp ${borel.variable}`} id="top">
      <Spotlight />
      <div className="hp-bg" aria-hidden="true">
        <span className="hp-glow hp-glow-a" />
        <span className="hp-glow hp-glow-b" />
        <span className="hp-grid" />
        <span className="hp-noise" />
      </div>

      <nav className="hp-nav" aria-label="Main">
        <Link href="/" className="hp-brand" aria-label="Forms home">
          <Image src="/bcon.png" alt="Business Conclave Logo" width={28} height={28} style={{ objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
          <span className="hp-brand-name">Business Conclave</span>
        </Link>
        <div className="hp-nav-links">
          <a href="#passes">Passes</a>
          <a href="#how">How it works</a>
          <a href="#faq">FAQ</a>
        </div>
        <Link href="/bcon" className="hp-btn hp-btn-sm" id="hp-nav-register">
          Register <span aria-hidden="true">→</span>
        </Link>
      </nav>

      <main>
        {/* ── Hero ── */}
        <section className="hp-hero" aria-labelledby="hp-hero-title">
          <div className="hp-hero-copy">
            <Link href="/bcon" className="hp-pill" id="hp-pill">
              <span className="hp-pulse" aria-hidden="true" />
              Registrations open · Business Conclave 2026
              <span aria-hidden="true" className="hp-pill-arrow">→</span>
            </Link>
            <h1 id="hp-hero-title" className="hp-title">
              Register in under <em>two&nbsp;minutes.</em>
            </h1>
            <p className="hp-lede">
              Pick a pass, answer one question at a time, pay by UPI and get your confirmation by email.
              No sign-up and no long form.
            </p>
            <div className="hp-cta-row">
              <Link href="/bcon" className="hp-btn hp-btn-lg" id="hp-hero-register">
                <span className="hp-btn-shine" aria-hidden="true" />
                Register for Business Conclave <span aria-hidden="true">→</span>
              </Link>
              <a href="#passes" className="hp-btn-ghost" id="hp-hero-passes">See passes</a>
            </div>
            <ul className="hp-meta" aria-label="Highlights">
              <li>8 short questions</li>
              <li>Autosaves</li>
              <li>Works on any phone</li>
            </ul>
          </div>

          <div className="hp-hero-visual" aria-hidden="true">
            <div className="hp-mock" data-spot>
              <div className="hp-mock-bar">
                <span className="hp-dots"><i /><i /><i /></span>
                <span className="hp-mock-url">forms.rishabhj.in/bcon</span>
              </div>
              <div className="hp-mock-progress"><span /></div>
              <div className="hp-mock-body">
                <p className="hp-mock-eyebrow">Question 03</p>
                <p className="hp-mock-q">Email Address</p>
                <p className="hp-mock-help">We&apos;ll send your confirmation here.</p>
                <div className="hp-mock-input">
                  <span className="hp-type">you@snu.edu.in</span>
                  <span className="hp-caret" />
                </div>
                <div className="hp-mock-actions">
                  <span className="hp-mock-ok">OK ✓</span>
                  <span className="hp-mock-hint">press <kbd>Enter ↵</kbd></span>
                </div>
              </div>
            </div>
            <div className="hp-chip hp-chip-a">
              <span className="hp-chip-dot" /> Saved automatically
            </div>
            <div className="hp-chip hp-chip-b">
              <span className="hp-chip-check">✓</span>
              <span>
                <strong>Registration confirmed</strong>
                <small>Sent to you@snu.edu.in</small>
              </span>
            </div>
          </div>
        </section>

        {/* ── Featured event ── */}
        <section className="hp-section hp-reveal" aria-labelledby="hp-event-title">
          <Link href="/bcon" className="hp-event" id="hp-event-card" data-spot>
            <div className="hp-event-copy">
              <span className="hp-eyebrow">Featured event</span>
              <h2 id="hp-event-title" className="hp-h2">
                Business <em>Conclave</em> 2026
              </h2>
              <p className="hp-body">
                Speakers, panels and a full room. Send in your question for the speakers with your registration
                and it goes straight to the panel.
              </p>
              <span className="hp-link">
                Open registration <span aria-hidden="true">↗</span>
              </span>
            </div>
            <div className="hp-event-art">
              <span className="hp-event-ring" aria-hidden="true" />
              <span className="hp-event-ring hp-event-ring-2" aria-hidden="true" />
              <Image src="/bcon.png" alt="Business Conclave 2026 logo" width={220} height={120} className="hp-event-logo" priority />
            </div>
          </Link>
        </section>

        {/* ── Passes ── */}
        <section className="hp-section hp-reveal" id="passes" aria-labelledby="hp-passes-title">
          <header className="hp-section-head">
            <span className="hp-eyebrow">Passes</span>
            <h2 id="hp-passes-title" className="hp-h2">
              Bring friends and <em>pay less.</em>
            </h2>
          </header>
          <div className="hp-passes">
            {PASSES.map((p) => (
              <Link
                key={p.name}
                href="/bcon"
                className={`hp-pass ${p.featured ? "hp-pass-featured" : ""}`}
                id={`hp-pass-${p.price}`}
                data-spot
              >
                {p.featured ? <span className="hp-pass-badge">Best for pairs</span> : null}
                <span className="hp-pass-name">{p.name}</span>
                <span className="hp-pass-people">{p.people}</span>
                <span className="hp-pass-price">
                  <small>₹</small>
                  {p.price.toLocaleString("en-IN")}
                </span>
                <span className="hp-pass-per">
                  {p.save > 0 ? <>≈ ₹{p.perHead} per person · <b>save ₹{p.save}</b></> : <>Standard access</>}
                </span>
                <span className="hp-pass-cta">
                  Choose {p.name.toLowerCase()} <span aria-hidden="true">→</span>
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* ── How it works ── */}
        <section className="hp-section hp-reveal" id="how" aria-labelledby="hp-how-title">
          <header className="hp-section-head">
            <span className="hp-eyebrow">How it works</span>
            <h2 id="hp-how-title" className="hp-h2">
              Four steps. <em>That&apos;s it.</em>
            </h2>
          </header>
          <ol className="hp-steps">
            {STEPS.map((s) => (
              <li key={s.n} className="hp-step">
                <span className="hp-step-n">{s.n}</span>
                <h3 className="hp-step-title">{s.title}</h3>
                <p className="hp-body">{s.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ── Features ── */}
        <section className="hp-section hp-reveal" aria-labelledby="hp-feat-title">
          <header className="hp-section-head">
            <span className="hp-eyebrow">The form itself</span>
            <h2 id="hp-feat-title" className="hp-h2">
              Feels like a chat, <em>not paperwork.</em>
            </h2>
          </header>
          <div className="hp-features">
            {FEATURES.map((f) => (
              <article key={f.title} className="hp-feature" data-spot>
                <span className="hp-feature-icon" aria-hidden="true">{f.icon}</span>
                <h3 className="hp-feature-title">{f.title}</h3>
                <p className="hp-body">{f.body}</p>
              </article>
            ))}
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="hp-section hp-reveal hp-faq-wrap" id="faq" aria-labelledby="hp-faq-title">
          <header className="hp-section-head">
            <span className="hp-eyebrow">FAQ</span>
            <h2 id="hp-faq-title" className="hp-h2">
              Quick <em>answers.</em>
            </h2>
          </header>
          <div className="hp-faq">
            {FAQS.map((f, i) => (
              <details key={f.q} className="hp-faq-item" id={`hp-faq-${i + 1}`}>
                <summary>
                  {f.q}
                  <span className="hp-faq-icon" aria-hidden="true" />
                </summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* ── Final CTA ── */}
        <section className="hp-section hp-reveal" aria-labelledby="hp-final-title">
          <div className="hp-final" data-spot>
            <h2 id="hp-final-title" className="hp-h2">
              Your seat is <em>two minutes</em> away.
            </h2>
            <p className="hp-body">Registrations for Business Conclave 2026 are open now.</p>
            <Link href="/bcon" className="hp-btn hp-btn-lg" id="hp-final-register">
              <span className="hp-btn-shine" aria-hidden="true" />
              Register now <span aria-hidden="true">→</span>
            </Link>
          </div>
        </section>
      </main>

      <footer className="hp-footer">
        <span>
          Built by{" "}
          <a href="https://www.rishabhj.in" target="_blank" rel="noreferrer">Rishabh Joshi</a>
        </span>
        <a href="mailto:rj910@snu.edu.in">rj910@snu.edu.in</a>
        <a href="#top">Back to top ↑</a>
      </footer>
    </div>
  );
}
