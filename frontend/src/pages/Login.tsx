import { useState } from 'react';
import { IonContent, IonPage } from '@ionic/react';
import { Link } from 'react-router-dom';
import { Moon, Sun, Wallet, Lock, Mail } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { loginThunk } from '../store/authSlice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTheme } from '@/hooks/use-theme';

const Login: React.FC = () => {
  const dispatch = useAppDispatch();
  const { status, error } = useAppSelector((s) => s.auth);
  const { isDark, toggleTheme } = useTheme();
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
      <IonContent className="ion-padding" scrollY={false}>
        <div className="relative flex min-h-screen flex-col justify-center">
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
                Budget-Famille
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Gérez le budget de votre foyer, ensemble.
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <form onSubmit={submit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="login-email"
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
                  <Label htmlFor="login-password">Mot de passe</Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      className="pl-10"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                    />
                  </div>
                </div>

                {error ? (
                  <p className="text-sm font-medium text-destructive">{error}</p>
                ) : null}

                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={!canSubmit || status === 'loading'}
                >
                  {status === 'loading' ? 'Connexion…' : 'Se connecter'}
                </Button>
              </form>
            </div>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Pas encore de compte ?{' '}
              <Link to="/register" className="font-medium text-primary hover:underline">
                Créer un compte
              </Link>
            </p>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Login;