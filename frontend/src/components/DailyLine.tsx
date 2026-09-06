import { useMemo } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ValueType, NameType } from 'recharts/types/component/DefaultTooltipContent';
import type { CategoryStats } from '../types';
import { formatDay, formatMoney } from '../utils/format';

const toNumber = (v: ValueType | undefined): number =>
  Number(Array.isArray(v) ? v[0] : v) || 0;

const DailyLine: React.FC<{ stats: CategoryStats | null; currency: string }> = ({
  stats,
  currency,
}) => {
  const data = useMemo(() => {
    if (!stats) return [];
    let cumulative = 0;
    return stats.daily.map((d) => {
      cumulative += d.total;
      return { day: formatDay(d.date), total: d.total, cumul: cumulative };
    });
  }, [stats]);

  if (!stats || data.length === 0) {
    return (
      <p style={{ textAlign: 'center', color: 'var(--ion-color-medium)' }}>
        Pas encore de point de données.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--ion-border-color)" />
        <XAxis dataKey="day" fontSize={10} tick={{ fill: 'var(--ion-color-medium)' }} />
        <YAxis
          fontSize={10}
          width={48}
          tick={{ fill: 'var(--ion-color-medium)' }}
          tickFormatter={(v: number) => formatMoney(v)}
        />
        <Tooltip
          formatter={(value: ValueType | undefined, name: NameType | undefined) => [
            formatMoney(toNumber(value), currency),
            name === 'cumul' ? 'Cumul' : 'Jour',
          ]}
          labelStyle={{ fontSize: 12 }}
        />
        <Line
          type="monotone"
          dataKey="cumul"
          stroke="var(--ion-color-primary)"
          strokeWidth={2}
          dot={false}
          name="Cumul"
        />
        <Line
          type="monotone"
          dataKey="total"
          stroke="var(--ion-color-warning)"
          strokeWidth={1.5}
          dot={{ r: 2 }}
          name="Jour"
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default DailyLine;