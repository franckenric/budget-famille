import { useState } from 'react';
import {
  IonButton,
  IonContent,
  IonDatetime,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonModal,
  IonTitle,
  IonToast,
  IonToolbar,
} from '@ionic/react';
import { checkmarkCircle, pencilOutline, trashOutline } from 'ionicons/icons';
import { useAppDispatch } from '../store/hooks';
import { editPaymentThunk, undoPaymentThunk } from '../store/debtsSlice';
import type { Debt } from '../types';
import { formatDay, formatMoney, toISODate } from '../utils/format';

interface Props {
  debt: Debt | null;
  isOpen: boolean;
  onDismiss: () => void;
  currency: string;
}

const paidTotal = (d: Debt): number => (d.payments ?? []).reduce((s, p) => s + p.amount, 0);

const DebtHistoryModal: React.FC<Props> = ({ debt, isOpen, onDismiss, currency }) => {
  const dispatch = useAppDispatch();

  const [editing, setEditing] = useState<{ index: number; amount: string; date: string } | null>(null);
  const [showEditDate, setShowEditDate] = useState(false);
  const [toast, setToast] = useState<{ message: string; color: string } | null>(null);

  const payments = debt?.payments ?? [];

  const confirmEdit = async () => {
    if (!editing || !debt) return;
    const amount = Number(editing.amount);
    if (!amount || amount <= 0) return;
    const res = await dispatch(
      editPaymentThunk({ id: debt.id, index: editing.index, payment: { date: editing.date, amount } }),
    );
    setEditing(null);
    setToast({
      message: res.meta.requestStatus === 'fulfilled' ? 'Paiement modifié.' : 'Erreur lors de la modification.',
      color: res.meta.requestStatus === 'fulfilled' ? 'success' : 'danger',
    });
  };

  const removePayment = async (index: number) => {
    if (!debt) return;
    const res = await dispatch(undoPaymentThunk({ id: debt.id, index }));
    if (res.meta.requestStatus === 'fulfilled') {
      setToast({ message: 'Paiement supprimé.', color: 'success' });
    }
  };

  const openEdit = (index: number) => {
    const p = payments[index];
    if (!p) return;
    setEditing({ index, amount: String(p.amount), date: p.date ?? toISODate(new Date()) });
  };

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onDismiss}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{debt ? `Historique — ${debt.lender_name}` : ''}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        {debt && (
          <>
            {payments.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--ion-color-medium)', padding: '40px 0' }}>
                Aucun paiement enregistré pour le moment.
              </div>
            ) : (
              <div className="tile-group">
                {payments.map((p, i) => (
                  <div key={i} className="recent-row">
                    <div
                      className="ico-bubble"
                      style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}
                    >
                      <IonIcon icon={checkmarkCircle} style={{ fontSize: 16 }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div className="recent-title">Paiement #{payments.length - i}</div>
                      <div className="recent-sub">{formatDay(p.date)}</div>
                    </div>
                    <div className="recent-amount" style={{ color: '#10b981' }}>
                      − {formatMoney(p.amount, currency)}
                    </div>
                    <button
                      type="button"
                      onClick={() => openEdit(i)}
                      className="pay-toggle"
                      aria-label="Modifier ce paiement"
                      style={{ color: 'var(--ion-color-primary)' }}
                    >
                      <IonIcon icon={pencilOutline} />
                    </button>
                    <button
                      type="button"
                      onClick={() => removePayment(i)}
                      className="pay-toggle"
                      aria-label="Supprimer ce paiement"
                      style={{ color: 'var(--ion-color-danger)' }}
                    >
                      <IonIcon icon={trashOutline} style={{ fontSize: 17 }} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div
              style={{
                marginTop: 16,
                paddingTop: 12,
                borderTop: '1px solid var(--ion-color-step-300, rgba(0,0,0,0.08))',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span style={{ fontWeight: 700, fontSize: 14 }}>
                Payé {formatMoney(paidTotal(debt), currency)} / {formatMoney(debt.amount, currency)} {currency}
              </span>
              <span style={{ fontWeight: 800, fontSize: 15, color: '#f97316' }}>
                Reste {formatMoney(Math.max(0, debt.amount - paidTotal(debt)), currency)}
              </span>
            </div>
            <IonButton expand="block" style={{ marginTop: 16 }} onClick={onDismiss}>
              Fermer
            </IonButton>
          </>
        )}
      </IonContent>

      {/* Modifier un paiement */}
      <IonModal isOpen={!!editing} onDidDismiss={() => setEditing(null)}>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Modifier le paiement</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          {editing && (
            <>
              <IonItem style={{ marginBottom: 12 }}>
                <IonInput
                  type="number"
                  label={`Montant (${currency})`}
                  labelPlacement="stacked"
                  inputmode="numeric"
                  value={editing.amount}
                  onIonInput={(e) => setEditing({ ...editing, amount: String(e.detail.value ?? '') })}
                />
              </IonItem>
              <IonItem button onClick={() => setShowEditDate(true)} style={{ marginBottom: 16 }}>
                <IonLabel>Date du paiement</IonLabel>
                <IonLabel slot="end" color="medium">{editing.date}</IonLabel>
              </IonItem>
              <IonButton
                expand="block"
                disabled={!Number(editing.amount) || Number(editing.amount) <= 0}
                onClick={confirmEdit}
              >
                Enregistrer
              </IonButton>
              <IonButton expand="block" fill="clear" onClick={() => setEditing(null)} style={{ marginTop: 8 }}>
                Annuler
              </IonButton>
            </>
          )}
        </IonContent>
      </IonModal>

      <IonModal isOpen={showEditDate && !!editing} onDidDismiss={() => setShowEditDate(false)}>
        <IonDatetime
          value={editing?.date}
          onIonChange={(e) => {
            if (editing) {
              setEditing({ ...editing, date: String(e.detail.value ?? '').slice(0, 10) });
            }
            setShowEditDate(false);
          }}
          locale="fr-FR"
        />
      </IonModal>

      <IonToast
        isOpen={!!toast}
        message={toast?.message ?? ''}
        color={toast?.color}
        duration={2200}
        onDidDismiss={() => setToast(null)}
      />
    </IonModal>
  );
};

export default DebtHistoryModal;