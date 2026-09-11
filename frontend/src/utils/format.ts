export const API_URL: string =
  import.meta.env.VITE_API_URL ?? 'http://localhost:8083/api/v1';

export function currentMonth(offset = 0): string {
  const now = new Date();
  now.setMonth(now.getMonth() + offset);
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function previousMonth(month: string, delta = 1): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 - delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number);
  const names = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
  ];
  return `${names[m - 1]} ${y}`;
}

export function formatMoney(amount: number, currency = 'MGA'): string {
  const value = new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
  return currency === 'MGA' ? `${value} Ar` : `${value} ${currency}`;
}

export function formatMoneyShort(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}k`;
  return String(amount);
}

export function formatDate(iso: string): string {
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDay(iso: string): string {
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function nowISO(): string {
  return new Date().toISOString();
}

/* --- Week helpers --- */

export type ViewMode = 'month' | 'week';

export function getWeekRange(refDate: Date = new Date()): { start: string; end: string } {
  const d = new Date(refDate);
  const day = d.getDay();
  const diffToMonday = (day + 6) % 7;
  const monday = new Date(d);
  monday.setDate(d.getDate() - diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { start: toISODate(monday), end: toISODate(sunday) };
}

export function weekLabel(refDate: Date = new Date()): string {
  const { start, end } = getWeekRange(refDate);
  const s = new Date(`${start}T00:00:00`);
  const e = new Date(`${end}T00:00:00`);
  const fmtShort = (dt: Date) => dt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  return `${fmtShort(s)} – ${fmtShort(e)}`;
}

export function isDateInRange(isoDate: string, start: string, end: string): boolean {
  return isoDate >= start && isoDate <= end;
}