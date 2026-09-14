import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import type { LocalNotificationSchema } from '@capacitor/local-notifications';
import type { FixedCharge } from '../types';
import { currentMonth, formatMoney } from '../utils/format';

export const REMINDER_LEAD_DAYS = 3;
const NOTIFICATION_HOUR = 9;
const NOTIFICATION_MINUTE = 0;
const ENABLED_KEY = 'bf_notif_enabled';
const TRACKING_KEY = 'bf_notif_tracking';

interface TrackedCharge {
  chargeId: string;
  dueId: number;
  remindId: number;
}

export function remindersEnabled(): boolean {
  return localStorage.getItem(ENABLED_KEY) !== '0';
}

export function setRemindersEnabled(on: boolean): void {
  localStorage.setItem(ENABLED_KEY, on ? '1' : '0');
}

function isNative(): boolean {
  const platform = Capacitor.getPlatform();
  return platform === 'android' || platform === 'ios';
}

function hashInt32(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (Math.imul(hash, 31) + input.charCodeAt(i)) | 0;
  }
  return hash === 0 ? 1 : hash;
}

function dueDateOf(charge: FixedCharge): Date {
  const month = charge.month ?? currentMonth();
  const [y, m] = month.split('-').map(Number);
  const day = Math.min(Math.max(charge.due_day || 1, 1), 28);
  return new Date(y, m - 1, day, NOTIFICATION_HOUR, NOTIFICATION_MINUTE, 0, 0);
}

function chargeIdsOf(charges: FixedCharge[]): Set<string> {
  return new Set(charges.filter((c) => c.id).map((c) => c.id));
}

function loadTracking(): TrackedCharge[] {
  try {
    const raw = localStorage.getItem(TRACKING_KEY);
    return raw ? (JSON.parse(raw) as TrackedCharge[]) : [];
  } catch {
    return [];
  }
}

function saveTracking(tracked: TrackedCharge[]): void {
  localStorage.setItem(TRACKING_KEY, JSON.stringify(tracked));
}

/**
 * Planifie les notifications locales pour les charges fixes non payées :
 * un rappel `REMINDER_LEAD_DAYS` jours avant l'échéance, puis une notification
 * le jour même. Annule celles devenues inutiles (payées, passées ou supprimées).
 */
export async function syncFixedChargeNotifications(
  charges: FixedCharge[],
  options: { currency?: string } = {},
): Promise<void> {
  if (!isNative() || !remindersEnabled() || charges.length === 0) return;

  const permission = await LocalNotifications.requestPermissions();
  if (permission.display !== 'granted') return;

  const now = new Date();
  const notifications: LocalNotificationSchema[] = [];
  const candidateIds = new Set<number>();
  const desiredIds = new Set<number>();
  const tracked: TrackedCharge[] = [];

  for (const charge of charges) {
    const dueId = hashInt32(`${charge.id}|due`);
    const remindId = hashInt32(`${charge.id}|remind`);
    candidateIds.add(dueId);
    candidateIds.add(remindId);

    if (charge.is_paid) continue;

    const dueDate = dueDateOf(charge);
    if (dueDate < now) continue;

    const amount = formatMoney(charge.amount, options.currency ?? 'MGA');
    tracked.push({ chargeId: charge.id, dueId, remindId });
    desiredIds.add(dueId);
    notifications.push({
      id: dueId,
      title: `${charge.name} — échéance aujourd'hui`,
      body: `Prévoyez ${amount} pour régler cette charge fixe.`,
      schedule: { at: dueDate, allowWhileIdle: true },
      isExactNotification: false,
      extra: { type: 'fixed_charge_due', chargeId: charge.id },
    });

    const remindDate = new Date(dueDate);
    remindDate.setDate(remindDate.getDate() - REMINDER_LEAD_DAYS);
    if (remindDate >= now) {
      desiredIds.add(remindId);
      notifications.push({
        id: remindId,
        title: `${charge.name} arrive à échéance`,
        body: `Échéance dans ${REMINDER_LEAD_DAYS} jour${REMINDER_LEAD_DAYS > 1 ? 's' : ''} — ${amount}.`,
        schedule: { at: remindDate, allowWhileIdle: true },
        isExactNotification: false,
        extra: { type: 'fixed_charge_reminder', chargeId: charge.id },
      });
    }
  }

  if (notifications.length > 0) {
    await LocalNotifications.schedule({ notifications });
  }

  const pending = await LocalNotifications.getPending();
  const pendingIds = new Set(pending.notifications.map((n) => n.id));
  const toCancel: number[] = [];

  for (const id of pendingIds) {
    if (candidateIds.has(id) && !desiredIds.has(id)) {
      toCancel.push(id);
    }
  }

  const currentChargeIds = chargeIdsOf(charges);
  for (const t of loadTracking()) {
    if (!currentChargeIds.has(t.chargeId)) {
      if (pendingIds.has(t.dueId)) toCancel.push(t.dueId);
      if (pendingIds.has(t.remindId)) toCancel.push(t.remindId);
    }
  }

  if (toCancel.length > 0) {
    await LocalNotifications.cancel({ notifications: toCancel.map((id) => ({ id })) });
  }

  saveTracking(tracked);
}

export async function cancelAllFixedChargeNotifications(): Promise<void> {
  if (!isNative()) return;
  await LocalNotifications.cancelAll();
  localStorage.removeItem(TRACKING_KEY);
}