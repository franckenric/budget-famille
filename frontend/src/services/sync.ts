import { loadSnapshot, saveSnapshot } from './storage';
import type {
  Budget,
  FixedCharge,
  FixedChargeTemplate,
  VariableExpense,
  PendingOp,
} from '../types';
import { pullSync, pushSync } from './endpoints';
import type { PushItem } from './endpoints';
import { api } from './api';
import { nowISO, uid } from '../utils/format';
import { isOnline } from './connectivity';

type LocalSnapshot = {
  budgets: Budget[];
  fixedCharges: FixedCharge[];
  templates: FixedChargeTemplate[];
  expenses: VariableExpense[];
  pending: PendingOp[];
};

const EMPTY: LocalSnapshot = {
  budgets: [],
  fixedCharges: [],
  templates: [],
  expenses: [],
  pending: [],
};

let lastSyncAt = localStorage.getItem('bf_last_sync') ?? '0';

export function getLastSync(): string {
  return lastSyncAt;
}

function timestampOf(item: { updated_at?: string }): number {
  if (!item.updated_at) return 0;
  const t = Date.parse(item.updated_at);
  return Number.isNaN(t) ? 0 : t;
}

/**
 * Merge rules: a line is kept if its updated_at is strictly more recent,
 * otherwise local wins on exact tie (idempotent retries).
 */
function mergeById<T extends { id: string; updated_at?: string }>(local: T[], remote: T[]): T[] {
  const map = new Map<string, T>();
  for (const item of local) map.set(item.id, item);
  for (const item of remote) {
    const existing = map.get(item.id);
    if (!existing || timestampOf(item) > timestampOf(existing)) {
      map.set(item.id, item);
    }
  }
  return Array.from(map.values());
}

function applyPendingOps(snap: LocalSnapshot): LocalSnapshot {
  let budgets = snap.budgets;
  let fixedCharges = snap.fixedCharges;
  let templates = snap.templates;
  let expenses = snap.expenses;

  for (const op of snap.pending) {
    if (op.action === 'delete') {
      if (op.entity === 'budget') budgets = budgets.filter((b) => b.id !== op.clientId);
      if (op.entity === 'fixed_charge') fixedCharges = fixedCharges.filter((c) => c.id !== op.clientId);
      if (op.entity === 'fixed_charge_template') {
        templates = templates.filter((t) => t.id !== op.clientId);
        // Les occurrences liées au gabarit disparaissent aussi (comme côté serveur).
        fixedCharges = fixedCharges.filter((c) => c.template_id !== op.clientId);
      }
      if (op.entity === 'variable_expense') expenses = expenses.filter((e) => e.id !== op.clientId);
    }
  }
  return { budgets, fixedCharges, templates, expenses, pending: snap.pending };
}

export async function flushPending(): Promise<number> {
  if (!isOnline() || !api.getToken()) return 0;
  const snap = await loadSnapshot();
  if (snap.pending.length === 0) return 0;

  const items: PushItem[] = snap.pending.map((p) => ({
    entity: p.entity,
    id: p.clientId,
    action: p.action,
    data: p.data,
  }));

  const res = await pushSync(items);

  // Idempotent retries: drop ops accepted or already applied server-side.
  const acceptedIds = new Set(
    res.results.filter((r) => r.status === 'accepted').map((r) => r.id),
  );
  snap.pending = snap.pending.filter((p) => !acceptedIds.has(p.clientId));

  const merged = applyPendingOps(snap);
  await saveSnapshot(merged);

  if (snap.pending.length === 0) {
    lastSyncAt = nowISO();
    localStorage.setItem('bf_last_sync', lastSyncAt);
  }
  return acceptedIds.size;
}

export async function pullFromServer(): Promise<void> {
  if (!isOnline() || !api.getToken()) return;
  const since = lastSyncAt;
  const remote = await pullSync(since);

  const snap = await loadSnapshot();
  const merged: LocalSnapshot = {
    budgets: mergeById(snap.budgets, remote.budgets ?? []),
    fixedCharges: mergeById(snap.fixedCharges, remote.fixed_charges ?? []),
    templates: mergeById(snap.templates, remote.fixed_charge_templates ?? []),
    expenses: mergeById(snap.expenses, remote.variable_expenses ?? []),
    pending: snap.pending,
  };
  await saveSnapshot(merged);

  lastSyncAt = nowISO();
  localStorage.setItem('bf_last_sync', lastSyncAt);
}

export async function fullSync(): Promise<void> {
  await flushPending();
  await pullFromServer();
}

function queueOp(
  pending: PendingOp[],
  entity: PendingOp['entity'],
  clientId: string,
  data?: Record<string, unknown>,
  action: PendingOp['action'] = 'upsert',
): PendingOp[] {
  const op: PendingOp = {
    id: uid(),
    clientId,
    entity,
    action,
    data,
    updatedAt: nowISO(),
    createdAt: nowISO(),
  };
  return [
    ...pending.filter((p) => !(p.entity === entity && p.clientId === clientId)),
    op,
  ];
}

function upsertLocal<T>(items: T[], item: T): T[] {
  const idx = items.findIndex((i) => (i as { id: string }).id === (item as { id: string }).id);
  if (idx >= 0) {
    const copy = [...items];
    copy[idx] = item;
    return copy;
  }
  return [...items, item];
}

export async function offlineUpsertBudget(budget: Budget): Promise<void> {
  const snap = await loadSnapshot();
  await saveSnapshot(
    applyPendingOps({
      budgets: upsertLocal(snap.budgets, budget),
      fixedCharges: snap.fixedCharges,
      templates: snap.templates,
      expenses: snap.expenses,
      pending: queueOp(snap.pending, 'budget', budget.id, { ...budget, id: undefined }),
    }),
  );
}

export async function offlineDeleteBudget(id: string): Promise<void> {
  const snap = await loadSnapshot();
  await saveSnapshot(
    applyPendingOps({
      budgets: snap.budgets.filter((b) => b.id !== id),
      fixedCharges: snap.fixedCharges,
      templates: snap.templates,
      expenses: snap.expenses,
      pending: queueOp(snap.pending, 'budget', id, { id }, 'delete'),
    }),
  );
}

export async function offlineUpsertFixedCharge(charge: FixedCharge): Promise<void> {
  const snap = await loadSnapshot();
  await saveSnapshot(
    applyPendingOps({
      budgets: snap.budgets,
      fixedCharges: upsertLocal(snap.fixedCharges, charge),
      templates: snap.templates,
      expenses: snap.expenses,
      pending: queueOp(snap.pending, 'fixed_charge', charge.id, { ...charge, id: undefined }),
    }),
  );
}

export async function offlineDeleteFixedCharge(id: string): Promise<void> {
  const snap = await loadSnapshot();
  await saveSnapshot(
    applyPendingOps({
      budgets: snap.budgets,
      fixedCharges: snap.fixedCharges.filter((c) => c.id !== id),
      templates: snap.templates,
      expenses: snap.expenses,
      pending: queueOp(snap.pending, 'fixed_charge', id, { id }, 'delete'),
    }),
  );
}

export async function offlineUpsertFixedChargeTemplate(
  template: FixedChargeTemplate,
): Promise<void> {
  const snap = await loadSnapshot();
  await saveSnapshot(
    applyPendingOps({
      budgets: snap.budgets,
      fixedCharges: snap.fixedCharges,
      templates: upsertLocal(snap.templates, template),
      expenses: snap.expenses,
      pending: queueOp(snap.pending, 'fixed_charge_template', template.id, {
        ...template,
        id: undefined,
      }),
    }),
  );
}

export async function offlineDeleteFixedChargeTemplate(id: string): Promise<void> {
  const snap = await loadSnapshot();
  await saveSnapshot(
    applyPendingOps({
      budgets: snap.budgets,
      fixedCharges: snap.fixedCharges,
      templates: snap.templates.filter((t) => t.id !== id),
      expenses: snap.expenses,
      pending: queueOp(snap.pending, 'fixed_charge_template', id, { id }, 'delete'),
    }),
  );
}

export async function offlineUpsertExpense(expense: VariableExpense): Promise<void> {
  const snap = await loadSnapshot();
  await saveSnapshot(
    applyPendingOps({
      budgets: snap.budgets,
      fixedCharges: snap.fixedCharges,
      templates: snap.templates,
      expenses: upsertLocal(snap.expenses, expense),
      pending: queueOp(snap.pending, 'variable_expense', expense.id, { ...expense, id: undefined }),
    }),
  );
}

export async function offlineDeleteExpense(id: string): Promise<void> {
  const snap = await loadSnapshot();
  await saveSnapshot(
    applyPendingOps({
      budgets: snap.budgets,
      fixedCharges: snap.fixedCharges,
      templates: snap.templates,
      expenses: snap.expenses.filter((e) => e.id !== id),
      pending: queueOp(snap.pending, 'variable_expense', id, { id }, 'delete'),
    }),
  );
}

export async function clearPendingAndSnapshot(): Promise<void> {
  await saveSnapshot(EMPTY);
}

export async function pendingCount(): Promise<number> {
  const snap = await loadSnapshot();
  return snap.pending.length;
}

export async function resetSyncCursor(): Promise<void> {
  lastSyncAt = '0';
  localStorage.setItem('bf_last_sync', '0');
}