import type { Branch, Level, TransactionCategory, TransactionType } from "@/types";

// ─── Value arrays ─────────────────────────────────────────────────────────────
export const BRANCHES: Branch[] = ["tunis", "sousse"];
export const LEVELS: Level[] = ["beginner", "intermediate", "advanced"];
export const TRANSACTION_TYPES: TransactionType[] = ["income", "expense", "transfer"];

// ─── Accounts (used for money transfers) ─────────────────────────────────────
export const ACCOUNTS = ["caisse", "bank", "ccp"] as const;
export type Account = (typeof ACCOUNTS)[number];
export const ACCOUNT_LABELS: Record<string, string> = {
  caisse: "Caisse",
  bank: "Bank Account",
  ccp: "CCP (Postal)",
};

/**
 * Categories available when type = "income"
 * (Inscription fees are the main revenue source; anything else goes to "Other")
 */
export const INCOME_CATEGORIES: TransactionCategory[] = [
  "frais_inscription",
  "autres",
];

/**
 * Categories available when type = "expense"
 * (All operational cost categories)
 */
export const EXPENSE_CATEGORIES: TransactionCategory[] = [
  "loyer",
  "salaire_coach",
  "materiel",
  "fournitures",
  "transport",
  "evenement",
  "autres",
];

/** All categories combined — kept for places that don't filter by type */
export const TRANSACTION_CATEGORIES: TransactionCategory[] = [
  "frais_inscription",
  "loyer",
  "salaire_coach",
  "materiel",
  "cotisation",
  "fournitures",
  "transport",
  "evenement",
  "autres",
];

// ─── Human-readable labels (English only) ────────────────────────────────────
export const BRANCH_LABELS: Record<Branch, string> = {
  tunis: "Tunis Branch",
  sousse: "Sousse Branch (Sahloul 4)",
};

export const LEVEL_LABELS: Record<Level, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

export const TRANSACTION_CATEGORY_LABELS: Record<TransactionCategory, string> = {
  frais_inscription: "Inscription Fee",
  loyer: "Rent",
  salaire_coach: "Coach Salary",
  materiel: "Materials & Equipment",
  cotisation: "Membership Fee",
  fournitures: "Supplies",
  transport: "Transport",
  evenement: "Event",
  autres: "Other",
};

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  income: "Income",
  expense: "Expense",
  transfer: "Transfer",
};
