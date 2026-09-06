import type { FixedChargeCategory, VariableCategory } from './types';

export type CategoryInfo = {
  value: string;
  label: string;
  color: string;
  icon: string;
};

export const VARIABLE_CATEGORIES: CategoryInfo[] = [
  { value: 'alimentation', label: 'Alimentation', color: '#f97316', icon: 'basket-outline' },
  { value: 'transport', label: 'Transport', color: '#3b82f6', icon: 'bus-outline' },
  { value: 'loisirs', label: 'Loisirs', color: '#8b5cf6', icon: 'game-controller-outline' },
  { value: 'sante', label: 'Santé', color: '#dc2626', icon: 'medkit-outline' },
  { value: 'shopping', label: 'Shopping', color: '#ec4899', icon: 'cart-outline' },
  { value: 'autre', label: 'Autre', color: '#64748b', icon: 'ellipsis-horizontal-outline' },
];

export const FIXED_CATEGORIES: CategoryInfo[] = [
  { value: 'logement', label: 'Logement', color: '#0d9488', icon: 'home-outline' },
  { value: 'energie', label: 'Énergie (EDF/Eau...)', color: '#eab308', icon: 'flash-outline' },
  { value: 'abonnement', label: 'Abonnements', color: '#a855f7', icon: 'tv-outline' },
  { value: 'assurance', label: 'Assurances', color: '#0891b2', icon: 'shield-checkmark-outline' },
  { value: 'autre', label: 'Autre', color: '#64748b', icon: 'ellipsis-horizontal-outline' },
];

export const CATEGORY_COLOR_MAP: Record<string, string> = Object.fromEntries(
  [...VARIABLE_CATEGORIES, ...FIXED_CATEGORIES].map((c) => [c.value, c.color]),
);

export const CATEGORY_ICON_MAP: Record<string, string> = Object.fromEntries(
  [...VARIABLE_CATEGORIES, ...FIXED_CATEGORIES].map((c) => [c.value, c.icon]),
);

export const CATEGORY_LABEL_MAP: Record<string, string> = Object.fromEntries(
  [...VARIABLE_CATEGORIES, ...FIXED_CATEGORIES].map((c) => [c.value, c.label]),
);

export function categoryLabel(value: string): string {
  return CATEGORY_LABEL_MAP[value] ?? value;
}

export function categoryIcon(value: string): string {
  return CATEGORY_ICON_MAP[value] ?? 'ellipsis-horizontal-outline';
}

export function categoryColor(value: string): string {
  return CATEGORY_COLOR_MAP[value] ?? '#64748b';
}

export const DEFAULT_CURRENCY = 'MGA';

export const ALERT_LEVELS = {
  none: { label: 'Sous contrôle', color: '#16a34a', icon: 'checkmark-circle' },
  yellow: { label: 'Attention (70 %)', color: '#f97316', icon: 'warning' },
  red: { label: 'Presque dépassé (85 %)', color: '#dc2626', icon: 'alert-circle' },
  over: { label: 'Budget dépassé !', color: '#7f1d1d', icon: 'close-circle' },
} as const;

export function isVariableCategory(value: string): value is VariableCategory {
  return VARIABLE_CATEGORIES.some((c) => c.value === value);
}

export function isFixedChargeCategory(value: string): value is FixedChargeCategory {
  return FIXED_CATEGORIES.some((c) => c.value === value);
}