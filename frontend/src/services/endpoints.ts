import { api } from './api';
import type {
  Budget,
  BudgetSummary,
  CategoryStats,
  CompareItem,
  Debt,
  Family,
  FamilyMember,
  FamilySummary,
  FixedCharge,
  FixedChargeTemplate,
  VariableExpense,
  User,
} from '../types';

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface RegisterPayload {
  email: string;
  full_name: string;
  password: string;
  currency?: string;
}

export interface ListResponse<T> {
  count: number;
  data: T[];
}

interface CompareResponse {
  months: CompareItem[];
}

// ---- Auth ----
/** Login OAuth2 : le backend attend un formulaire `username`/`password` encodé. */
export function login(email: string, password: string) {
  return api.post<LoginResponse>(
    '/login/access-token',
    new URLSearchParams({ username: email, password }),
  );
}

/** L'inscription renvoie l'utilisateur (sans token) : on se connecte ensuite. */
export function register(payload: RegisterPayload) {
  return api.request<User>('/login/register', {
    method: 'POST',
    body: payload,
    auth: false,
  });
}

export function fetchMe() {
  return api.get<User>('/users/me');
}

export function updateMe(payload: Partial<User>) {
  return api.request<User>('/users/me', { method: 'PATCH', body: payload });
}

// ---- Budgets ----
export function ensureBudget(month: string) {
  return api.post<Budget>(`/budgets/ensure?month=${month}`, undefined);
}

export function updateBudget(budgetId: string, payload: Partial<Budget>) {
  return api.request<Budget>(`/budgets/${budgetId}`, { method: 'PUT', body: payload });
}

export async function fetchSummary(month: string): Promise<BudgetSummary> {
  const res = await api.get<{ data: BudgetSummary }>(`/budgets/summary?month=${month}`);
  return res.data;
}

export function fetchStats(month: string) {
  return api.get<CategoryStats>(`/budgets/stats?month=${month}`);
}

export async function fetchCompare(): Promise<CompareItem[]> {
  const res = await api.get<CompareResponse>('/budgets/compare');
  return res.months ?? [];
}

// ---- Fixed charges ----
/** Les listes sont filtrées par budget via le paramètre `where` (JSON encodé). */
function budgetWhere(budgetId: string): string {
  return encodeURIComponent(
    JSON.stringify([{ key: 'budget_id', value: budgetId, operator: '==' }]),
  );
}

export async function listFixedCharges(budgetId: string): Promise<FixedCharge[]> {
  const res = await api.get<ListResponse<FixedCharge>>(
    `/fixed_charges/?limit=200&where=${budgetWhere(budgetId)}`,
  );
  return res.data ?? [];
}

export function createFixedCharge(payload: Partial<FixedCharge> & { budget_id: string }) {
  return api.request<FixedCharge>('/fixed_charges/', { method: 'POST', body: payload });
}

export function updateFixedCharge(id: string, payload: Partial<FixedCharge>) {
  return api.request<FixedCharge>(`/fixed_charges/${id}`, { method: 'PUT', body: payload });
}

export function markChargePaid(id: string, isPaid: boolean) {
  return api.request<FixedCharge>(`/fixed_charges/${id}/pay`, {
    method: 'PATCH',
    body: { is_paid: isPaid },
  });
}

export function deleteFixedCharge(id: string) {
  return api.request<{ msg: string }>(`/fixed_charges/${id}`, { method: 'DELETE' });
}

// ---- Fixed charge templates (charges récurrentes) ----
export async function listFixedChargeTemplates(): Promise<FixedChargeTemplate[]> {
  const res = await api.get<ListResponse<FixedChargeTemplate>>('/fixed_charge_templates/?limit=200');
  return res.data ?? [];
}

export function createFixedChargeTemplate(
  payload: Partial<FixedChargeTemplate> & { name: string; default_amount: number },
) {
  return api.request<FixedChargeTemplate>('/fixed_charge_templates/', {
    method: 'POST',
    body: payload,
  });
}

export function updateFixedChargeTemplate(
  id: string,
  payload: Partial<FixedChargeTemplate>,
) {
  return api.request<FixedChargeTemplate>(`/fixed_charge_templates/${id}`, {
    method: 'PUT',
    body: payload,
  });
}

export function deleteFixedChargeTemplate(id: string) {
  return api.request<{ msg: string }>(`/fixed_charge_templates/${id}`, {
    method: 'DELETE',
  });
}

// ---- Variable expenses ----
export async function listExpenses(month: string): Promise<VariableExpense[]> {
  const res = await api.get<ListResponse<VariableExpense>>(
    `/variable_expenses/?month=${encodeURIComponent(month)}&limit=200`,
  );
  return res.data ?? [];
}

export function createExpense(payload: Partial<VariableExpense> & { budget_id: string }) {
  return api.request<VariableExpense>('/variable_expenses/', { method: 'POST', body: payload });
}

export function updateExpense(id: string, payload: Partial<VariableExpense>) {
  return api.request<VariableExpense>(`/variable_expenses/${id}`, { method: 'PUT', body: payload });
}

export function deleteExpense(id: string) {
  return api.request<{ msg: string }>(`/variable_expenses/${id}`, { method: 'DELETE' });
}

// ---- Families ----
export function createFamily(name: string) {
  return api.request<Family>('/families/', { method: 'POST', body: { name } });
}

export function joinFamily(inviteCode: string) {
  return api.request<Family>('/families/join', { method: 'POST', body: { invite_code: inviteCode } });
}

export function fetchMyFamily() {
  return api.get<Family | null>('/families/me');
}

export function updateMemberRole(userId: string, role: FamilyMember['role']) {
  return api.request<FamilyMember>(`/families/me/members/${userId}`, {
    method: 'PATCH',
    body: { role },
  });
}

export function fetchFamilySummary(month: string) {
  return api.get<FamilySummary>(`/families/me/summary?month=${month}`);
}

// ---- Sync ----
export interface PullResult {
  budgets: Budget[];
  fixed_charges: FixedCharge[];
  fixed_charge_templates?: FixedChargeTemplate[];
  variable_expenses: VariableExpense[];
}

export interface PushItem {
  entity: 'budget' | 'fixed_charge' | 'fixed_charge_template' | 'variable_expense';
  id: string;
  action: 'upsert' | 'delete';
  data?: Record<string, unknown>;
}

export interface PushResponse {
  accepted: number;
  conflicts: number;
  errors: number;
  results: { id: string; entity: string; status: string; reason?: string | null }[];
}

export function pullSync(since: string) {
  return api.get<PullResult>(`/sync/pull?since=${encodeURIComponent(since)}`);
}

export function pushSync(items: PushItem[]) {
  return api.request<PushResponse>('/sync/push', { method: 'POST', body: { items } });
}

// ---- Debts (emprunts / avances) ----
export async function listDebts(month?: string): Promise<Debt[]> {
  const res = await api.get<ListResponse<Debt>>('/debts/?limit=200');
  return res.data ?? [];
}

export function createDebt(payload: Partial<Debt> & { lender_name: string; amount: number; debt_date: string }) {
  return api.request<Debt>('/debts/', { method: 'POST', body: payload });
}

export function updateDebt(id: string, payload: Partial<Debt>) {
  return api.request<Debt>(`/debts/${id}`, { method: 'PUT', body: payload });
}

export function recordDebtPayment(id: string, payment: { date: string; amount: number }) {
  return api.request<Debt>(`/debts/${id}/payments`, { method: 'POST', body: payment });
}

export function removeDebtPayment(id: string, index: number) {
  return api.request<Debt>(`/debts/${id}/payments/${index}`, { method: 'DELETE' });
}

export function markDebtRepaid(id: string) {
  return api.request<Debt>(`/debts/${id}/repay`, { method: 'PATCH' });
}

export function deleteDebt(id: string) {
  return api.request<{ msg: string }>(`/debts/${id}`, { method: 'DELETE' });
}