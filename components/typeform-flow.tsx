"use client";

import { AnimatePresence, motion, useReducedMotion, type Variants } from "framer-motion";
import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  type AnswerMap,
  getQuestionByIndex,
  questionSchema,
  resolveNextQuestionIndex,
  startQuestionIndex,
  validateQuestion,
} from "../lib/flow";

const STORAGE_KEY = "typeform-flow-demo";
const THEME_KEY = "typeform-flow-theme";
type Theme = "dark" | "light";

export function TypeformFlow() {
  const [started, setStarted] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitOrigin, setSubmitOrigin] = useState({ x: 0, y: 150 });
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [index, setIndex] = useState(startQuestionIndex);
  const [history, setHistory] = useState<number[]>([]);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<Theme>("dark");
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const reducedMotion = useReducedMotion();
  const [forceMotion, setForceMotion] = useState(true);
  const effectiveReducedMotion = reducedMotion && !forceMotion;

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
    } catch {}
  }, []);

  useEffect(() => {
    if (forceMotion) document.documentElement.classList.add("force-motion");
    else document.documentElement.classList.remove("force-motion");
    try { window.localStorage.setItem("typeform-force-motion", forceMotion ? "1" : "0"); } catch {}
  }, [forceMotion]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ answers }));
  }, [answers]);

  useEffect(() => {
    if (!started || submitted) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 330);
    return () => window.clearTimeout(timer);
  }, [started, submitted, index]);

  const question = started && !submitted ? getQuestionByIndex(index) : null;
  const value = question ? answers[question.id] ?? "" : "";
  const journeyLength = answers.goal === "physical_product" ? 6 : answers.goal === "subscription" ? 5 : 4;
  const currentStep = history.length + 1;
  const progress = useMemo(() => (started ? (currentStep / journeyLength) * 100 : 0), [started, currentStep, journeyLength]);

  async function submitToGoogleSheets(finalAnswers: AnswerMap) {
    try {
      const response = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: finalAnswers }),
      });
      const data = (await response.json().catch(() => null)) as
        | { ok: boolean; status?: string; error?: string }
        | null;
      if (data?.ok) {
        console.log(`[sheets] Response saved (${data.status ?? "created"}).`);
      } else {
        console.warn("[sheets] Submission not saved:", data?.error ?? `HTTP ${response.status}`);
      }
    } catch (error) {
      console.error("[sheets] Could not send answers to Google Sheets:", error);
    }
  }

  function begin() {
    setAnswers({});
    window.localStorage.removeItem(STORAGE_KEY);
    setStarted(true); setSubmitted(false); setSubmitting(false); setIndex(startQuestionIndex); setHistory([]); setError(null); setDirection(1);
  }

  function returnToWelcome() {
    setAnswers({});
    window.localStorage.removeItem(STORAGE_KEY);
    setStarted(false); setSubmitted(false); setSubmitting(false); setIndex(startQuestionIndex); setHistory([]); setError(null); setDirection(-1);
  }

  useEffect(() => {
    if (started) return;
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Enter") { event.preventDefault(); begin(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [started]);

  function next(answer?: string) {
    if (!question) return;
    const nextValue = answer ?? value;
    const validation = validateQuestion(question, nextValue);
    if (validation) { setError(validation); return; }
    setAnswers((current) => ({ ...current, [question.id]: nextValue }));
    setError(null);
    const nextIndex = resolveNextQuestionIndex(index, nextValue, answers);
    if (nextIndex === null) {
      const submitButton = document.querySelector<HTMLElement>("[data-submit-button]");
      const rect = submitButton?.getBoundingClientRect();
      if (rect) setSubmitOrigin({ x: rect.left + rect.width / 2 - window.innerWidth / 2, y: rect.top + rect.height / 2 - window.innerHeight / 2 });
      setSubmitting(true);
      // Send the answers to Google Sheets (fire-and-forget; never blocks the UX).
      void submitToGoogleSheets({ ...answers, [question.id]: nextValue });
      // keep submit transition duration just long enough for animations to finish
      window.setTimeout(() => { setSubmitting(false); setSubmitted(true); }, effectiveReducedMotion ? 0 : 2200);
      return;
    }
    setHistory((current) => [...current, index]);
    setDirection(1); setIndex(nextIndex);
  }

  function back() {
    setHistory((current) => {
      const previous = current.at(-1);
      if (previous === undefined) return current;
      setDirection(-1); setIndex(previous); setError(null);
      return current.slice(0, -1);
    });
  }

  function choose(choice: string) {
    setAnswers((current) => question ? { ...current, [question.id]: choice } : current);
    setError(null);
    window.setTimeout(() => next(choice), effectiveReducedMotion ? 0 : 170);
  }

  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (!question || question.type !== "multipleChoice") return;
      const choiceIndex = /^[1-9]$/.test(event.key) ? Number(event.key) - 1 : -1;
      const choice = question.options?.[choiceIndex];
      if (choice) { event.preventDefault(); choose(choice.value); }
      if (event.key === "Escape") back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [question, index, effectiveReducedMotion]);

  function onInputKeyDown(event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); next(); }
    if (event.key === "Escape") back();
  }

  const pageMotion = effectiveReducedMotion ? { duration: 0 } : { duration: 0.48, ease: [0.16, 1, 0.3, 1] as const };
  const slide = {
    initial: (d: number) => ({ opacity: 0, y: d > 0 ? 38 : -38, filter: "blur(8px)" }),
    animate: { opacity: 1, y: 0, filter: "blur(0px)", transition: pageMotion },
    exit: (d: number) => ({ opacity: 0, y: d > 0 ? -28 : 28, filter: "blur(4px)", transition: { duration: effectiveReducedMotion ? 0 : 0.24 } }),
  };

  return (
    <main className="form-shell">
      <div className="form-orb form-orb-one" /><div className="form-orb form-orb-two" />
      <section className="form-stage" aria-label="Interactive order form">
          <header className="form-header">
          <button type="button" className="quiet-button" onClick={back} disabled={!started || history.length === 0} aria-label="Go to previous question">← <span>Back</span></button>
          <div className="wordmark">INFORMATION <span>FORM</span></div>
          <div style={{display:'flex',gap:12,alignItems:'center'}}>
            <button type="button" className="motion-toggle" onClick={() => setForceMotion((v) => !v)} aria-pressed={forceMotion} aria-label={forceMotion ? "Disable forced motion" : "Enable forced motion"}>
              <span className="motion-toggle-knob">{forceMotion ? "⚡" : "—"}</span><span style={{marginLeft:6}}>{forceMotion ? "Effects Enabled" : "Effects Disabled"}</span>
            </button>
            <button type="button" className="theme-toggle" onClick={() => setTheme((current) => current === "dark" ? "light" : "dark")} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}>
              <span className="theme-toggle-knob">{theme === "dark" ? "◐" : "◑"}</span><span>{theme === "dark" ? "Light" : "Dark"}</span>
            </button>
          </div>
        </header>

        <div className="progress-wrap" aria-hidden="true"><motion.div className="progress-line" animate={{ width: `${submitted ? 100 : progress}%` }} transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }} /></div>

        <div className="form-content">
          <AnimatePresence mode="wait" custom={direction}>
            {!started ? <Intro key="intro" onBegin={begin} reducedMotion={effectiveReducedMotion} /> : null}
            {question ? <Question key={question.id} question={question} questionNumber={currentStep} value={value} answers={answers} error={error} inputRef={inputRef} direction={direction} slide={slide} onChange={(newValue) => { setAnswers((current) => ({ ...current, [question.id]: newValue })); setError(null); }} onChoose={choose} onNext={() => next()} onKeyDown={onInputKeyDown} /> : null}
            {submitted ? <Completion key="completion" onRestart={returnToWelcome} reducedMotion={effectiveReducedMotion} /> : null}
          </AnimatePresence>
          <AnimatePresence>{submitting ? <SubmitTransition key="submit-transition" origin={submitOrigin} reducedMotion={effectiveReducedMotion} /> : null}</AnimatePresence>
        </div>

        <footer className="form-footer">
          <span>Made by <a href="https://www.rishabhj.in" target="_blank" rel="noreferrer">Rishabh</a></span>
          <span className="desktop-hint">{question?.type === "multipleChoice" ? "Press 1–3 to choose" : "Enter to continue"}</span>
        </footer>
      </section>
    </main>
  );
}

function Intro({ onBegin, reducedMotion }: { onBegin: () => void; reducedMotion: boolean | null }) {
  return <motion.div className="intro" initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -18 }} transition={{ duration: reducedMotion ? 0 : 0.5 }}>
    <div className="intro-sculpture" aria-hidden="true"><span /><span /><i /></div>
    <p className="eyebrow">Welcome</p><h1>Test <em>Form </em>1</h1>
    <p className="intro-copy">This is a dummy form. Answer a few questions to explore the experience.</p>
    <motion.button type="button" className="start-button" onClick={onBegin} whileHover={reducedMotion ? undefined : { y: -4, scale: 1.035, rotateX: -7, rotateY: 5 }} whileTap={{ y: 1, scale: .97, rotateX: 6 }}><span className="start-button-orbit" aria-hidden="true" /><span className="start-button-label">Start form <b>↗</b></span></motion.button>
    <p className="key-hint"><kbd>Enter</kbd> to start</p>
  </motion.div>;
}

type QuestionProps = { question: NonNullable<ReturnType<typeof getQuestionByIndex>>; questionNumber: number; value: string; answers: AnswerMap; error: string | null; inputRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>; direction: 1 | -1; slide: Variants; onChange: (value: string) => void; onChoose: (value: string) => void; onNext: () => void; onKeyDown: (event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void };
function Question({ question, questionNumber, value, answers, error, inputRef, direction, slide, onChange, onChoose, onNext, onKeyDown }: QuestionProps) {
  return <motion.article className="question" custom={direction} variants={slide} initial="initial" animate="animate" exit="exit">
    <p className="eyebrow">Question {String(questionNumber).padStart(2, "0")}</p><h1>{question.prompt}</h1><p className="helper">{question.helper}</p>
    <div className="answer-area">
      {question.type === "multipleChoice" ? <div className="choices">{question.options?.map((option, optionIndex) => <motion.button key={option.value} type="button" className={`choice ${answers[question.id] === option.value ? "selected" : ""}`} onClick={() => onChoose(option.value)} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 + optionIndex * 0.07 }} whileHover={{ x: 4 }} whileTap={{ scale: 0.99 }}><span className="choice-key">{optionIndex + 1}</span><span><strong>{option.label}</strong><small>{option.description}</small></span><span className="choice-mark">✓</span></motion.button>)}</div> : question.multiline ? <textarea ref={inputRef as React.RefObject<HTMLTextAreaElement>} value={value} onChange={(event) => onChange(event.target.value)} onKeyDown={onKeyDown} placeholder={question.placeholder} aria-label={question.prompt} /> : <input ref={inputRef as React.RefObject<HTMLInputElement>} value={value} onChange={(event) => onChange(event.target.value)} onKeyDown={onKeyDown} placeholder={question.placeholder} inputMode={question.inputMode} aria-label={question.prompt} />}
      {question.type !== "multipleChoice" ? <div className="next-row"><span className={`validation ${error ? "is-error" : ""}`}>{error ?? "Your response is saved automatically"}</span><button type="button" className="next-button" onClick={onNext} data-submit-button={question.id === "story" || undefined}>{question.id === "story" ? "Submit" : "Continue"} <span>↵</span></button></div> : null}
    </div>
  </motion.article>;
}

function SubmitTransition({ origin, reducedMotion }: { origin: { x: number; y: number }; reducedMotion: boolean | null }) {
  const dots = Array.from({ length: 10 }, (_, index) => {
    const angle = (Math.PI * 2 * index) / 10;
    return { x: Math.cos(angle) * (52 + (index % 3) * 14), y: Math.sin(angle) * (52 + (index % 3) * 14), delay: index * 0.03 };
  });
  return <motion.div className="submit-transition" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
    <div className="conversion-grid" aria-hidden="true">{Array.from({ length: 12 }, (_, index) => <motion.i key={index} initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ delay: 0.32 + index * 0.03, duration: reducedMotion ? 0 : 0.34, ease: [0.22, 1, 0.36, 1] }} />)}</div>
    <motion.div className="submit-pod" initial={{ x: origin.x, y: origin.y, scale: 1, opacity: 1 }} animate={{ x: 0, y: 0, scale: .18, opacity: 0 }} transition={{ duration: reducedMotion ? 0 : .6, ease: [0.16, 1, 0.3, 1] }}>Submit <b>↵</b></motion.div>
    <motion.div className="dot-field" animate={reducedMotion ? {} : { rotate: 360 }} transition={{ delay: 0.5, duration: 2.4, ease: "linear" }}>
      {dots.map((dot, index) => <motion.span key={index} className="travel-dot" initial={{ x: origin.x, y: origin.y, scale: 0, opacity: 0 }} animate={{ x: [origin.x, 0, dot.x], y: [origin.y, 0, dot.y], scale: [0, 1.25, .62], opacity: [0, 1, 1] }} transition={{ duration: reducedMotion ? 0 : 0.9, delay: dot.delay, ease: [0.16, 1, 0.3, 1], times: [0, .52, 1] }} />)}</motion.div>
    <motion.div className="loading-core" initial={{ scale: 0, opacity: 0 }} animate={{ scale: [0, 1.25, 1], opacity: 1 }} transition={{ delay: reducedMotion ? 0 : .34, duration: reducedMotion ? 0 : .46, ease: [0.34, 1.56, 0.64, 1] }}><span /></motion.div>
    <motion.p className="transmitting" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: reducedMotion ? 0 : 0.8 }}>Sending your answers</motion.p>
  </motion.div>;
}

function Completion({ onRestart, reducedMotion }: { onRestart: () => void; reducedMotion: boolean | null }) {
  return <motion.article className="completion" initial={{ opacity: 0, scale: 0.82, rotateX: -20 }} animate={{ opacity: 1, scale: 1, rotateX: 0 }} transition={{ type: "spring", stiffness: 120, damping: 15 }}>
    <div className="completion-scene" aria-hidden="true"><motion.div className="orbital orbital-one" animate={reducedMotion ? {} : { rotate: 360 }} transition={{ repeat: Infinity, duration: 10, ease: "linear" }} /><motion.div className="orbital orbital-two" animate={reducedMotion ? {} : { rotate: -360 }} transition={{ repeat: Infinity, duration: 7, ease: "linear" }} /><motion.div className="core" initial={{ scale: 0 }} animate={{ scale: [0, 1.35, 1] }} transition={{ duration: reducedMotion ? 0 : 0.8, delay: 0.14 }}><span>✓</span></motion.div></div>
    <p className="eyebrow">Transmission complete</p><h1>We got it.</h1><p>Your answers have landed. Your completed form has been sent to our team for internal review and you will be contacted once the details are verified.</p>
    <button type="button" className="primary-button" onClick={onRestart}>Start again <span>↗</span></button>
  </motion.article>;
}
