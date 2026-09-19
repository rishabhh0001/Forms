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
  const rm = reducedMotion ?? false;

  const journeyLength = bconQuestionSchema.length;
  const currentStep = history.length + 1;
  const progress = useMemo(
    () => (started ? (currentStep / journeyLength) * 100 : 0),
    [started, currentStep, journeyLength],
  );

  async function submitForm(finalAnswers: AnswerMap, retries = 3) {
    let numPasses = 1;
    if (finalAnswers["ticket_type"] === "800") numPasses = 2;
    if (finalAnswers["ticket_type"] === "1500") numPasses = 4;

    const parseMulti = (val: string | undefined): string[] => {
      if (!val) return [];
      try {
        const parsed = JSON.parse(val);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
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
        payload["name"] = i === 0 ? (names[0] || "") : `${names[i] || ""} (Email: ${emails[i] || ""})`;
        payload["email"] = i === 0 ? (emails[0] || "") : "bcon-noreply@snu.edu.in";
        payload["phone"] = phones[i] || phones[0] || "";
        payload["roll_number"] = rollNumbers[i] || rollNumbers[0] || "";
      }

      const attempt = async (currentAttempt: number) => {
        try {
          const res = await fetch("/api/submit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ formId: FORM_ID, answers: payload }),
          });
          
          let collision = false;
          let duplicate = false;
          try {
             const data = await res.clone().json();
             if (data.status === "collision") collision = true;
             if (data.status === "duplicate") duplicate = true;
          } catch {}

          if (duplicate) {
            throw new Error("duplicate");
          }

          if ((!res.ok || collision) && currentAttempt < retries) {
            throw new Error("Retry");
          }
        } catch (err: any) {
          if (err.message === "duplicate") {
            throw err; // pass up to caller
          }
          if (currentAttempt < retries) {
            await new Promise(r => setTimeout(r, 1000 * Math.pow(2, currentAttempt))); // exponential backoff
            await attempt(currentAttempt + 1);
          } else {
            throw err;
          }
        }
      };
      
      // Await each submission with a small 1s stagger to prevent Apps Script row collisions
      await attempt(0);
      if (i < numPasses - 1) {
        await new Promise(r => setTimeout(r, 1200));
      }
    }
  }

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}");
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
             if (e.message === "duplicate") {
                setError("This email has already submitted a response.");
             } else {
                setError("Submission failed. Please check your network and try again.");
             }
          });
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
  } catch {}

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
    } catch {}
    return val;
  };

  const isMultiInput = ["name", "email", "phone", "roll_number"].includes(question.id);
  let numPasses = 1;
  if (answers["ticket_type"] === "800") numPasses = 2;
  if (answers["ticket_type"] === "1500") numPasses = 4;
  
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
        ) : question.type === "file" ? (
          <div className="bcon-file-upload">
            <div className="bcon-qr-container" style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
              <div className="bcon-qr-item" style={{ maxWidth: '220px', width: '100%', textAlign: 'center' }}>
                <div className="bcon-qr-box" style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
                  {(() => {
                    const firstName = getFirstAttendeeName().trim().split(/\s+/)[0];
                    const amount = answers["ticket_type"] || "450";
                    const upiUri = `upi://pay?pa=8595144095@slc&pn=Business%20Conclave&cu=INR&tn=${firstName}_BCON26&am=${amount}`;
                    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=2&ecc=H&data=${encodeURIComponent(upiUri)}`;
                    return (
                      <img src={qrUrl} alt="Payment QR Code" style={{ display: 'block', width: '100%', height: 'auto', borderRadius: '8px' }} onError={(e) => e.currentTarget.style.display = 'none'} />
                    );
                  })()}
                </div>
                <span className="bcon-qr-label" style={{ marginTop: '12px', display: 'block', fontWeight: 600 }}>
                  Scan to Pay ₹{answers["ticket_type"] || "450"}
                </span>
              </div>
            </div>

            <div className="bcon-mobile-upi">
              <div className="bcon-mobile-upi-divider">
                <div className="bcon-mobile-upi-line"></div>
                <span className="bcon-mobile-upi-text">QR</span>
                <div className="bcon-mobile-upi-line"></div>
              </div>
              {(() => {
                const firstName = getFirstAttendeeName().trim().split(/\s+/)[0];
                const amount = answers["ticket_type"] || "450";
                const upiUri = `upi://pay?pa=vansh1310@oksbi&pn=Business%20Conclave&cu=INR&tn=${firstName}_BCON26&am=${amount}`;
                return (
                  <a
                    href={upiUri}
                    className="bcon-mobile-upi-btn"
                  >
                    Pay ₹{amount} with UPI <span>↗</span>
                  </a>
                );
              })()}
              <p className="bcon-mobile-upi-hint">Mobile only - opens your chosen UPI app</p>
            </div>

            <input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              type="file"
              accept="image/*"
              className="bcon-input"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;

                setUploading(true);
                try {
                  const ext = file.name.split('.').pop();
                  const safeName = getFirstAttendeeName().replace(/[^a-zA-Z0-9]/g, "_");
                  const filename = `${safeName}_${Date.now()}.${ext}`;

                  // Convert and compress file to base64
                  const base64 = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (e) => {
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
                          resolve((e.target?.result as string).split(",")[1]);
                          return;
                        }
                        ctx.drawImage(img, 0, 0, width, height);

                        // Use JPEG compression to reduce size and handle heavy traffic easily
                        const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
                        resolve(dataUrl.split(",")[1]);
                      };
                      img.onerror = reject;
                      img.src = e.target?.result as string;
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                  });

                  const res = await fetch("/api/upload", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      filename,
                      mimeType: file.type,
                      base64,
                    }),
                  });

                  const data = await res.json();
                  if (!res.ok || !data.ok) throw new Error(data.error || "Upload failed");

                  const fileUrl = data.url || data.fileUrl || data.link || data.webViewLink || (Object.values(data).find(v => typeof v === 'string' && v.startsWith('http'))) || "Upload successful";
                  onChange(fileUrl as string);
                } catch (err: any) {
                  console.error("Upload failed", err);
                  if (err.message && err.message.includes("Access denied: DriveApp")) {
                    alert("Drive uplink permissions error. Please contact rj910@snu.edu.in with a screenshot of this message.");
                  } else {
                    alert("Upload failed. Please try again within a few seconds.");
                  }
                } finally {
                  setUploading(false);
                }
              }}
              aria-label={question.prompt}
              style={{ display: value ? 'none' : 'block', cursor: 'pointer', marginTop: 16 }}
            />
            {value && (
              <div style={{ marginTop: 16 }}>
                <img src={value} alt="Preview" style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8, objectFit: 'contain', border: '1px solid var(--line)' }} />
                <button
                  type="button"
                  onClick={() => onChange("")}
                  style={{ display: 'block', marginTop: 8, color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, textDecoration: 'underline' }}
                >
                  Remove image (Preview might not render properly don&apos;t worry about it.)
                </button>
              </div>
            )}
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
