import { useEffect, useState } from 'react';
import {
  IonButton,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonModal,
  IonPage,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToolbar,
  IonToast,
  IonAlert,
  IonText,
  IonNote,
} from '@ionic/react';
import { add, refreshOutline, settingsOutline } from 'ionicons/icons';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  addFixedChargeThunk,
  editFixedChargeThunk,
  refreshMonthThunk,
  removeFixedChargeThunk,
  togglePaidThunk,
} from '../store/budgetSlice';
import FixedChargeItem from '../components/FixedChargeItem';
import EmptyState from '../components/EmptyState';
import { FIXED_CATEGORIES } from '../constants';
import type { FixedCharge } from '../types';
import { formatMoney, monthLabel, nowISO, uid } from '../utils/format';
import { isOnline } from '../services/connectivity';
import { offlineUpsertFixedCharge, offlineDeleteFixedCharge } from '../services/sync';
import { syncFixedChargeNotifications } from '../services/notifications';

const Charges: React.FC = () => {
  const dispatch = useAppDispatch();
  const { month, fixedCharges, budget } = useAppSelector((s) => s.budget);
  const currency = budget?.currency ?? 'MGA';

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FixedCharge | null>(null);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDay, setDueDay] = useState('5');
  const [category, setCategory] = useState('logement');
  const [toDelete, setToDelete] = useState<FixedCharge | null>(null);
  const [toast, setToast] = useState<{ message: string; color: string } | null>(null);

  useEffect(() => {
    dispatch(refreshMonthThunk(month));
  }, [month, dispatch]);

  const resetForm = () => {
    setName('');
    setAmount('');
    setDueDay('5');
    setCategory('logement');
    setEditing(null);
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (c: FixedCharge) => {
    setEditing(c);
    setName(c.name);
    setAmount(String(c.amount));
    setDueDay(String(c.due_day));
    setCategory(c.category);
    setOpen(true);
  };

  const closeModal = () => {
    setOpen(false);
    resetForm();
    dispatch(refreshMonthThunk(month));
  };

  const reschedule = (charges: FixedCharge[]) => {
    syncFixedChargeNotifications(charges, { currency }).catch(() => undefined);
  };

  const save = async () => {
    const numAmount = Number(amount);
    const numDay = Number(dueDay);
    if (!budget || name.trim().length === 0 || !numAmount || !numDay) return;

    const payload: Partial<FixedCharge> = {
      name: name.trim(),
      amount: numAmount,
      due_day: numDay,
      category: category as FixedCharge['category'],
    };

    if (isOnline()) {
      if (editing) {
        await dispatch(editFixedChargeThunk({ id: editing.id, payload }));
      } else {
        await dispatch(addFixedChargeThunk({ ...payload, budget_id: budget.id }));
      }
    } else {
      const charge: FixedCharge = {
        id: editing?.id ?? uid(),
        budget_id: budget.id,
        name: name.trim(),
        amount: numAmount,
        due_day: numDay,
        category: category as FixedCharge['category'],
        is_paid: editing?.is_paid ?? false,
        created_at: editing?.created_at ?? nowISO(),
        updated_at: nowISO(),
      };
      await offlineUpsertFixedCharge(charge);
      setToast({ message: 'Enregistré hors ligne.', color: 'warning' });
      reschedule(
        editing
          ? fixedCharges.map((c) => (c.id === charge.id ? charge : c))
          : [...fixedCharges, charge],
      );
    }
    closeModal();
  };

  const toggle = (c: FixedCharge) => {
    if (isOnline()) {
      dispatch(togglePaidThunk({ id: c.id, isPaid: !c.is_paid })).then(() =>
        dispatch(refreshMonthThunk(month)),
      );
    } else {
      const updated: FixedCharge = { ...c, is_paid: !c.is_paid, updated_at: nowISO() };
      offlineUpsertFixedCharge(updated).then(() => {
        setToast({ message: 'Changement enregistré hors ligne.', color: 'warning' });
        reschedule(fixedCharges.map((x) => (x.id === c.id ? updated : x)));
      });
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    if (isOnline()) {
      await dispatch(removeFixedChargeThunk({ id: toDelete.id, month }));
    } else {
      await offlineDeleteFixedCharge(toDelete.id);
      setToast({ message: 'Supprimé hors ligne.', color: 'warning' });
      reschedule(fixedCharges.filter((c) => c.id !== toDelete.id));
    }
    setToDelete(null);
    dispatch(refreshMonthThunk(month));
  };

  const total = fixedCharges.reduce((s, c) => s + c.amount, 0);
  const paidTotal = fixedCharges.filter((c) => c.is_paid).reduce((s, c) => s + c.amount, 0);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Charges fixes</IonTitle>
          <IonButton slot="end" fill="clear" size="small" routerLink="/tabs/settings">
            <IonIcon icon={settingsOutline} slot="start" /> Récurrentes
          </IonButton>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <IonText style={{ display: 'block', textAlign: 'center', marginBottom: 14 }}>
          <IonNote color="medium">
            {monthLabel(month)} — les charges récurrentes de Réglages apparaissent
            automatiquement ici.
          </IonNote>
        </IonText>

        {fixedCharges.length > 0 && (
          <div className="pay-summary">
            <div className="pay-meta">
              <b>{formatMoney(paidTotal, currency)}</b> / {formatMoney(total, currency)}
              <div>payés de vos charges fixes</div>
            </div>
            <div className="mini-bar">
              <div
                className="mini-bar-fill"
                style={{ width: total > 0 ? `${(paidTotal / total) * 100}%` : '0%' }}
              />
            </div>
          </div>
        )}

        {fixedCharges.length === 0 && (
          <div className="tile-group">
            <EmptyState
              icon="wallet-outline"
              title="Aucune charge fixe"
              subtitle="Loyer, factures, abonnements — ajoutez-les avec le bouton +."
            />
          </div>
        )}

        {fixedCharges.length > 0 && (
          <div className="tile-group">
            {fixedCharges.map((c) => (
              <FixedChargeItem
                key={c.id}
                charge={c}
                currency={currency}
                onToggle={toggle}
                onEdit={openEdit}
              />
            ))}
          </div>
        )}

        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton onClick={openCreate}>
            <IonIcon icon={add} />
          </IonFabButton>
        </IonFab>

        <IonModal isOpen={open} onDidDismiss={closeModal}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>{editing ? 'Modifier la charge' : 'Nouvelle charge fixe'}</IonTitle>
              <IonButton slot="end" fill="clear" onClick={closeModal}>
                Fermer
              </IonButton>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <IonItem style={{ marginBottom: 12 }}>
              <IonInput
                label="Nom (loyer, électricité...)"
                labelPlacement="stacked"
                value={name}
                onIonInput={(e) => setName(String(e.detail.value ?? ''))}
              />
            </IonItem>
            <IonItem style={{ marginBottom: 12 }}>
              <IonInput
                type="number"
                label={`Montant (${currency})`}
                labelPlacement="stacked"
                inputmode="numeric"
                value={amount}
                onIonInput={(e) => setAmount(String(e.detail.value ?? ''))}
              />
            </IonItem>
            <IonItem style={{ marginBottom: 12 }}>
              <IonInput
                type="number"
                label="Jour d'échéance (1-28)"
                labelPlacement="stacked"
                inputmode="numeric"
                max={28}
                min={1}
                value={dueDay}
                onIonInput={(e) => setDueDay(String(e.detail.value ?? ''))}
              />
            </IonItem>
            <IonItem style={{ marginBottom: 16 }}>
              <IonLabel>Catégorie</IonLabel>
              <IonSelect
                value={category}
                interface="action-sheet"
                onIonChange={(e) => setCategory(String(e.detail.value))}
              >
                {FIXED_CATEGORIES.map((c) => (
                  <IonSelectOption key={c.value} value={c.value}>
                    {c.label}
                  </IonSelectOption>
                ))}
              </IonSelect>
            </IonItem>
            <IonButton expand="block" disabled={!name.trim() || !Number(amount)} onClick={save}>
              {editing ? 'Enregistrer' : 'Ajouter'}
            </IonButton>
          </IonContent>
        </IonModal>

        <IonAlert
          isOpen={!!toDelete}
          header="Supprimer cette charge ?"
          message={toDelete?.name}
          buttons={[
            { text: 'Annuler', role: 'cancel' },
            { text: 'Supprimer', role: 'destructive', handler: () => confirmDelete() },
          ]}
        />
        <IonToast
          isOpen={!!toast}
          message={toast?.message ?? ''}
          color={toast?.color}
          duration={2000}
          onDidDismiss={() => setToast(null)}
        />
      </IonContent>
    </IonPage>
  );
};

export default Charges;