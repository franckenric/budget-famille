import { useState } from 'react';
import { IonAvatar, IonIcon, IonItem, IonLabel, IonNote } from '@ionic/react';
import { chevronDown, chevronForward, listOutline, trashOutline } from 'ionicons/icons';
import type { VariableExpense } from '../types';
import { categoryColor, categoryIcon, categoryLabel } from '../constants';
import { formatDay, formatMoney } from '../utils/format';

const ExpenseItem: React.FC<{
  expense: VariableExpense;
  currency: string;
  onEdit: (e: VariableExpense) => void;
  onDelete: (e: VariableExpense) => void;
}> = ({ expense, currency, onEdit, onDelete }) => {
  const [expanded, setExpanded] = useState(false);
  const hasDetails = expense.details && expense.details.length > 0;

  return (
    <div style={{ marginBottom: 4 }}>
      <IonItem
        detail
        onClick={() => onEdit(expense)}
        button
        style={{ '--inner-padding-start': '8px', '--padding-start': '8px' }}
      >
        <IonAvatar
          slot="start"
          style={{
            background: `${categoryColor(expense.category)}20`,
            width: 34,
            height: 34,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <IonIcon
            icon={categoryIcon(expense.category)}
            style={{ color: categoryColor(expense.category), fontSize: 18 }}
          />
        </IonAvatar>
        <IonLabel>
          <h2 style={{ margin: 0 }}>
            {expense.title}
            {expense.is_recurring ? (
              <IonIcon
                icon="repeat-outline"
                style={{ fontSize: 13, marginLeft: 4, verticalAlign: 'middle' }}
                color="medium"
              />
            ) : null}
            {hasDetails && (
              <IonIcon
                icon={listOutline}
                style={{ fontSize: 13, marginLeft: 4, verticalAlign: 'middle', color: '#3b82f6' }}
              />
            )}
          </h2>
          <IonNote style={{ color: 'var(--ion-color-medium)' }}>
            {categoryLabel(expense.category)} · {formatDay(expense.expense_date)}
          </IonNote>
        </IonLabel>
        <div slot="end" style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: 8 }}>
          <IonNote style={{ fontWeight: 600, fontSize: 14, color: 'var(--ion-color-danger)' }}>
            − {formatMoney(expense.amount, currency)}
          </IonNote>
          {hasDetails && (
            <div
              style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(!expanded);
              }}
            >
              <IonIcon
                icon={expanded ? chevronDown : chevronForward}
                style={{ fontSize: 16, color: 'var(--ion-color-medium)' }}
              />
            </div>
          )}
          <IonIcon
            icon={trashOutline}
            style={{ fontSize: 18, color: 'var(--ion-color-medium)' }}
            onClick={(e) => {
              e.stopPropagation();
              onDelete(expense);
            }}
          />
        </div>
      </IonItem>

      {/* Expandable details */}
      {expanded && hasDetails && (
        <div
          style={{
            padding: '6px 12px 10px 52px',
            background: 'var(--ion-color-step-100, rgba(0,0,0,0.03))',
            borderBottomLeftRadius: 8,
            borderBottomRightRadius: 8,
            marginTop: -4,
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ion-color-medium)', marginBottom: 4 }}>
            Détail
          </div>
          {expense.details!.map((d, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: 12,
                padding: '3px 0',
                borderBottom: i < expense.details!.length - 1 ? '1px solid var(--ion-color-step-200, rgba(0,0,0,0.06))' : 'none',
              }}
            >
              <span style={{ flex: 1, color: 'var(--ion-color-dark)' }}>
                {d.description}
              </span>
              <span style={{ color: 'var(--ion-color-medium)', marginRight: 12 }}>
                {d.quantity} × {formatMoney(d.unit_price, currency)}
              </span>
              <span style={{ fontWeight: 600, color: 'var(--ion-color-dark)' }}>
                {formatMoney(d.quantity * d.unit_price, currency)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ExpenseItem;
