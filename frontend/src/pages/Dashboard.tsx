import { useEffect } from 'react';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonContent,
  IonHeader,
  IonIcon,
  IonPage,
  IonText,
  IonTitle,
  IonToolbar,
  IonNote,
  useIonViewWillEnter,
} from '@ionic/react';
import { add, chevronBack, chevronForward, walletOutline } from 'ionicons/icons';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { loadMonthThunk, refreshMonthThunk, setMonth } from '../store/budgetSlice';
import BudgetProgress from '../components/BudgetProgress';
import CategoryPie from '../components/CategoryPie';
import FixedChargesList from '../components/FixedChargesList';
import EmptyState from '../components/EmptyState';
import { monthLabel } from '../utils/format';

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

  // Rafraîchit à chaque retour sur l'onglet (ex: après une charge ajoutée dans Réglages).
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
        <div className="ion-align-items-center" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <IonButton fill="clear" size="small" onClick={goPrev}>
            <IonIcon slot="icon-only" icon={chevronBack} />
          </IonButton>
          <IonText>
            <b>{monthLabel(month)}</b>
          </IonText>
          <IonButton fill="clear" size="small" onClick={goNext}>
            <IonIcon slot="icon-only" icon={chevronForward} />
          </IonButton>
        </div>

        <IonCard>
          <IonCardContent>
            {loading ? (
              <IonText color="medium">
                <p style={{ textAlign: 'center' }}>Chargement...</p>
              </IonText>
            ) : (
              <BudgetProgress summary={summary} currency={currency} />
            )}
          </IonCardContent>
        </IonCard>

        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <IonButton routerLink="/tabs/expenses/add" expand="block">
            <IonIcon icon={add} slot="start" /> Dépense
          </IonButton>
          <IonButton routerLink="/tabs/charges" expand="block" fill="outline">
            <IonIcon icon={walletOutline} slot="start" /> Charges
          </IonButton>
        </div>

        <FixedChargesList charges={fixedCharges} currency={currency} />

        <IonCard>
          <IonCardContent>
            <IonNote color="medium">Répartition par catégorie</IonNote>
            <CategoryPie stats={stats} currency={currency} />
          </IonCardContent>
        </IonCard>

        <IonCard>
          <IonCardContent>
            <IonNote color="medium">Dernières dépenses</IonNote>
            {recent.length === 0 ? (
              <EmptyState
                icon="receipt-outline"
                title="Aucune dépense ce mois-ci"
                subtitle="Ajoutez votre première dépense avec le bouton ci-dessus."
              />
            ) : (
              <div>
                {recent.map((e) => (
                  <div
                    key={e.id}
                    className="ion-justify-content-between"
                    style={{ display: 'flex', padding: '8px 0', fontSize: 14, borderBottom: '1px solid var(--ion-border-color)' }}
                  >
                    <span>{e.title}</span>
                    <span style={{ color: 'var(--ion-color-danger)' }}>
                      − {new Intl.NumberFormat('fr-FR').format(e.amount)} Ar
                    </span>
                  </div>
                ))}
              </div>
            )}
          </IonCardContent>
        </IonCard>
      </IonContent>
    </IonPage>
  );
};

export default Dashboard;