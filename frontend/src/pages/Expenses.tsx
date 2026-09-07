import { useEffect, useState } from 'react';
import {
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonPage,
  IonTitle,
  IonToolbar,
  IonAlert,
  IonToast,
  IonLabel,
} from '@ionic/react';
import { add } from 'ionicons/icons';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { refreshMonthThunk, removeExpenseThunk } from '../store/budgetSlice';
import ExpenseItem from '../components/ExpenseItem';
import EmptyState from '../components/EmptyState';
import { VARIABLE_CATEGORIES } from '../constants';
import type { VariableExpense } from '../types';
import { useIonRouter } from '@ionic/react';
import { formatMoney } from '../utils/format';

const Expenses: React.FC = () => {
  const dispatch = useAppDispatch();
  const router = useIonRouter();
  const { month, expenses, budget } = useAppSelector((s) => s.budget);
  const [segment, setSegment] = useState('tous');
  const [toDelete, setToDelete] = useState<VariableExpense | null>(null);
  const [toast, setToast] = useState<{ message: string; color: string } | null>(null);

  const currency = budget?.currency ?? 'MGA';

  useEffect(() => {
    dispatch(refreshMonthThunk(month));
  }, [month, dispatch]);

  const filtered =
    segment === 'tous' ? expenses : expenses.filter((e) => e.category === segment);

  const total = filtered.reduce((sum, e) => sum + e.amount, 0);

  const confirmDelete = async () => {
    if (!toDelete) return;
    const res = await dispatch(removeExpenseThunk({ id: toDelete.id, month }));
    if (res.meta.requestStatus === 'fulfilled') {
      setToast({ message: 'Dépense supprimée.', color: 'success' });
      dispatch(refreshMonthThunk(month));
    }
    setToDelete(null);
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Dépenses</IonTitle>
          <IonLabel slot="end" style={{ fontSize: 13, marginRight: 16, fontWeight: 600, color: 'var(--ion-color-medium)' }}>
            {formatMoney(total, currency)}
          </IonLabel>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <div className="chip-row">
          <button
            type="button"
            className={`filter-chip ${segment === 'tous' ? 'active' : ''}`}
            onClick={() => setSegment('tous')}
          >
            Tous
          </button>
          {VARIABLE_CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              className={`filter-chip ${segment === c.value ? 'active' : ''}`}
              onClick={() => setSegment(c.value)}
            >
              <IonIcon icon={c.icon} style={{ color: segment === c.value ? '#fff' : c.color }} />
              {c.label}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="tile-group">
            <EmptyState
              icon="receipt-outline"
              title="Aucune dépense"
              subtitle="Utilisez le bouton + pour enregistrer une dépense."
            />
          </div>
        ) : (
          <div className="tile-group">
            {filtered.map((e) => (
              <ExpenseItem
                key={e.id}
                expense={e}
                currency={currency}
                onEdit={(exp) => router.push(`/tabs/expenses/add?edit=${exp.id}`)}
                onDelete={(exp) => setToDelete(exp)}
              />
            ))}
          </div>
        )}

        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton routerLink="/tabs/expenses/add">
            <IonIcon icon={add} />
          </IonFabButton>
        </IonFab>

        <IonAlert
          isOpen={!!toDelete}
          header="Supprimer cette dépense ?"
          message={
            toDelete ? `${toDelete.title} — ${new Intl.NumberFormat('fr-FR').format(toDelete.amount)} Ar` : undefined
          }
          buttons={[
            { text: 'Annuler', role: 'cancel' },
            { text: 'Supprimer', role: 'destructive', handler: () => confirmDelete() },
          ]}
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

export default Expenses;
