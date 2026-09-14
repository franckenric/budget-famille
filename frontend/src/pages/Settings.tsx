import { useEffect, useState } from 'react';
import {
  IonAlert,
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonPage,
  IonRange,
  IonTitle,
  IonToggle,
  IonToast,
  IonToolbar,
} from '@ionic/react';
import { logOutOutline, syncOutline, walletOutline, notificationsOutline } from 'ionicons/icons';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { logout, updateProfileThunk } from '../store/authSlice';
import { refreshMonthThunk, saveBudgetThunk } from '../store/budgetSlice';
import { fullSync, pendingCount, resetSyncCursor } from '../services/sync';
import RecurringChargesSection from '../components/RecurringChargesSection';
import { formatMoney } from '../utils/format';
import { isOnline } from '../services/connectivity';
import {
  cancelAllFixedChargeNotifications,
  remindersEnabled,
  setRemindersEnabled,
  syncFixedChargeNotifications,
} from '../services/notifications';

const Settings: React.FC = () => {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const { budget, month, fixedCharges } = useAppSelector((s) => s.budget);
  const currency = budget?.currency ?? user?.currency ?? 'MGA';

  const [capitalInput, setCapitalInput] = useState<string>('');
  const [yellow, setYellow] = useState<number>(user?.yellow_threshold ?? 70);
  const [red, setRed] = useState<number>(user?.red_threshold ?? 85);
  const [blocking, setBlocking] = useState<boolean>(user?.blocking_enabled ?? false);
  const [reminders, setReminders] = useState<boolean>(remindersEnabled());
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState(0);
  const [toast, setToast] = useState<{ message: string; color: string } | null>(null);
  const [confirmLogout, setConfirmLogout] = useState(false);

  useEffect(() => {
    if (budget) setCapitalInput(String(budget.capital));
    pendingCount().then(setPending).catch(() => undefined);
  }, [budget]);

  const saveBudget = async () => {
    if (!budget) return;
    const capital = Number(capitalInput);
    if (!capital || capital <= 0) return;
    setSaving(true);
    const res = await dispatch(
      saveBudgetThunk({ budgetId: budget.id, payload: { capital, currency } }),
    );
    if (res.meta.requestStatus === 'fulfilled') {
      setToast({ message: 'Budget mis à jour.', color: 'success' });
      dispatch(refreshMonthThunk(month));
    }
    setSaving(false);
  };

  const saveThresholds = async () => {
    if (yellow >= red) {
      setToast({ message: 'Le seuil jaune doit être inférieur au seuil rouge.', color: 'danger' });
      return;
    }
    const res = await dispatch(
      updateProfileThunk({ yellow_threshold: yellow, red_threshold: red, blocking_enabled: blocking }),
    );
    if (res.meta.requestStatus === 'fulfilled') {
      setToast({ message: 'Paramètres enregistrés.', color: 'success' });
    }
  };

  const toggleReminders = async (on: boolean) => {
    setReminders(on);
    setRemindersEnabled(on);
    try {
      if (on) {
        await syncFixedChargeNotifications(fixedCharges, { currency });
        setToast({ message: 'Rappels d\u2019échéance activés.', color: 'success' });
      } else {
        await cancelAllFixedChargeNotifications();
        setToast({ message: 'Rappels d\u2019échéance désactivés.', color: 'warning' });
      }
    } catch {
      setToast({ message: 'Permission de notification refusée.', color: 'danger' });
    }
  };

  const doSync = async () => {
    setToast({ message: isOnline() ? 'Synchronisation en cours...' : 'Hors ligne.', color: 'medium' });
    await fullSync();
    const n = await pendingCount();
    setPending(n);
    setToast({ message: n === 0 ? 'Synchronisé.' : `${n} opérations à synchroniser.`, color: 'success' });
  };

  const doLogout = () => {
    setConfirmLogout(false);
    dispatch(logout());
  };

  const initials = (user?.full_name ?? 'P')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Réglages</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        {/* Profil */}
        <div className="settings-card">
          <div className="settings-profile-row">
            <div className="avatar-gradient" style={{ width: 52, height: 52, fontSize: 20 }}>
              {initials}
            </div>
            <div style={{ minWidth: 0 }}>
              <h2 className="settings-name">{user?.full_name ?? 'Mon profil'}</h2>
              <IonNote color="medium">{user?.email}</IonNote>
            </div>
          </div>

          <div className="settings-divider" />

          <div className="settings-title">Capital du mois ({month})</div>
          <div className="settings-capital-row">
            <IonInput
              type="number"
              inputmode="numeric"
              placeholder={`Montant (${currency})`}
              value={capitalInput}
              onIonInput={(e) => setCapitalInput(String(e.detail.value ?? ''))}
            />
            <IonButton size="small" onClick={saveBudget} disabled={saving}>
              {saving ? '...' : 'Enregistrer'}
            </IonButton>
          </div>
          <IonNote color="medium" style={{ display: 'block', marginTop: 6, fontSize: 12 }}>
            {formatMoney(budget?.capital ?? 0, currency)} enregistrés pour {month}.
          </IonNote>
        </div>

        {/* Alertes & rappels */}
        <div className="settings-card">
          <div className="settings-title">Alertes de budget</div>

          <div className="settings-threshold-row">
            <span>Seuil jaune</span>
            <span style={{ color: '#f97316' }}>{yellow} %</span>
          </div>
          <IonRange
            aria-label="Seuil jaune"
            min={50}
            max={95}
            step={5}
            value={yellow}
            pin
            ticks
            snaps
            onIonChange={(e) => setYellow(Number(e.detail.value))}
          />

          <div className="settings-threshold-row">
            <span>Seuil rouge</span>
            <span style={{ color: '#dc2626' }}>{red} %</span>
          </div>
          <IonRange
            aria-label="Seuil rouge"
            min={60}
            max={100}
            step={5}
            value={red}
            pin
            ticks
            snaps
            onIonChange={(e) => setRed(Number(e.detail.value))}
          />

          <IonItem lines="none" style={{ marginTop: 8, '--padding-start': 0 }}>
            <IonLabel>
              <div style={{ fontWeight: 600 }}>Bloquer les nouvelles dépenses au-delà du seuil rouge</div>
              <IonNote color="medium">Une alerte s'affichera quand le budget sera dépassé.</IonNote>
            </IonLabel>
            <IonToggle checked={blocking} onIonChange={(e) => setBlocking(e.detail.checked)} />
          </IonItem>

          <IonItem lines="none" style={{ '--padding-start': 0 }}>
            <IonLabel>
              <div style={{ fontWeight: 600 }}>
                <IonIcon
                  icon={notificationsOutline}
                  style={{ fontSize: 15, marginRight: 6, verticalAlign: 'text-bottom' }}
                />
                Rappels des charges fixes à leur échéance
              </div>
              <IonNote color="medium">Notification sur votre téléphone le jour de la date d'échéance et 3 jours avant.</IonNote>
            </IonLabel>
            <IonToggle checked={reminders} onIonChange={(e) => toggleReminders(e.detail.checked)} />
          </IonItem>

          <IonButton expand="block" onClick={saveThresholds} style={{ marginTop: 10 }}>
            Enregistrer les seuils
          </IonButton>
        </div>

        {/* Charges récurrentes */}
        <div className="settings-card">
          <RecurringChargesSection />
        </div>

        {/* Synchronisation */}
        <div className="settings-card">
          <div className="settings-title">Synchronisation</div>
          <div className="settings-sync-row">
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600 }}>
                <IonIcon icon={syncOutline} style={{ fontSize: 15, marginRight: 6, verticalAlign: 'text-bottom' }} />
                État de la borne
              </div>
              <IonNote color="medium">
                {pending > 0 ? `${pending} opération(s) en attente` : 'À jour'}
              </IonNote>
            </div>
            <IonButton fill="outline" size="small" onClick={doSync}>
              Synchroniser
            </IonButton>
          </div>
          <div style={{ marginTop: 10 }}>
            <IonButton expand="block" fill="clear" size="small" onClick={() => resetSyncCursor().then(doSync)}>
              Réinitialiser le cache local
            </IonButton>
          </div>
        </div>

        <IonList inset>
          <IonItem button onClick={() => setConfirmLogout(true)} color="danger">
            <IonIcon icon={logOutOutline} slot="start" />
            <IonLabel>Se déconnecter</IonLabel>
          </IonItem>
        </IonList>

        <IonAlert
          isOpen={confirmLogout}
          header="Se déconnecter ?"
          buttons={[
            { text: 'Annuler', role: 'cancel' },
            { text: 'Se déconnecter', handler: doLogout },
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

export default Settings;