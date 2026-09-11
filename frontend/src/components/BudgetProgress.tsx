import { IonButton, IonIcon, IonProgressBar, IonText } from '@ionic/react';
import { arrowForward, checkmarkCircle, warning, alertCircle, closeCircle } from 'ionicons/icons';
import type { BudgetSummary } from '../types';
import { ALERT_LEVELS } from '../constants';
import { currentMonth, formatMoney } from '../utils/format';

const ALERT_ICONS: Record<string, string> = {
  none: checkmarkCircle,
  yellow: warning,
  red: alertCircle,
  over: closeCircle,
};

const BudgetProgress: React.FC<{
  summary: BudgetSummary | null;
  currency: string;
  debtPayments?: number;
}> = ({ summary, currency, debtPayments = 0 }) => {
  if (!summary) {
    return (
      <div className="hero-card">
        <div className="hero-inner" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <IonText>
            <p style={{ color: 'rgba(255,255,255,0.92)', margin: 0 }}>
              Aucun budget pour {currentMonth()}.
            </p>
          </IonText>
        </div>
      </div>
    );
  }

  const alert = ALERT_LEVELS[summary.alert_level];
  const alertColor = alert.color;

  const adjustedSpent = summary.total_spent + debtPayments;
  const adjustedCapital = summary.capital;
  const adjustedRemaining = Math.max(0, summary.remaining - debtPayments);
  const adjustedPercent = adjustedCapital > 0 ? (adjustedSpent / adjustedCapital) * 100 : 0;

  const barColor =
    adjustedPercent >= 100
      ? 'danger'
      : adjustedPercent >= (summary.alert_level === 'yellow' ? 70 : 85)
        ? 'warning'
        : 'success';

  return (
    <div className="hero-card">
      <div className="hero-inner">
        <div className="hero-top">
          <div>
            <div className="hero-k">Dépenses du mois</div>
            <div className="hero-value">{formatMoney(adjustedSpent, currency)}</div>
          </div>
          <div className="right">
            <div className="hero-k">Capital</div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>
              {formatMoney(adjustedCapital, currency)}
            </div>
          </div>
        </div>

        <IonProgressBar
          className="hero-progress"
          value={Math.min(adjustedPercent / 100, 1.2)}
          color={barColor}
        />
        <div className="hero-progress-row">
          <span>{Math.round(adjustedPercent)} %</span>
          <span
            className="hero-alert"
            style={{
              background: `${alertColor}22`,
              color: alertColor,
            }}
          >
            <IonIcon icon={ALERT_ICONS[summary.alert_level]} /> {alert.label}
          </span>
        </div>

        <div className="hero-stat-row">
          <span className="k">Restant</span>
          <span className="v">{formatMoney(adjustedRemaining, currency)}</span>
        </div>
        {debtPayments > 0 && (
          <div className="hero-stat-row">
            <span className="k">Remboursement emprunts</span>
            <span className="v" style={{ color: '#f97316' }}>
              − {formatMoney(debtPayments, currency)}
            </span>
          </div>
        )}
        <div className="hero-stat-row">
          <span className="k">Charges fixes</span>
          <span className="v dim">
            {summary.fixed_paid_count}/{summary.fixed_total_count} ·{' '}
            {formatMoney(summary.total_fixed, currency)}
          </span>
        </div>
        <div className="hero-stat-row">
          <span className="k">Dépenses variables</span>
          <span className="v dim">
            {summary.variable_count} · {formatMoney(summary.total_variable, currency)}
          </span>
        </div>

        <div style={{ marginTop: 6 }}>
          <IonButton
            className="hero-link"
            fill="clear"
            size="small"
            routerLink="/tabs/expenses"
            style={{ '--padding-start': 0 }}
          >
            Voir la liste <IonIcon icon={arrowForward} slot="end" />
          </IonButton>
        </div>
      </div>
    </div>
  );
};

export default BudgetProgress;
