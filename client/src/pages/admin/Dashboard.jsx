import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from 'recharts';
import { api } from '../../services/api.js';
import { SERVICE_TYPE_MAP, TIRE_BRANDS } from '../../utils/constants.js';
import { formatCurrency, formatNumber, formatDate } from '../../utils/formatters.js';

const COLORS = ['#F97316', '#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EC4899'];

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/services/stats')
      .then(res => {
        if (res.success) setStats(res.data);
      })
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

  // Prepare chart data
  const serviceData = Object.entries(stats.serviceBreakdown).map(([key, value]) => ({
    name: SERVICE_TYPE_MAP[key]?.label || key,
    value,
    color: SERVICE_TYPE_MAP[key]?.color || '#CBD5E1',
  }));

  const brandData = Object.entries(stats.brandCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([key, value]) => ({
      name: TIRE_BRANDS.find(b => b.code === key)?.label || key,
      count: value,
    }));

  const revenueData = Object.entries(stats.monthlyRevenue)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-12)
    .map(([month, revenue]) => ({
      month: month.slice(2), // YY-MM
      revenue,
    }));

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold" style={{ fontFamily: 'Manrope' }}>แดชบอร์ด</h2>
        <p className="text-sm text-text-secondary mt-1">ภาพรวมธุรกิจร้านยาง</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          icon="calendar_month"
          label="บริการเดือนนี้"
          value={`${stats.month.count} รายการ`}
          sub={`ยาง ${stats.month.tires} เส้น`}
          color="#3B82F6"
        />
        <StatCard
          icon="payments"
          label="รายรับรวม (เดือนนี้)"
          value={formatCurrency(stats.month.revenue)}
          sub={`ต้นทุน: ${formatCurrency(stats.month.cost || 0)}`}
          color="#8B5CF6"
        />
        <StatCard
          icon="account_balance"
          label="กำไรสุทธิ (เดือนนี้)"
          value={formatCurrency(stats.month.profit || 0)}
          sub={`ยอดรวมกำไรทั้งหมด`}
          color="#10B981"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="bg-white rounded-2xl p-6 border border-border-light shadow-sm">
          <h3 className="font-bold text-sm mb-4" style={{ fontFamily: 'Manrope' }}>รายได้รายเดือน</h3>
          {revenueData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#94A3B8" />
                <YAxis tick={{ fontSize: 11 }} stroke="#94A3B8" tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => formatCurrency(v)} labelFormatter={(l) => `เดือน ${l}`} />
                <Line type="monotone" dataKey="revenue" stroke="#F97316" strokeWidth={2.5} dot={{ fill: '#F97316', r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-60 flex items-center justify-center text-text-muted text-sm">ยังไม่มีข้อมูล</div>
          )}
        </div>

        {/* Service Type Breakdown */}
        <div className="bg-white rounded-2xl p-6 border border-border-light shadow-sm">
          <h3 className="font-bold text-sm mb-4" style={{ fontFamily: 'Manrope' }}>ประเภทบริการ</h3>
          {serviceData.length > 0 ? (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Tooltip />
                  <Pie
                    data={serviceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    dataKey="value"
                    stroke="none"
                    onClick={(entry) => {
                      const typeMapEntry = Object.entries(SERVICE_TYPE_MAP).find(([k, v]) => v.label === entry.name);
                      if (typeMapEntry) navigate(`/admin/services?type=${typeMapEntry[0]}`);
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    {serviceData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 flex-1">
                {serviceData.map((entry, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                    <span className="text-text-secondary flex-1">{entry.name}</span>
                    <span className="font-semibold">{entry.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-40 flex items-center justify-center text-text-muted text-sm">ยังไม่มีข้อมูล</div>
          )}
        </div>
      </div>

      {/* Brand Rankings */}
      {brandData.length > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-border-light shadow-sm">
          <h3 className="font-bold text-sm mb-4" style={{ fontFamily: 'Manrope' }}>ยี่ห้อยางยอดนิยม</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={brandData} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 11 }} stroke="#94A3B8" />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke="#94A3B8" width={80} />
              <Tooltip />
              <Bar dataKey="count" fill="#F97316" radius={[0, 6, 6, 0]} barSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent Activity */}
      <div className="bg-white rounded-2xl p-6 border border-border-light shadow-sm">
        <h3 className="font-bold text-sm mb-4" style={{ fontFamily: 'Manrope' }}>กิจกรรมล่าสุด</h3>
        {stats.recentRecords.length > 0 ? (
          <div className="space-y-3">
            {stats.recentRecords.map(record => {
              const sType = SERVICE_TYPE_MAP[record.service_type];
              return (
                <div key={record.id} className="flex items-center gap-3 py-2">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${sType?.color || '#CBD5E1'}15` }}>
                    <span className="material-symbols-outlined text-lg" style={{ color: sType?.color, fontVariationSettings: "'FILL' 1" }}>
                      {sType?.icon || 'build'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{record.license_plate}</span>
                      <span className="text-xs text-text-muted">{sType?.label}</span>
                    </div>
                    <span className="text-xs text-text-muted">{formatDate(record.date)}</span>
                  </div>
                  <span className="text-sm font-semibold text-primary">{formatCurrency(record.total_price)}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-text-muted text-sm text-center py-8">ยังไม่มีรายการ</p>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub, color }) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-border-light shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
          <span className="material-symbols-outlined text-xl" style={{ color }}>{icon}</span>
        </div>
      </div>
      <p className="text-2xl font-bold" style={{ fontFamily: 'Manrope' }}>{value}</p>
      <p className="text-xs text-text-muted mt-0.5">{label}</p>
      <p className="text-xs text-text-secondary mt-1 font-medium">{sub}</p>
    </div>
  );
}
