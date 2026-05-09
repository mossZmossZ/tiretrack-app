import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { api } from '../../services/api.js';
import { SERVICE_TYPE_MAP, TIRE_BRANDS } from '../../utils/constants.js';
import { formatCurrency, formatNumber, formatDate } from '../../utils/formatters.js';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/services/stats')
      .then(res => { if (res.success) setStats(res.data); })
      .catch(() => { })
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

  // Revenue trend: current month vs previous month
  const now = new Date();
  const currMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthKey = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;
  const prevRevenue = stats.monthlyRevenue[prevMonthKey] || 0;
  const currRevenue = stats.monthlyRevenue[currMonthKey] || 0;
  const revenueTrend = prevRevenue > 0
    ? Number(((currRevenue - prevRevenue) / prevRevenue * 100).toFixed(1))
    : null;

  // Today trend: compare today vs daily avg of past week
  const pastDaysCount = stats.week.count - stats.today.count;
  const avgPerDay = pastDaysCount / 6;
  const todayTrend = avgPerDay > 0
    ? Number(((stats.today.count - avgPerDay) / avgPerDay * 100).toFixed(1))
    : null;

  // Revenue chart — last 12 months
  const revenueData = Object.entries(stats.monthlyRevenue)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-12)
    .map(([month, revenue]) => ({ month: month.slice(2), revenue }));

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
            <p className="text-xs text-text-muted mt-0.5">12 เดือนล่าสุด</p>
          </div>
          <span className="text-xs text-text-secondary bg-surface px-3 py-1.5 rounded-lg border border-border-light font-medium">
            {new Date().toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}
          </span>
        </div>
        {revenueData.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={revenueData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
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
                labelFormatter={l => `เดือน ${l}`}
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
                dot={{ fill: '#F97316', r: 3, strokeWidth: 0 }}
                activeDot={{ r: 5, fill: '#F97316', strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-64 flex items-center justify-center text-text-muted text-sm">ยังไม่มีข้อมูล</div>
        )}
      </div>

      {/* Recent Records Table */}
      <div className="bg-white rounded-2xl border border-border-light shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-light">
          <div>
            <h3 className="font-bold text-base">รายการล่าสุด</h3>
            <p className="text-xs text-text-muted mt-0.5">{stats.recentRecords.length} รายการล่าสุด</p>
          </div>
          <button
            onClick={() => navigate('/admin/services')}
            className="text-xs font-semibold text-primary bg-primary-50 hover:bg-primary-100 px-3 py-1.5 rounded-lg transition-colors"
          >
            ดูทั้งหมด →
          </button>
        </div>
        {stats.recentRecords.length > 0 ? (
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
                {stats.recentRecords.map(record => {
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
        ) : (
          <p className="text-text-muted text-sm text-center py-12">ยังไม่มีรายการ</p>
        )}
      </div>
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
