import { useEffect, useState } from 'react';
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
  IonText,
  IonTitle,
  IonToast,
  IonToolbar,
  useIonViewWillEnter,
} from '@ionic/react';
import {
  add,
  cashOutline,
  checkmarkCircle,
  pencilOutline,
  timeOutline,
  trashOutline,
} from 'ionicons/icons';
import { useIonRouter } from '@ionic/react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  loadDebtsThunk,
  recordPaymentThunk,
  removeDebtThunk,
} from '../store/debtsSlice';
import RecurringChargesSection from '../components/RecurringChargesSection';
import EmptyState from '../components/EmptyState';
import DebtHistoryModal from '../components/DebtHistoryModal';
import { formatMoney, toISODate } from '../utils/format';
import type { Debt } from '../types';

const debtPaid = (d: Debt): number => (d.payments ?? []).reduce((s, p) => s + p.amount, 0);
const debtRemaining = (d: Debt): number => Math.max(0, d.amount - debtPaid(d));

const Global: React.FC = () => {
  const dispatch = useAppDispatch();
  const router = useIonRouter();
  const { budget } = useAppSelector((s) => s.budget);
  const { debts } = useAppSelector((s) => s.debts);
  const currency = budget?.currency ?? 'MGA';

  const [toast, setToast] = useState<{ message: string; color: string } | null>(null);
  const [payModal, setPayModal] = useState<Debt | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(toISODate(new Date()));
  const [showPayDate, setShowPayDate] = useState(false);
  const [toDelete, setToDelete] = useState<Debt | null>(null);
  const [historyDebt, setHistoryDebt] = useState<Debt | null>(null);

  useEffect(() => {
    dispatch(loadDebtsThunk());
  }, [dispatch]);

  useIonViewWillEnter(() => {
    dispatch(loadDebtsThunk());
  });

  const unpaidDebts = debts.filter((d) => !d.is_repaid);
  const totalRemaining = unpaidDebts.reduce((s, d) => s + debtRemaining(d), 0);
  const repaidCount = debts.length - unpaidDebts.length;

  const confirmPayment = async () => {
    if (!payModal) return;
    const amount = Number(payAmount);
    if (!amount || amount <= 0) return;
    const res = await dispatch(recordPaymentThunk({ id: payModal.id, payment: { date: payDate, amount } }));
    setPayModal(null);
    setToast({
      message: res.meta.requestStatus === 'fulfilled' ? 'Paiement enregistré.' : 'Erreur lors de l\'enregistrement.',
      color: res.meta.requestStatus === 'fulfilled' ? 'success' : 'danger',
    });
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    const res = await dispatch(removeDebtThunk(toDelete.id));
    setToDelete(null);
    if (res.meta.requestStatus === 'fulfilled') {
      setToast({ message: 'Emprunt supprimé.', color: 'success' });
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar className="dash-toolbar">
          <div className="dash-greet">
            <div className="dash-greet-hello">Global</div>
            <div className="dash-greet-date">Emprunts & charges récurrentes</div>
          </div>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        {/* ============ DETTES & EMPRUNTS ============ */}
        <div className="section-head">
          <IonIcon icon={cashOutline} />
          <h3 className="section-title">Dettes & Emprunts</h3>
          <IonButton
            className="section-extra"
            fill="clear"
            size="small"
            routerLink="/tabs/debts/add"
          >
            <IonIcon icon={add} slot="start" /> Ajouter
          </IonButton>
        </div>

        <IonText className="section-note">
          Ces dettes ne sont pas rattachées à un mois : elles durent jusqu'au remboursement complet.
        </IonText>

        {debts.length > 0 && (
          <div className="debt-summary-card">
            <div>
              <div className="ds-label">Restant global</div>
              <div className="ds-value">{formatMoney(totalRemaining, currency)}</div>
            </div>
            <div className="ds-side">
              <div>
                <b>{unpaidDebts.length}</b> en cours
              </div>
              <div>
                <b>{repaidCount}</b> remboursée{repaidCount > 1 ? 's' : ''}
              </div>
            </div>
          </div>
        )}

        {debts.length === 0 ? (
          <div className="tile-group">
            <EmptyState
              icon="cash-outline"
              title="Aucun emprunt"
              subtitle="Ajoutez une dette (prêt, avance) pour suivre son remboursement."
            />
          </div>
        ) : (
          <div className="tile-group">
            {debts.map((d) => {
              const paid = d.is_repaid ? d.amount : debtPaid(d);
              const remaining = debtRemaining(d);
              const ratio = d.amount > 0 ? Math.min(1, paid / d.amount) : 0;
              const payments = d.payments ?? [];

              return (
                <div
                  key={d.id}
                  className={`debt-card${d.is_repaid ? ' is-repaid' : ''}`}
                >
                  <div className="debt-head">
                    <div
                      className="debt-avatar"
                      style={{
                        background: d.is_repaid ? 'rgba(22,163,74,0.12)' : 'rgba(249,115,22,0.12)',
                        color: d.is_repaid ? '#16a34a' : '#f97316',
                      }}
                    >
                      <IonIcon icon={d.is_repaid ? checkmarkCircle : cashOutline} style={{ fontSize: 19 }} />
                    </div>
                    <div className="debt-meta">
                      <div className={`debt-title${d.is_repaid ? ' is-repaid' : ''}`}>
                        {d.lender_name}
                      </div>
                      <div className="debt-sub">
                        {formatMoney(d.amount, currency)}
                        {d.monthly_amount && d.monthly_amount > 0 && !d.is_repaid &&
                          ` · ${new Intl.NumberFormat('fr-FR').format(d.monthly_amount)} ${currency}/mois`}
                        {d.reason ? ` · ${d.reason}` : ''}
                      </div>
                    </div>
                    <button
                      type="button"
                      aria-label="Modifier"
                      onClick={() => router.push(`/tabs/debts/add?edit=${d.id}`)}
                      className="pay-toggle"
                    >
                      <IonIcon icon={pencilOutline} />
                    </button>
                    <button
                      type="button"
                      aria-label="Supprimer"
                      onClick={() => setToDelete(d)}
                      className="pay-toggle"
                      style={{ color: 'var(--ion-color-danger)' }}
                    >
                      <IonIcon icon={trashOutline} />
                    </button>
                  </div>

                  {!d.is_repaid && (
                    <div className="debt-body">
                      <div className="debt-payhead">
                        <span>
                          <IonIcon icon={timeOutline} style={{ fontSize: 12, marginRight: 4 }} />
                          Payé {new Intl.NumberFormat('fr-FR').format(Math.round(paid))} /{' '}
                          {new Intl.NumberFormat('fr-FR').format(d.amount)} {currency}
                        </span>
                        <span className="pct">{Math.round(ratio * 100)}%</span>
                      </div>
                      <div className="mini-bar">
                        <div className="mini-bar-fill" style={{ width: `${ratio * 100}%` }} />
                      </div>
                      <div className="debt-rest">
                        <span className="amount">Reste : − {formatMoney(remaining, currency)}</span>
                        {d.monthly_amount && d.monthly_amount > 0 && remaining > 0 && (
                          <span>~{Math.ceil(remaining / d.monthly_amount)} mois</span>
                        )}
                      </div>
                      <div className="debt-actions">
                        <IonButton
                          size="small"
                          fill="outline"
                          className="filter-btn"
                          style={{ margin: 0, fontSize: 12 }}
                          onClick={() => {
                            setPayAmount('');
                            setPayDate(toISODate(new Date()));
                            setPayModal(d);
                          }}
                        >
                          Encaisser un paiement
                        </IonButton>
                        {payments.length > 0 && (
                          <IonButton
                            size="small"
                            fill="clear"
                            className="filter-btn"
                            style={{ margin: 0, fontSize: 12 }}
                            onClick={() => setHistoryDebt(d)}
                          >
                            Voir l'historique de paiement ({payments.length})
                          </IonButton>
                        )}
                      </div>
                    </div>
                  )}

                  {d.is_repaid && payments.length > 0 && (
                    <div className="debt-body">
                      <div className="debt-actions">
                        <IonButton
                          size="small"
                          fill="outline"
                          className="filter-btn"
                          style={{ margin: 0, fontSize: 12 }}
                          onClick={() => setHistoryDebt(d)}
                        >
                          Voir les paiements ({payments.length})
                        </IonButton>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ============ CHARGES RÉCURRENTES (globales) ============ */}
        <div className="settings-card" style={{ marginTop: 4 }}>
          <RecurringChargesSection />
        </div>

        {/* ---- Modals ---- */}
        <IonModal isOpen={!!payModal} onDidDismiss={() => setPayModal(null)}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>{payModal ? `Paiement — ${payModal.lender_name}` : ''}</IonTitle>
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

        {/* Historique de paiements */}
        <DebtHistoryModal
          debt={debts.find((dd) => dd.id === historyDebt?.id) ?? historyDebt}
          isOpen={!!historyDebt}
          onDismiss={() => setHistoryDebt(null)}
          currency={currency}
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

export default Global;