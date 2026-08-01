"use client";

import { AnimatePresence, motion } from "framer-motion";
import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  AnswerMap,
  getQuestionByIndex,
  questionSchema,
  resolveNextQuestionIndex,
  startQuestionIndex,
  totalQuestions,
  validateQuestion,
} from "../lib/flow";

const STORAGE_KEY = "typeform-flow-demo";

function isValidIndex(value: number) {
  return Number.isInteger(value) && value >= 0 && value < questionSchema.length;
}

export function TypeformFlow() {
  const [hasStarted, setHasStarted] = useState(false);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(startQuestionIndex);
  const [history, setHistory] = useState<number[]>([]);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [error, setError] = useState<string | null>(null);
  const [typingTick, setTypingTick] = useState(0);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);

    if (!stored) {
      return;
    }

    try {
      const parsed = JSON.parse(stored) as { answers?: AnswerMap };
      if (parsed.answers) {
        setAnswers(parsed.answers);
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ answers }));
  }, [answers]);

  useEffect(() => {
    if (!hasStarted) {
      return;
    }

    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 160);

    return () => window.clearTimeout(timer);
  }, [hasStarted, currentQuestionIndex]);

  useEffect(() => {
    if (!hasStarted) {
      return;
    }

    setTypingTick((value) => value + 1);
  }, [hasStarted, currentQuestionIndex]);

  const currentQuestion = hasStarted ? getQuestionByIndex(currentQuestionIndex) : null;
  const currentValue = currentQuestion ? answers[currentQuestion.id] ?? "" : "";
  const questionNumber = currentQuestionIndex + 1;
  const progressPercent = useMemo(
    () => (hasStarted ? Math.max(0, (questionNumber / totalQuestions) * 100) : 0),
    [hasStarted, questionNumber],
  );
  const isFinalStep = Boolean(currentQuestion) && currentQuestionIndex === totalQuestions - 1;
  const activeQuestion = currentQuestion;

  function resetToStart() {
    setHasStarted(true);
    setAnswers({});
    setCurrentQuestionIndex(startQuestionIndex);
    setHistory([]);
    setDirection(1);
    setError(null);
  }

  function goNext(nextValue?: string) {
    if (!currentQuestion) {
      return;
    }

    const value = nextValue ?? currentValue;
    const validationError = validateQuestion(currentQuestion, value);

    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setAnswers((previous) => ({ ...previous, [currentQuestion.id]: value }));

    const nextQuestionIndex = resolveNextQuestionIndex(currentQuestionIndex, value, answers);
    if (nextQuestionIndex === null) {
      return;
    }

    setHistory((previous) => [...previous, currentQuestionIndex]);
    setDirection(1);
    setCurrentQuestionIndex(nextQuestionIndex);
  }

  function goBack() {
    setHistory((previous) => {
      if (previous.length === 0) {
        return previous;
      }

      const nextHistory = [...previous];
      const previousIndex = nextHistory.pop();

      if (typeof previousIndex !== "number") {
        return previous;
      }

      setError(null);
      setDirection(-1);
      setCurrentQuestionIndex(previousIndex);
      return nextHistory;
    });
  }

  function handleChoice(choiceValue: string) {
    if (!currentQuestion) {
      return;
    }

    setAnswers((previous) => ({ ...previous, [currentQuestion.id]: choiceValue }));
    setError(null);
    window.setTimeout(() => goNext(choiceValue), 140);
  }

  useEffect(() => {
    function handleChoiceShortcut(event: globalThis.KeyboardEvent) {
      if (!hasStarted || !currentQuestion || currentQuestion.type !== "multipleChoice" || !currentQuestion.options) {
        return;
      }

      const key = event.key.toLowerCase();
      const index = key >= "1" && key <= "9" ? Number(key) - 1 : key >= "a" && key <= "z" ? key.charCodeAt(0) - 97 : -1;
      const option = currentQuestion.options[index];

      if (option) {
        event.preventDefault();
        handleChoice(option.value);
      }
    }

    window.addEventListener("keydown", handleChoiceShortcut);
    return () => window.removeEventListener("keydown", handleChoiceShortcut);
  }, [hasStarted, currentQuestion, currentQuestionIndex]);

  function handleKeyboard(event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      goNext();
    }

    if (event.key === "Escape") {
      goBack();
    }
  }

  const slideVariants = {
    initial: (slideDirection: number) => ({
      opacity: 0,
      y: slideDirection > 0 ? 42 : -42,
      scale: 0.98,
    }),
    animate: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.42, ease: [0.16, 1, 0.3, 1] },
    },
    exit: (slideDirection: number) => ({
      opacity: 0,
      y: slideDirection > 0 ? -30 : 30,
      scale: 0.985,
      transition: { duration: 0.26, ease: [0.4, 0, 0.2, 1] },
    }),
  };

  const promptVariants = {
    initial: { opacity: 0, y: 12, filter: "blur(8px)" },
    animate: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: { duration: 0.34, ease: [0.16, 1, 0.3, 1] },
    },
  };

  const optionVariants = {
    initial: { opacity: 0, y: 14 },
    animate: (index: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: 0.08 + index * 0.07, duration: 0.28, ease: [0.16, 1, 0.3, 1] },
    }),
    tap: { scale: 0.985 },
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-6 sm:px-6 lg:px-10">
      <div className="pointer-events-none absolute inset-0 opacity-35 [background-image:linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] [background-size:88px_88px]" />
      <div className="bg-drift pointer-events-none absolute left-[10%] top-[12%] h-[18rem] w-[18rem] rounded-full bg-[radial-gradient(circle,rgba(110,168,255,0.28),transparent_68%)] blur-3xl" />
      <div className="bg-drift pointer-events-none absolute right-[10%] top-[18%] h-[22rem] w-[22rem] rounded-full bg-[radial-gradient(circle,rgba(154,215,255,0.18),transparent_70%)] [animation-delay:-6s] blur-3xl" />

      <section className="relative flex min-h-[calc(100vh-1.5rem)] w-full max-w-4xl overflow-hidden rounded-[2rem] border border-white/10 bg-[rgba(255,255,255,0.04)] shadow-[0_24px_90px_rgba(0,0,0,0.42)] backdrop-blur-2xl">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.05),transparent_30%,rgba(255,255,255,0.02)_70%,transparent)]" />
        <div className="pointer-events-none absolute inset-0 rounded-[2rem] border border-white/5" />

        <div className="relative flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between px-5 pt-5 sm:px-8 sm:pt-6">
            <button
              type="button"
              onClick={goBack}
              disabled={!hasStarted || history.length === 0}
              className="rounded-full border border-white/10 bg-[rgba(255,255,255,0.04)] px-4 py-2 text-[11px] font-medium uppercase tracking-[0.22em] text-[var(--foreground)] transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-35"
            >
              Back
            </button>
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-white/45">
              <span>{hasStarted ? `Q${questionNumber}` : "Start"}</span>
              <span className="h-px w-10 bg-white/15" />
              <span>{hasStarted ? `0${totalQuestions}`.slice(-2) : "Intro"}</span>
            </div>
          </div>

          <div className="px-5 pt-4 sm:px-8">
            <div className="h-px w-full overflow-hidden bg-white/8">
              <div
                className="h-full bg-[linear-gradient(90deg,#6ea8ff,#9ad7ff)] transition-[width] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
                style={{ width: hasStarted ? `${progressPercent}%` : "0%" }}
              />
            </div>
          </div>

          <div className="relative flex flex-1 items-center justify-center px-5 py-8 sm:px-8 sm:py-10 lg:px-12">
            <AnimatePresence mode="wait" initial={false} custom={direction}>
              {!hasStarted ? (
                <motion.div
                  key="start-screen"
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -18 }}
                  transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
                  className="shine-sweep relative w-full max-w-3xl overflow-hidden rounded-[2rem] border border-white/10 bg-[rgba(255,255,255,0.05)] px-6 py-10 shadow-[0_20px_80px_rgba(0,0,0,0.25)] sm:px-10 sm:py-14"
                >
                  <div className="space-y-4 text-center">
                    <div className="text-[11px] uppercase tracking-[0.4em] text-white/45">Checkout registration</div>
                    <h1 className="mx-auto max-w-2xl font-['Cormorant_Garamond',serif] text-5xl leading-[0.92] tracking-[-0.035em] text-[var(--foreground)] sm:text-6xl lg:text-7xl">
                      Welcome to the form.
                    </h1>
                    <p className="mx-auto max-w-2xl text-sm leading-6 text-white/60 sm:text-base">
                      Reserve your spot, complete the dummy checkout, and keep the flow moving one screen at a time.
                    </p>
                  </div>

                  <div className="mt-10 flex flex-col items-center gap-3">
                    <button
                      type="button"
                      onClick={resetToStart}
                      className="rounded-[0.9rem] bg-[#2b232d] px-7 py-3 text-sm font-semibold text-white transition hover:bg-[#342a36]"
                    >
                      Fill form
                    </button>
                    <div className="flex items-center gap-2 text-sm text-white/60">
                      <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-white/35 text-[10px]">⏱</span>
                      <span>Takes a few minutes</span>
                    </div>
                  </div>
                </motion.div>
              ) : activeQuestion ? (
                  <motion.div
                    key={activeQuestion.id}
                    custom={direction}
                    variants={slideVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className="shine-sweep relative w-full max-w-3xl overflow-hidden rounded-[2rem] border border-white/10 bg-[rgba(255,255,255,0.04)] px-6 py-8 shadow-[0_20px_80px_rgba(0,0,0,0.25)] sm:px-10 sm:py-10"
                  >
                  <div className="mb-6 flex items-center gap-2 text-[11px] uppercase tracking-[0.35em] text-white/45">
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-white/80">Q{questionNumber}</span>
                    <span>{activeQuestion.eyebrow}</span>
                  </div>

                  <motion.div
                    key={`${activeQuestion.id}-prompt-${typingTick}`}
                    variants={promptVariants}
                    initial="initial"
                    animate="animate"
                    className="space-y-2"
                  >
                    <h1 className="max-w-2xl font-['Cormorant_Garamond',serif] text-5xl leading-[0.92] tracking-[-0.035em] text-[var(--foreground)] sm:text-6xl lg:text-7xl">
                      {activeQuestion.prompt}
                    </h1>
                    <p className="max-w-2xl text-sm leading-6 text-white/60 sm:text-base">{activeQuestion.helper}</p>
                  </motion.div>

                  <div className="mt-10 space-y-4 sm:mt-12">
                    {activeQuestion.type === "multipleChoice" ? (
                      <div className="grid gap-3">
                        {activeQuestion.options?.map((option, index) => {
                          const selected = answers[activeQuestion.id] === option.value;

                          return (
                            <motion.button
                              key={option.value}
                              type="button"
                              custom={index}
                              variants={optionVariants}
                              initial="initial"
                              animate="animate"
                              whileHover={{ y: -2, scale: 1.01 }}
                              whileTap="tap"
                              onClick={() => handleChoice(option.value)}
                              className={`group rounded-[1.35rem] border px-5 py-4 text-left transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(154,215,255,0.55)] sm:px-6 sm:py-5 ${selected ? "border-[rgba(154,215,255,0.7)] bg-[rgba(110,168,255,0.13)]" : "border-white/10 bg-[rgba(255,255,255,0.045)] hover:border-white/20 hover:bg-[rgba(255,255,255,0.075)]"}`}
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div>
                                  <div className="text-lg font-medium tracking-[-0.02em] text-[var(--foreground)] sm:text-xl">{option.label}</div>
                                  <div className="mt-1 max-w-xl text-sm leading-6 text-white/60">{option.description}</div>
                                </div>
                                <div className={`mt-1 flex h-8 w-8 items-center justify-center rounded-full border transition ${selected ? "border-[rgba(154,215,255,0.75)] bg-[rgba(110,168,255,0.22)] shadow-[0_0_0_6px_rgba(110,168,255,0.08)]" : "border-white/12 bg-[rgba(255,255,255,0.045)] group-hover:border-white/20"}`}>
                                  <span className={`h-2.5 w-2.5 rounded-full transition ${selected ? "bg-[#9ad7ff]" : "bg-white/20"}`} />
                                </div>
                              </div>
                            </motion.button>
                          );
                        })}
                      </div>
                    ) : activeQuestion.multiline ? (
                      <div className="space-y-4">
                        <textarea
                          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                          value={currentValue}
                          onChange={(event) => {
                            setAnswers((previous) => ({ ...previous, [activeQuestion.id]: event.target.value }));
                            setError(null);
                          }}
                          onKeyDown={handleKeyboard}
                          placeholder={activeQuestion.placeholder}
                          className="min-h-40 w-full resize-none rounded-[1.5rem] border border-white/12 bg-[rgba(255,255,255,0.045)] px-5 py-4 text-base leading-7 text-[var(--foreground)] outline-none transition placeholder:text-white/28 focus:border-[rgba(154,215,255,0.72)] focus:shadow-[0_0_0_1px_rgba(154,215,255,0.16),0_0_0_12px_rgba(110,168,255,0.1)]"
                        />
                        <div className="flex items-center justify-between text-xs uppercase tracking-[0.24em] text-white/42">
                          <span className="flex items-center gap-2">
                            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-[#9ad7ff]" />
                            Typing preview active
                          </span>
                          <button
                            type="button"
                            onClick={() => goNext()}
                            className="rounded-full border border-white/10 bg-[rgba(255,255,255,0.06)] px-4 py-2 text-[11px] uppercase tracking-[0.24em] text-[var(--foreground)] transition hover:bg-white/10"
                          >
                            Finish
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <input
                          ref={inputRef as React.RefObject<HTMLInputElement>}
                          value={currentValue}
                          onChange={(event) => {
                            setAnswers((previous) => ({ ...previous, [activeQuestion.id]: event.target.value }));
                            setError(null);
                          }}
                          onKeyDown={handleKeyboard}
                          placeholder={activeQuestion.placeholder}
                          inputMode={activeQuestion.inputMode}
                          className="w-full rounded-full border border-white/12 bg-[rgba(255,255,255,0.045)] px-5 py-4 text-base text-[var(--foreground)] outline-none transition placeholder:text-white/28 focus:border-[rgba(154,215,255,0.72)] focus:shadow-[0_0_0_1px_rgba(154,215,255,0.16),0_0_0_12px_rgba(110,168,255,0.1)]"
                        />
                        <div className="flex items-center justify-between text-xs uppercase tracking-[0.24em] text-white/42">
                          <span className="flex items-center gap-2">
                            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-[#9ad7ff]" />
                            {error ? <span className="text-[var(--danger)]">{error}</span> : "Answers are auto-saved locally"}
                          </span>
                          <button
                            type="button"
                            onClick={() => goNext()}
                            className="rounded-full border border-white/10 bg-[rgba(255,255,255,0.06)] px-5 py-2 text-[11px] uppercase tracking-[0.24em] text-[var(--foreground)] transition hover:bg-white/10"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-8 min-h-6 text-sm text-[var(--danger)]">{error}</div>

                  {isFinalStep && currentValue.trim() ? (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.15 }}
                      className="mt-8 rounded-[1.5rem] border border-[rgba(154,215,255,0.22)] bg-[rgba(110,168,255,0.08)] p-5 text-sm leading-6 text-[var(--foreground)]"
                    >
                      <div className="text-xs uppercase tracking-[0.3em] text-white/50">Preview</div>
                      <p className="mt-2 max-w-2xl">
                        The checkout-style flow is ready for Vercel. The state machine, branching logic, keyboard shortcuts, and dark-mode glass shell are all in place.
                      </p>
                    </motion.div>
                  ) : null}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>
      </section>
    </main>
  );
}
