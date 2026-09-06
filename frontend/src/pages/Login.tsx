import { useState } from 'react';
import {
  IonButton,
  IonContent,
  IonIcon,
  IonInput,
  IonItem,
  IonPage,
  IonText,
} from '@ionic/react';
import {
  lockClosedOutline,
  mailOutline,
  walletOutline,
} from 'ionicons/icons';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { loginThunk } from '../store/authSlice';

const Login: React.FC = () => {
  const dispatch = useAppDispatch();
  const { status, error } = useAppSelector((s) => s.auth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const canSubmit = email.trim().length > 0 && password.length > 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    await dispatch(loginThunk({ email: email.trim(), password }));
  };

  return (
    <IonPage>
      <IonContent
        className="ion-padding"
        style={{ '--background': 'transparent' } as React.CSSProperties}
      >
        <div className="auth-shell">
          <div className="auth-hero">
            <IonIcon icon={walletOutline} />
            <h1 style={{ margin: '12px 0 4px' }}>Budget-Famille</h1>
            <IonText color="medium">
              <p style={{ margin: 0 }}>Gérez le budget de votre foyer, ensemble.</p>
            </IonText>
          </div>

          <div className="auth-card">
            <form onSubmit={submit}>
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
              <IonItem style={{ marginBottom: 16 }}>
                <IonIcon icon={lockClosedOutline} slot="start" />
                <IonInput
                  type="password"
                  label="Mot de passe"
                  labelPlacement="stacked"
                  value={password}
                  onIonInput={(e) => setPassword(String(e.detail.value ?? ''))}
                  autocomplete="current-password"
                />
              </IonItem>

              {error ? (
                <IonText color="danger">
                  <p style={{ fontSize: 13, margin: '0 0 12px' }}>{error}</p>
                </IonText>
              ) : null}

              <IonButton
                type="submit"
                expand="block"
                disabled={!canSubmit || status === 'loading'}
                style={{ marginBottom: 8 }}
              >
                {status === 'loading' ? 'Connexion...' : 'Se connecter'}
              </IonButton>
            </form>
          </div>

          <div className="auth-alt-link">
            <p>
              Pas encore de compte ?{' '}
              <IonButton
                routerLink="/register"
                fill="clear"
                size="small"
                style={{ '--padding-start': 0 }}
              >
                Créer un compte
              </IonButton>
            </p>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Login;