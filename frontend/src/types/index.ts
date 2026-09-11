export type RoleType = 'admin' | 'member';

export type FixedChargeCategory =
  | 'logement'
  | 'energie'
  | 'abonnement'
  | 'assurance'
  | 'autre';

export type VariableCategory =
  | 'alimentation'
  | 'transport'
  | 'loisirs'
  | 'sante'
  | 'shopping'
  | 'autre';

export interface User {
  id?: string;
  email?: string;
  full_name?: string;
  is_active?: boolean;
  currency?: string;
  yellow_threshold?: number;
  red_threshold?: number;
  blocking_enabled?: boolean;
  role_id?: string;
  family_id?: string | null;
  role_name?: string | null;
  family?: Family | null;
}

export interface Budget {
  id: string;
  user_id?: string;
  family_id?: string | null;
  month: string;
  capital: number;
  currency: string;
  yellow_threshold: number;
  red_threshold: number;
  blocking_enabled: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface FixedCharge {
  id: string;
  budget_id: string;
  name: string;
  amount: number;
  due_day: number;
  is_paid: boolean;
  category: FixedChargeCategory;
  template_id?: string | null;
  month?: string | null;
  created_at?: string;
  updated_at?: string;
}

/** Charge fixe récurrente (loyer, EDF…) : définie une fois, proposée chaque mois. */
export interface FixedChargeTemplate {
  id: string;
  user_id?: string;
  name: string;
  default_amount: number;
  due_day: number;
  category: FixedChargeCategory;
  created_at?: string;
  updated_at?: string;
}

export interface ExpenseDetail {
  description: string;
  quantity: number;
  unit_price: number;
}

export interface VariableExpense {
  id: string;
  budget_id: string;
  user_id?: string;
  title: string;
  amount: number;
  expense_date: string;
  category: VariableCategory;
  description?: string;
  photo_url?: string;
  is_recurring?: boolean;
  details?: ExpenseDetail[];
  created_at?: string;
  updated_at?: string;
}

export interface DebtPayment {
  date: string;
  amount: number;
}

export interface Debt {
  id: string;
  budget_id?: string | null;
  user_id?: string;
  lender_name: string;
  amount: number;
  reason?: string;
  debt_date: string;
  monthly_amount?: number | null;
  start_date?: string | null;
  is_repaid: boolean;
  repaid_date?: string | null;
  payments?: DebtPayment[];
  created_at?: string;
  updated_at?: string;
}

export interface FamilyMember {
  id?: string;
  user_id: string;
  family_id?: string;
  role: RoleType;
  is_active?: boolean;
  email?: string;
  full_name?: string;
}

export interface Family {
  id?: string;
  name?: string;
  owner_user_id?: string;
  invite_code?: string;
  members?: FamilyMember[];
}

export interface BudgetSummary {
  month: string;
  capital: number;
  total_fixed: number;
  total_variable: number;
  total_spent: number;
  remaining: number;
  percent_spent: number;
  alert_level: 'none' | 'yellow' | 'red' | 'over';
  fixed_total_count: number;
  fixed_paid_count: number;
  variable_count: number;
}

export interface CategoryStatItem {
  category: string;
  total: number;
  count: number;
}

export interface DailyStatItem {
  date: string;
  total: number;
  count: number;
}

export interface CategoryStats {
  month: string;
  total_variable: number;
  categories: CategoryStatItem[];
  daily: DailyStatItem[];
}

export interface CompareItem {
  month: string;
  capital: number;
  total_fixed: number;
  total_variable: number;
  total_spent: number;
}

export interface FamilySummary {
  month: string;
  family_id?: string;
  family_name?: string;
  member_count: number;
  total_capital: number;
  total_fixed: number;
  total_variable: number;
  total_spent: number;
  percent_spent: number;
  members: { member_id: string; full_name: string; capital: number; total_spent: number }[];
}

export type SyncEntity =
  | 'budget'
  | 'fixed_charge'
  | 'fixed_charge_template'
  | 'variable_expense';

export interface PendingOp {
  id: string;
  clientId: string;
  entity: SyncEntity;
  action: 'upsert' | 'delete';
  data?: Record<string, unknown>;
  updatedAt: string;
  createdAt: string;
}