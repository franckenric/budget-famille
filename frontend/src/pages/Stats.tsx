import { useEffect, useState } from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
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
    prevRow && prevRow.total_variable > 0 && stats
      ? ((stats.total_variable - prevRow.total_variable) / prevRow.total_variable) * 100
      : null;

  const varCount = stats ? stats.categories.reduce((sum, c) => sum + c.count, 0) : 0;
  const topCat =
    stats && stats.categories.length > 0
      ? stats.categories.reduce((a, b) => (b.total > a.total ? b : a), stats.categories[0])
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
          <div className="tile-group">
            <EmptyState
              icon="bar-chart-outline"
              title="Pas encore de données"
              subtitle="Les graphiques apparaîtront dès les premières dépenses du mois."
            />
          </div>
        ) : (
          <>
            <div className="stat-tiles">
              <div className="stat-tile">
                <div className="stat-label">Dépenses variables</div>
                <div className="stat-value">{formatMoney(stats.total_variable, currency)}</div>
                <div className="stat-sub">{monthLabel(month)}</div>
              </div>
              <div className="stat-tile">
                <div className="stat-label">Catégories actives</div>
                <div className="stat-value">{stats.categories.length}</div>
                <div className="stat-sub">{varCount} opérations</div>
              </div>
              {topCat && topCat.total > 0 ? (
                <div className="stat-tile">
                  <div className="stat-label">Top catégorie</div>
                  <div className="stat-value" style={{ fontSize: 16 }}>
                    {topCat.category}
                  </div>
                  <div className="stat-sub">{formatMoney(topCat.total, currency)}</div>
                </div>
              ) : null}
              <div
                className="stat-tile"
                style={{
                  borderColor: growth !== null && growth > 0 ? 'rgba(220,38,38,0.35)' : undefined,
                }}
              >
                <div className="stat-label">vs {monthLabel(prev)}</div>
                {growth !== null ? (
                  <>
                    <div
                      className="stat-value"
                      style={{ color: growth >= 0 ? 'var(--ion-color-danger)' : 'var(--ion-color-success)' }}
                    >
                      {growth >= 0 ? '+' : ''}
                      {growth.toFixed(1)} %
                    </div>
                    <div className="stat-sub">
                      {growth >= 0 ? '▲' : '▼'} {formatMoney(prevRow?.total_variable ?? 0, currency)}{' '}
                      en {monthLabel(prev)}
                    </div>
                  </>
                ) : (
                  <div className="stat-sub">Pas de données sur le mois précédent.</div>
                )}
              </div>
            </div>

            <div className="tile-group chart-card">
              <div style={{ padding: '14px 14px 0' }}>
                <p className="section-title" style={{ margin: 0, fontSize: 12 }}>
                  Dépenses par catégorie
                </p>
              </div>
              <div style={{ padding: '4px 6px' }}>
                <CategoryPie stats={stats} currency={currency} />
              </div>
            </div>

            <div className="tile-group chart-card">
              <div style={{ padding: '14px 14px 0' }}>
                <p className="section-title" style={{ margin: 0, fontSize: 12 }}>
                  Évolution du mois ({monthLabel(month)})
                </p>
              </div>
              <div style={{ padding: '4px 6px' }}>
                <DailyLine stats={stats} currency={currency} />
              </div>
            </div>
          </>
        )}
      </IonContent>
    </IonPage>
  );
};

export default Stats;
