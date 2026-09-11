import { useState } from 'react';
import {
  IonButton,
  IonIcon,
  IonNote,
  IonText,
  IonToast,
} from '@ionic/react';
import { checkmark, settingsOutline, walletOutline } from 'ionicons/icons';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { refreshMonthThunk, togglePaidThunk } from '../store/budgetSlice';
import { categoryColor, categoryIcon, categoryLabel } from '../constants';
import type { FixedCharge } from '../types';
import { formatMoney, nowISO } from '../utils/format';
import { isOnline } from '../services/connectivity';
import { offlineUpsertFixedCharge } from '../services/sync';

const FixedChargesList: React.FC<{
  charges: FixedCharge[];
  currency: string;
}> = ({ charges, currency }) => {
  const dispatch = useAppDispatch();
  const month = useAppSelector((s) => s.budget.month);
  const [toast, setToast] = useState<{ message: string; color: string } | null>(null);

  const paidCount = charges.filter((c) => c.is_paid).length;
  const total = charges.reduce((s, c) => s + c.amount, 0);
  const paidTotal = charges.filter((c) => c.is_paid).reduce((s, c) => s + c.amount, 0);

  const toggle = (c: FixedCharge) => {
    const next = !c.is_paid;
    if (isOnline()) {
      dispatch(togglePaidThunk({ id: c.id, isPaid: next })).then(() => {
        dispatch(refreshMonthThunk(month)).catch(() => undefined);
      });
    } else {
      offlineUpsertFixedCharge({ ...c, is_paid: next, updated_at: nowISO() }).then(() => {
        setToast({ message: 'Enregistré hors ligne.', color: 'warning' });
      });
    }
  };

  return (
    <div className="dash-card">
      <div className="dash-card-header">
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>Charges fixes</div>
          <IonNote color="medium" style={{ fontSize: 12 }}>
            {paidCount}/{charges.length} payée{charges.length > 1 ? 's' : ''} ·{' '}
            {formatMoney(paidTotal, currency)}/{formatMoney(total, currency)}
          </IonNote>
        </div>
        <IonButton routerLink="/tabs/global" fill="clear" size="small">
          <IonIcon icon={settingsOutline} slot="start" /> Gérer
        </IonButton>
      </div>

      {charges.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '20px 12px' }}>
          <IonIcon
            icon={walletOutline}
            style={{ fontSize: 34, color: 'var(--ion-color-medium)' }}
          />
          <IonText color="medium">
            <p style={{ margin: '8px 0 4px', fontSize: 13 }}>
              Aucune charge récurrente ce mois-ci.
            </p>
          </IonText>
          <IonButton routerLink="/tabs/global" size="small" fill="outline">
            Ajouter dans Global
          </IonButton>
        </div>
      ) : (
        charges.map((c) => {
          const color = categoryColor(c.category);
          return (
            <div
              key={c.id}
              className="charge-row"
              style={{ opacity: c.is_paid ? 0.65 : 1 }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 11,
                  background: `${color}22`,
                  color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <IonIcon icon={categoryIcon(c.category)} style={{ fontSize: 19 }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: 14,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    textDecoration: c.is_paid ? 'line-through' : 'none',
                  }}
                >
                  {c.name}
                </div>
                <IonNote color="medium" style={{ fontSize: 12 }}>
                  {categoryLabel(c.category)} · le {c.due_day}
                </IonNote>
              </div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>
                {formatMoney(c.amount, currency)}
              </div>
              <button
                type="button"
                aria-label={c.is_paid ? `Marquer « ${c.name} » non payée` : `Marquer « ${c.name} » payée`}
                onClick={() => toggle(c)}
                className={`pay-toggle ${c.is_paid ? 'is-paid' : ''}`}
              >
                <IonIcon icon={checkmark} />
              </button>
            </div>
          );
        })
      )}

      <IonToast
        isOpen={!!toast}
        message={toast?.message ?? ''}
        color={toast?.color}
        duration={2200}
        onDidDismiss={() => setToast(null)}
      />
    </div>
  );
};

export default FixedChargesList;
