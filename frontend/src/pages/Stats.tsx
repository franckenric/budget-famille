import { useEffect, useState } from 'react';
import {
  IonCard,
  IonCardContent,
  IonContent,
  IonHeader,
  IonNote,
  IonPage,
  IonTitle,
  IonToolbar,
  IonText,
} from '@ionic/react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import CategoryPie from '../components/CategoryPie';
import DailyLine from '../components/DailyLine';
import EmptyState from '../components/EmptyState';
import { fetchCompare } from '../services/endpoints';
import type { CompareItem } from '../types';
import { formatMoney, monthLabel, previousMonth } from '../utils/format';

const Stats: React.FC = () => {
  const dispatch = useAppDispatch();
  const { month, stats, budget } = useAppSelector((s) => s.budget);
  const currency = budget?.currency ?? 'MGA';
  const [compare, setCompare] = useState<CompareItem[]>([]);

  useEffect(() => {
    fetchCompare()
      .then(setCompare)
      .catch(() => setCompare([]));
  }, [month, dispatch]);

  const prev = previousMonth(month);
  const prevRow = compare.find((c) => c.month === prev);
  const growth =
    prevRow && prevRow.total_spent > 0 && stats
      ? ((stats.total_variable - prevRow.total_variable) / prevRow.total_variable) * 100
      : null;

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Statistiques</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        {!stats || stats.categories.length === 0 ? (
          <EmptyState
            title="Pas encore de données"
            subtitle="Les graphiques apparaîtront dès les premières dépenses du mois."
          />
        ) : (
          <>
            <IonCard>
              <IonCardContent>
                <IonNote color="medium">Dépenses par catégorie</IonNote>
                <CategoryPie stats={stats} currency={currency} />
                <div style={{ marginTop: 8 }}>
                  {stats.categories
                    .filter((c) => c.total > 0)
                    .map((c) => (
                      <div
                        key={c.category}
                        className="ion-justify-content-between"
                        style={{ display: 'flex', fontSize: 13, padding: '4px 0' }}
                      >
                        <span>{c.category}</span>
                        <span style={{ color: 'var(--ion-color-medium)' }}>
                          {formatMoney(c.total, currency)}
                        </span>
                      </div>
                    ))}
                </div>
              </IonCardContent>
            </IonCard>

            <IonCard>
              <IonCardContent>
                <IonNote color="medium">Évolution du mois ({monthLabel(month)})</IonNote>
                <DailyLine stats={stats} currency={currency} />
              </IonCardContent>
            </IonCard>

            <IonCard>
              <IonCardContent>
                <IonNote color="medium">Comparaison avec {monthLabel(prev)}</IonNote>
                {prevRow && growth !== null ? (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                    <span style={{ color: 'var(--ion-color-medium)' }}>
                      {monthLabel(prev)} : {formatMoney(prevRow.total_variable, currency)}
                    </span>
                    <b
                      style={{
                        color:
                          growth >= 0 ? 'var(--ion-color-danger)' : 'var(--ion-color-success)',
                      }}
                    >
                      {growth >= 0 ? '+' : ''}
                      {growth.toFixed(1)} %
                    </b>
                  </div>
                ) : (
                  <IonText color="medium">
                    <small>Pas de données sur le mois précédent.</small>
                  </IonText>
                )}
              </IonCardContent>
            </IonCard>
          </>
        )}
      </IonContent>
    </IonPage>
  );
};

export default Stats;