import { useEffect, useState } from 'react';
import {
  IonAlert,
  IonButton,
  IonCard,
  IonCardContent,
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
  IonToolbar,
  IonToggle,
  IonToast,
} from '@ionic/react';
import { logOutOutline, syncOutline, walletOutline } from 'ionicons/icons';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { logout, updateProfileThunk } from '../store/authSlice';
import { refreshMonthThunk, saveBudgetThunk } from '../store/budgetSlice';
import { fullSync, pendingCount, resetSyncCursor } from '../services/sync';
import RecurringChargesSection from '../components/RecurringChargesSection';
import { formatMoney } from '../utils/format';
import { isOnline } from '../services/connectivity';

const Settings: React.FC = () => {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const { budget, month } = useAppSelector((s) => s.budget);
  const currency = budget?.currency ?? user?.currency ?? 'MGA';

  const [capitalInput, setCapitalInput] = useState<string>('');
  const [yellow, setYellow] = useState<number>(user?.yellow_threshold ?? 70);
  const [red, setRed] = useState<number>(user?.red_threshold ?? 85);
  const [blocking, setBlocking] = useState<boolean>(user?.blocking_enabled ?? false);
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

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Réglages</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <IonCard>
          <IonCardContent>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <IonIcon icon={walletOutline} style={{ fontSize: 32, color: 'var(--ion-color-primary)' }} />
              <div>
                <h2 style={{ margin: 0 }}>{user?.full_name ?? 'Mon profil'}</h2>
                <IonNote color="medium">{user?.email}</IonNote>
              </div>
            </div>

            <IonItem lines="full">
              <IonLabel position="stacked">
                Capital du mois ({month}) — {currency}
              </IonLabel>
              <IonInput
                type="number"
                inputmode="numeric"
                value={capitalInput}
                onIonInput={(e) => setCapitalInput(String(e.detail.value ?? ''))}
              />
            </IonItem>
            <div className="ion-justify-content-between ion-align-items-center" style={{ display: 'flex', margin: '8px 4px' }}>
              <IonNote color="medium">{formatMoney(budget?.capital ?? 0, currency)}</IonNote>
              <IonButton size="small" onClick={saveBudget} disabled={saving}>
                {saving ? '...' : 'Enregistrer'}
              </IonButton>
            </div>

            <IonItem lines="none" style={{ marginTop: 8 }}>
              <IonLabel>
                <h3 style={{ margin: 0, fontSize: 15 }}>Seuils d'alerte</h3>
                <IonNote color="medium">Jaune (alerte douce) : {yellow} %</IonNote>
              </IonLabel>
            </IonItem>

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

            <IonItem lines="none">
              <IonLabel>
                <IonNote color="medium">Rouge (dépassement probable) : {red} %</IonNote>
              </IonLabel>
            </IonItem>
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

            <IonItem lines="none">
              <IonLabel>
                Bloquer les nouvelles dépenses au-delà du seuil rouge
              </IonLabel>
              <IonToggle
                checked={blocking}
                onIonChange={(e) => setBlocking(e.detail.checked)}
              />
            </IonItem>

            <IonButton expand="block" onClick={saveThresholds}>
              Enregistrer les seuils
            </IonButton>
          </IonCardContent>
        </IonCard>

        <div className="settings-card">
          <RecurringChargesSection />
        </div>

        <IonCard>
          <IonCardContent>
            <IonItem lines="full">
              <IonLabel>
                <h3 style={{ margin: 0, fontSize: 15 }}>Synchronisation</h3>
                <IonNote color="medium">
                  {pending > 0 ? `${pending} opération(s) en attente` : 'À jour'}
                </IonNote>
              </IonLabel>
            </IonItem>
            <IonButton expand="block" fill="outline" onClick={doSync} style={{ marginTop: 12 }}>
              <IonIcon icon={syncOutline} slot="start" /> Synchroniser maintenant
            </IonButton>
            <IonButton
              expand="block"
              fill="clear"
              size="small"
              onClick={() => resetSyncCursor().then(doSync)}
            >
              Réinitialiser le cache local
            </IonButton>
          </IonCardContent>
        </IonCard>

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