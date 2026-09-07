import { useEffect } from 'react';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonPage,
  IonTitle,
  IonToolbar,
  useIonViewWillEnter,
} from '@ionic/react';
import {
  add,
  chevronBack,
  chevronForward,
  receiptOutline,
  walletOutline,
} from 'ionicons/icons';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { loadMonthThunk, refreshMonthThunk, setMonth } from '../store/budgetSlice';
import BudgetProgress from '../components/BudgetProgress';
import CategoryPie from '../components/CategoryPie';
import FixedChargesList from '../components/FixedChargesList';
import EmptyState from '../components/EmptyState';
import { categoryColor, categoryIcon, categoryLabel } from '../constants';
import { formatDay, formatMoney, monthLabel } from '../utils/format';

const Dashboard: React.FC = () => {
  const dispatch = useAppDispatch();
  const { month, summary, stats, expenses, fixedCharges, budget, loading } = useAppSelector(
    (s) => s.budget,
  );
  const userCurrency = useAppSelector((s) => s.auth.user?.currency);
  const currency = budget?.currency ?? userCurrency ?? 'MGA';

  useEffect(() => {
    dispatch(refreshMonthThunk(month));
  }, [month, dispatch]);

  useIonViewWillEnter(() => {
    dispatch(refreshMonthThunk(month)).catch(() => undefined);
  });

  const goPrev = () => {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(y, m - 2, 1);
    const newMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    dispatch(setMonth(newMonth));
    dispatch(loadMonthThunk(newMonth));
  };

  const goNext = () => {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(y, m, 1);
    const newMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    dispatch(setMonth(newMonth));
    dispatch(loadMonthThunk(newMonth));
  };

  const recent = expenses.slice(0, 5);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Budget-Famille</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <div className="month-switch">
          <IonButton fill="clear" size="small" onClick={goPrev}>
            <IonIcon slot="icon-only" icon={chevronBack} />
          </IonButton>
          <span className="month-label">{monthLabel(month)}</span>
          <IonButton fill="clear" size="small" onClick={goNext}>
            <IonIcon slot="icon-only" icon={chevronForward} />
          </IonButton>
        </div>

        {loading ? (
          <div className="hero-card">
            <div className="hero-inner" style={{ textAlign: 'center', padding: '40px 20px' }}>
              <p style={{ color: 'rgba(255,255,255,0.92)', margin: 0 }}>Chargement…</p>
            </div>
          </div>
        ) : (
          <BudgetProgress summary={summary} currency={currency} />
        )}

        <div className="quick-actions">
          <IonButton routerLink="/tabs/expenses/add" expand="block" className="primary-action">
            <IonIcon icon={add} slot="start" /> Dépense
          </IonButton>
          <IonButton routerLink="/tabs/charges" expand="block" fill="outline">
            <IonIcon icon={walletOutline} slot="start" /> Charges
          </IonButton>
        </div>

        {stats && stats.categories.filter((c) => c.total > 0).length > 0 ? (
          <div className="tile-group chart-card">
            <div style={{ padding: '14px 14px 0' }}>
              <p className="section-title" style={{ margin: 0, fontSize: 12 }}>
                Répartition par catégorie
              </p>
            </div>
            <CategoryPie stats={stats} currency={currency} />
          </div>
        ) : null}

        <div className="section-head">
          <IonIcon icon={walletOutline} />
          <h3 className="section-title">Charges fixes</h3>
          <IonButton
            className="section-extra"
            fill="clear"
            size="small"
            routerLink="/tabs/charges"
          >
            Voir tout
          </IonButton>
        </div>
        <FixedChargesList charges={fixedCharges} currency={currency} />

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
                  <div className="recent-title">{e.title}</div>
                  <div className="recent-sub">
                    {categoryLabel(e.category)} · {formatDay(e.expense_date)}
                  </div>
                </div>
                <div className="recent-amount">− {formatMoney(e.amount, currency)}</div>
              </div>
            ))}
          </div>
        )}
      </IonContent>
    </IonPage>
  );
};

export default Dashboard;
