import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Forms Portal",
  description: "Access and test form experiences built for different events and workflows.",
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
            radial-gradient(ellipse 55% 65% at 8% 6%,  rgba(186,39,206,0.18), transparent 65%),
            radial-gradient(ellipse 45% 55% at 94% 92%, rgba(198,100,219,0.14), transparent 68%),
            #0e0718;
          color: #f0eaf8;
          font-family: 'Montserrat', sans-serif;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: clamp(24px, 5vw, 64px) clamp(20px, 4vw, 48px);
          position: relative;
          overflow: hidden;
        }

        /* Grid overlay */
        .lp-root::before {
          content: '';
          position: absolute;
          inset: 0;
          pointer-events: none;
          opacity: 0.14;
          background-image:
            linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px);
          background-size: 72px 72px;
          -webkit-mask-image: radial-gradient(ellipse at 50% 40%, black, transparent 72%);
          mask-image: radial-gradient(ellipse at 50% 40%, black, transparent 72%);
        }

        /* Orb accents */
        .lp-orb {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
          animation: lpFloat 14s ease-in-out infinite;
        }
        .lp-orb-a {
          width: min(50vw, 560px); aspect-ratio: 1;
          left: -18%; top: -28%;
          background: radial-gradient(circle, rgba(186,39,206,0.13) 0%, transparent 70%);
          filter: blur(2px);
        }
        .lp-orb-b {
          width: min(42vw, 480px); aspect-ratio: 1;
          right: -22%; bottom: -32%;
          background: radial-gradient(circle, rgba(198,100,219,0.1) 0%, transparent 70%);
          filter: blur(2px);
          animation-delay: -7s;
        }
        @keyframes lpFloat { 50% { transform: translate3d(16px, 10px, 0) rotate(6deg); } }

        /* Header */
        .lp-header {
          text-align: center;
          margin-bottom: clamp(40px, 7vw, 72px);
          position: relative;
          z-index: 1;
        }
        .lp-badge {
          display: inline-block;
          font-family: 'Cinzel', serif;
          font-size: 10px;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          color: #cfaf89;
          border: 1px solid rgba(207,175,137,0.35);
          padding: 6px 16px;
          margin-bottom: 24px;
        }
        .lp-title {
          font-family: 'Cinzel', serif;
          font-size: clamp(36px, 6vw, 72px);
          font-weight: 700;
          line-height: 1;
          letter-spacing: -0.02em;
          color: #ffffff;
          margin-bottom: 16px;
        }
        .lp-title span {
          background: linear-gradient(135deg, #c664db 20%, #cfaf89 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .lp-subtitle {
          color: rgba(240,234,248,0.5);
          font-size: 15px;
          line-height: 1.6;
          max-width: 380px;
          margin: 0 auto;
        }

        /* Cards */
        .lp-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 20px;
          width: min(100%, 860px);
          position: relative;
          z-index: 1;
        }

        .lp-card {
          position: relative;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(45,17,71,0.4);
          padding: clamp(28px, 4vw, 40px);
          text-decoration: none;
          color: inherit;
          display: flex;
          flex-direction: column;
          gap: 14px;
          overflow: hidden;
          transition: border-color 0.25s, background 0.25s, transform 0.25s;
          -webkit-backdrop-filter: blur(12px);
          backdrop-filter: blur(12px);
          cursor: pointer;
        }
        .lp-card::before {
          content: '';
          position: absolute;
          inset: 0;
          opacity: 0;
          background: linear-gradient(135deg, rgba(198,100,219,0.08), rgba(207,175,137,0.05));
          transition: opacity 0.25s;
          pointer-events: none;
        }
        .lp-card:hover { border-color: rgba(207,175,137,0.45); transform: translateY(-3px); }
        .lp-card:hover::before { opacity: 1; }

        /* Featured card (BCon) */
        .lp-card-featured {
          border-color: rgba(207,175,137,0.28);
          background: rgba(45,17,71,0.6);
        }
        .lp-card-featured::after {
          content: '';
          position: absolute;
          top: 0; right: 0;
          width: 100px; height: 100px;
          background: linear-gradient(225deg, rgba(207,175,137,0.1), transparent 60%);
          pointer-events: none;
        }

        .lp-card-tag {
          font-family: 'Cinzel', serif;
          font-size: 9px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: #cfaf89;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .lp-card-tag::before {
          content: '';
          display: inline-block;
          width: 20px;
          height: 1px;
          background: #cfaf89;
        }
        .lp-card-tag-muted {
          color: rgba(240,234,248,0.35);
        }
        .lp-card-tag-muted::before { background: rgba(240,234,248,0.35); }

        .lp-card-logo {
          font-family: 'Cinzel', serif;
          font-weight: 700;
          font-size: clamp(38px, 6vw, 56px);
          line-height: 0.9;
          letter-spacing: -0.03em;
          display: flex;
          align-items: baseline;
          gap: 0;
        }
        .lp-logo-left { color: #ffffff; }
        .lp-logo-slash {
          width: 2px;
          height: 2.2em;
          background: linear-gradient(to bottom, #c664db, #cfaf89);
          margin: 0 6px;
          align-self: center;
          flex-shrink: 0;
        }
        .lp-logo-right {
          background: linear-gradient(135deg, #c664db 20%, #cfaf89 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .lp-card-title {
          font-family: 'Cinzel', serif;
          font-size: 15px;
          font-weight: 600;
          letter-spacing: 0.05em;
          color: #ffffff;
        }
        .lp-card-desc {
          font-size: 13px;
          line-height: 1.6;
          color: rgba(240,234,248,0.5);
          flex: 1;
        }
        .lp-card-cta {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-family: 'Cinzel', serif;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #cfaf89;
          margin-top: 4px;
          transition: gap 0.2s;
        }
        .lp-card:hover .lp-card-cta { gap: 12px; }
        .lp-card-cta-test { color: rgba(240,234,248,0.45); }

        /* Test form icon */
        .lp-test-icon {
          width: 52px; height: 52px;
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 50%;
          display: grid;
          place-items: center;
          font-size: 22px;
          color: rgba(240,234,248,0.5);
          margin-bottom: 4px;
        }

        /* Footer */
        .lp-footer {
          margin-top: clamp(40px, 6vw, 64px);
          font-family: 'Cinzel', serif;
          font-size: 9px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: rgba(240,234,248,0.2);
          position: relative;
          z-index: 1;
        }
        .lp-footer a {
          color: rgba(207,175,137,0.4);
          text-decoration: none;
        }
        .lp-footer a:hover { color: rgba(207,175,137,0.8); }

        @media (max-width: 560px) {
          .lp-cards { grid-template-columns: 1fr; }
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
            Select a form below to view or test the registration experience.
          </p>
        </header>

        <div className="lp-cards">
          {/* Business Conclave — featured */}
          <Link href="/bcon" className="lp-card lp-card-featured" id="lp-bcon-card">
            <span className="lp-card-tag">Featured Event</span>
            <div className="lp-card-logo">
              <span className="lp-logo-left">20</span>
              <div className="lp-logo-slash" />
              <span className="lp-logo-right">26</span>
            </div>
            <p className="lp-card-title">Business Conclave</p>
            <p className="lp-card-desc">
              The flagship registration form for Business Conclave 2026 — styled to brand with
              animated transitions and live email verification.
            </p>
            <span className="lp-card-cta">Open Form ↗</span>
          </Link>

          {/* Test / Dummy form */}
          <Link href="/test" className="lp-card" id="lp-test-card">
            <span className="lp-card-tag lp-card-tag-muted">Test</span>
            <div className="lp-test-icon">⚡</div>
            <p className="lp-card-title">Dummy Form</p>
            <p className="lp-card-desc">
              A generic multi-step form for exploring the flow logic, branching, motion effects,
              and Google Sheets integration before going live.
            </p>
            <span className="lp-card-cta lp-card-cta-test">Open Form ↗</span>
          </Link>
        </div>

        <footer className="lp-footer">
          <a href="https://www.rishabhj.in" target="_blank" rel="noreferrer">
            Built by Rishabh
          </a>
          {" — "}Forms Platform
        </footer>
      </div>
    </>
  );
}
