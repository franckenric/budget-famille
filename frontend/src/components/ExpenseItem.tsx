import { IonAvatar, IonIcon, IonItem, IonLabel, IonNote } from '@ionic/react';
import { chevronForward, trashOutline } from 'ionicons/icons';
import type { VariableExpense } from '../types';
import { categoryColor, categoryIcon, categoryLabel } from '../constants';
import { formatDay, formatMoney } from '../utils/format';

const ExpenseItem: React.FC<{
  expense: VariableExpense;
  currency: string;
  onEdit: (e: VariableExpense) => void;
  onDelete: (e: VariableExpense) => void;
}> = ({ expense, currency, onEdit, onDelete }) => {
  return (
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
        </h2>
        <IonNote style={{ color: 'var(--ion-color-medium)' }}>
          {categoryLabel(expense.category)} · {formatDay(expense.expense_date)}
        </IonNote>
      </IonLabel>
      <div slot="end" style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: 8 }}>
        <IonNote style={{ fontWeight: 600, fontSize: 14, color: 'var(--ion-color-danger)' }}>
          − {formatMoney(expense.amount, currency)}
        </IonNote>
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
  );
};

export default ExpenseItem;