import { useState } from 'react';
import {
  IonButton,
  IonContent,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonPage,
  IonText,
} from '@ionic/react';
import { lockClosedOutline, mailOutline, personOutline } from 'ionicons/icons';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { registerThunk } from '../store/authSlice';

const Register: React.FC = () => {
  const dispatch = useAppDispatch();
  const { status, error } = useAppSelector((s) => s.auth);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const canSubmit =
    fullName.trim().length > 0 &&
    email.trim().length > 0 &&
    password.length >= 6 &&
    password === confirm;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (password.length < 6) {
      setLocalError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    if (password !== confirm) {
      setLocalError('Les mots de passe ne correspondent pas.');
      return;
    }
    await dispatch(
      registerThunk({ email: email.trim(), full_name: fullName.trim(), password, currency: 'MGA' }),
    );
  };

  return (
    <IonPage>
      <IonContent className="ion-padding">
        <div className="auth-shell">
          <div className="auth-hero">
            <IonIcon icon={personOutline} />
            <h1 style={{ margin: '12px 0 4px' }}>Créer un compte</h1>
            <IonText color="medium">
              <p style={{ margin: 0 }}>
                Rejoignez Budget-Famille et commencez avec un budget en Ariary.
              </p>
            </IonText>
          </div>

          <div className="auth-card">
            <form onSubmit={submit}>
              <IonItem style={{ marginBottom: 12 }}>
                <IonIcon icon={personOutline} slot="start" />
                <IonInput
                  label="Nom complet"
                  labelPlacement="stacked"
                  value={fullName}
                  onIonInput={(e) => setFullName(String(e.detail.value ?? ''))}
                  autocomplete="name"
                />
              </IonItem>
              <IonItem style={{ marginBottom: 12 }}>
                <IonIcon icon={mailOutline} slot="start" />
                <IonInput
                  type="email"
                  label="Email"
                  labelPlacement="stacked"
                  value={email}
                  onIonInput={(e) => setEmail(String(e.detail.value ?? ''))}
                  autocomplete="email"
                />
              </IonItem>
              <IonItem style={{ marginBottom: 12 }}>
                <IonIcon icon={lockClosedOutline} slot="start" />
                <IonInput
                  type="password"
                  label="Mot de passe (min. 6 caractères)"
                  labelPlacement="stacked"
                  value={password}
                  onIonInput={(e) => setPassword(String(e.detail.value ?? ''))}
                />
              </IonItem>
              <IonItem style={{ marginBottom: 16 }}>
                <IonIcon icon={lockClosedOutline} slot="start" />
                <IonInput
                  type="password"
                  label="Confirmer le mot de passe"
                  labelPlacement="stacked"
                  value={confirm}
                  onIonInput={(e) => setConfirm(String(e.detail.value ?? ''))}
                />
              </IonItem>

              {localError || error ? (
                <IonText color="danger">
                  <p style={{ fontSize: 13, margin: '0 0 12px' }}>{localError ?? error}</p>
                </IonText>
              ) : null}

              <IonButton
                type="submit"
                expand="block"
                disabled={!canSubmit || status === 'loading'}
              >
                {status === 'loading' ? 'Création...' : 'Créer mon compte'}
              </IonButton>
            </form>
          </div>

          <div className="auth-alt-link">
            <p>
              Déjà un compte ?{' '}
              <IonButton
                routerLink="/login"
                fill="clear"
                size="small"
                style={{ '--padding-start': 0 }}
              >
                Se connecter
              </IonButton>
            </p>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Register;