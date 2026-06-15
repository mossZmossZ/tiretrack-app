import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { api } from '../../services/api.js';
import { SERVICE_TYPE_MAP } from '../../utils/constants.js';
import { formatCurrency, formatNumber, formatDate } from '../../utils/formatters.js';

const THAI_MONTH_SHORT = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
const VALID_MONTH_KEY = /^\d{4}-(0[1-9]|1[0-2])$/;

const FILTERS = [
  { key: '1m', label: '1M', subtitle: '30 วันล่าสุด' },
  { key: '5m', label: '5M', subtitle: '5 เดือนล่าสุด' },
  { key: '1y', label: '1Y', subtitle: '12 เดือนล่าสุด' },
  { key: '3y', label: '3Y', subtitle: '3 ปีล่าสุด' },
];

function getChartData(filter, stats) {
  const maxYear = new Date().getFullYear() + 1;

  if (filter === '1m') {
    return Object.entries(stats.dailyRevenue || {})
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, revenue]) => {
        const [, mStr, dStr] = date.split('-');
        return {
          month: `${Number(dStr)} ${THAI_MONTH_SHORT[Number(mStr) - 1]}`,
          revenue,
          from: date,
          to: date,
        };
      });
  }

  const monthEntries = Object.entries(stats.monthlyRevenue || {})
    .filter(([m]) => {
      const year = Number(m.slice(0, 4));
      return VALID_MONTH_KEY.test(m) && year >= 2000 && year <= maxYear;
    })
    .sort((a, b) => a[0].localeCompare(b[0]));

  if (filter === '5m' || filter === '1y') {
    const count = filter === '5m' ? 5 : 12;
    return monthEntries.slice(-count).map(([month, revenue]) => {
      const [yearStr, mStr] = month.split('-');
      const year = Number(yearStr);
      const m = Number(mStr);
      const lastDay = new Date(year, m, 0).getDate();
      return {
        month: `${THAI_MONTH_SHORT[m - 1]} ${String(year + 543).slice(-2)}`,
        revenue,
        from: `${yearStr}-${mStr}-01`,
        to: `${yearStr}-${mStr}-${String(lastDay).padStart(2, '0')}`,
      };
    });
  }

  // '3y': aggregate last 36 months into quarters
  const quarterMap = new Map();
  monthEntries.slice(-36).forEach(([month, revenue]) => {
    const [yearStr, mStr] = month.split('-');
    const year = Number(yearStr);
    const m = Number(mStr);
    const q = Math.ceil(m / 3);
    const key = `${yearStr}-Q${q}`;
    if (!quarterMap.has(key)) quarterMap.set(key, { year, yearStr, q, revenue: 0 });
    quarterMap.get(key).revenue += revenue;
  });

  return [...quarterMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([, { year, yearStr, q, revenue }]) => {
      const startMonth = (q - 1) * 3 + 1;
      const endMonth = q * 3;
      const lastDay = new Date(year, endMonth, 0).getDate();
      return {
        month: `Q${q} ${String(year + 543).slice(-2)}`,
        revenue,
        from: `${yearStr}-${String(startMonth).padStart(2, '0')}-01`,
        to: `${yearStr}-${String(endMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
      };
    });
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('1y');
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [drillRecords, setDrillRecords] = useState(null);
  const [drillLoading, setDrillLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/services/stats')
      .then(res => { if (res.success) setStats(res.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!stats) {
    return <div className="text-center text-text-muted py-16">ไม่สามารถโหลดข้อมูลได้</div>;
  }

  const now = new Date();
  const currMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthKey = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;
  const prevRevenue = stats.monthlyRevenue[prevMonthKey] || 0;
  const currRevenue = stats.monthlyRevenue[currMonthKey] || 0;
  const revenueTrend = prevRevenue > 0
    ? Number(((currRevenue - prevRevenue) / prevRevenue * 100).toFixed(1))
    : null;

  const pastDaysCount = stats.week.count - stats.today.count;
  const avgPerDay = pastDaysCount / 6;
  const todayTrend = avgPerDay > 0
    ? Number(((stats.today.count - avgPerDay) / avgPerDay * 100).toFixed(1))
    : null;

  const revenueData = getChartData(filter, stats);
  const activeFilter = FILTERS.find(f => f.key === filter);

  async function handlePointClick({ from, to, label }) {
    setSelectedPoint({ label, from, to });
    setDrillRecords(null);
    setDrillLoading(true);
    try {
      const res = await api.get(`/services?from=${from}&to=${to}&limit=9999`);
      setDrillRecords(res.success ? res.data : []);
    } catch {
      setDrillRecords([]);
    } finally {
      setDrillLoading(false);
    }
  }

  function handleFilterChange(key) {
    setFilter(key);
    setSelectedPoint(null);
    setDrillRecords(null);
  }

  const displayRecords = selectedPoint && drillRecords !== null
    ? drillRecords
    : stats.recentRecords;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold">แดชบอร์ด</h2>
        <p className="text-sm text-text-secondary mt-1">ภาพรวมธุรกิจร้านยาง</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="บริการวันนี้"
          value={formatNumber(stats.today.count)}
          sub={`${stats.today.tires} เส้น`}
          trend={todayTrend}
          trendLabel="เทียบกับเฉลี่ยรายวัน"
          icon="calendar_today"
          color="#3B82F6"
        />
        <StatCard
          label="รายรับเดือนนี้"
          value={formatCurrency(stats.month.revenue)}
          sub={`ต้นทุน ${formatCurrency(stats.month.cost || 0)}`}
          trend={revenueTrend}
          trendLabel="เทียบเดือนก่อน"
          icon="payments"
          color="#F97316"
        />
        <StatCard
          label="กำไรสุทธิ"
          value={formatCurrency(stats.month.profit || 0)}
          sub="เดือนนี้"
          trend={null}
          icon="trending_up"
          color="#10B981"
        />
        <StatCard
          label="ยางเปลี่ยนเดือนนี้"
          value={formatNumber(stats.month.tires)}
          sub="เส้น"
          trend={null}
          icon="tire_repair"
          color="#8B5CF6"
        />
      </div>

      {/* Area Chart */}
      <div className="bg-white rounded-2xl p-6 border border-border-light shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-bold text-base">รายรับรายเดือน</h3>
            <p className="text-xs text-text-muted mt-0.5">{activeFilter?.subtitle}</p>
          </div>
          <div className="flex items-center gap-1">
            {FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => handleFilterChange(f.key)}
                className={
                  filter === f.key
                    ? 'bg-primary text-white rounded-lg px-3 py-1 text-xs font-semibold'
                    : 'border border-border-light text-text-secondary rounded-lg px-3 py-1 text-xs font-semibold hover:bg-surface'
                }
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        {revenueData.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart
              data={revenueData}
              margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
              style={{ cursor: 'pointer' }}
              onClick={(chartState) => {
                const idx = chartState?.activeIndex;
                if (idx != null && revenueData[idx]) {
                  const point = revenueData[idx];
                  handlePointClick({ from: point.from, to: point.to, label: point.month });
                }
              }}
            >
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F97316" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#F97316" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: '#94A3B8' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#94A3B8' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={v => `${(v / 1000).toFixed(0)}k`}
                width={40}
              />
              <Tooltip
                formatter={v => [formatCurrency(v), 'รายรับ']}
                labelFormatter={l => l}
                contentStyle={{
                  borderRadius: '12px',
                  border: 'none',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                  fontSize: '12px',
                }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#F97316"
                strokeWidth={2.5}
                fill="url(#revenueGradient)"
                isAnimationActive={true}
                dot={(props) => {
                  const isSelected = selectedPoint && props.payload.from === selectedPoint.from;
                  return (
                    <circle
                      key={props.index}
                      cx={props.cx}
                      cy={props.cy}
                      r={isSelected ? 7 : 3}
                      fill="#F97316"
                    />
                  );
                }}
                activeDot={{ r: 5, fill: '#F97316', strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-64 flex items-center justify-center text-text-muted text-sm">ยังไม่มีข้อมูล</div>
        )}
      </div>

      {/* Records Section */}
      <div className="bg-white rounded-2xl border border-border-light shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-light">
          <div>
            <h3 className="font-bold text-base">
              {selectedPoint ? `รายการ: ${selectedPoint.label}` : 'รายการล่าสุด'}
            </h3>
            {!drillLoading && (
              <p className="text-xs text-text-muted mt-0.5">
                {selectedPoint && drillRecords !== null
                  ? `${drillRecords.length} รายการ`
                  : !selectedPoint
                  ? `${stats.recentRecords.length} รายการล่าสุด`
                  : null}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {selectedPoint && !drillLoading && (
              <button
                onClick={() => handleFilterChange('1m')}
                className="border border-primary text-primary text-xs px-3 py-1.5 rounded-lg"
              >
                ← รีเซ็ต
              </button>
            )}
            {!selectedPoint && (
              <button
                onClick={() => navigate('/admin/services')}
                className="text-xs font-semibold text-primary bg-primary-50 hover:bg-primary-100 px-3 py-1.5 rounded-lg transition-colors"
              >
                ดูทั้งหมด →
              </button>
            )}
          </div>
        </div>

        {drillLoading ? (
          <SkeletonRows />
        ) : selectedPoint && drillRecords !== null && drillRecords.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <span className="material-symbols-outlined text-4xl text-text-muted">calendar_month</span>
            <p className="text-sm text-text-muted">ไม่มีรายการในช่วงเวลานี้</p>
          </div>
        ) : displayRecords.length > 0 ? (
          <RecordsTable records={displayRecords} />
        ) : (
          <p className="text-text-muted text-sm text-center py-12">ยังไม่มีรายการ</p>
        )}
      </div>
    </div>
  );
}

function SkeletonRows() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <tbody className="divide-y divide-border-light">
          {[1, 2, 3].map(i => (
            <tr key={i} className="animate-pulse">
              <td className="px-6 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-border-light" />
                  <div className="h-4 w-24 bg-border-light rounded" />
                </div>
              </td>
              <td className="px-6 py-3.5 hidden md:table-cell">
                <div className="h-4 w-20 bg-border-light rounded" />
              </td>
              <td className="px-6 py-3.5">
                <div className="h-4 w-16 bg-border-light rounded" />
              </td>
              <td className="px-6 py-3.5 hidden sm:table-cell text-center">
                <div className="h-4 w-12 bg-border-light rounded mx-auto" />
              </td>
              <td className="px-6 py-3.5 text-right">
                <div className="h-4 w-16 bg-border-light rounded ml-auto" />
              </td>
              <td className="px-6 py-3.5 hidden lg:table-cell text-center">
                <div className="h-6 w-20 bg-border-light rounded mx-auto" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RecordsTable({ records }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="bg-surface text-xs text-text-muted font-semibold uppercase tracking-wide">
            <th className="text-left px-6 py-3">ทะเบียนรถ</th>
            <th className="text-left px-6 py-3 hidden md:table-cell">จังหวัด</th>
            <th className="text-left px-6 py-3">วันที่</th>
            <th className="text-center px-6 py-3 hidden sm:table-cell">จำนวนยาง</th>
            <th className="text-right px-6 py-3">ราคา</th>
            <th className="text-center px-6 py-3 hidden lg:table-cell">ประเภท</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-light">
          {records.map(record => {
            const sType = SERVICE_TYPE_MAP[record.service_type];
            return (
              <tr key={record.id} className="hover:bg-surface/60 transition-colors">
                <td className="px-6 py-3.5">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${sType?.color || '#CBD5E1'}18` }}
                    >
                      <span
                        className="material-symbols-outlined text-[18px]"
                        style={{ color: sType?.color, fontVariationSettings: "'FILL' 1" }}
                      >
                        {sType?.icon || 'build'}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-text-primary">{record.license_plate}</span>
                  </div>
                </td>
                <td className="px-6 py-3.5 text-sm text-text-secondary hidden md:table-cell">
                  {record.province || '-'}
                </td>
                <td className="px-6 py-3.5 text-sm text-text-secondary">
                  {formatDate(record.date)}
                </td>
                <td className="px-6 py-3.5 text-sm text-center text-text-secondary hidden sm:table-cell">
                  {record.service_type === 'tire_change' && record.quantity
                    ? `${record.quantity} เส้น`
                    : '-'}
                </td>
                <td className="px-6 py-3.5 text-sm font-bold text-right text-primary">
                  {formatCurrency(record.total_price)}
                </td>
                <td className="px-6 py-3.5 text-center hidden lg:table-cell">
                  <span
                    className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
                    style={{
                      backgroundColor: `${sType?.color || '#CBD5E1'}15`,
                      color: sType?.color || '#64748B',
                    }}
                  >
                    {sType?.label || record.service_type}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function StatCard({ label, value, sub, trend, trendLabel, icon, color }) {
  const isPositive = trend !== null && Number(trend) >= 0;

  return (
    <div className="bg-white rounded-2xl p-5 border border-border-light shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-extrabold mt-2 text-text-primary truncate" style={{ fontFamily: 'Manrope' }}>
            {value}
          </p>
          <p className="text-xs text-text-secondary mt-0.5">{sub}</p>
        </div>
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${color}15` }}
        >
          <span
            className="material-symbols-outlined text-2xl"
            style={{ color, fontVariationSettings: "'FILL' 1" }}
          >
            {icon}
          </span>
        </div>
      </div>
      {trend !== null && (
        <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-border-light">
          <span
            className="material-symbols-outlined text-base"
            style={{ color: isPositive ? '#10B981' : '#EF4444' }}
          >
            {isPositive ? 'arrow_upward' : 'arrow_downward'}
          </span>
          <span className="text-xs font-bold" style={{ color: isPositive ? '#10B981' : '#EF4444' }}>
            {isPositive ? '+' : ''}{trend}%
          </span>
          <span className="text-xs text-text-muted">{trendLabel}</span>
        </div>
      )}
    </div>
  );
}
