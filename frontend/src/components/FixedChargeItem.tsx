import { IonAvatar, IonIcon, IonItem, IonLabel, IonNote } from '@ionic/react';
import { checkmark, checkmarkDone } from 'ionicons/icons';
import type { FixedCharge } from '../types';
import { categoryColor, categoryIcon, categoryLabel } from '../constants';
import { formatMoney } from '../utils/format';

const FixedChargeItem: React.FC<{
  charge: FixedCharge;
  currency: string;
  onToggle: (c: FixedCharge) => void;
  onEdit: (c: FixedCharge) => void;
}> = ({ charge, currency, onToggle, onEdit }) => {
  const color = charge.is_paid ? 'var(--ion-color-success)' : 'var(--ion-color-medium)';

  return (
    <IonItem
      button
      onClick={() => onEdit(charge)}
      style={{ '--inner-padding-start': '8px', '--padding-start': '8px' }}
    >
      <IonAvatar
        slot="start"
        style={{
          background: `${categoryColor(charge.category)}20`,
          width: 34,
          height: 34,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <IonIcon
          icon={categoryIcon(charge.category)}
          style={{ color: categoryColor(charge.category), fontSize: 18 }}
        />
      </IonAvatar>
      <IonLabel>
        <h2 style={{ margin: 0 }}>
          {charge.name}
          {charge.is_paid ? (
            <IonIcon
              icon={checkmarkDone}
              style={{ fontSize: 14, marginLeft: 4, verticalAlign: 'middle' }}
              color="success"
            />
          ) : null}
        </h2>
        <IonNote style={{ color: 'var(--ion-color-medium)' }}>
          {categoryLabel(charge.category)} · Le {charge.due_day}
        </IonNote>
      </IonLabel>
      <div slot="end" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <IonNote style={{ fontWeight: 600, fontSize: 14, color }}>
          {formatMoney(charge.amount, currency)}
        </IonNote>
        <IonIcon
          icon={charge.is_paid ? checkmark : checkmarkDone}
          color={charge.is_paid ? 'success' : 'medium'}
          style={{ fontSize: 22 }}
          onClick={(e) => {
            e.stopPropagation();
            onToggle(charge);
          }}
        />
      </div>
    </IonItem>
  );
};

export default FixedChargeItem;