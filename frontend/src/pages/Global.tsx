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
  planetOutline,
  timeOutline,
  trashOutline,
} from 'ionicons/icons';
import { useIonRouter } from '@ionic/react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  loadDebtsThunk,
  recordPaymentThunk,
  removeDebtThunk,
  toggleRepaidThunk,
  undoPaymentThunk,
} from '../store/debtsSlice';
import RecurringChargesSection from '../components/RecurringChargesSection';
import EmptyState from '../components/EmptyState';
import { formatDay, formatMoney, toISODate } from '../utils/format';
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

  const handleToggleRepaid = async (id: string) => {
    await dispatch(toggleRepaidThunk(id));
    dispatch(loadDebtsThunk());
  };

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

  const undoPayment = async (d: Debt, index: number) => {
    const res = await dispatch(undoPaymentThunk({ id: d.id, index }));
    if (res.meta.requestStatus === 'fulfilled') {
      dispatch(loadDebtsThunk());
      setToast({ message: 'Paiement annulé.', color: 'success' });
    }
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
        <IonToolbar>
          <IonIcon icon={planetOutline} slot="start" style={{ marginInlineStart: 14, fontSize: 22, color: 'var(--ion-color-primary)' }} />
          <IonTitle>Global</IonTitle>
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

        <IonText style={{ display: 'block', marginBottom: 12 }}>
          <span style={{ fontSize: 12, color: 'var(--ion-color-medium)' }}>
            Ces dettes ne sont pas rattachées à un mois : elles durent jusqu'au remboursement complet.
          </span>
        </IonText>

        {unpaidDebts.length > 0 && (
          <div className="dash-card" style={{ marginBottom: 12, padding: '12px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--ion-color-medium)', fontWeight: 600 }}>
                Restant global
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
                  className="charge-row"
                  style={{ opacity: d.is_repaid ? 0.65 : 1, flexDirection: 'column', alignItems: 'stretch', gap: 0 }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 11,
                        background: d.is_repaid ? 'rgba(22,163,74,0.12)' : 'rgba(249,115,22,0.12)',
                        color: d.is_repaid ? '#16a34a' : '#f97316',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <IonIcon icon={d.is_repaid ? checkmarkCircle : cashOutline} style={{ fontSize: 19 }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, textDecoration: d.is_repaid ? 'line-through' : 'none' }}>
                        {d.lender_name}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--ion-color-medium)' }}>
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
                    <div style={{ marginTop: 8, paddingLeft: 48 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ion-color-medium)', marginBottom: 4 }}>
                        <span>
                          <IonIcon icon={timeOutline} style={{ fontSize: 12, marginRight: 4 }} />
                          Payé {new Intl.NumberFormat('fr-FR').format(Math.round(paid))} / {new Intl.NumberFormat('fr-FR').format(d.amount)} {currency}
                        </span>
                        <span>{Math.round(ratio * 100)}%</span>
                      </div>
                      <div className="mini-bar">
                        <div className="mini-bar-fill" style={{ width: `${ratio * 100}%` }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 6, fontWeight: 600 }}>
                        <span style={{ color: '#f97316' }}>Reste : − {formatMoney(remaining, currency)}</span>
                        {d.monthly_amount && d.monthly_amount > 0 && remaining > 0 && (
                          <span style={{ color: 'var(--ion-color-medium)' }}>
                            ~{Math.ceil(remaining / d.monthly_amount)} mois
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8, alignItems: 'center' }}>
                        <IonButton size="small" fill="outline" className="filter-btn" style={{ margin: 0, fontSize: 12 }}
                          onClick={() => {
                            setPayAmount('');
                            setPayDate(toISODate(new Date()));
                            setPayModal(d);
                          }}>
                          Encaisser un paiement
                        </IonButton>
                        {payments.length > 0 && (
                          <IonButton size="small" fill="clear" className="filter-btn" style={{ margin: 0, fontSize: 12 }}
                            onClick={() => setHistoryDebt(d)}>
                            Voir l'historique de paiement ({payments.length})
                          </IonButton>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ============ CHARGES RÉCURRENTES (globales) ============ */}
        <div style={{ marginTop: 16 }}>
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
        <IonModal isOpen={!!historyDebt} onDidDismiss={() => setHistoryDebt(null)}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>
                {historyDebt ? `Historique — ${historyDebt.lender_name}` : ''}
              </IonTitle>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            {historyDebt &&
              (() => {
                const current = debts.find((dd) => dd.id === historyDebt.id) ?? historyDebt;
                const payments = current.payments ?? [];
                const paidTotal = (dd: Debt) => (dd.payments ?? []).reduce((s, p) => s + p.amount, 0);
                return (
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
                              onClick={() => undoPayment(current, i)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--ion-color-danger)',
                                fontSize: 14,
                                padding: '0 4px',
                                cursor: 'pointer',
                              }}
                              aria-label="Annuler ce paiement"
                            >
                              ✕
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
                        Payé {formatMoney(paidTotal(current), currency)} / {formatMoney(current.amount, currency)} {currency}
                      </span>
                      <span style={{ fontWeight: 800, fontSize: 15, color: '#f97316' }}>
                        Reste {formatMoney(Math.max(0, current.amount - paidTotal(current)), currency)}
                      </span>
                    </div>
                    <IonButton expand="block" style={{ marginTop: 16 }} onClick={() => setHistoryDebt(null)}>
                      Fermer
                    </IonButton>
                  </>
                );
              })()}
          </IonContent>
        </IonModal>

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