export type QuestionType = "text" | "multipleChoice" | "email" | "textarea";

export type AnswerMap = Record<string, string>;

export type ChoiceOption = {
  label: string;
  value: string;
  description: string;
};

export type QuestionId = "goal" | "capacity" | "timeline" | "cadence" | "name" | "email" | "story";
export type NextStepRule = QuestionId | ((value: string, answers: AnswerMap) => QuestionId | null) | null;

export type Question = {
  id: QuestionId;
  type: QuestionType;
  prompt: string;
  options?: ChoiceOption[];
  helper: string;
  eyebrow: string;
  required?: boolean;
  placeholder?: string;
  nextStep?: NextStepRule;
  multiline?: boolean;
  inputMode?: "text" | "email" | "numeric" | "tel" | "search" | "url";
};

export const questionSchema: Question[] = [
  {
    id: "goal",
    eyebrow: "01 / 05",
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
    eyebrow: "02 / 05",
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
    eyebrow: "02 / 05",
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
    eyebrow: "02 / 05",
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
    eyebrow: "03 / 05",
    prompt: "What name should appear on the dummy order?",
    helper: "This stands in for the customer or billing name field.",
    type: "text",
    required: true,
    placeholder: "Alex Rivera",
    nextStep: "email",
  },
  {
    id: "email",
    eyebrow: "04 / 05",
    prompt: "Where should the confirmation email be sent?",
    helper: "This is the final required checkout contact field for testing.",
    type: "email",
    required: true,
    placeholder: "alex@studio.com",
    inputMode: "email",
    nextStep: "story",
  },
  {
    id: "story",
    eyebrow: "05 / 05",
    prompt: "Anything else we should test before completing the dummy order?",
    helper: "Shift+Enter makes a line break. Enter continues. This note is just for testing.",
    type: "textarea",
    required: true,
    placeholder: "Add notes about the test scenario, edge cases, or checkout variations.",
    multiline: true,
    nextStep: null,
  },
];

export const totalQuestions = questionSchema.length;
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

export function validateQuestion(question: Question, value: string) {
  if (!question.required) {
    return null;
  }

  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return "This question needs an answer before you can continue.";
  }

  if (question.type === "email") {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(trimmedValue)) {
      return "Enter a valid email address.";
    }
  }

  return null;
}
