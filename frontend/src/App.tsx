import { useEffect, useState } from "react";
import { IonApp, IonRouterOutlet, IonToast } from "@ionic/react";
import { IonReactRouter } from "@ionic/react-router";
import { Navigate, Route } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "./store/hooks";
import { loadMeThunk, logout } from "./store/authSlice";
import { loadMonthThunk } from "./store/budgetSlice";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Tabs from "./pages/Tabs";
import { initConnectivity, isOnline } from "./services/connectivity";
import { fullSync } from "./services/sync";
import { api } from "./services/api";

const App: React.FC = () => {
  const dispatch = useAppDispatch();
  const token = useAppSelector((s) => s.auth.token);
  const [connected, setConnected] = useState(isOnline());
  const [banner, setBanner] = useState<string | null>(null);

  useEffect(() => {
    api.onUnauthorized(() => {
      dispatch(logout());
    });
  }, [dispatch]);

  useEffect(() => {
    initConnectivity((online) => {
      setConnected(online);
      if (online) {
        setBanner("Connexion rétablie — synchronisation...");
        fullSync()
          .catch(() => undefined)
          .finally(() => setBanner(null));
      } else {
        setBanner("Hors ligne — vos saisies seront synchronisées plus tard.");
      }
    });
  }, []);

  useEffect(() => {
    if (!token) return;
    const month = new Date().toISOString().slice(0, 7);
    dispatch(loadMeThunk());
    dispatch(loadMonthThunk(month));
    if (isOnline()) {
      fullSync().catch(() => undefined);
    }
  }, [token, dispatch]);

  return (
    <IonApp>
      <IonReactRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <IonRouterOutlet>
          <Route
            path="/login"
            element={token ? <Navigate to="/tabs" replace /> : <Login />}
          />
          <Route
            path="/register"
            element={token ? <Navigate to="/tabs" replace /> : <Register />}
          />
          <Route
            path="/tabs/*"
            element={token ? <Tabs /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/"
            element={
              token ? (
                <Navigate to="/tabs" replace />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
        </IonRouterOutlet>
      </IonReactRouter>
      <IonToast
        isOpen={!!banner}
        message={banner ?? ""}
        duration={3000}
        position="top"
        color={connected ? "success" : "warning"}
        onDidDismiss={() => setBanner(null)}
      />
    </IonApp>
  );
};

export default App;
