import { useEffect, useState } from 'react';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonDatetime,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonPage,
  IonTextarea,
  IonTitle,
  IonToolbar,
  IonToast,
  IonModal,
  IonToggle,
  IonIcon,
  IonAlert,
} from '@ionic/react';
import { trashOutline } from 'ionicons/icons';
import { useIonRouter } from '@ionic/react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { addDebtThunk, editDebtThunk, removeDebtThunk } from '../store/debtsSlice';
import { toISODate } from '../utils/format';
import type { Debt } from '../types';

const AddDebt: React.FC = () => {
  const dispatch = useAppDispatch();
  const router = useIonRouter();
  const { budget } = useAppSelector((s) => s.budget);
  const { debts } = useAppSelector((s) => s.debts);
  const currency = budget?.currency ?? 'MGA';

  const editId = new URLSearchParams(window.location.search).get('edit');
  const editing = editId ? debts.find((d) => d.id === editId) : null;

  const [lender, setLender] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [date, setDate] = useState(toISODate(new Date()));
  const [showDate, setShowDate] = useState(false);
  const [showStartDate, setShowStartDate] = useState(false);
  const [monthlyPayment, setMonthlyPayment] = useState(false);
  const [monthlyAmount, setMonthlyAmount] = useState('');
  const [startDate, setStartDate] = useState(toISODate(new Date()));
  const [toast, setToast] = useState<{ message: string; color: string } | null>(null);
  const [showDelete, setShowDelete] = useState(false);

  useEffect(() => {
    if (editing) {
      setLender(editing.lender_name);
      setAmount(String(editing.amount));
      setReason(editing.reason ?? '');
      setDate(editing.debt_date);
      const hasMonthly = editing.monthly_amount != null && editing.monthly_amount > 0;
      setMonthlyPayment(hasMonthly);
      setMonthlyAmount(hasMonthly ? String(editing.monthly_amount) : '');
      setStartDate(editing.start_date ?? toISODate(new Date()));
    }
  }, [editing]);

  const numAmount = Number(amount);
  const numMonthly = Number(monthlyAmount);
  const monthsToRepay = monthlyPayment && numMonthly > 0 ? Math.ceil(numAmount / numMonthly) : 0;
  const canSubmit = lender.trim().length > 0 && numAmount > 0;

  const save = async () => {
    if (!canSubmit) return;
    const payload = {
      lender_name: lender.trim(),
      amount: numAmount,
      debt_date: date,
      reason: reason.trim() || undefined,
      monthly_amount: monthlyPayment && numMonthly > 0 ? numMonthly : null,
      start_date: monthlyPayment && numMonthly > 0 ? startDate : null,
    };

    if (editing) {
      const res = await dispatch(editDebtThunk({ id: editing.id, payload }));
      if (res.meta.requestStatus === 'fulfilled') {
        setToast({ message: 'Emprunt mis à jour.', color: 'success' });
        setTimeout(() => router.push('/tabs/global'), 400);
      }
    } else {
      const res = await dispatch(addDebtThunk(payload));
      if (res.meta.requestStatus === 'fulfilled') {
        setToast({ message: 'Emprunt enregistré.', color: 'success' });
        setTimeout(() => router.push('/tabs/global'), 400);
      }
    }
  };

  const handleDelete = async () => {
    if (!editing) return;
    const res = await dispatch(removeDebtThunk(editing.id));
    if (res.meta.requestStatus === 'fulfilled') {
      setToast({ message: 'Emprunt supprimé.', color: 'success' });
      setTimeout(() => router.push('/tabs/global'), 400);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/tabs/global" />
          </IonButtons>
          <IonTitle>{editing ? 'Modifier l\'emprunt' : 'Nouvel emprunt'}</IonTitle>
          {editing && (
            <IonButtons slot="end">
              <IonButton onClick={() => setShowDelete(true)}>
                <IonIcon icon={trashOutline} slot="icon-only" color="danger" />
              </IonButton>
            </IonButtons>
          )}
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        {!editing && (
          <div className="hero-card" style={{ marginBottom: 20 }}>
            <div className="hero-inner">
              <div className="hero-k">Emprunt global</div>
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.82)', marginTop: 4 }}>
                Cette dette n'est rattachée à aucun mois : elle dure jusqu'au
                remboursement complet.
              </div>
            </div>
          </div>
        )}

        <IonItem style={{ marginBottom: 12 }}>
          <IonInput
            label="Prêteur / Source"
            labelPlacement="stacked"
            placeholder="Ex: Mama, Ami, Banque..."
            value={lender}
            onIonInput={(e) => setLender(String(e.detail.value ?? ''))}
          />
        </IonItem>

        <IonItem style={{ marginBottom: 12 }}>
          <IonInput
            type="number"
            label={`Montant total (${currency})`}
            labelPlacement="stacked"
            inputmode="numeric"
            value={amount}
            onIonInput={(e) => setAmount(String(e.detail.value ?? ''))}
          />
        </IonItem>

        <IonItem button onClick={() => setShowDate(true)} style={{ marginBottom: 12 }}>
          <IonLabel>Date de l'emprunt</IonLabel>
          <IonLabel slot="end" color="medium">
            {date}
          </IonLabel>
        </IonItem>

        {/* Monthly payment toggle */}
        <IonItem lines="none" style={{ marginBottom: 4 }}>
          <IonLabel>
            <div style={{ fontWeight: 600 }}>Payer par mois</div>
            <div style={{ fontSize: 12, color: 'var(--ion-color-medium)' }}>
              Définir un montant mensuel de remboursement
            </div>
          </IonLabel>
          <IonToggle
            slot="end"
            checked={monthlyPayment}
            onIonChange={(e) => setMonthlyPayment(e.detail.checked)}
          />
        </IonItem>

        {monthlyPayment && (
          <>
            <IonItem style={{ marginBottom: 12, marginTop: 8 }}>
              <IonInput
                type="number"
                label={`Montant par mois (${currency})`}
                labelPlacement="stacked"
                inputmode="numeric"
                value={monthlyAmount}
                onIonInput={(e) => setMonthlyAmount(String(e.detail.value ?? ''))}
                placeholder={`Ex: ${numAmount > 0 ? Math.round(numAmount / 3) : ''}`}
              />
            </IonItem>

            <IonItem button onClick={() => setShowStartDate(true)} style={{ marginBottom: 12 }}>
              <IonLabel>Date de début</IonLabel>
              <IonLabel slot="end" color="medium">
                {startDate}
              </IonLabel>
            </IonItem>

            {numMonthly > 0 && numAmount > 0 && (
              <div className="dash-card" style={{ marginBottom: 16, padding: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                  Résumé du remboursement
                </div>
                <div style={{ fontSize: 12, color: 'var(--ion-color-medium)', lineHeight: 1.6 }}>
                  {numMonthly >= numAmount ? (
                    <>Remboursement en 1 mois ({numMonthly} {currency}/mois)</>
                  ) : (
                    <>
                      {monthsToRepay} mois × {new Intl.NumberFormat('fr-FR').format(numMonthly)} {currency}
                      <br />
                      Total: {new Intl.NumberFormat('fr-FR').format(numMonthly * monthsToRepay)} {currency}
                      {numMonthly * monthsToRepay > numAmount && (
                        <>, soit {new Intl.NumberFormat('fr-FR').format(numMonthly * monthsToRepay - numAmount)} {currency} de différence</>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        <IonItem style={{ marginBottom: 12 }}>
          <IonTextarea
            label="Raison (optionnelle)"
            labelPlacement="stacked"
            rows={2}
            placeholder="Ex: Loyer, médicaments..."
            value={reason}
            onIonInput={(e) => setReason(String(e.detail.value ?? ''))}
          />
        </IonItem>

        <IonButton
          expand="block"
          disabled={!canSubmit}
          onClick={save}
        >
          {editing ? 'Enregistrer les modifications' : 'Enregistrer l\'emprunt'}
        </IonButton>

        <IonModal isOpen={showDate} onDidDismiss={() => setShowDate(false)}>
          <IonDatetime
            value={date}
            onIonChange={(e) => {
              setDate(String(e.detail.value ?? '').slice(0, 10));
              setShowDate(false);
            }}
            locale="fr-FR"
          />
        </IonModal>

        <IonModal isOpen={showStartDate} onDidDismiss={() => setShowStartDate(false)}>
          <IonDatetime
            value={startDate}
            onIonChange={(e) => {
              setStartDate(String(e.detail.value ?? '').slice(0, 10));
              setShowStartDate(false);
            }}
            locale="fr-FR"
          />
        </IonModal>

        <IonAlert
          isOpen={showDelete}
          header="Supprimer cet emprunt ?"
          message={editing ? `${editing.lender_name} — ${new Intl.NumberFormat('fr-FR').format(editing.amount)} ${currency}` : undefined}
          buttons={[
            { text: 'Annuler', role: 'cancel' },
            { text: 'Supprimer', role: 'destructive', handler: () => handleDelete() },
          ]}
          onDidDismiss={() => setShowDelete(false)}
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

export default AddDebt;
