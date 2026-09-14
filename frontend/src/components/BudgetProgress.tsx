import { IonButton, IonIcon, IonProgressBar, IonText } from '@ionic/react';
import { arrowForward, checkmarkCircle, warning, alertCircle, closeCircle } from 'ionicons/icons';
import type { BudgetSummary } from '../types';
import { ALERT_LEVELS } from '../constants';
import { currentMonth, formatMoney, monthLabel } from '../utils/format';

const ALERT_ICONS: Record<string, string> = {
  none: checkmarkCircle,
  yellow: warning,
  red: alertCircle,
  over: closeCircle,
};

const R = 50;
const CIRC = 2 * Math.PI * R;

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
  const percent = Math.min(adjustedPercent, 100);

  const barColor =
    adjustedPercent >= 100
      ? 'danger'
      : adjustedPercent >= (summary.alert_level === 'yellow' ? 70 : 85)
        ? 'warning'
        : 'success';

  const ringColor =
    adjustedPercent >= 100
      ? '#f87171'
      : adjustedPercent >= (summary.alert_level === 'yellow' ? 70 : 85)
        ? '#fbbf24'
        : '#6ee7b7';

  const dash = (percent / 100) * CIRC;

  return (
    <div className="hero-card">
      <div className="hero-inner">
        <div className="hero-top">
          <div>
            <div className="hero-k">
              Dépenses · {monthLabel(summary.month ?? currentMonth())}
            </div>
            <div className="hero-value">{formatMoney(adjustedSpent, currency)}</div>
          </div>
          <div className="hero-gauge-wrap">
            <svg viewBox="0 0 120 120" aria-hidden="true">
              <circle className="hero-gauge-bg" cx="60" cy="60" r={R} />
              <circle
                className="hero-gauge-fg"
                cx="60"
                cy="60"
                r={R}
                stroke={ringColor}
                strokeDasharray={`${dash} ${CIRC}`}
                transform="rotate(-90 60 60)"
              />
            </svg>
            <div className="hero-gauge-label">
              {Math.round(adjustedPercent)}<small>%</small>
            </div>
          </div>
        </div>

        <div className="hero-rest-row">
          <span className="hero-k">Restant</span>
          <span
            className="hero-alert"
            style={{
              background: 'rgba(255,255,255,0.16)',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.22)',
            }}
          >
            <IonIcon icon={ALERT_ICONS[summary.alert_level]} /> {alert.label}
          </span>
          <span className="hero-rest-amount">{formatMoney(adjustedRemaining, currency)}</span>
        </div>

        <IonProgressBar
          className="hero-progress"
          value={Math.min(adjustedPercent / 100, 1.2)}
          color={barColor}
        />

        <div className="hero-stat-row">
          <span className="k">Capital</span>
          <span className="v">{formatMoney(adjustedCapital, currency)}</span>
        </div>
        {debtPayments > 0 && (
          <div className="hero-stat-row">
            <span className="k">Remboursement emprunts</span>
            <span className="v" style={{ color: '#fca5a5' }}>
              − {formatMoney(debtPayments, currency)}
            </span>
          </div>
        )}

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