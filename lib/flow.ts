export type QuestionType = "text" | "multipleChoice" | "email" | "textarea";

export type AnswerMap = Record<string, string>;

export type ChoiceOption = {
  label: string;
  value: string;
  description: string;
  disabled?: boolean;
};

export type QuestionId = "ticket_type" | "name" | "email" | "phone" | "roll_number" | "college" | "questions_for_speakers";
export type NextStepRule = QuestionId | ((value: string, answers: AnswerMap) => QuestionId | null) | null;

export type Question = {
  id: QuestionId;
  type: QuestionType;
  prompt: string;
  options?: ChoiceOption[];
  helper: string;
  required?: boolean;
  placeholder?: string;
  nextStep?: NextStepRule;
  multiline?: boolean;
  inputMode?: "text" | "email" | "numeric" | "tel" | "search" | "url";
};

export const questionSchema: Question[] = [
  {
    id: "ticket_type",
    prompt: "Ticket type",
    helper: "Select the event you wish to register for.",
    type: "multipleChoice",
    required: true,
    options: [
      {
        label: "Conference",
        description: "Standard access to the Business Conclave.",
        value: "conference",
      },
      {
        label: "DJ Night",
        description: "Access to the DJ Night.",
        value: "dj_night",
        disabled: true,
      },
    ],
    nextStep: "name",
  },
  {
    id: "name",
    prompt: "Full Name",
    helper: "Enter your full name as it should appear on your pass.",
    type: "text",
    required: true,
    placeholder: "e.g. Jane Doe",
    nextStep: "email",
  },
  {
    id: "email",
    prompt: "Email Address",
    helper: "We will send your confirmation and ticket to this address.",
    type: "email",
    required: true,
    placeholder: "you@example.com",
    inputMode: "email",
    nextStep: "phone",
  },
  {
    id: "phone",
    prompt: "Phone Number",
    helper: "Enter a valid mobile number.",
    type: "text",
    required: true,
    placeholder: "e.g. +91 98765 43210",
    inputMode: "tel",
    nextStep: "roll_number",
  },
  {
    id: "roll_number",
    prompt: "Roll number",
    helper: "Optional. Required for SNU students.",
    type: "text",
    required: false,
    placeholder: "e.g. 21BMS123",
    nextStep: "college",
  },
  {
    id: "college",
    prompt: "College / Organization",
    helper: "Enter the name of your college, university, or company.",
    type: "text",
    required: true,
    placeholder: "e.g. Shiv Nadar University",
    nextStep: "questions_for_speakers",
  },
  {
    id: "questions_for_speakers",
    prompt: "Any question you'd like the speakers/management to address?",
    helper: "Optional. Let us know if you have any questions for the panel.",
    type: "textarea",
    required: false,
    placeholder: "Your questions here...",
    multiline: true,
    nextStep: null,
  },
];

export const startQuestionIndex = 0;

export const questionIdToIndex = Object.fromEntries(
  questionSchema.map((question, index) => [question.id, index]),
) as Record<QuestionId, number>;

export function getQuestionByIndex(index: number) {
  return questionSchema[index] ?? null;
}

export function resolveNextQuestionIndex(
  currentQuestionIndex: number,
  value: string,
  answers: AnswerMap,
): number | null {
  const question = getQuestionByIndex(currentQuestionIndex);

  if (!question) {
    return null;
  }

  const nextStep = question.nextStep;

  if (typeof nextStep === "function") {
    const nextQuestionId = nextStep(value, answers);
    return nextQuestionId ? questionIdToIndex[nextQuestionId] ?? null : null;
  }

  if (typeof nextStep === "string") {
    return questionIdToIndex[nextStep] ?? null;
  }

  return null;
}

/** Generic RFC-5322-ish email check. Used by the test/dummy form. */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string) {
  return EMAIL_PATTERN.test(value.trim());
}

/** SNU-domain-specific check — kept for BCON / institutional forms. */
export const SNU_EMAIL_PATTERN = /^[^\s@]+@snu\.edu\.in$/i;

export function isValidSnuEmail(value: string) {
  return SNU_EMAIL_PATTERN.test(value.trim());
}

export function validateQuestion(question: Question, value: string) {
  if (!question.required) {
    return null;
  }

  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return "This question needs an answer before you can continue.";
  }

  if (question.type === "email" && !isValidEmail(trimmedValue)) {
    return "Enter a valid email address (e.g. you@example.com).";
  }

  return null;
}
