export type AdminCopyCategory =
  | "briefing"
  | "hint"
  | "judgement.question"
  | "judgement.answer"
  | "spectator"
  | "results.stage"
  | "results.game"
  | "review"
  | "admin";

export type AdminVisibility = "public" | "self" | "redacted" | "ai_internal" | "not_visible_yet";

export const adminCopyCategories: AdminCopyCategory[] = [
  "briefing",
  "hint",
  "judgement.question",
  "judgement.answer",
  "spectator",
  "results.stage",
  "results.game",
  "review",
  "admin",
];

export const adminScaffoldSections = [
  "case-library",
  "judgement-review",
  "hint-control",
  "manual-review-queue",
  "copy-pack",
] as const;

export const adminRuntimePanels = [
  "case-index",
  "ai-review-flow",
  "copy-pack",
  "copy-key-map",
  "integration-notes",
] as const;
