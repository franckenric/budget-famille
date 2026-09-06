import { useMemo } from 'react';
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import type { ValueType, NameType } from 'recharts/types/component/DefaultTooltipContent';
import type { CategoryStats } from '../types';
import { categoryColor, categoryLabel } from '../constants';
import { formatMoney, formatMoneyShort } from '../utils/format';

type Payload = {
  payload?: { value?: ValueType };
};

const toNumber = (v: ValueType | undefined): number =>
  Number(Array.isArray(v) ? v[0] : v) || 0;

const CategoryPie: React.FC<{ stats: CategoryStats | null; currency: string }> = ({
  stats,
  currency,
}) => {
  const data = useMemo(() => {
    if (!stats) return [];
    return stats.categories
      .filter((c) => c.total > 0)
      .map((c) => ({
        name: categoryLabel(c.category),
        value: c.total,
        color: categoryColor(c.category),
      }));
  }, [stats]);

  if (!stats || data.length === 0) {
    return (
      <p style={{ textAlign: 'center', color: 'var(--ion-color-medium)' }}>
        Aucune dépense ce mois-ci.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={85}
          paddingAngle={2}
        >
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: ValueType | undefined) => formatMoney(toNumber(value), currency)}
          itemSorter={(item: Payload) =>
            -toNumber(item.payload?.value ?? 0)
          }
        />
        <Legend
          formatter={(value: string, entry) => (
            <span style={{ fontSize: 12 }}>
              {value} ·{' '}
              {formatMoneyShort(
                toNumber((entry as unknown as Payload).payload?.value ?? 0),
              )}
            </span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
};

export default CategoryPie;