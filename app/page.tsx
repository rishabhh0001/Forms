import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Forms Portal",
  description: "Registration forms for Business Conclave 2026 and other events.",
};

export default function LandingPage() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Montserrat:wght@400;500;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .lp-root {
          min-height: 100dvh;
          background:
            radial-gradient(ellipse 55% 65% at 8% 6%,  rgba(155,121,248,0.18), transparent 65%),
            radial-gradient(ellipse 45% 55% at 94% 92%, rgba(255,102,196,0.14), transparent 68%),
            #0B0514;
          color: #f0eaf8;
          font-family: 'Montserrat', sans-serif;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: clamp(32px, 6vw, 72px) clamp(18px, 5vw, 48px);
          position: relative;
          overflow: hidden;
        }

        .lp-root::before {
          content: '';
          position: absolute;
          inset: 0;
          pointer-events: none;
          opacity: 0.12;
          background-image:
            linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px);
          background-size: 64px 64px;
          -webkit-mask-image: radial-gradient(ellipse at 50% 40%, black, transparent 72%);
          mask-image: radial-gradient(ellipse at 50% 40%, black, transparent 72%);
        }

        .lp-orb {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
          animation: lpFloat 14s ease-in-out infinite;
        }
        .lp-orb-a {
          width: min(60vw, 560px); aspect-ratio: 1;
          left: -20%; top: -30%;
          background: radial-gradient(circle, rgba(155,121,248,0.15) 0%, transparent 70%);
          filter: blur(2px);
        }
        .lp-orb-b {
          width: min(55vw, 480px); aspect-ratio: 1;
          right: -24%; bottom: -34%;
          background: radial-gradient(circle, rgba(255,102,196,0.11) 0%, transparent 70%);
          filter: blur(2px);
          animation-delay: -7s;
        }
        @keyframes lpFloat { 50% { transform: translate3d(14px, 9px, 0) rotate(5deg); } }

        .lp-header {
          text-align: center;
          margin-bottom: clamp(32px, 6vw, 64px);
          position: relative;
          z-index: 1;
          width: 100%;
        }
        .lp-badge {
          display: inline-block;
          font-family: 'Cinzel', serif;
          font-size: clamp(8px, 2.2vw, 10px);
          letter-spacing: 0.25em;
          text-transform: uppercase;
          color: #ff66c4;
          border: 1px solid rgba(255,102,196,0.35);
          padding: 6px 16px;
          margin-bottom: clamp(16px, 3vw, 24px);
        }
        .lp-title {
          font-family: 'Cinzel', serif;
          font-size: clamp(32px, 8vw, 72px);
          font-weight: 700;
          line-height: 1;
          letter-spacing: -0.02em;
          color: #ffffff;
          margin-bottom: 14px;
        }
        .lp-title span {
          background: linear-gradient(135deg, #9b79f8 20%, #ff66c4 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .lp-subtitle {
          color: rgba(240,234,248,0.5);
          font-size: clamp(13px, 3.5vw, 15px);
          line-height: 1.6;
          max-width: 340px;
          margin: 0 auto;
        }

        .lp-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));
          gap: clamp(14px, 3vw, 20px);
          width: min(100%, 860px);
          position: relative;
          z-index: 1;
        }

        .lp-card {
          position: relative;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(45,17,71,0.4);
          padding: clamp(22px, 5vw, 40px);
          text-decoration: none;
          color: inherit;
          display: flex;
          flex-direction: column;
          gap: 12px;
          overflow: hidden;
          -webkit-backdrop-filter: blur(12px);
          backdrop-filter: blur(12px);
          cursor: pointer;
          /* smooth on iOS */
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
        }
        /* Hover only on pointer devices to avoid sticky states on touch */
        @media (hover: hover) {
          .lp-card {
            transition: border-color 0.25s, background 0.25s, transform 0.25s;
          }
          .lp-card::before {
            content: '';
            position: absolute;
            inset: 0;
            opacity: 0;
            background: linear-gradient(135deg, rgba(255,102,196,0.08), rgba(255,102,196,0.05));
            transition: opacity 0.25s;
            pointer-events: none;
          }
          .lp-card:hover { border-color: rgba(255,102,196,0.45); transform: translateY(-3px); }
          .lp-card:hover::before { opacity: 1; }
          .lp-card:hover .lp-card-cta { gap: 12px; }
        }
        @media (hover: none) {
          .lp-card:active { opacity: 0.85; }
        }

        .lp-card-featured {
          border-color: rgba(255,102,196,0.28);
          background: rgba(45,17,71,0.6);
        }
        .lp-card-featured::after {
          content: '';
          position: absolute;
          top: 0; right: 0;
          width: 100px; height: 100px;
          background: linear-gradient(225deg, rgba(255,102,196,0.1), transparent 60%);
          pointer-events: none;
        }

        .lp-card-tag {
          font-family: 'Cinzel', serif;
          font-size: clamp(8px, 2vw, 9px);
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: #ff66c4;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .lp-card-tag::before {
          content: '';
          display: inline-block;
          width: 18px;
          height: 1px;
          background: #ff66c4;
          flex-shrink: 0;
        }
        .lp-card-tag-muted { color: rgba(240,234,248,0.35); }
        .lp-card-tag-muted::before { background: rgba(240,234,248,0.35); }

        .lp-card-logo {
          font-family: 'Cinzel', serif;
          font-weight: 700;
          font-size: clamp(32px, 8vw, 56px);
          line-height: 0.9;
          letter-spacing: -0.03em;
          display: flex;
          align-items: baseline;
        }
        .lp-logo-left { color: #ffffff; }
        .lp-logo-slash {
          width: 2px;
          height: 2.1em;
          background: linear-gradient(to bottom, #9b79f8, #ff66c4);
          margin: 0 5px;
          align-self: center;
          flex-shrink: 0;
        }
        .lp-logo-right {
          background: linear-gradient(135deg, #9b79f8 20%, #ff66c4 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .lp-card-title {
          font-family: 'Cinzel', serif;
          font-size: clamp(13px, 3.5vw, 15px);
          font-weight: 600;
          letter-spacing: 0.05em;
          color: #ffffff;
        }
        .lp-card-desc {
          font-size: clamp(12px, 3vw, 13px);
          line-height: 1.65;
          color: rgba(240,234,248,0.5);
          flex: 1;
        }
        .lp-card-cta {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-family: 'Cinzel', serif;
          font-size: clamp(8px, 2vw, 10px);
          font-weight: 600;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #ff66c4;
          margin-top: 4px;
          /* ensure 44px minimum tap target vertically */
          min-height: 44px;
          align-items: center;
        }
        .lp-card-cta-test { color: rgba(240,234,248,0.45); }

        .lp-test-icon {
          width: 48px; height: 48px;
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 50%;
          display: grid;
          place-items: center;
          font-size: 20px;
          color: rgba(240,234,248,0.5);
        }

        .lp-footer {
          margin-top: clamp(32px, 5vw, 56px);
          font-family: 'Cinzel', serif;
          font-size: clamp(8px, 2vw, 9px);
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: rgba(240,234,248,0.2);
          position: relative;
          z-index: 1;
          text-align: center;
        }
        .lp-footer a {
          color: rgba(255,102,196,0.4);
          text-decoration: none;
          /* tap target */
          display: inline-block;
          padding: 8px 0;
        }

        /* ── Mobile: stack cards, tighten header ── */
        @media (max-width: 480px) {
          .lp-root { justify-content: flex-start; padding-top: clamp(48px, 12vw, 72px); }
          .lp-cards { grid-template-columns: 1fr; }
          .lp-card { gap: 10px; }
          .lp-card-logo { font-size: clamp(28px, 12vw, 44px); }
        }

        @media (prefers-reduced-motion: reduce) {
          .lp-orb { animation: none; }
        }
      `}</style>

      <div className="lp-root">
        <div className="lp-orb lp-orb-a" />
        <div className="lp-orb lp-orb-b" />

        <header className="lp-header">
          <div className="lp-badge">Forms Portal</div>
          <h1 className="lp-title">
            Live <span>Experiences</span>
          </h1>
          <p className="lp-subtitle">
            Select a form below to register or explore the experience.
          </p>
        </header>

        <div className="lp-cards">
          <Link href="/bcon" className="lp-card lp-card-featured" id="lp-bcon-card">
            <span className="lp-card-tag">Featured Event</span>
            <div className="lp-card-logo" aria-label="2026">
              <span className="lp-logo-left">20</span>
              <div className="lp-logo-slash" aria-hidden="true" />
              <span className="lp-logo-right">26</span>
            </div>
            <p className="lp-card-title">Business Conclave</p>
            <p className="lp-card-desc">
              The flagship registration form for Business Conclave 2026 — fully branded with animated transitions and live email verification.
            </p>
            <span className="lp-card-cta">Open Form ↗</span>
          </Link>

          <Link href="/test" className="lp-card" id="lp-test-card">
            <span className="lp-card-tag lp-card-tag-muted">Test</span>
            <div className="lp-test-icon" aria-hidden="true">⚡</div>
            <p className="lp-card-title">Dummy Form</p>
            <p className="lp-card-desc">
              A multi-step form for exploring the flow engine, branching logic, and Google Sheets integration.
            </p>
            <span className="lp-card-cta lp-card-cta-test">Open Form ↗</span>
          </Link>
        </div>

        <footer className="lp-footer">
          <a href="https://www.rishabhj.in" target="_blank" rel="noreferrer">Rishabh Joshi</a>
          {" — "}Forms Platform
        </footer>
      </div>
    </>
  );
}
