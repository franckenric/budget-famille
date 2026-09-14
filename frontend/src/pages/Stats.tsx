import { useEffect, useState } from 'react';
import {
  IonContent,
  IonHeader,
  IonIcon,
  IonPage,
  IonToolbar,
} from '@ionic/react';
import { pieChartOutline, trendingDownOutline, trendingUpOutline } from 'ionicons/icons';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import CategoryPie from '../components/CategoryPie';
import DailyLine from '../components/DailyLine';
import EmptyState from '../components/EmptyState';
import { fetchCompare } from '../services/endpoints';
import { categoryColor, categoryIcon, categoryLabel } from '../constants';
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
        <IonToolbar className="dash-toolbar">
          <div className="dash-greet">
            <div className="dash-greet-hello">Statistiques</div>
            <div className="dash-greet-date">{monthLabel(month)}</div>
          </div>
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
                <div className="stat-label">Opérations</div>
                <div className="stat-value">{varCount}</div>
                <div className="stat-sub">
                  {stats.categories.length} catégorie{stats.categories.length > 1 ? 's' : ''} active
                  {stats.categories.length > 1 ? 's' : ''}
                </div>
              </div>

              {topCat && topCat.total > 0 ? (
                <div className="stat-tile">
                  <div className="stat-label">Top catégorie</div>
                  <div
                    className="stat-value"
                    style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16 }}
                  >
                    <span
                      className="stat-tile-icon"
                      style={{
                        background: `${categoryColor(topCat.category)}22`,
                        color: categoryColor(topCat.category),
                      }}
                    >
                      <IonIcon icon={categoryIcon(topCat.category)} style={{ fontSize: 14 }} />
                    </span>
                    {categoryLabel(topCat.category)}
                  </div>
                  <div className="stat-sub">
                    {formatMoney(topCat.total, currency)} ·{' '}
                    {stats ? Math.round((topCat.total / stats.total_variable) * 100) : 0} % du
                    total
                  </div>
                </div>
              ) : null}

              <div className="stat-tile">
                <div className="stat-label">vs {monthLabel(prev)}</div>
                {growth !== null ? (
                  <>
                    <div
                      className="stat-value"
                      style={{
                        color:
                          growth >= 0 ? 'var(--ion-color-danger)' : 'var(--ion-color-success)',
                      }}
                    >
                      {growth >= 0 ? '+' : ''}
                      {growth.toFixed(1)} %
                    </div>
                    <div className="stat-sub">
                      <IonIcon
                        icon={growth >= 0 ? trendingUpOutline : trendingDownOutline}
                        style={{
                          fontSize: 12,
                          verticalAlign: 'text-bottom',
                          marginRight: 4,
                          color:
                            growth >= 0 ? 'var(--ion-color-danger)' : 'var(--ion-color-success)',
                        }}
                      />
                      {formatMoney(prevRow?.total_variable ?? 0, currency)} en {monthLabel(prev)}
                    </div>
                  </>
                ) : (
                  <div className="stat-sub">Pas de données sur le mois précédent.</div>
                )}
              </div>
            </div>

            <div className="tile-group chart-card">
              <div className="chart-head">
                <IonIcon icon={pieChartOutline} />
                Dépenses par catégorie
              </div>
              <div style={{ padding: '4px 6px 12px' }}>
                <CategoryPie stats={stats} currency={currency} />
              </div>
            </div>

            <div className="tile-group chart-card">
              <div className="chart-head">
                <IonIcon icon={trendingUpOutline} />
                Évolution du mois
              </div>
              <div style={{ padding: '4px 6px 12px' }}>
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