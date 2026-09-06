import { IonButton, IonIcon, IonProgressBar, IonText } from '@ionic/react';
import { arrowForward } from 'ionicons/icons';
import type { BudgetSummary } from '../types';
import { ALERT_LEVELS } from '../constants';
import { currentMonth, formatMoney } from '../utils/format';

const BudgetProgress: React.FC<{
  summary: BudgetSummary | null;
  currency: string;
}> = ({ summary, currency }) => {
  if (!summary) {
    return (
      <IonText color="medium">
        <p style={{ textAlign: 'center' }}>Aucun budget pour {currentMonth()}.</p>
      </IonText>
    );
  }

  const alert = ALERT_LEVELS[summary.alert_level];
  const barColor =
    summary.alert_level === 'none'
      ? 'success'
      : summary.alert_level === 'yellow'
        ? 'warning'
        : 'danger';

  return (
    <div style={{ paddingBottom: 8 }}>
      <div className="ion-justify-content-between ion-align-items-center" style={{ display: 'flex', marginBottom: 8 }}>
        <div>
          <IonText className="ion-text-uppercase" style={{ fontSize: 12, color: 'var(--ion-color-medium)' }}>
            Dépenses du mois
          </IonText>
          <div style={{ fontSize: 28, fontWeight: 700 }}>
            {formatMoney(summary.total_spent, currency)}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <IonText style={{ fontSize: 12, color: 'var(--ion-color-medium)' }}>Capital</IonText>
          <div style={{ fontSize: 16, fontWeight: 600 }}>{formatMoney(summary.capital, currency)}</div>
        </div>
      </div>

      <IonProgressBar value={Math.min(summary.percent_spent / 100, 1.2)} color={barColor} />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 12, color: 'var(--ion-color-medium)' }}>
        <span>{Math.round(summary.percent_spent)} %</span>
        <span style={{ color: alert.color }}>
          <IonIcon icon={alert.icon} style={{ verticalAlign: 'middle' }} /> {alert.label}
        </span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontSize: 14 }}>
        <span style={{ color: 'var(--ion-color-medium)' }}>Restant</span>
        <b>{formatMoney(summary.remaining, currency)}</b>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
        <span style={{ color: 'var(--ion-color-medium)' }}>Charges fixes</span>
        <b>
          {summary.fixed_paid_count}/{summary.fixed_total_count} ·{' '}
          {formatMoney(summary.total_fixed, currency)}
        </b>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
        <span style={{ color: 'var(--ion-color-medium)' }}>Dépenses variables</span>
        <b>
          {summary.variable_count} · {formatMoney(summary.total_variable, currency)}
        </b>
      </div>

      <div style={{ marginTop: 12 }}>
        <IonButton
          fill="clear"
          size="small"
          routerLink="/tabs/expenses"
          style={{ '--padding-start': 0 }}
        >
          Voir la liste <IonIcon icon={arrowForward} slot="end" />
        </IonButton>
      </div>
    </div>
  );
};

export default BudgetProgress;