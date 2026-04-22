// ─── Primitive union types ────────────────────────────────────────────────────
export type Role = "admin" | "assistant" | "coach" | "player";
export type Branch = "tunis" | "sousse";
export type Level = "beginner" | "intermediate" | "advanced";
export type TransactionType = "income" | "expense";
export type TransactionCategory =
  | "frais_inscription"
  | "loyer"
  | "salaire_coach"
  | "materiel"
  | "cotisation"
  | "fournitures"
  | "transport"
  | "evenement"
  | "autres";

export type PaymentFrequency = "monthly" | "weekly" | "package";

// ─── Domain interfaces ────────────────────────────────────────────────────────
export interface Profile {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  phone_number: string | null;
  role: Role;
  branch: Branch | null;
  fide_id: string | null;
  level: Level | null;
  birth_date: string | null;   // DATE as YYYY-MM-DD
  parent_name: string | null;
  address: string | null;
  memo: string | null;
  group_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Groups ───────────────────────────────────────────────────────────────────
export interface Group {
  id: string;
  name: string;
  monthly_fee: number;
  branch: Branch;
  description: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/** Links one coach (profile) to one group. */
export interface GroupCoach {
  id: string;
  group_id: string;
  coach_id: string;
  assigned_at: string;
  // Optionally joined
  coach?: Profile;
  group?: Group;
}

// ─── Attendance & Comments ────────────────────────────────────────────────────
export interface Attendance {
  id: string;
  player_id: string;
  session_date: string;   // DATE as YYYY-MM-DD
  is_present: boolean;
  notes: string | null;
  recorded_by: string | null;
  created_at: string;
}

/** One progress comment per player per month. */
export interface PlayerComment {
  id: string;
  player_id: string;
  month: string;          // DATE — first day of the month
  comment: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  type: TransactionType;
  category: TransactionCategory;
  branch: Branch;
  date: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Package / Subscription ───────────────────────────────────────────────────
export interface Package {
  id: string;
  name: string;
  price: number;
  start_date: string;   // DATE as YYYY-MM-DD
  end_date: string;     // DATE as YYYY-MM-DD
  description: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Row in student_packages — links one student to one package.
 * A student may have at most ONE active assignment.
 */
export interface StudentPackage {
  id: string;
  student_id: string;
  package_id: string;
  is_active: boolean;
  assigned_at: string;  // DATE as YYYY-MM-DD
  created_at: string;
  updated_at: string;
  // Optionally joined when queried with select("*, package:packages(*)")
  package?: Package;
}

/**
 * One payment record per student per billing period (first day of the month).
 * Created automatically when admin marks a student as "Paid".
 * Deleted (along with its transaction) when marked as "Unpaid".
 */
export interface StudentPayment {
  id: string;
  student_id: string;
  billing_period: string;       // DATE — first day of the billing month
  payment_frequency: PaymentFrequency;
  amount: number;
  is_paid: boolean;
  paid_at: string | null;
  transaction_id: string | null; // FK → transactions.id
  package_id: string | null;     // FK → packages.id (when paid via package)
  notes: string | null;
  created_at: string;
  updated_at: string;
}
