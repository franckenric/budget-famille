import { Capacitor } from '@capacitor/core';
import type {
  Budget,
  FixedCharge,
  FixedChargeTemplate,
  VariableExpense,
  PendingOp,
} from '../types';

const DB_NAME = 'budget_famille_db';
let sqliteInstance: any = null;
let dbReady = false;

type AsyncDb = {
  run: (sql: string, values?: unknown[]) => Promise<unknown>;
  query: (sql: string, values?: unknown[]) => Promise<{ values: any[] }>;
};

let asyncDb: AsyncDb | null = null;

async function getSqlite(): Promise<any> {
  if (sqliteInstance) return sqliteInstance;
  if (Capacitor.getPlatform() === 'web') {
    return null;
  }
  try {
    const { CapacitorSQLite } = await import('@capacitor-community/sqlite');
    sqliteInstance = CapacitorSQLite;
    return CapacitorSQLite;
  } catch {
    return null;
  }
}

async function openNativeDb(): Promise<AsyncDb> {
  const sqlite = await getSqlite();
  if (!sqlite) throw new Error('native sqlite unavailable');

  await sqlite.createConnection({ database: DB_NAME, version: 1, encrypted: false });
  const conn = await sqlite.retrieveConnection(DB_NAME, false);
  await conn.open();

  await conn.execute(`CREATE TABLE IF NOT EXISTS budgets (
    id TEXT PRIMARY KEY, user_id TEXT, family_id TEXT, month TEXT,
    capital REAL, currency TEXT, yellow_threshold REAL, red_threshold REAL,
    blocking_enabled INTEGER, created_at TEXT, updated_at TEXT
  )`);
  await conn.execute(`CREATE TABLE IF NOT EXISTS fixed_charges (
    id TEXT PRIMARY KEY, budget_id TEXT, name TEXT, amount REAL,
    due_day INTEGER, is_paid INTEGER, category TEXT, template_id TEXT,
    month TEXT, created_at TEXT, updated_at TEXT
  )`);
  await conn.execute(`CREATE TABLE IF NOT EXISTS fixed_charge_templates (
    id TEXT PRIMARY KEY, user_id TEXT, name TEXT, default_amount REAL,
    due_day INTEGER, category TEXT, created_at TEXT, updated_at TEXT
  )`);
  await conn.execute(`CREATE TABLE IF NOT EXISTS variable_expenses (
    id TEXT PRIMARY KEY, budget_id TEXT, user_id TEXT, title TEXT, amount REAL,
    expense_date TEXT, category TEXT, description TEXT, photo_url TEXT,
    is_recurring INTEGER, created_at TEXT, updated_at TEXT
  )`);
  await conn.execute(`CREATE TABLE IF NOT EXISTS pending_ops (
    id TEXT PRIMARY KEY, client_id TEXT, entity TEXT, action TEXT,
    data TEXT, updated_at TEXT, created_at TEXT
  )`);
  await conn.execute('CREATE INDEX IF NOT EXISTS idx_variable_expenses_date ON variable_expenses (expense_date)');

  // Mise à niveau : colonne `month` ajoutée aux charges fixes (occurrences récurrentes).
  const cols = await conn.query(`PRAGMA table_info(fixed_charges)`, []);
  const hasMonth = cols.values.some((c: any) => c.name === 'month');
  if (!hasMonth) {
    await conn.execute(`ALTER TABLE fixed_charges ADD COLUMN month TEXT`);
  }

  dbReady = true;
  return {
    run: (sql: string, values: unknown[] = []) => conn.run(sql, values),
    query: (sql: string, values: unknown[] = []) =>
      conn.query(sql, values).then((res: { values: any[] }) => ({ values: res.values })),
  };
}

async function getDb(): Promise<AsyncDb | null> {
  if (asyncDb && dbReady) return asyncDb;
  if (Capacitor.getPlatform() !== 'web') {
    try {
      asyncDb = await openNativeDb();
      return asyncDb;
    } catch {
      return null;
    }
  }
  return null;
}

function rowToBudget(r: any): Budget {
  return {
    id: r.id,
    user_id: r.user_id,
    family_id: r.family_id,
    month: r.month,
    capital: Number(r.capital),
    currency: r.currency,
    yellow_threshold: Number(r.yellow_threshold),
    red_threshold: Number(r.red_threshold),
    blocking_enabled: Boolean(r.blocking_enabled),
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

function rowToFixed(r: any): FixedCharge {
  return {
    id: r.id,
    budget_id: r.budget_id,
    name: r.name,
    amount: Number(r.amount),
    due_day: Number(r.due_day),
    is_paid: Boolean(r.is_paid),
    category: r.category,
    template_id: r.template_id ?? null,
    month: r.month ?? null,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

function rowToTemplate(r: any): FixedChargeTemplate {
  return {
    id: r.id,
    user_id: r.user_id,
    name: r.name,
    default_amount: Number(r.default_amount),
    due_day: Number(r.due_day),
    category: r.category,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

function rowToExpense(r: any): VariableExpense {
  return {
    id: r.id,
    budget_id: r.budget_id,
    user_id: r.user_id,
    title: r.title,
    amount: Number(r.amount),
    expense_date: r.expense_date,
    category: r.category,
    description: r.description ?? undefined,
    photo_url: r.photo_url ?? undefined,
    is_recurring: Boolean(r.is_recurring),
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

function authKey(): string {
  return localStorage.getItem('bf_token')?.slice(-8) ?? 'anon';
}

/** Web fallback: store JSON blobs per current user. */
const webStore = {
  async read<T>(key: string): Promise<T | null> {
    try {
      const raw = localStorage.getItem(`bf_db_${authKey()}_${key}`);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  },
  async write(key: string, value: unknown): Promise<void> {
    localStorage.setItem(`bf_db_${authKey()}_${key}`, JSON.stringify(value));
  },
  async del(key: string): Promise<void> {
    localStorage.removeItem(`bf_db_${authKey()}_${key}`);
  },
};

export interface LocalSnapshot {
  budgets: Budget[];
  fixedCharges: FixedCharge[];
  templates: FixedChargeTemplate[];
  expenses: VariableExpense[];
  pending: PendingOp[];
}

const EMPTY: LocalSnapshot = {
  budgets: [],
  fixedCharges: [],
  templates: [],
  expenses: [],
  pending: [],
};

export async function loadSnapshot(): Promise<LocalSnapshot> {
  const db = await getDb();
  if (db) {
    const budgets = (await db.query('SELECT * FROM budgets')).values.map(rowToBudget);
    const fixedCharges = (await db.query('SELECT * FROM fixed_charges')).values.map(rowToFixed);
    const templates = (await db.query('SELECT * FROM fixed_charge_templates')).values.map(
      rowToTemplate,
    );
    const expenses = (await db.query('SELECT * FROM variable_expenses')).values.map(rowToExpense);
    const pending = (await db.query('SELECT * FROM pending_ops ORDER BY created_at')).values.map(
      (r): PendingOp => ({
        id: r.id,
        clientId: r.client_id,
        entity: r.entity,
        action: r.action,
        data: r.data ? JSON.parse(r.data) : undefined,
        updatedAt: r.updated_at,
        createdAt: r.created_at,
      }),
    );
    return { budgets, fixedCharges, templates, expenses, pending };
  }
  const snap = await webStore.read<LocalSnapshot>('snapshot');
  if (!snap) return EMPTY;
  return {
    budgets: snap.budgets ?? [],
    fixedCharges: snap.fixedCharges ?? [],
    templates: snap.templates ?? [],
    expenses: snap.expenses ?? [],
    pending: snap.pending ?? [],
  };
}

export async function saveSnapshot(snap: LocalSnapshot): Promise<void> {
  const db = await getDb();
  if (db) {
    await db.run('BEGIN TRANSACTION');
    try {
      await db.run('DELETE FROM budgets');
      await db.run('DELETE FROM fixed_charges');
      await db.run('DELETE FROM fixed_charge_templates');
      await db.run('DELETE FROM variable_expenses');
      await db.run('DELETE FROM pending_ops');
      for (const b of snap.budgets) {
        await db.run(
          'INSERT INTO budgets (id, user_id, family_id, month, capital, currency, yellow_threshold, red_threshold, blocking_enabled, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
          [b.id, b.user_id ?? null, b.family_id ?? null, b.month, b.capital, b.currency, b.yellow_threshold, b.red_threshold, b.blocking_enabled ? 1 : 0, b.created_at ?? null, b.updated_at ?? null],
        );
      }
      for (const f of snap.fixedCharges) {
        await db.run(
          'INSERT INTO fixed_charges (id, budget_id, name, amount, due_day, is_paid, category, template_id, month, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
          [f.id, f.budget_id, f.name, f.amount, f.due_day, f.is_paid ? 1 : 0, f.category, f.template_id ?? null, f.month ?? null, f.created_at ?? null, f.updated_at ?? null],
        );
      }
      for (const t of snap.templates) {
        await db.run(
          'INSERT INTO fixed_charge_templates (id, user_id, name, default_amount, due_day, category, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)',
          [t.id, t.user_id ?? null, t.name, t.default_amount, t.due_day, t.category, t.created_at ?? null, t.updated_at ?? null],
        );
      }
      for (const e of snap.expenses) {
        await db.run(
          'INSERT INTO variable_expenses (id, budget_id, user_id, title, amount, expense_date, category, description, photo_url, is_recurring, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
          [e.id, e.budget_id, e.user_id ?? null, e.title, e.amount, e.expense_date, e.category, e.description ?? null, e.photo_url ?? null, e.is_recurring ? 1 : 0, e.created_at ?? null, e.updated_at ?? null],
        );
      }
      for (const p of snap.pending) {
        await db.run(
          'INSERT INTO pending_ops (id, client_id, entity, action, data, updated_at, created_at) VALUES (?,?,?,?,?,?,?)',
          [p.id, p.clientId, p.entity, p.action, p.data ? JSON.stringify(p.data) : null, p.updatedAt, p.createdAt],
        );
      }
      await db.run('COMMIT');
    } catch (err) {
      await db.run('ROLLBACK');
      throw err;
    }
    return;
  }
  await webStore.write('snapshot', snap);
}

export async function clearLocalData(): Promise<void> {
  const db = await getDb();
  if (db) {
    await db.run('DELETE FROM budgets');
    await db.run('DELETE FROM fixed_charges');
    await db.run('DELETE FROM fixed_charge_templates');
    await db.run('DELETE FROM variable_expenses');
    await db.run('DELETE FROM pending_ops');
    return;
  }
  await webStore.del('snapshot');
}