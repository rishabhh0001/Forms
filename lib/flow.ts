export type QuestionType = "text" | "multipleChoice" | "email" | "textarea";

export type AnswerMap = Record<string, string>;

export type ChoiceOption = {
  label: string;
  value: string;
  description: string;
  disabled?: boolean;
};

export type QuestionId = "ticket_type" | "name" | "email" | "phone" | "roll_number" | "college" | "questions_for_speakers" | "goal" | "capacity" | "timeline" | "cadence" | "story";
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

export const bconQuestionSchema: Question[] = [
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
        label: "DJ Night (Opening soon)",
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

export const dummyQuestionSchema: Question[] = [
  {
    id: "goal",
    prompt: "What are you testing in this dummy checkout flow?",
    helper: "Pick the path that best matches the sample scenario you want to preview.",
    type: "multipleChoice",
    required: true,
    options: [
      {
        label: "Digital order",
        description: "A downloadable product with no shipping step.",
        value: "digital_order",
      },
      {
        label: "Physical product",
        description: "A normal shipping flow with a delivery address.",
        value: "physical_product",
      },
      {
        label: "Subscription",
        description: "A recurring purchase with a payment-focused path.",
        value: "subscription",
      },
    ],
    nextStep: (value) => {
      if (value === "digital_order") return "name";
      if (value === "physical_product") return "capacity";
      if (value === "subscription") return "cadence";
      return null;
    },
  },
  {
    id: "capacity",
    prompt: "How fast should the dummy delivery arrive?",
    helper: "This placeholder shipping step helps test branching, progress, and motion.",
    type: "multipleChoice",
    required: true,
    options: [
      { label: "Standard shipping", description: "Arrives in 3-5 business days.", value: "standard" },
      { label: "Express shipping", description: "Arrives in 1-2 business days.", value: "express" },
      { label: "Overnight", description: "Fastest test path for checkout completion.", value: "overnight" },
    ],
    nextStep: "timeline",
  },
  {
    id: "timeline",
    prompt: "Any delivery instructions for the test order?",
    helper: "This extra checkout step makes the physical-product path feel more realistic.",
    type: "multipleChoice",
    required: true,
    options: [
      { label: "Leave at the door", description: "A fast, low-friction delivery preference.", value: "door" },
      { label: "Signature required", description: "A more secure handoff for the test checkout.", value: "signature" },
      { label: "Hold at front desk", description: "Useful for office or apartment deliveries.", value: "front_desk" },
    ],
    nextStep: "name",
  },
  {
    id: "cadence",
    prompt: "How often should this dummy checkout repeat?",
    helper: "A recurring test path is useful for subscriptions and repeat customers.",
    type: "multipleChoice",
    required: true,
    options: [
      { label: "Once", description: "A single checkout pass.", value: "once" },
      { label: "Weekly", description: "A recurring subscription check-in.", value: "weekly" },
      { label: "Whenever it matters", description: "Trigger it from an action or cart event.", value: "event" },
    ],
    nextStep: "name",
  },
  {
    id: "name",
    prompt: "What name should appear on the dummy order?",
    helper: "This stands in for the customer or billing name field.",
    type: "text",
    required: true,
    placeholder: "Rishabh Joshi",
    nextStep: "email",
  },
  {
    id: "email",
    prompt: "Where should the confirmation email be sent?",
    helper: "Any valid email address works — responses are sent here for testing.",
    type: "email",
    required: true,
    placeholder: "you@example.com",
    inputMode: "email",
    nextStep: "story",
  },
  {
    id: "story",
    prompt: "Anything else we should test before completing the dummy order?",
    helper: "Shift+Enter makes a line break. Enter continues. This note is just for testing.",
    type: "textarea",
    required: false,
    placeholder: "Add notes about the test scenario, edge cases, or checkout variations.",
    multiline: true,
    nextStep: null,
  },
];

export const startQuestionIndex = 0;

export function getQuestionByIndex(schema: Question[], index: number) {
  return schema[index] ?? null;
}

export function resolveNextQuestionIndex(
  schema: Question[],
  currentQuestionIndex: number,
  value: string,
  answers: AnswerMap,
): number | null {
  const question = getQuestionByIndex(schema, currentQuestionIndex);

  if (!question) {
    return null;
  }

  const nextStep = question.nextStep;
  const questionIdToIndex = Object.fromEntries(schema.map((q, i) => [q.id, i])) as Record<QuestionId, number>;

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
