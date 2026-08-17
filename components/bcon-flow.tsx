"use client";

import { AnimatePresence, motion, useReducedMotion, type Variants } from "framer-motion";
import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  type AnswerMap,
  type ChoiceOption,
  getQuestionByIndex,
  isValidEmail,
  resolveNextQuestionIndex,
  startQuestionIndex,
  validateQuestion,
} from "../lib/flow";
import "./bcon.css";

const STORAGE_KEY = "bcon-flow";
const FORM_ID     = "bcon";
type EmailStatus  = "idle" | "checking" | "available" | "taken";

export function BconFlow() {
  const [started, setStarted]       = useState(false);
  const [submitted, setSubmitted]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitOrigin, setSubmitOrigin] = useState({ x: 0, y: 150 });
  const [answers, setAnswers]   = useState<AnswerMap>({});
  const [index, setIndex]       = useState(startQuestionIndex);
  const [history, setHistory]   = useState<number[]>([]);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [error, setError]         = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const reducedMotion = useReducedMotion();
  const [emailStatus, setEmailStatus] = useState<EmailStatus>("idle");
  const emailCheckInFlightRef = useRef<{ email: string; promise: Promise<EmailStatus> } | null>(null);
  const emailCheckSeqRef = useRef(0);
  const advancingRef     = useRef(false);
  const rm = reducedMotion ?? false;

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}") as { answers?: AnswerMap };
      if (saved.answers) setAnswers(saved.answers);
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ answers }));
  }, [answers]);

  useEffect(() => {
    if (!started || submitted) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 330);
    return () => window.clearTimeout(t);
  }, [started, submitted, index]);

  const question = started && !submitted ? getQuestionByIndex(index) : null;
  const value    = question ? (answers[question.id] ?? "") : "";

  useEffect(() => {
    if (!question || question.id !== "email" || !started || submitted) return;
    const email = value.trim().toLowerCase();
    if (!isValidEmail(email)) {
      emailCheckSeqRef.current += 1;
      setEmailStatus("idle");
      return;
    }
    const seq = ++emailCheckSeqRef.current;
    setEmailStatus("checking");
    const timer = window.setTimeout(() => { void fireEmailCheck(email, seq); }, 150);
    return () => { window.clearTimeout(timer); emailCheckSeqRef.current += 1; };
  }, [question?.id, value, started, submitted]);

  const journeyLength = answers.goal === "physical_product" ? 6 : answers.goal === "subscription" ? 5 : 4;
  const currentStep  = history.length + 1;
  const progress = useMemo(
    () => (started ? (currentStep / journeyLength) * 100 : 0),
    [started, currentStep, journeyLength],
  );

  async function submitForm(finalAnswers: AnswerMap) {
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formId: FORM_ID, answers: finalAnswers }),
      });
      await res.json().catch(() => null);
    } catch {
      // silent — submission is fire-and-forget
    }
  }

  function fireEmailCheck(email: string, seq: number): Promise<EmailStatus> | null {
    if (!isValidEmail(email)) return null;
    const existing = emailCheckInFlightRef.current;
    if (existing && existing.email === email) return existing.promise;

    let resolve!: (s: EmailStatus) => void;
    const promise = new Promise<EmailStatus>((r) => { resolve = r; });
    const entry = { email, promise };
    emailCheckInFlightRef.current = entry;

    void fetch("/api/check-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    })
      .then((r) => r.json().catch(() => null))
      .then((data: { ok?: boolean; exists?: boolean } | null) => {
        const status: EmailStatus =
          data?.ok && typeof data.exists === "boolean"
            ? data.exists ? "taken" : "available"
            : "idle";
        if (emailCheckInFlightRef.current === entry) emailCheckInFlightRef.current = null;
        if (seq === emailCheckSeqRef.current) setEmailStatus(status);
        resolve(status);
      })
      .catch(() => {
        if (emailCheckInFlightRef.current === entry) emailCheckInFlightRef.current = null;
        if (seq === emailCheckSeqRef.current) setEmailStatus("idle");
        resolve("idle");
      });

    return promise;
  }

  function begin() {
    setAnswers({});
    window.localStorage.removeItem(STORAGE_KEY);
    setStarted(true); setSubmitted(false); setSubmitting(false);
    setIndex(startQuestionIndex); setHistory([]); setError(null);
    setDirection(1); setEmailStatus("idle");
    emailCheckSeqRef.current += 1;
  }

  function returnToWelcome() {
    setAnswers({});
    window.localStorage.removeItem(STORAGE_KEY);
    setStarted(false); setSubmitted(false); setSubmitting(false);
    setIndex(startQuestionIndex); setHistory([]); setError(null);
    setDirection(-1); setEmailStatus("idle");
    emailCheckSeqRef.current += 1;
  }

  useEffect(() => {
    if (started) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Enter") { e.preventDefault(); begin(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [started]);

  async function next(answer?: string) {
    if (!question || advancingRef.current) return;
    advancingRef.current = true;
    try {
      const nextValue = answer ?? value;
      const validation = validateQuestion(question, nextValue);
      if (validation) { setError(validation); return; }

      if (question.id === "email") {
        const email = nextValue.trim().toLowerCase();
        const seq   = emailCheckSeqRef.current;
        const pending = fireEmailCheck(email, seq);
        if (pending) {
          setEmailStatus("checking");
          const status = await pending;
          if (status === "taken") {
            setError("This email is already registered for Business Conclave 2026.");
            return;
          }
        }
      }

      setAnswers((prev: AnswerMap) => ({ ...prev, [question.id]: nextValue }));
      setError(null);
      const nextIndex = resolveNextQuestionIndex(index, nextValue, answers);
      if (nextIndex === null) {
        const btn  = document.querySelector<HTMLElement>("[data-submit-button]");
        const rect = btn?.getBoundingClientRect();
        if (rect) setSubmitOrigin({
          x: rect.left + rect.width / 2 - window.innerWidth / 2,
          y: rect.top  + rect.height / 2 - window.innerHeight / 2,
        });
        setSubmitting(true);
        void submitForm({ ...answers, [question.id]: nextValue });
        window.setTimeout(() => { setSubmitting(false); setSubmitted(true); }, rm ? 0 : 2200);
        return;
      }
      setHistory((prev: number[]) => [...prev, index]);
      setDirection(1); setIndex(nextIndex);
    } finally {
      advancingRef.current = false;
    }
  }

  function back() {
    setHistory((prev: number[]) => {
      const previous = prev.at(-1);
      if (previous === undefined) return prev;
      setDirection(-1); setIndex(previous); setError(null);
      return prev.slice(0, -1);
    });
  }

  function choose(choice: string) {
    setAnswers((prev: AnswerMap) => question ? { ...prev, [question.id]: choice } : prev);
    setError(null);
    window.setTimeout(() => next(choice), rm ? 0 : 170);
  }

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (!question || question.type !== "multipleChoice") return;
      const idx = /^[1-9]$/.test(e.key) ? Number(e.key) - 1 : -1;
      const ch  = question.options?.[idx];
      if (ch) { e.preventDefault(); choose(ch.value); }
      if (e.key === "Escape") back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [question, index, rm]);

  function onInputKeyDown(e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); next(); }
    if (e.key === "Escape") back();
  }

  const pageMotion = rm ? { duration: 0 } : { duration: 0.48, ease: [0.16, 1, 0.3, 1] as const };
  const slide: Variants = {
    initial: (d: number) => ({ opacity: 0, y: d > 0 ? 38 : -38, filter: "blur(8px)" }),
    animate: { opacity: 1, y: 0, filter: "blur(0px)", transition: pageMotion },
    exit:    (d: number) => ({ opacity: 0, y: d > 0 ? -28 : 28, filter: "blur(4px)", transition: { duration: rm ? 0 : 0.24 } }),
  };

  const userEmail = answers["email"] ?? "";

  return (
    <main className="bcon-shell">
      <div className="bcon-orb bcon-orb-one" />
      <div className="bcon-orb bcon-orb-two" />
      <div className="bcon-orb bcon-orb-three" />

      <section className="bcon-stage" aria-label="Business Conclave 2026 registration">
        <header className="bcon-header">
          <button
            type="button"
            className="bcon-back-btn"
            onClick={back}
            disabled={!started || history.length === 0}
            aria-label="Go to previous question"
          >
            ← <span>Back</span>
          </button>
          <div className="bcon-wordmark">
            <span className="bcon-wordmark-main">BUSINESS</span>
            <span className="bcon-wordmark-sub">CONCLAVE</span>
            <span className="bcon-wordmark-year">2026</span>
          </div>
          <div style={{ width: 80 }} />
        </header>

        <div className="bcon-progress-wrap" aria-hidden="true">
          <motion.div
            className="bcon-progress-line"
            animate={{ width: `${submitted ? 100 : progress}%` }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>

        <div className="bcon-content">
          <AnimatePresence mode="wait" custom={direction}>
            {!started
              ? <BconIntro key="intro" onBegin={begin} rm={rm} />
              : null}
            {question
              ? (
                <BconQuestion
                  key={question.id}
                  question={question}
                  questionNumber={currentStep}
                  value={value}
                  answers={answers}
                  error={error}
                  emailStatus={emailStatus}
                  inputRef={inputRef}
                  direction={direction}
                  slide={slide}
                  onChange={(v: string) => {
                    setAnswers((prev: AnswerMap) => ({ ...prev, [question.id]: v }));
                    setError(null);
                  }}
                  onChoose={choose}
                  onNext={() => next()}
                  onKeyDown={onInputKeyDown}
                />
              )
              : null}
            {submitted
              ? <BconCompletion key="done" onRestart={returnToWelcome} rm={rm} userEmail={userEmail} />
              : null}
          </AnimatePresence>
          <AnimatePresence>
            {submitting
              ? <BconSubmitTransition key="tx" origin={submitOrigin} rm={rm} />
              : null}
          </AnimatePresence>
        </div>

        <footer className="bcon-footer">
          <span className="bcon-footer-brand">Business Conclave <em>2026</em></span>
          <span className="bcon-desktop-hint">
            {question?.type === "multipleChoice" ? "Press 1–3 to choose" : "Enter to continue"}
          </span>
        </footer>
      </section>
    </main>
  );
}

function Logo2026({ rm }: { rm: boolean }) {
  return (
    <motion.div
      className="bcon-logo-2026-image"
      initial={{ opacity: 0, scale: 0.88, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: rm ? 0 : 0.8, ease: [0.16, 1, 0.3, 1] }}
      aria-hidden="true"
      style={{ position: "relative", display: "flex", justifyContent: "center" }}
    >
      <div 
        className="bcon-logo-glow" 
        style={{ 
          opacity: 0.8, 
          background: "radial-gradient(circle, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0) 65%)",
          transform: "scale(1.5)"
        }} 
      />
      <motion.img 
        src="/bcon-logo.png" 
        alt="2026" 
        style={{ 
          position: "relative", 
          zIndex: 2, 
          display: "block", 
          width: "auto", 
          height: "clamp(46px, 7.5vw, 92px)",
          maxHeight: "100%", 
          objectFit: "contain"
        }}
        initial={{ filter: "drop-shadow(0 0 0px rgba(255,255,255,0))" }}
        animate={{ filter: "drop-shadow(0 4px 20px rgba(255,255,255,0.4))" }}
        transition={{ duration: rm ? 0 : 1.2, delay: 0.2 }}
      />
    </motion.div>
  );
}

function BconIntro({ onBegin, rm }: { onBegin: () => void; rm: boolean }) {
  return (
    <motion.div
      className="bcon-intro"
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -18 }}
      transition={{ duration: rm ? 0 : 0.5 }}
    >
      <motion.div
        className="bcon-intro-hero"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: rm ? 0 : 0.5, delay: 0.2 }}
      >
        <div className="bcon-intro-text-col">
          <h1 className="bcon-intro-title">
            BUSINESS<br /><em>CONCLAVE</em>
          </h1>
          <div className="bcon-intro-line" />
        </div>
        <Logo2026 rm={rm} />
      </motion.div>

      <motion.div
        className="bcon-intro-label"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: rm ? 0 : 0.5, delay: 0.35 }}
      >
        <p className="bcon-intro-copy">
          Fill in your details below to secure your spot.
        </p>
      </motion.div>

      <motion.button
        type="button"
        className="bcon-start-btn"
        id="bcon-register-btn"
        onClick={onBegin}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: rm ? 0 : 0.45, delay: 0.5 }}
        whileHover={rm ? undefined : { y: -4, scale: 1.03 }}
        whileTap={{ y: 1, scale: 0.97 }}
      >
        <span className="bcon-start-btn-glow" aria-hidden="true" />
        <span className="bcon-start-btn-label">Register Now <b>↗</b></span>
      </motion.button>

      <motion.p
        className="bcon-key-hint"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.65, duration: rm ? 0 : 0.4 }}
      >
        <kbd>Enter</kbd> to begin
      </motion.p>
    </motion.div>
  );
}

type BconQuestionProps = {
  question: NonNullable<ReturnType<typeof getQuestionByIndex>>;
  questionNumber: number;
  value: string;
  answers: AnswerMap;
  error: string | null;
  emailStatus: EmailStatus;
  inputRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
  direction: 1 | -1;
  slide: Variants;
  onChange: (value: string) => void;
  onChoose: (value: string) => void;
  onNext: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
};

function BconQuestion({
  question, questionNumber, value, answers, error,
  emailStatus, inputRef, direction, slide,
  onChange, onChoose, onNext, onKeyDown,
}: BconQuestionProps) {
  const hint = error ?? (question.id === "email"
    ? emailStatus === "checking"    ? "Checking…"
      : emailStatus === "taken"     ? "Already registered."
        : emailStatus === "available" ? "Available ✓"
          : "Saved automatically"
    : "Saved automatically");

  const hintClass =
    error || (question.id === "email" && emailStatus === "taken")
      ? "bcon-is-error"
      : question.id === "email" && emailStatus === "available"
        ? "bcon-is-success"
        : "";

  return (
    <motion.article
      className="bcon-question"
      custom={direction}
      variants={slide}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <p className="bcon-eyebrow">Question {String(questionNumber).padStart(2, "0")}</p>
      <h1 className="bcon-question-title">{question.prompt}</h1>
      <p className="bcon-helper">{question.helper}</p>

      <div className="bcon-answer-area">
        {question.type === "multipleChoice" ? (
          <div className="bcon-choices">
            {question.options?.map((option: ChoiceOption, i: number) => (
              <motion.button
                key={option.value}
                type="button"
                disabled={option.disabled}
                id={`bcon-choice-${option.value}`}
                className={`bcon-choice ${answers[question.id] === option.value ? "bcon-choice-selected" : ""} ${option.disabled ? "bcon-choice-disabled" : ""}`}
                onClick={() => !option.disabled && onChoose(option.value)}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: option.disabled ? 0.5 : 1, y: 0 }}
                transition={{ delay: 0.14 + i * 0.07 }}
                whileHover={option.disabled ? {} : { x: 4 }}
                whileTap={option.disabled ? {} : { scale: 0.99 }}
              >
                <span className="bcon-choice-key">{i + 1}</span>
                <span>
                  <strong>{option.label}</strong>
                  <small>{option.description}</small>
                </span>
                <span className="bcon-choice-mark">✓</span>
              </motion.button>
            ))}
          </div>
        ) : question.multiline ? (
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            className="bcon-input"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={question.placeholder}
            aria-label={question.prompt}
          />
        ) : (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            className="bcon-input"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={question.placeholder}
            inputMode={question.inputMode}
            aria-label={question.prompt}
          />
        )}

        {question.type !== "multipleChoice" ? (
          <div className="bcon-next-row">
            <span className={`bcon-validation ${hintClass}`}>{hint}</span>
            <button
              type="button"
              id="bcon-next-btn"
              className="bcon-next-btn"
              onClick={onNext}
              data-submit-button={question.id === "questions_for_speakers" || undefined}
            >
              {question.id === "questions_for_speakers" ? "Submit" : "Continue"} <span>↵</span>
            </button>
          </div>
        ) : null}
      </div>
    </motion.article>
  );
}

function BconSubmitTransition({ origin, rm }: { origin: { x: number; y: number }; rm: boolean }) {
  const dots = Array.from({ length: 10 }, (_, i) => {
    const angle = (Math.PI * 2 * i) / 10;
    return { x: Math.cos(angle) * (52 + (i % 3) * 14), y: Math.sin(angle) * (52 + (i % 3) * 14), delay: i * 0.03 };
  });
  return (
    <motion.div className="bcon-submit-transition" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="bcon-conversion-grid" aria-hidden="true">
        {Array.from({ length: 12 }, (_, i) => (
          <motion.i key={i} initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ delay: 0.32 + i * 0.03, duration: rm ? 0 : 0.34, ease: [0.22, 1, 0.36, 1] }} />
        ))}
      </div>
      <motion.div className="bcon-submit-pod" initial={{ x: origin.x, y: origin.y, scale: 1, opacity: 1 }} animate={{ x: 0, y: 0, scale: 0.18, opacity: 0 }} transition={{ duration: rm ? 0 : 0.6, ease: [0.16, 1, 0.3, 1] }}>
        Submit <b>↵</b>
      </motion.div>
      <motion.div className="bcon-dot-field" animate={rm ? {} : { rotate: 360 }} transition={{ delay: 0.5, duration: 2.4, ease: "linear" }}>
        {dots.map((dot, i) => (
          <motion.span key={i} className="bcon-travel-dot" initial={{ x: origin.x, y: origin.y, scale: 0, opacity: 0 }} animate={{ x: [origin.x, 0, dot.x], y: [origin.y, 0, dot.y], scale: [0, 1.25, 0.62], opacity: [0, 1, 1] }} transition={{ duration: rm ? 0 : 0.9, delay: dot.delay, ease: [0.16, 1, 0.3, 1], times: [0, 0.52, 1] }} />
        ))}
      </motion.div>
      <motion.div className="bcon-loading-core" initial={{ scale: 0, opacity: 0 }} animate={{ scale: [0, 1.25, 1], opacity: 1 }} transition={{ delay: rm ? 0 : 0.34, duration: rm ? 0 : 0.46, ease: [0.34, 1.56, 0.64, 1] }}>
        <span />
      </motion.div>
      <motion.p className="bcon-transmitting" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: rm ? 0 : 0.8 }}>
        Submitting registration
      </motion.p>
    </motion.div>
  );
}

function BconCompletion({ onRestart, rm, userEmail }: {
  onRestart: () => void;
  rm: boolean;
  userEmail: string;
}) {
  return (
    <motion.article
      className="bcon-completion"
      initial={{ opacity: 0, scale: 0.82, rotateX: -20 }}
      animate={{ opacity: 1, scale: 1, rotateX: 0 }}
      transition={{ type: "spring", stiffness: 120, damping: 15 }}
    >
      <div className="bcon-completion-scene" aria-hidden="true">
        <motion.div className="bcon-orbital bcon-orbital-one" animate={rm ? {} : { rotate: 360 }} transition={{ repeat: Infinity, duration: 10, ease: "linear" }} />
        <motion.div className="bcon-orbital bcon-orbital-two" animate={rm ? {} : { rotate: -360 }} transition={{ repeat: Infinity, duration: 7, ease: "linear" }} />
        <motion.div className="bcon-core" initial={{ scale: 0 }} animate={{ scale: [0, 1.35, 1] }} transition={{ duration: rm ? 0 : 0.8, delay: 0.14 }}>
          <span>✓</span>
        </motion.div>
      </div>

      <p className="bcon-eyebrow">Registration Received</p>
      <h1 className="bcon-completion-title">You&rsquo;re In.</h1>

      <p className="bcon-completion-copy">
        {userEmail ? (
          <>
            A confirmation has been sent to{" "}
            <strong className="bcon-completion-email">{userEmail}</strong>.
            <br />
            We&rsquo;ll be in touch shortly.
          </>
        ) : (
          <>We&rsquo;ll be in touch with your confirmation shortly.</>
        )}
      </p>

      <div className="bcon-completion-brand" aria-hidden="true">
        <span className="bcon-completion-brand-name">Business Conclave</span>
        <span className="bcon-completion-brand-year">2026</span>
      </div>

      <button type="button" id="bcon-restart-btn" className="bcon-primary-btn" onClick={onRestart}>
        Submit another <span>↗</span>
      </button>
    </motion.article>
  );
}
