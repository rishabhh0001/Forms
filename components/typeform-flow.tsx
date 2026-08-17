"use client";

import { AnimatePresence, motion, useReducedMotion, type Variants } from "framer-motion";
import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  type AnswerMap,
  getQuestionByIndex,
  isValidEmail,
  resolveNextQuestionIndex,
  startQuestionIndex,
  validateQuestion,
} from "../lib/flow";

const STORAGE_KEY = "typeform-flow-demo";
const THEME_KEY   = "typeform-flow-theme";
type Theme       = "light" | "dark";
type EmailStatus = "idle" | "checking" | "available" | "taken";

export function TypeformFlow() {
  const [started,       setStarted]       = useState(false);
  const [submitted,     setSubmitted]     = useState(false);
  const [submitting,    setSubmitting]    = useState(false);
  const [submitOrigin,  setSubmitOrigin]  = useState({ x: 0, y: 150 });
  const [answers,       setAnswers]       = useState<AnswerMap>({});
  const [index,         setIndex]         = useState(startQuestionIndex);
  const [history,       setHistory]       = useState<number[]>([]);
  const [direction,     setDirection]     = useState<1 | -1>(1);
  const [error,         setError]         = useState<string | null>(null);
  const [theme,         setTheme]         = useState<Theme>("dark");
  const [forceMotion,   setForceMotion]   = useState(true);
  const [emailStatus,   setEmailStatus]   = useState<EmailStatus>("idle");
  const inputRef              = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const reducedMotion         = useReducedMotion();
  const emailCheckInFlightRef = useRef<{ email: string; promise: Promise<EmailStatus> } | null>(null);
  const emailCheckSeqRef      = useRef(0);
  const advancingRef          = useRef(false);
  const rm                    = reducedMotion && !forceMotion;

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}") as { answers?: AnswerMap };
      if (saved.answers) setAnswers(saved.answers);
      const savedTheme = window.localStorage.getItem(THEME_KEY) as Theme | null;
      if (savedTheme === "light" || savedTheme === "dark") setTheme(savedTheme);
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("typeform-force-motion");
      if (saved !== null) setForceMotion(saved === "1");
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (forceMotion) document.documentElement.classList.add("force-motion");
    else document.documentElement.classList.remove("force-motion");
    try { window.localStorage.setItem("typeform-force-motion", forceMotion ? "1" : "0"); } catch { /* ignore */ }
  }, [forceMotion]);

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
    const timer = window.setTimeout(() => { void getEmailCheckPromise(email, seq); }, 150);
    return () => { window.clearTimeout(timer); emailCheckSeqRef.current += 1; };
  }, [question?.id, value, started, submitted]);

  const journeyLength = answers.goal === "physical_product" ? 6 : answers.goal === "subscription" ? 5 : 4;
  const currentStep  = history.length + 1;
  const progress = useMemo(
    () => (started ? (currentStep / journeyLength) * 100 : 0),
    [started, currentStep, journeyLength],
  );

  async function submitToGoogleSheets(finalAnswers: AnswerMap) {
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formId: "test", answers: finalAnswers }),
      });
      await res.json().catch(() => null);
    } catch { /* silent — never blocks UX */ }
  }

  function getEmailCheckPromise(email: string, seq: number): Promise<EmailStatus> | null {
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
        const pending = getEmailCheckPromise(email, seq);
        if (pending) {
          setEmailStatus("checking");
          const status = await pending;
          if (status === "taken") {
            setError("This email has already submitted a response.");
            return;
          }
        }
      }

      setAnswers((prev) => ({ ...prev, [question.id]: nextValue }));
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
        void submitToGoogleSheets({ ...answers, [question.id]: nextValue });
        window.setTimeout(() => { setSubmitting(false); setSubmitted(true); }, rm ? 0 : 2200);
        return;
      }
      setHistory((prev) => [...prev, index]);
      setDirection(1); setIndex(nextIndex);
    } finally {
      advancingRef.current = false;
    }
  }

  function back() {
    setHistory((prev) => {
      const previous = prev.at(-1);
      if (previous === undefined) return prev;
      setDirection(-1); setIndex(previous); setError(null);
      return prev.slice(0, -1);
    });
  }

  function choose(choice: string) {
    setAnswers((prev) => question ? { ...prev, [question.id]: choice } : prev);
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

  return (
    <main className="form-shell">
      <div className="form-orb form-orb-one" /><div className="form-orb form-orb-two" />
      <section className="form-stage" aria-label="Test form">
        <header className="form-header">
          <button type="button" className="quiet-button" onClick={back} disabled={!started || history.length === 0} aria-label="Go to previous question">
            ← <span>Back</span>
          </button>
          <div className="wordmark">INFORMATION <span>FORM</span></div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <button
              type="button" className="motion-toggle"
              onClick={() => setForceMotion((v) => !v)}
              aria-pressed={forceMotion}
              aria-label={forceMotion ? "Disable effects" : "Enable effects"}
            >
              <span className="motion-toggle-knob">{forceMotion ? "⚡" : "—"}</span>
              <span style={{ marginLeft: 6 }}>{forceMotion ? "Effects On" : "Effects Off"}</span>
            </button>
            <button
              type="button" className="theme-toggle"
              onClick={() => setTheme((t) => t === "dark" ? "light" : "dark")}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            >
              <span className="theme-toggle-knob">{theme === "dark" ? "◐" : "◑"}</span>
              <span>{theme === "dark" ? "Light" : "Dark"}</span>
            </button>
          </div>
        </header>

        <div className="progress-wrap" aria-hidden="true">
          <motion.div className="progress-line" animate={{ width: `${submitted ? 100 : progress}%` }} transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }} />
        </div>

        <div className="form-content">
          <AnimatePresence mode="wait" custom={direction}>
            {!started ? <Intro key="intro" onBegin={begin} rm={rm} /> : null}
            {question
              ? <Question
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
                  onChange={(v) => { setAnswers((prev) => ({ ...prev, [question.id]: v })); setError(null); }}
                  onChoose={choose}
                  onNext={() => next()}
                  onKeyDown={onInputKeyDown}
                />
              : null}
            {submitted ? <Completion key="completion" onRestart={returnToWelcome} rm={rm} /> : null}
          </AnimatePresence>
          <AnimatePresence>
            {submitting ? <SubmitTransition key="submit-transition" origin={submitOrigin} rm={rm} /> : null}
          </AnimatePresence>
        </div>

        <footer className="form-footer">
          <span>Made by <a href="https://www.rishabhj.in" target="_blank" rel="noreferrer">Rishabh</a></span>
          <span className="desktop-hint">{question?.type === "multipleChoice" ? "Press 1–3 to choose" : "Enter to continue"}</span>
        </footer>
      </section>
    </main>
  );
}

function Intro({ onBegin, rm }: { onBegin: () => void; rm: boolean | null }) {
  return (
    <motion.div className="intro" initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -18 }} transition={{ duration: rm ? 0 : 0.5 }}>
      <div className="intro-sculpture" aria-hidden="true"><span /><span /><i /></div>
      <p className="eyebrow">Test Environment</p>
      <h1>Dummy <em>Form</em></h1>
      <p className="intro-copy">A multi-step form for exploring branching logic, animated transitions, and Google Sheets integration.</p>
      <motion.button type="button" className="start-button" onClick={onBegin} whileHover={rm ? undefined : { y: -4, scale: 1.035, rotateX: -7, rotateY: 5 }} whileTap={{ y: 1, scale: 0.97, rotateX: 6 }}>
        <span className="start-button-orbit" aria-hidden="true" />
        <span className="start-button-label">Start <b>↗</b></span>
      </motion.button>
      <p className="key-hint"><kbd>Enter</kbd> to start</p>
    </motion.div>
  );
}

type QuestionProps = {
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

function Question({ question, questionNumber, value, answers, error, emailStatus, inputRef, direction, slide, onChange, onChoose, onNext, onKeyDown }: QuestionProps) {
  const hint =
    error ??
    (question.id === "email"
      ? emailStatus === "checking"    ? "Checking…"
        : emailStatus === "taken"     ? "This email has already submitted a response."
          : emailStatus === "available" ? "Available ✓"
            : "Saved automatically"
      : "Saved automatically");

  const hintClass =
    error || (question.id === "email" && emailStatus === "taken")
      ? "is-error"
      : question.id === "email" && emailStatus === "available"
        ? "is-success"
        : "";

  return (
    <motion.article className="question" custom={direction} variants={slide} initial="initial" animate="animate" exit="exit">
      <p className="eyebrow">Question {String(questionNumber).padStart(2, "0")}</p>
      <h1>{question.prompt}</h1>
      <p className="helper">{question.helper}</p>
      <div className="answer-area">
        {question.type === "multipleChoice"
          ? <div className="choices">
              {question.options?.map((opt, i) => (
                <motion.button key={opt.value} type="button" className={`choice ${answers[question.id] === opt.value ? "selected" : ""}`} onClick={() => onChoose(opt.value)} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 + i * 0.07 }} whileHover={{ x: 4 }} whileTap={{ scale: 0.99 }}>
                  <span className="choice-key">{i + 1}</span>
                  <span><strong>{opt.label}</strong><small>{opt.description}</small></span>
                  <span className="choice-mark">✓</span>
                </motion.button>
              ))}
            </div>
          : question.multiline
            ? <textarea ref={inputRef as React.RefObject<HTMLTextAreaElement>} value={value} onChange={(e) => onChange(e.target.value)} onKeyDown={onKeyDown} placeholder={question.placeholder} aria-label={question.prompt} />
            : <input ref={inputRef as React.RefObject<HTMLInputElement>} value={value} onChange={(e) => onChange(e.target.value)} onKeyDown={onKeyDown} placeholder={question.placeholder} inputMode={question.inputMode} aria-label={question.prompt} />}
        {question.type !== "multipleChoice"
          ? <div className="next-row">
              <span className={`validation ${hintClass}`}>{hint}</span>
              <button type="button" className="next-button" onClick={onNext} data-submit-button={question.id === "story" || undefined}>
                {question.id === "story" ? "Submit" : "Continue"} <span>↵</span>
              </button>
            </div>
          : null}
      </div>
    </motion.article>
  );
}

function SubmitTransition({ origin, rm }: { origin: { x: number; y: number }; rm: boolean | null }) {
  const dots = Array.from({ length: 10 }, (_, i) => {
    const a = (Math.PI * 2 * i) / 10;
    return { x: Math.cos(a) * (52 + (i % 3) * 14), y: Math.sin(a) * (52 + (i % 3) * 14), delay: i * 0.03 };
  });
  return (
    <motion.div className="submit-transition" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="conversion-grid" aria-hidden="true">{Array.from({ length: 12 }, (_, i) => <motion.i key={i} initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ delay: 0.32 + i * 0.03, duration: rm ? 0 : 0.34, ease: [0.22, 1, 0.36, 1] }} />)}</div>
      <motion.div className="submit-pod" initial={{ x: origin.x, y: origin.y, scale: 1, opacity: 1 }} animate={{ x: 0, y: 0, scale: 0.18, opacity: 0 }} transition={{ duration: rm ? 0 : 0.6, ease: [0.16, 1, 0.3, 1] }}>Submit <b>↵</b></motion.div>
      <motion.div className="dot-field" animate={rm ? {} : { rotate: 360 }} transition={{ delay: 0.5, duration: 2.4, ease: "linear" }}>
        {dots.map((dot, i) => <motion.span key={i} className="travel-dot" initial={{ x: origin.x, y: origin.y, scale: 0, opacity: 0 }} animate={{ x: [origin.x, 0, dot.x], y: [origin.y, 0, dot.y], scale: [0, 1.25, 0.62], opacity: [0, 1, 1] }} transition={{ duration: rm ? 0 : 0.9, delay: dot.delay, ease: [0.16, 1, 0.3, 1], times: [0, 0.52, 1] }} />)}
      </motion.div>
      <motion.div className="loading-core" initial={{ scale: 0, opacity: 0 }} animate={{ scale: [0, 1.25, 1], opacity: 1 }} transition={{ delay: rm ? 0 : 0.34, duration: rm ? 0 : 0.46, ease: [0.34, 1.56, 0.64, 1] }}><span /></motion.div>
      <motion.p className="transmitting" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: rm ? 0 : 0.8 }}>Submitting</motion.p>
    </motion.div>
  );
}

function Completion({ onRestart, rm }: { onRestart: () => void; rm: boolean | null }) {
  return (
    <motion.article className="completion" initial={{ opacity: 0, scale: 0.82, rotateX: -20 }} animate={{ opacity: 1, scale: 1, rotateX: 0 }} transition={{ type: "spring", stiffness: 120, damping: 15 }}>
      <div className="completion-scene" aria-hidden="true">
        <motion.div className="orbital orbital-one" animate={rm ? {} : { rotate: 360 }} transition={{ repeat: Infinity, duration: 10, ease: "linear" }} />
        <motion.div className="orbital orbital-two" animate={rm ? {} : { rotate: -360 }} transition={{ repeat: Infinity, duration: 7, ease: "linear" }} />
        <motion.div className="core" initial={{ scale: 0 }} animate={{ scale: [0, 1.35, 1] }} transition={{ duration: rm ? 0 : 0.8, delay: 0.14 }}><span>✓</span></motion.div>
      </div>
      <p className="eyebrow">Submitted</p>
      <h1>Got it.</h1>
      <p>Your response has been recorded.</p>
      <button type="button" className="primary-button" onClick={onRestart}>Start again <span>↗</span></button>
    </motion.article>
  );
}
