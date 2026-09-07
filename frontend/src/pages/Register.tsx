import { useState } from 'react';
import { IonContent, IonPage } from '@ionic/react';
import { Link } from 'react-router-dom';
import { Moon, Sun, Lock, Mail, User, Wallet } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { registerThunk } from '../store/authSlice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTheme } from '@/hooks/use-theme';

const Register: React.FC = () => {
  const dispatch = useAppDispatch();
  const { status, error } = useAppSelector((s) => s.auth);
  const { isDark, toggleTheme } = useTheme();
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

  const displayedError = localError ?? error;

  return (
    <IonPage>
      <IonContent className="ion-padding">
        <div className="relative flex min-h-screen flex-col justify-center py-8">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Changer de thème"
            className="absolute top-6 right-6 inline-flex h-10 w-10 items-center justify-center rounded-full border border-input bg-background text-foreground shadow-sm transition-colors hover:bg-muted"
          >
            {isDark ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </button>

          <div className="mx-auto w-full max-w-sm">
            <div className="mb-8 flex flex-col items-center text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
                <Wallet className="h-7 w-7" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">
                Créer un compte
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Rejoignez Budget-Famille et commencez avec un budget en Ariary.
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <form onSubmit={submit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reg-name">Nom complet</Label>
                  <div className="relative">
                    <User className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="reg-name"
                      type="text"
                      placeholder="Votre nom"
                      className="pl-10"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      autoComplete="name"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reg-email">Email</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="reg-email"
                      type="email"
                      placeholder="vous@exemple.com"
                      className="pl-10"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reg-password">Mot de passe</Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="reg-password"
                      type="password"
                      placeholder="Min. 6 caractères"
                      className="pl-10"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reg-confirm">Confirmer le mot de passe</Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="reg-confirm"
                      type="password"
                      placeholder="••••••••"
                      className="pl-10"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                    />
                  </div>
                </div>

                {displayedError ? (
                  <p className="text-sm font-medium text-destructive">
                    {displayedError}
                  </p>
                ) : null}

                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={!canSubmit || status === 'loading'}
                >
                  {status === 'loading' ? 'Création…' : 'Créer mon compte'}
                </Button>
              </form>
            </div>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Déjà un compte ?{' '}
              <Link to="/login" className="font-medium text-primary hover:underline">
                Se connecter
              </Link>
            </p>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Register;