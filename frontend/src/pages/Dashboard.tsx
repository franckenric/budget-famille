import { useEffect, useMemo, useState } from 'react';
import {
  IonAlert,
  IonButton,
  IonContent,
  IonDatetime,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonModal,
  IonPage,
  IonSegment,
  IonSegmentButton,
  IonTitle,
  IonToolbar,
  IonToast,
  useIonViewWillEnter,
} from '@ionic/react';
import {
  add,
  calendar,
  calendarOutline,
  chevronBack,
  chevronForward,
  listOutline,
  receiptOutline,
  walletOutline,
  pieChartOutline,
  cashOutline,
  checkmarkCircle,
  pencilOutline,
  trashOutline,
} from 'ionicons/icons';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { useIonRouter } from '@ionic/react';
import { loadMonthThunk, refreshMonthThunk, setMonth } from '../store/budgetSlice';
import { loadDebtsThunk, recordPaymentThunk, removeDebtThunk } from '../store/debtsSlice';
import BudgetProgress from '../components/BudgetProgress';
import CategoryPie from '../components/CategoryPie';
import FixedChargesList from '../components/FixedChargesList';
import DebtHistoryModal from '../components/DebtHistoryModal';
import EmptyState from '../components/EmptyState';
import { categoryColor, categoryIcon, categoryLabel } from '../constants';
import type { BudgetSummary, Debt } from '../types';
import {
  formatDay,
  formatMoney,
  getWeekRange,
  isDateInRange,
  monthLabel,
  toISODate,
  weekLabel,
} from '../utils/format';
import type { ViewMode } from '../utils/format';

const Dashboard: React.FC = () => {
  const dispatch = useAppDispatch();
  const router = useIonRouter();
  const { month, summary, stats, expenses, fixedCharges, budget, loading } = useAppSelector(
    (s) => s.budget,
  );
  const { debts } = useAppSelector((s) => s.debts);
  const userCurrency = useAppSelector((s) => s.auth.user?.currency);
  const user = useAppSelector((s) => s.auth.user);
  const currency = budget?.currency ?? userCurrency ?? 'MGA';
  const [toast, setToast] = useState<{ message: string; color: string } | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [weekRef, setWeekRef] = useState(() => new Date());

  useEffect(() => {
    dispatch(refreshMonthThunk(month));
    dispatch(loadDebtsThunk());
  }, [month, dispatch]);

  useIonViewWillEnter(() => {
    dispatch(refreshMonthThunk(month)).catch(() => undefined);
    dispatch(loadDebtsThunk()).catch(() => undefined);
  });

  const goPrev = () => {
    if (viewMode === 'month') {
      const [y, m] = month.split('-').map(Number);
      const d = new Date(y, m - 2, 1);
      const newMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      dispatch(setMonth(newMonth));
      dispatch(loadMonthThunk(newMonth));
    } else {
      setWeekRef((prev) => {
        const d = new Date(prev);
        d.setDate(d.getDate() - 7);
        return d;
      });
    }
  };

  const goNext = () => {
    if (viewMode === 'month') {
      const [y, m] = month.split('-').map(Number);
      const d = new Date(y, m, 1);
      const newMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      dispatch(setMonth(newMonth));
      dispatch(loadMonthThunk(newMonth));
    } else {
      setWeekRef((prev) => {
        const d = new Date(prev);
        d.setDate(d.getDate() + 7);
        return d;
      });
    }
  };

  const weekRange = useMemo(() => getWeekRange(weekRef), [weekRef]);

  const weekExpenses = useMemo(() => {
    if (viewMode !== 'week') return expenses;
    return expenses.filter((e) => isDateInRange(e.expense_date, weekRange.start, weekRange.end));
  }, [viewMode, expenses, weekRange]);

  const weekCharges = useMemo(() => {
    if (viewMode !== 'week') return fixedCharges;
    return fixedCharges.filter((c) => c.due_day >= weekRef.getDate() && c.due_day <= weekRef.getDate() + 6);
  }, [viewMode, fixedCharges, weekRef]);

  const weekSummary = useMemo<BudgetSummary | null>(() => {
    if (viewMode !== 'week' || !summary) return summary;
    const wTotal = weekExpenses.reduce((s, e) => s + e.amount, 0);
    const wFixed = weekCharges.reduce((s, c) => s + c.amount, 0);
    const daysInWeek = 7;
    const daysInMonth = new Date(weekRef.getFullYear(), weekRef.getMonth() + 1, 0).getDate();
    const proportion = daysInWeek / daysInMonth;
    const projectedCapital = summary.capital * proportion;
    const wRemaining = projectedCapital - wTotal - wFixed;
    const wPercent = projectedCapital > 0 ? ((wTotal + wFixed) / projectedCapital) * 100 : 0;
    let alertLevel: 'none' | 'yellow' | 'red' | 'over' = 'none';
    if (wPercent >= 100) alertLevel = 'over';
    else if (wPercent >= 85) alertLevel = 'red';
    else if (wPercent >= 70) alertLevel = 'yellow';

    return {
      ...summary,
      capital: Math.round(projectedCapital),
      total_spent: wTotal + wFixed,
      total_variable: wTotal,
      total_fixed: wFixed,
      remaining: Math.round(wRemaining),
      percent_spent: Math.round(wPercent * 10) / 10,
      alert_level: alertLevel,
      fixed_total_count: weekCharges.length,
      fixed_paid_count: weekCharges.filter((c) => c.is_paid).length,
      variable_count: weekExpenses.length,
    };
  }, [viewMode, summary, weekExpenses, weekCharges, weekRef]);

  const recent = weekExpenses.slice(0, 5);
  const weekTotal = weekExpenses.reduce((s, e) => s + e.amount, 0);
  const headerLabel = viewMode === 'month' ? monthLabel(month) : weekLabel(weekRef);

  const unpaidDebts = debts.filter((d) => !d.is_repaid);

  const debtPaid = (d: Debt): number =>
    (d.payments ?? []).reduce((s, p) => s + p.amount, 0);

  const debtRemaining = (d: Debt): number => Math.max(0, d.amount - debtPaid(d));

  const totalRemaining = unpaidDebts.reduce((s, d) => s + debtRemaining(d), 0);

  const debtPaymentsThisMonth = debts.reduce((s, d) => {
    const payments = d.payments ?? [];
    return s + payments
      .filter((p) => p.date?.startsWith(month))
      .reduce((ss, p) => ss + p.amount, 0);
  }, 0);

  const debtPaymentsWeek = debts.reduce((s, d) => {
    const payments = d.payments ?? [];
    return s + payments
      .filter((p) => p.date && isDateInRange(p.date, weekRange.start, weekRange.end))
      .reduce((ss, p) => ss + p.amount, 0);
  }, 0);

  const debtPayments = viewMode === 'month' ? debtPaymentsThisMonth : debtPaymentsWeek;

  const summaryExpenses = viewMode === 'month' ? (summary?.total_variable ?? 0) : weekTotal;
  const summaryCharges = viewMode === 'month' ? (summary?.total_fixed ?? 0) : weekCharges.reduce((s, c) => s + c.amount, 0);
  const summaryDebtsPaid = debtPayments;
  const summaryGrandTotal = summaryExpenses + summaryCharges + summaryDebtsPaid;
  const isOverBudget = summary ? summary.percent_spent >= 100 : false;

  const [payModal, setPayModal] = useState<Debt | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(toISODate(new Date()));
  const [showPayDate, setShowPayDate] = useState(false);
  const [historyDebt, setHistoryDebt] = useState<Debt | null>(null);
  const [toDelete, setToDelete] = useState<Debt | null>(null);

  const openPayModal = (d: Debt) => {
    setPayAmount('');
    setPayDate(toISODate(new Date()));
    setPayModal(d);
  };

  const confirmPayment = async () => {
    if (!payModal) return;
    const amount = Number(payAmount);
    if (!amount || amount <= 0) return;
    const res = await dispatch(recordPaymentThunk({ id: payModal.id, payment: { date: payDate, amount } }));
    setPayModal(null);
    if (res.meta.requestStatus === 'fulfilled') {
      setToast({ message: 'Paiement enregistré.', color: 'success' });
    } else {
      setToast({ message: 'Erreur lors de l\'enregistrement.', color: 'danger' });
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    const res = await dispatch(removeDebtThunk(toDelete.id));
    setToDelete(null);
    if (res.meta.requestStatus === 'fulfilled') {
      setToast({ message: 'Emprunt supprimé.', color: 'success' });
      dispatch(loadDebtsThunk());
    }
  };

  const openHistory = (d: Debt) => {
    setHistoryDebt(d);
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar className="dash-toolbar">
          <div className="dash-greet">
            <div className="dash-greet-hello">
              {user?.full_name
                ? `Bonjour, ${user.full_name.split(' ')[0]}`
                : 'Bonjour'}
            </div>
            <div className="dash-greet-date">
              {new Date().toLocaleDateString('fr-FR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </div>
          </div>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        {/* View toggle */}
        <IonSegment
          value={viewMode}
          onIonChange={(e) => setViewMode(e.detail.value as ViewMode)}
          className="view-toggle"
        >
          <IonSegmentButton value="month">
            <IonIcon icon={calendar} slot="start" />
            Mois
          </IonSegmentButton>
          <IonSegmentButton value="week">
            <IonIcon icon={calendarOutline} slot="start" />
            Semaine
          </IonSegmentButton>
        </IonSegment>

        {/* Period switcher */}
        <div className="month-switch">
          <IonButton fill="clear" size="small" onClick={goPrev}>
            <IonIcon slot="icon-only" icon={chevronBack} />
          </IonButton>
          <span className="month-label">{headerLabel}</span>
          <IonButton fill="clear" size="small" onClick={goNext}>
            <IonIcon slot="icon-only" icon={chevronForward} />
          </IonButton>
        </div>

        {/* Budget hero — month only */}
        {viewMode === 'month' && (
          loading ? (
            <div className="hero-card">
              <div className="hero-inner" style={{ textAlign: 'center', padding: '40px 20px' }}>
                <p style={{ color: 'rgba(255,255,255,0.92)', margin: 0 }}>Chargement…</p>
              </div>
            </div>
          ) : (
            <BudgetProgress summary={weekSummary} currency={currency} debtPayments={viewMode === 'month' ? debtPaymentsThisMonth : debtPaymentsWeek} />
          )
        )}

        {/* Stat tiles — month only */}
        {viewMode === 'month' && summary && (
          <div className="stat-tiles">
            <div className="stat-tile">
              <div className="stat-label">Restant</div>
              <div
                className="stat-value"
                style={{ color: summary.remaining - debtPaymentsThisMonth >= 0 ? '#16a34a' : '#dc2626' }}
              >
                {formatMoney(Math.abs(summary.remaining - debtPaymentsThisMonth), currency)}
              </div>
              <div className="stat-sub">
                {summary.remaining - debtPaymentsThisMonth >= 0 ? 'disponible' : 'de dépassement'}
              </div>
            </div>
            <div className="stat-tile">
              <div className="stat-label">Budget utilisé</div>
              <div className="stat-value">{Math.round(summary.percent_spent)}%</div>
              <div className="stat-bar">
                <span
                  style={{
                    width: `${Math.min(summary.percent_spent, 100)}%`,
                    background:
                      summary.percent_spent >= 100
                        ? '#ef4444'
                        : summary.percent_spent >= 70
                          ? '#f97316'
                          : '#22c55e',
                  }}
                />
              </div>
            </div>
            <div className="stat-tile">
              <div className="stat-label">Charges fixes payées</div>
              <div className="stat-value">
                {summary.fixed_paid_count}/{summary.fixed_total_count}
              </div>
              <div className="stat-sub">{formatMoney(summary.total_fixed, currency)}</div>
            </div>
            <div className="stat-tile">
              <div className="stat-label">Dépenses</div>
              <div className="stat-value">{summary.variable_count}</div>
              <div className="stat-sub">{formatMoney(summary.total_variable, currency)}</div>
            </div>
          </div>
        )}

        {/* Quick actions — month only */}
        {viewMode === 'month' && (
          <div className="quick-actions">
            <IonButton routerLink="/tabs/expenses/add" expand="block" className="primary-action">
              <IonIcon icon={add} slot="start" /> Dépense
            </IonButton>
            <IonButton routerLink="/tabs/global" expand="block" fill="outline">
              <IonIcon icon={walletOutline} slot="start" /> Charges
            </IonButton>
          </div>
        )}

        {/* Debt alert — month only, when over budget */}
        {viewMode === 'month' && isOverBudget && (
          <div className="debt-banner">
            <div className="debt-banner-header">
              <IonIcon icon={cashOutline} />
              <span className="debt-banner-title">Budget dépassé !</span>
            </div>
            <div className="debt-banner-amount">
              Dépassement de {formatMoney((summary?.total_spent ?? 0) - (summary?.capital ?? 0), currency)}
            </div>
          </div>
        )}

        {/* Emprunts section — month only */}
        {viewMode === 'month' && (<>
        <div className="section-head">
          <IonIcon icon={cashOutline} />
          <h3 className="section-title">Emprunts</h3>
        </div>

        {unpaidDebts.length > 0 && totalRemaining > 0 && (
          <div className="dash-card" style={{ marginBottom: 12, padding: '12px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--ion-color-medium)', fontWeight: 600 }}>
                Reste à rembourser
              </span>
              <span style={{ fontSize: 15, fontWeight: 800, color: '#f97316' }}>
                {formatMoney(totalRemaining, currency)}
              </span>
            </div>
          </div>
        )}

        {debts.length === 0 ? (
          <div className="tile-group">
            <EmptyState
              icon="cash-outline"
              title="Aucun emprunt"
              subtitle="Vos dettes (emprunts, avances) sont gérées depuis l'onglet Global."
            />
          </div>
        ) : (
          <div className="tile-group">
            {debts.map((d) => {
              const payments = d.payments ?? [];
              const paidTotal = debtPaid(d);
              const remaining = debtRemaining(d);
              const ratio = d.amount > 0 ? Math.min(1, paidTotal / d.amount) : 0;
              const paidThisMonth = payments
                .filter((p) => p.date?.startsWith(month))
                .reduce((s, p) => s + p.amount, 0);
              const monthDue = d.monthly_amount && d.monthly_amount > 0 ? d.monthly_amount : null;

              return (
                <div
                  key={d.id}
                  className="dash-card"
                  style={{
                    padding: '14px 16px',
                    opacity: d.is_repaid ? 0.65 : 1,
                  }}
                >
                  {/* Header: icon + name + amount */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        background: d.is_repaid ? 'rgba(22,163,74,0.12)' : 'rgba(249,115,22,0.12)',
                        color: d.is_repaid ? '#16a34a' : '#f97316',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <IonIcon icon={d.is_repaid ? checkmarkCircle : cashOutline} style={{ fontSize: 20 }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 15, textDecoration: d.is_repaid ? 'line-through' : 'none' }}>
                        {d.lender_name}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--ion-color-medium)' }}>
                        {formatDay(d.debt_date)}
                        {d.reason ? ` · ${d.reason}` : ''}
                        {monthDue && !d.is_repaid && ` · ${new Intl.NumberFormat('fr-FR').format(monthDue)} ${currency}/mois`}
                      </div>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: d.is_repaid ? 'var(--ion-color-medium)' : '#f97316' }}>
                      {formatMoney(d.amount, currency)}
                    </div>
                  </div>

                  {/* Progress section */}
                  {!d.is_repaid && (
                    <>
                      {/* Progress bar */}
                      <div className="mini-bar" style={{ marginBottom: 6 }}>
                        <div className="mini-bar-fill" style={{ width: `${ratio * 100}%` }} />
                      </div>

                      {/* Stats row */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <div style={{ fontSize: 12, color: 'var(--ion-color-medium)' }}>
                          Payé {new Intl.NumberFormat('fr-FR').format(Math.round(paidTotal))} / {new Intl.NumberFormat('fr-FR').format(d.amount)} {currency}
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#f97316' }}>
                          Reste : − {formatMoney(remaining, currency)}
                        </div>
                      </div>

                      {/* Monthly info if exists */}
                      {monthDue && remaining > 0 && (
                        <div style={{ display: 'flex', gap: 16, marginBottom: 12, fontSize: 12, color: 'var(--ion-color-medium)' }}>
                          <span>Mois : {formatMoney(paidThisMonth, currency)} / {formatMoney(monthDue, currency)}</span>
                          <span>~{Math.ceil(remaining / monthDue)} mois restants</span>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <IonButton size="small" fill="outline" className="filter-btn" style={{ margin: 0, fontSize: 12, flex: '1 1 auto' }}
                          onClick={() => openPayModal(d)}>
                          Encaisser un paiement
                        </IonButton>
                        {payments.length > 0 && (
                          <IonButton size="small" fill="clear" className="filter-btn" style={{ margin: 0, fontSize: 12, flex: '1 1 auto' }}
                            onClick={() => openHistory(d)}>
                            Historique ({payments.length})
                          </IonButton>
                        )}
                      </div>
                    </>
                  )}

                  {/* Repaid badge */}
                  {d.is_repaid && (
                    <>
                      <div style={{ fontSize: 12, color: '#16a34a', fontWeight: 600, textAlign: 'center', padding: '6px 0 2px' }}>
                        ✓ Remboursé
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                        {payments.length > 0 && (
                          <IonButton size="small" fill="outline" className="filter-btn" style={{ margin: 0, fontSize: 12, flex: '1 1 auto' }}
                            onClick={() => setHistoryDebt(d)}>
                            Paiements ({payments.length})
                          </IonButton>
                        )}
                        <IonButton size="small" fill="outline" className="filter-btn" style={{ margin: 0, fontSize: 12, flex: '1 1 auto' }}
                          onClick={() => router.push(`/tabs/debts/add?edit=${d.id}`)}>
                          Modifier
                        </IonButton>
                        <IonButton size="small" fill="clear" className="filter-btn" style={{ margin: 0, fontSize: 12, flex: '1 1 auto', color: 'var(--ion-color-danger)' }}
                          onClick={() => setToDelete(d)}>
                          Supprimer
                        </IonButton>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
        </>)}

        {/* Charges fixes — month only */}
        {viewMode === 'month' && (
          <>
            <div className="section-head">
              <IonIcon icon={walletOutline} />
              <h3 className="section-title">Charges fixes</h3>
              <IonButton
                className="section-extra"
                fill="clear"
                size="small"
                routerLink="/tabs/global"
              >
                Voir tout
              </IonButton>
            </div>
            <FixedChargesList charges={fixedCharges} currency={currency} />
          </>
        )}

        {/* Dépenses — different layout per view */}
        {viewMode === 'month' ? (
          <>
            <div className="section-head">
              <IonIcon icon={receiptOutline} />
              <h3 className="section-title">Dernières dépenses</h3>
              <IonButton
                className="section-extra"
                fill="clear"
                size="small"
                routerLink="/tabs/expenses"
              >
                Voir tout
              </IonButton>
            </div>
            {recent.length === 0 ? (
              <div className="tile-group">
                <EmptyState
                  icon="receipt-outline"
                  title="Aucune dépense ce mois-ci"
                  subtitle="Ajoutez votre première dépense avec le bouton ci-dessus."
                />
              </div>
            ) : (
              <div className="tile-group">
                {recent.map((e) => (
                  <div key={e.id} className="recent-row">
                    <div
                      className="ico-bubble"
                      style={{ background: `${categoryColor(e.category)}22`, color: categoryColor(e.category) }}
                    >
                      <IonIcon icon={categoryIcon(e.category)} style={{ fontSize: 18 }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="recent-title">
                        {e.title}
                        {e.details && e.details.length > 0 && (
                          <IonIcon icon={listOutline} style={{ fontSize: 12, marginLeft: 4, verticalAlign: 'middle', color: '#3b82f6' }} />
                        )}
                      </div>
                      <div className="recent-sub">
                        {categoryLabel(e.category)} · {formatDay(e.expense_date)}
                      </div>
                    </div>
                    <div className="recent-amount">− {formatMoney(e.amount, currency)}</div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          /* Week view — full expense list */
          <>
            <div className="dash-card" style={{ marginBottom: 12, padding: '12px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--ion-color-medium)', fontWeight: 600 }}>
                  Dépenses de la semaine
                </span>
                <span style={{ fontSize: 15, fontWeight: 800 }}>
                  − {formatMoney(weekTotal, currency)}
                </span>
              </div>
            </div>
            {weekExpenses.length === 0 ? (
              <div className="tile-group">
                <EmptyState
                  icon="receipt-outline"
                  title="Aucune dépense cette semaine"
                  subtitle="Ajoutez une dépense pour la voir ici."
                />
              </div>
            ) : (
              <div className="tile-group">
                {weekExpenses.map((e) => (
                  <div key={e.id} className="recent-row">
                    <div
                      className="ico-bubble"
                      style={{ background: `${categoryColor(e.category)}22`, color: categoryColor(e.category) }}
                    >
                      <IonIcon icon={categoryIcon(e.category)} style={{ fontSize: 18 }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="recent-title">
                        {e.title}
                        {e.details && e.details.length > 0 && (
                          <IonIcon icon={listOutline} style={{ fontSize: 12, marginLeft: 4, verticalAlign: 'middle', color: '#3b82f6' }} />
                        )}
                      </div>
                      <div className="recent-sub">
                        {categoryLabel(e.category)} · {formatDay(e.expense_date)}
                      </div>
                    </div>
                    <div className="recent-amount">− {formatMoney(e.amount, currency)}</div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Chart — month only */}
        {viewMode === 'month' && stats && stats.categories.filter((c) => c.total > 0).length > 0 ? (
          <>
            <div className="section-head">
              <IonIcon icon={pieChartOutline} />
              <h3 className="section-title">Répartition par catégorie</h3>
            </div>
            <div className="tile-group chart-card">
              <CategoryPie stats={stats} currency={currency} />
            </div>
          </>
        ) : null}

        {/* Total global */}
        <div className="section-head">
          <IonIcon icon={pieChartOutline} />
          <h3 className="section-title">Total global</h3>
        </div>
        <div className="tile-group">
          {(() => {
            const capital = viewMode === 'month' ? (summary?.capital ?? 0) : (weekSummary?.capital ?? 0);
            const remaining = capital - summaryGrandTotal;
            const percentUsed = capital > 0 ? Math.round((summaryGrandTotal / capital) * 100) : 0;
            const barColor = percentUsed >= 100 ? '#ef4444' : percentUsed >= 85 ? '#f97316' : percentUsed >= 70 ? '#eab308' : '#22c55e';
            const remainingColor = remaining >= 0 ? '#22c55e' : '#ef4444';

            return (
              <>
                <div style={{ padding: '14px 14px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ion-color-medium)' }}>Capital</div>
                    <div style={{ fontSize: 18, fontWeight: 800 }}>{formatMoney(capital, currency)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ion-color-medium)' }}>Restant</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: remainingColor }}>
                      {remaining >= 0 ? '' : '− '}{formatMoney(Math.abs(remaining), currency)}
                    </div>
                  </div>
                </div>

                {capital > 0 && (
                  <div style={{ padding: '0 14px 12px' }}>
                    <div style={{ height: 6, borderRadius: 3, background: 'var(--ion-color-step-200, rgba(0,0,0,0.06))', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(percentUsed, 100)}%`, borderRadius: 3, background: barColor, transition: 'width 0.3s ease' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 11, color: 'var(--ion-color-medium)' }}>
                      <span>{percentUsed}% utilisé</span>
                      <span>{formatMoney(summaryGrandTotal, currency)} / {formatMoney(capital, currency)}</span>
                    </div>
                  </div>
                )}

                <div style={{ borderTop: '1px solid var(--ion-border-color)' }}>
                  <div className="recent-row">
                    <div className="ico-bubble" style={{ background: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}>
                      <IonIcon icon={receiptOutline} style={{ fontSize: 18 }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div className="recent-title">Dépenses variables</div>
                      <div className="recent-sub">{viewMode === 'month' ? monthLabel(month) : weekLabel(weekRef)}</div>
                    </div>
                    <div className="recent-amount" style={{ color: 'inherit' }}>− {formatMoney(summaryExpenses, currency)}</div>
                  </div>
                  <div className="recent-row">
                    <div className="ico-bubble" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
                      <IonIcon icon={walletOutline} style={{ fontSize: 18 }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div className="recent-title">Charges fixes</div>
                      <div className="recent-sub">{viewMode === 'month' ? monthLabel(month) : weekLabel(weekRef)}</div>
                    </div>
                    <div className="recent-amount" style={{ color: 'inherit' }}>− {formatMoney(summaryCharges, currency)}</div>
                  </div>
                  <div className="recent-row">
                    <div className="ico-bubble" style={{ background: 'rgba(249,115,22,0.12)', color: '#f97316' }}>
                      <IonIcon icon={cashOutline} style={{ fontSize: 18 }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div className="recent-title">Remboursement emprunts</div>
                      <div className="recent-sub">{viewMode === 'month' ? monthLabel(month) : weekLabel(weekRef)}</div>
                    </div>
                    <div className="recent-amount" style={{ color: '#f97316' }}>− {formatMoney(summaryDebtsPaid, currency)}</div>
                  </div>
                </div>

                <div style={{ padding: '12px 14px', borderTop: '1px solid var(--ion-border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: percentUsed >= 100 ? 'rgba(239,68,68,0.06)' : 'transparent', borderRadius: '0 0 var(--app-card-radius) var(--app-card-radius)' }}>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>Grand total</span>
                  <span style={{ fontWeight: 800, fontSize: 17, color: barColor }}>
                    − {formatMoney(summaryGrandTotal, currency)}
                  </span>
                </div>
              </>
            );
          })()}
        </div>

        {/* Paiement modal */}
        <IonModal isOpen={!!payModal} onDidDismiss={() => setPayModal(null)}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>
                {payModal ? `Paiement — ${payModal.lender_name}` : ''}
              </IonTitle>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            {payModal && (
              <>
                <IonItem style={{ marginBottom: 12 }}>
                  <IonInput
                    type="number"
                    label={`Montant (${currency})`}
                    labelPlacement="stacked"
                    inputmode="numeric"
                    value={payAmount}
                    onIonInput={(e) => setPayAmount(String(e.detail.value ?? ''))}
                    placeholder={payModal.monthly_amount ? String(payModal.monthly_amount) : ''}
                  />
                </IonItem>
                <IonItem button onClick={() => setShowPayDate(true)} style={{ marginBottom: 16 }}>
                  <IonLabel>Date du paiement</IonLabel>
                  <IonLabel slot="end" color="medium">{payDate}</IonLabel>
                </IonItem>
                <IonButton expand="block" disabled={!Number(payAmount) || Number(payAmount) <= 0} onClick={confirmPayment}>
                  Enregistrer le paiement
                </IonButton>
                <IonButton expand="block" fill="clear" onClick={() => setPayModal(null)} style={{ marginTop: 8 }}>
                  Annuler
                </IonButton>
              </>
            )}
          </IonContent>
        </IonModal>

        <IonModal isOpen={showPayDate} onDidDismiss={() => setShowPayDate(false)}>
          <IonDatetime
            value={payDate}
            onIonChange={(e) => {
              setPayDate(String(e.detail.value ?? '').slice(0, 10));
              setShowPayDate(false);
            }}
            locale="fr-FR"
          />
        </IonModal>

        {/* Historique de paiements */}
        <DebtHistoryModal
          debt={debts.find((dd) => dd.id === historyDebt?.id) ?? historyDebt}
          isOpen={!!historyDebt}
          onDismiss={() => setHistoryDebt(null)}
          currency={currency}
        />

        <IonAlert
          isOpen={!!toDelete}
          header="Supprimer cet emprunt ?"
          message={toDelete ? `${toDelete.lender_name} — ${formatMoney(toDelete.amount, currency)}` : undefined}
          buttons={[
            { text: 'Annuler', role: 'cancel' },
            { text: 'Supprimer', role: 'destructive', handler: () => confirmDelete() },
          ]}
          onDidDismiss={() => setToDelete(null)}
        />

        <IonToast
          isOpen={!!toast}
          message={toast?.message ?? ''}
          color={toast?.color}
          duration={2200}
          onDidDismiss={() => setToast(null)}
        />
      </IonContent>
    </IonPage>
  );
};

export default Dashboard;
