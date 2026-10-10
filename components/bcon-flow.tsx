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
  bconQuestionSchema,
} from "../lib/flow";
import UploadIcon from "./icons/upload-icon";
import "./bcon.css";

const STORAGE_KEY = "bcon-flow";
const FORM_ID = "bcon";

export function BconFlow() {
  const [started, setStarted] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitOrigin, setSubmitOrigin] = useState({ x: 0, y: 150 });
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [index, setIndex] = useState(startQuestionIndex);
  const [history, setHistory] = useState<number[]>([]);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const reducedMotion = useReducedMotion();
  const advancingRef = useRef(false);
  const rm = false; // Override reduced motion to ensure animations play

  const journeyLength = bconQuestionSchema.length;
  const currentStep = history.length + 1;
  const progress = useMemo(
    () => (started ? (currentStep / journeyLength) * 100 : 0),
    [started, currentStep, journeyLength],
  );

  async function submitForm(finalAnswers: AnswerMap, retries = 3) {
    let numPasses = 1;
    if (finalAnswers["ticket_type"] === "899") numPasses = 2;
    if (finalAnswers["ticket_type"] === "1599") numPasses = 4;

    const parseMulti = (val: string | undefined): string[] => {
      if (!val) return [];
      try {
        const parsed = JSON.parse(val);
        if (Array.isArray(parsed)) return parsed;
      } catch { }
      return [val];
    };

    const names = parseMulti(finalAnswers["name"]);
    const emails = parseMulti(finalAnswers["email"]);
    const phones = parseMulti(finalAnswers["phone"]);
    const rollNumbers = parseMulti(finalAnswers["roll_number"]);

    for (let i = 0; i < numPasses; i++) {
      const payload = { ...finalAnswers };
      if (numPasses > 1) {
        payload["ticket_type"] = `${finalAnswers["ticket_type"]} - Attendee ${i + 1}`;
        payload["name"] = names[i] || names[0] || "";
        payload["email"] = emails[i] || emails[0] || "";
        payload["phone"] = phones[i] || phones[0] || "";
        payload["roll_number"] = rollNumbers[i] || rollNumbers[0] || "";
      }

      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formId: FORM_ID, answers: payload }),
      });

      let collision = false;
      let errorMessage = "Unknown server error";
      try {
        const data = await res.json();
        if (data.status === "collision") collision = true;
        if (data.error) errorMessage = data.error;
      } catch { }

      if (!res.ok || collision) {
        throw new Error(errorMessage);
      }
      if (i < numPasses - 1) {
        await new Promise(r => setTimeout(r, 1200));
      }
    }
  }

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}");

      // Prevent old cached data ("conference" or "dj_night") from being submitted
      if (saved.answers && (saved.answers["ticket_type"] === "conference" || saved.answers["ticket_type"] === "dj_night")) {
        window.localStorage.removeItem(STORAGE_KEY);
        return;
      }

      if (saved.answers && Object.keys(saved.answers).length > 0) setAnswers(saved.answers);
      if (saved.index !== undefined) setIndex(saved.index);
      if (saved.history) setHistory(saved.history);
      if (saved.started) setStarted(saved.started);
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (submitted) {
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ answers, index, history, started }));
  }, [answers, index, history, started, submitted]);

  useEffect(() => {
    if (!started || submitted) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 330);
    return () => window.clearTimeout(t);
  }, [started, submitted, index]);

  const question = started && !submitted ? getQuestionByIndex(bconQuestionSchema, index) : null;
  const value = question ? (answers[question.id] ?? "") : "";



  function begin() {
    setStarted(true); setSubmitted(false); setSubmitting(false);
    setError(null);
    setDirection(1);
  }

  function returnToWelcome() {
    setAnswers({});
    window.localStorage.removeItem(STORAGE_KEY);
    setStarted(false); setSubmitted(false); setSubmitting(false);
    setIndex(startQuestionIndex); setHistory([]); setError(null);
    setDirection(-1);
    advancingRef.current = false;
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
      if (validation) { setError(validation); advancingRef.current = false; return; }

      // Email checking is disabled for now
      // if (question.id === "email") {
      //   ... logic removed
      // }

      setAnswers((prev: AnswerMap) => ({ ...prev, [question.id]: nextValue }));
      setError(null);
      const nextIndex = resolveNextQuestionIndex(bconQuestionSchema, index, nextValue, answers);
      if (nextIndex === null) {
        const btn = document.querySelector<HTMLElement>("[data-submit-button]");
        const rect = btn?.getBoundingClientRect();
        if (rect) setSubmitOrigin({
          x: rect.left + rect.width / 2 - window.innerWidth / 2,
          y: rect.top + rect.height / 2 - window.innerHeight / 2,
        });
        setSubmitting(true);
        submitForm({ ...answers, [question.id]: nextValue })
          .then(() => {
            window.setTimeout(() => { setSubmitting(false); setSubmitted(true); }, rm ? 0 : 2200);
          })
          .catch((e: any) => {
            setSubmitting(false);
            const msg = e.message || "Unknown error";
            setError(`Submission failed: ${msg}. Please take a screenshot and message +91 8826854528`);
            advancingRef.current = false;
          });
        return; // Do not reset advancingRef.current here so it prevents further submissions
      }
      setHistory((prev: number[]) => [...prev, index]);
      setDirection(1); setIndex(nextIndex);
      advancingRef.current = false;
    } catch {
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
      const ch = question.options?.[idx];
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

  const pageMotion = rm ? { duration: 0 } : { type: "spring", stiffness: 220, damping: 25, mass: 1 };
  const slide: Variants = {
    initial: (d: number) => ({ opacity: 0, y: d > 0 ? 50 : -50, scale: 0.96, rotateX: d > 0 ? 4 : -4, filter: "blur(12px)" }),
    animate: { opacity: 1, y: 0, scale: 1, rotateX: 0, filter: "blur(0px)", transition: pageMotion },
    exit: (d: number) => ({ opacity: 0, y: d > 0 ? -30 : 30, scale: 0.98, rotateX: d > 0 ? -2 : 2, filter: "blur(6px)", transition: { duration: rm ? 0 : 0.2, ease: "easeIn" } }),
  };

  let userEmail = answers["email"] ?? "";
  try {
    const parsed = JSON.parse(userEmail);
    if (Array.isArray(parsed) && parsed.length > 0) {
      userEmail = parsed[0];
    }
  } catch { }

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
            {!started && !submitted
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

      {process.env.NODE_ENV === "development" && (
        <button
          onClick={() => {
            setSubmitOrigin({ x: 0, y: 0 });
            setSubmitting(true);
            setTimeout(() => { setSubmitting(false); setSubmitted(true); }, 3000);
          }}
          style={{ position: "fixed", bottom: 20, right: 20, zIndex: 9999, padding: "8px 12px", background: "#222", color: "white", borderRadius: "6px", fontSize: "12px", cursor: "pointer", border: "1px solid #444", fontWeight: 600 }}
        >
          Test Anim
        </button>
      )}
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
          height: "clamp(48px, 7.9vw, 97px)",
          maxHeight: "100%",
          objectFit: "contain",
          transform: "translateY(-4px)"
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
  inputRef, direction, slide,
  onChange, onChoose, onNext, onKeyDown,
}: BconQuestionProps) {
  const [uploading, setUploading] = useState(false);
  const hint = uploading ? "Uploading..." : error ?? "Saved automatically";
  const hintClass = error ? "bcon-is-error" : "";

  const getFirstAttendeeName = () => {
    const val = answers["name"];
    if (!val) return "User";
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed[0];
    } catch { }
    return val;
  };

  const isMultiInput = ["name", "email", "phone", "roll_number"].includes(question.id);
  let numPasses = 1;
  if (answers["ticket_type"] === "899") numPasses = 2;
  if (answers["ticket_type"] === "1599") numPasses = 4;

  let multiValues = [value];
  if (isMultiInput && numPasses > 1) {
    try {
      const parsed = JSON.parse(value || "[]");
      multiValues = Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      multiValues = value ? [value] : [];
    }
    while (multiValues.length < numPasses) multiValues.push("");
  }

  const handleMultiChange = (index: number, newValue: string) => {
    if (isMultiInput && numPasses > 1) {
      const newArr = [...multiValues];
      newArr[index] = newValue;
      onChange(JSON.stringify(newArr));
    } else {
      onChange(newValue);
    }
  };

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
      <p className="bcon-helper">
        {question.helper.split(/(\+91\s?\d{10})/).map((part, i) =>
          part.match(/\+91\s?\d{10}/) ? (
            <a key={i} href={`tel:${part.replace(/\s/g, "")}`} style={{ fontWeight: "bold", color: "inherit", textDecoration: "underline" }}>
              {part}
            </a>
          ) : (
            part
          )
        )}
      </p>

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
        ) : question.type === "file" ? (
          <BconFileUpload
            question={question}
            value={value}
            answers={answers}
            getFirstAttendeeName={getFirstAttendeeName}
            uploading={uploading}
            setUploading={setUploading}
            onChange={onChange}
          />
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
        ) : isMultiInput && numPasses > 1 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '45vh', overflowY: 'auto', paddingRight: '6px', paddingBottom: '4px' }}>
            {multiValues.map((v, i) => (
              <div key={i}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Attendee {i + 1}
                </label>
                <input
                  ref={i === 0 ? (inputRef as React.RefObject<HTMLInputElement>) : null}
                  className="bcon-input"
                  value={v}
                  onChange={(e) => handleMultiChange(i, e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder={question.placeholder}
                  inputMode={question.inputMode}
                  aria-label={`${question.prompt} for Attendee ${i + 1}`}
                />
              </div>
            ))}
          </div>
        ) : (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            className="bcon-input"
            value={value}
            onChange={(e) => handleMultiChange(0, e.target.value)}
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

type BconFileUploadProps = {
  question: NonNullable<ReturnType<typeof getQuestionByIndex>>;
  value: string;
  answers: AnswerMap;
  getFirstAttendeeName: () => string;
  uploading: boolean;
  setUploading: (v: boolean) => void;
  onChange: (v: string) => void;
};

function BconFileUpload({
  question, value, answers, getFirstAttendeeName,
  uploading, setUploading, onChange,
}: BconFileUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [fileName, setFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressRef = useRef<number | null>(null);

  // Reset state when value is cleared
  useEffect(() => {
    if (!value && uploadState === "success") {
      setUploadState("idle");
      setUploadProgress(0);
      setFileName("");
    }
  }, [value, uploadState]);

  // Fake progress animation during upload
  const startFakeProgress = () => {
    setUploadProgress(0);
    let current = 0;
    const tick = () => {
      current += Math.random() * 12 + 3;
      if (current > 88) current = 88 + Math.random() * 2;
      if (current >= 90) { current = 90; return; }
      setUploadProgress(Math.min(current, 90));
      progressRef.current = window.requestAnimationFrame(() => {
        window.setTimeout(tick, 120 + Math.random() * 180);
      });
    };
    tick();
  };

  const stopFakeProgress = (success: boolean) => {
    if (progressRef.current) {
      window.cancelAnimationFrame(progressRef.current);
      progressRef.current = null;
    }
    if (success) {
      setUploadProgress(100);
    }
  };

  const handleFiles = async (file: File) => {
    setFileName(file.name);
    setUploadState("uploading");
    setErrorMsg("");
    setUploading(true);
    startFakeProgress();

    try {
      const safeName = getFirstAttendeeName().replace(/[^a-zA-Z0-9]/g, "_");

      // Convert and compress file to base64
      const { finalBase64, finalFilename, finalMimeType } = await new Promise<{finalBase64: string, finalFilename: string, finalMimeType: string}>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement("canvas");
            const maxWidth = 1200;
            let { width, height } = img;
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            if (!ctx) {
              // If canvas fails, we fall back to original file
              const result = ev.target?.result as string;
              const ext = file.name.split('.').pop() || "png";
              resolve({
                finalBase64: result.includes(",") ? result.split(",")[1] : result,
                finalFilename: `${safeName}_${Date.now()}.${ext}`,
                finalMimeType: file.type
              });
              return;
            }
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
            resolve({
              finalBase64: dataUrl.split(",")[1],
              finalFilename: `${safeName}_${Date.now()}.jpg`,
              finalMimeType: "image/jpeg"
            });
          };
          img.onerror = reject;
          img.src = ev.target?.result as string;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: finalFilename, mimeType: finalMimeType, base64: finalBase64 }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Upload failed");

      const fileUrl = data.url || data.fileUrl || data.link || data.webViewLink
        || (Object.values(data).find(v => typeof v === 'string' && v.startsWith('http')))
        || "Upload successful";

      stopFakeProgress(true);
      await new Promise(r => setTimeout(r, 400));
      setUploadState("success");
      onChange(fileUrl as string);
    } catch (err: any) {
      console.error("Upload failed", err);
      stopFakeProgress(false);
      setUploadState("error");
      if (err.message?.includes("Access denied: DriveApp")) {
        setErrorMsg("Drive permissions error. Please take a screenshot and message +91 8826854528");
      } else {
        const baseMsg = err.message || "Upload failed. Please try again.";
        setErrorMsg(`${baseMsg} - Please take a screenshot and message +91 8826854528`);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) handleFiles(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const circleR = 38;
  const circleC = 2 * Math.PI * circleR;
  const dashOffset = circleC - (uploadProgress / 100) * circleC;

  return (
    <div className="bcon-file-upload">
      {/* QR Code Section */}
      <div className="bcon-qr-container" style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
        <div className="bcon-qr-item" style={{ maxWidth: '220px', width: '100%', textAlign: 'center' }}>
          <div className="bcon-qr-box" style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
            {(() => {
              const firstName = getFirstAttendeeName().trim().split(/\s+/)[0];
              const amount = answers["ticket_type"] || "499";
              const upiUri = `upi://pay?pa=vansh1310@oksbi&pn=Business%20Conclave&cu=INR&tn=${firstName}_BCON26&am=${amount}`;
              const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=2&ecc=H&data=${encodeURIComponent(upiUri)}`;
              return (
                <img src={qrUrl} alt="Payment QR Code" style={{ display: 'block', width: '100%', height: 'auto', borderRadius: '8px' }} onError={(e) => e.currentTarget.style.display = 'none'} />
              );
            })()}
          </div>
          <span className="bcon-qr-label" style={{ marginTop: '12px', display: 'block', fontWeight: 600 }}>
            Scan to Pay ₹{answers["ticket_type"] || "499"}
          </span>
        </div>
      </div>

      {/* Mobile UPI */}
      <div className="bcon-mobile-upi">
        <div className="bcon-mobile-upi-divider">
          <div className="bcon-mobile-upi-line" />
          <span className="bcon-mobile-upi-text">QR</span>
          <div className="bcon-mobile-upi-line" />
        </div>
        {(() => {
          const firstName = getFirstAttendeeName().trim().split(/\s+/)[0];
          const amount = answers["ticket_type"] || "499";
          const upiUri = `upi://pay?pa=vansh1310@oksbi&pn=Business%20Conclave&cu=INR&tn=${firstName}_BCON26&am=${amount}`;
          return (
            <a href={upiUri} className="bcon-mobile-upi-btn">
              Pay ₹{amount} with UPI <span>↗</span>
            </a>
          );
        })()}
        <p className="bcon-mobile-upi-hint">Mobile only - opens your chosen UPI app</p>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="bcon-upload-hidden-input"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFiles(file);
        }}
        aria-label={question.prompt}
      />

      {/* Animated Upload Zone */}
      <AnimatePresence mode="wait">
        {value && uploadState === "success" ? (
          /* ── Success State ── */
          <motion.div
            key="upload-success"
            className="bcon-upload-zone bcon-upload-success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            <div className="bcon-upload-success-inner">
              <motion.div
                className="bcon-upload-check-wrap"
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 12, delay: 0.1 }}
              >
                <svg className="bcon-upload-check-svg" viewBox="0 0 52 52" fill="none">
                  <motion.circle
                    cx="26" cy="26" r="24"
                    stroke="var(--bcon-success)"
                    strokeWidth="2.5"
                    fill="none"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  />
                  <motion.path
                    d="M15 26.5L22 33.5L37 18.5"
                    stroke="var(--bcon-success)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.35, delay: 0.35, ease: "easeOut" }}
                  />
                </svg>
                {/* Success particles */}
                {Array.from({ length: 6 }).map((_, i) => (
                  <motion.span
                    key={i}
                    className="bcon-upload-particle"
                    initial={{ opacity: 1, scale: 1, x: 0, y: 0 }}
                    animate={{
                      opacity: 0,
                      scale: 0,
                      x: Math.cos((Math.PI * 2 * i) / 6) * 40,
                      y: Math.sin((Math.PI * 2 * i) / 6) * 40,
                    }}
                    transition={{ duration: 0.6, delay: 0.3 + i * 0.04, ease: "easeOut" }}
                  />
                ))}
              </motion.div>
              <motion.p
                className="bcon-upload-label"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                Screenshot uploaded!
              </motion.p>
              <motion.p
                className="bcon-upload-filename"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.6 }}
                transition={{ delay: 0.6 }}
              >
                {fileName || "Payment proof received"}
              </motion.p>
              <motion.button
                type="button"
                className="bcon-upload-remove-btn"
                onClick={() => { onChange(""); setUploadState("idle"); setFileName(""); }}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14" />
                </svg>
                Replace screenshot
              </motion.button>
            </div>
          </motion.div>
        ) : uploadState === "uploading" ? (
          /* ── Upload Progress State ── */
          <motion.div
            key="upload-progress"
            className="bcon-upload-zone bcon-upload-uploading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="bcon-upload-progress-inner">
              <div className="bcon-upload-ring-wrap">
                <svg className="bcon-upload-ring-svg" viewBox="0 0 88 88">
                  {/* Background track */}
                  <circle
                    cx="44" cy="44" r={circleR}
                    fill="none"
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth="4"
                  />
                  {/* Progress arc */}
                  <motion.circle
                    cx="44" cy="44" r={circleR}
                    fill="none"
                    stroke="url(#uploadGradient)"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={circleC}
                    strokeDashoffset={dashOffset}
                    transform="rotate(-90 44 44)"
                    style={{ transition: "stroke-dashoffset 0.3s ease" }}
                  />
                  <defs>
                    <linearGradient id="uploadGradient" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="var(--bcon-magenta)" />
                      <stop offset="50%" stopColor="var(--bcon-violet)" />
                      <stop offset="100%" stopColor="var(--bcon-gold)" />
                    </linearGradient>
                  </defs>
                </svg>
                {/* Percentage text */}
                <span className="bcon-upload-ring-pct">{Math.round(uploadProgress)}%</span>
                {/* Orbiting dot */}
                <motion.div
                  className="bcon-upload-orbit-dot"
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                />
              </div>
              <motion.p
                className="bcon-upload-label"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                Uploading screenshot…
              </motion.p>
              <p className="bcon-upload-filename" style={{ opacity: 0.5 }}>{fileName}</p>
            </div>
          </motion.div>
        ) : uploadState === "error" ? (
          /* ── Error State ── */
          <motion.div
            key="upload-error"
            className="bcon-upload-zone bcon-upload-error"
            initial={{ opacity: 0, x: 0 }}
            animate={{ opacity: 1, x: [0, -8, 8, -6, 6, -3, 3, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
          >
            <div className="bcon-upload-error-inner">
              <svg className="bcon-upload-error-icon" viewBox="0 0 48 48" fill="none">
                <circle cx="24" cy="24" r="22" stroke="var(--bcon-danger)" strokeWidth="2.5" fill="none" opacity="0.3" />
                <path d="M16 16L32 32M32 16L16 32" stroke="var(--bcon-danger)" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
              <p className="bcon-upload-label" style={{ color: "var(--bcon-danger)" }}>Upload failed</p>
              <p className="bcon-upload-error-msg">{errorMsg}</p>
              <motion.button
                type="button"
                className="bcon-upload-retry-btn"
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M1 4v6h6M23 20v-6h-6" />
                  <path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" />
                </svg>
                Try again
              </motion.button>
            </div>
          </motion.div>
        ) : (
          /* ── Idle / Drop Zone ── */
          <motion.div
            key="upload-idle"
            className={`bcon-upload-zone bcon-upload-idle ${dragOver ? "bcon-upload-dragover" : ""}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
            aria-label="Upload payment screenshot"
          >
            <div className="bcon-upload-idle-inner">
              <motion.div
                className="bcon-upload-icon-wrap"
                animate={dragOver ? { scale: 1.15, y: -4 } : { scale: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 15 }}
              >
                <UploadIcon
                  size={32}
                  color="url(#cloudGrad)"
                  className="bcon-upload-cloud-svg"
                />
                <svg width="0" height="0">
                  <defs>
                    <linearGradient id="cloudGrad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="var(--bcon-magenta)" />
                      <stop offset="50%" stopColor="var(--bcon-violet)" />
                      <stop offset="100%" stopColor="var(--bcon-mauve)" />
                    </linearGradient>
                  </defs>
                </svg>
              </motion.div>

              <motion.div
                style={{ display: "flex", flexDirection: "row", gap: "6px", alignItems: "baseline", flexWrap: "wrap", justifyContent: "center" }}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <p className="bcon-upload-label" style={{ margin: 0 }}>
                  {dragOver ? "Drop it here" : "Drop screenshot here"}
                </p>
                <p className="bcon-upload-sublabel" style={{ margin: 0 }}>
                  or click to browse <span style={{ opacity: 0.6, marginLeft: "4px" }}>• PNG, JPG, WEBP</span>
                </p>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
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
      <motion.div className="bcon-dot-field" initial={{ rotate: 0 }} animate={rm ? {} : { rotate: 360 }} transition={{ duration: 3, ease: "linear", repeat: Infinity }}>
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
