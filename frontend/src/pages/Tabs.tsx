import {
  IonIcon,
  IonLabel,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonTabs,
} from '@ionic/react';
import { barChart, cardOutline, home, people, receipt, settings } from 'ionicons/icons';
import { Navigate, Route } from 'react-router-dom';
import Dashboard from './Dashboard';
import Expenses from './Expenses';
import Charges from './Charges';
import AddExpense from './AddExpense';
import Stats from './Stats';
import Settings from './Settings';
import Family from './Family';

const Tabs: React.FC = () => {
  return (
    <IonTabs>
      <IonRouterOutlet>
        <Route path="/tabs/dashboard" element={<Dashboard />} />
        <Route path="/tabs/expenses" element={<Expenses />} />
        <Route path="/tabs/charges" element={<Charges />} />
        <Route path="/tabs/expenses/add" element={<AddExpense />} />
        <Route path="/tabs/stats" element={<Stats />} />
        <Route path="/tabs/family" element={<Family />} />
        <Route path="/tabs/settings" element={<Settings />} />
        <Route path="/tabs" element={<Navigate to="/tabs/dashboard" replace />} />
      </IonRouterOutlet>

      <IonTabBar slot="bottom">
        <IonTabButton tab="dashboard" href="/tabs/dashboard">
          <IonIcon icon={home} />
          <IonLabel>Accueil</IonLabel>
        </IonTabButton>
        <IonTabButton tab="expenses" href="/tabs/expenses">
          <IonIcon icon={receipt} />
          <IonLabel>Dépenses</IonLabel>
        </IonTabButton>
        <IonTabButton tab="charges" href="/tabs/charges">
          <IonIcon icon={cardOutline} />
          <IonLabel>Charges</IonLabel>
        </IonTabButton>
        <IonTabButton tab="stats" href="/tabs/stats">
          <IonIcon icon={barChart} />
          <IonLabel>Stats</IonLabel>
        </IonTabButton>
        <IonTabButton tab="family" href="/tabs/family">
          <IonIcon icon={people} />
          <IonLabel>Famille</IonLabel>
        </IonTabButton>
        <IonTabButton tab="settings" href="/tabs/settings">
          <IonIcon icon={settings} />
          <IonLabel>Réglages</IonLabel>
        </IonTabButton>
      </IonTabBar>
    </IonTabs>
  );
};

export default Tabs;