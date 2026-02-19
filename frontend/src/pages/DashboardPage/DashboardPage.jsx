import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { formatRupiah, formatNumber, formatDate } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import {
  Users, Wallet, Landmark, Store, TrendingUp, TrendingDown,
  ArrowUpRight, DollarSign, ShoppingCart, AlertTriangle, Clock, Bell, Plus
} from 'lucide-react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  ArcElement, PointElement, LineElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import Skeleton from '../../components/Skeleton/Skeleton';
import './DashboardPage.css';

ChartJS.register(
  CategoryScale, LinearScale, BarElement, ArcElement,
  PointElement, LineElement, Title, Tooltip, Legend, Filler
);

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/stats')
      .then(res => setStats(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="page dashboard-page">
      <div className="page-header"><div><div className="skeleton skeleton-title" /><div className="skeleton skeleton-text" style={{ width: '50%' }} /></div></div>
      <div className="grid grid-4 dashboard-stats">
        <Skeleton variant="stat" /><Skeleton variant="stat" /><Skeleton variant="stat" /><Skeleton variant="stat" />
      </div>
    </div>
  );
  if (!stats) return <div className="page-loading"><p>Gagal memuat data</p></div>;

  const savingsData = {
    labels: ['Pokok', 'Wajib', 'Sukarela'],
    datasets: [{
      data: [stats.simpanan.pokok, stats.simpanan.wajib, stats.simpanan.sukarela],
      backgroundColor: ['#0891b2', '#6366f1', '#22c55e'],
      borderWidth: 0,
      hoverOffset: 6,
    }],
  };

  const savingsOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { color: '#94a3b8', padding: 16, usePointStyle: true, pointStyleWidth: 10 } },
      tooltip: {
        callbacks: { label: (ctx) => ` ${ctx.label}: ${formatRupiah(ctx.raw)}` },
        backgroundColor: '#1e293b', borderColor: '#334155', borderWidth: 1,
      },
    },
  };

  const overviewData = {
    labels: ['Simpanan', 'Pinjaman', 'Toko'],
    datasets: [{
      label: 'Nominal (Rp)',
      data: [stats.simpanan.total, stats.pinjaman.outstanding, stats.toko.penjualan_bulan_ini],
      backgroundColor: ['rgba(8,145,178,0.7)', 'rgba(99,102,241,0.7)', 'rgba(34,197,94,0.7)'],
      borderRadius: 8,
      borderSkipped: false,
    }],
  };

  const overviewOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: { label: (ctx) => formatRupiah(ctx.raw) },
        backgroundColor: '#1e293b', borderColor: '#334155', borderWidth: 1,
      },
    },
    scales: {
      x: { ticks: { color: '#64748b' }, grid: { display: false } },
      y: { ticks: { color: '#64748b', callback: (v) => formatRupiah(v) }, grid: { color: 'rgba(148,163,184,0.08)' } },
    },
  };

  return (
    <div className="page dashboard-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            Selamat datang, <strong>{user?.name}</strong> — {stats.periode.bulan}
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-4 dashboard-actions">
        <button className="action-card" onClick={() => navigate('/anggota')}>
          <div className="action-icon" style={{ background: 'rgba(8,145,178,0.15)', color: '#0891b2' }}><Users size={20} /></div>
          <span>Tambah Anggota</span>
        </button>
        <button className="action-card" onClick={() => navigate('/simpanan')}>
          <div className="action-icon" style={{ background: 'rgba(99,102,241,0.15)', color: '#6366f1' }}><Wallet size={20} /></div>
          <span>Setor Simpanan</span>
        </button>
        <button className="action-card" onClick={() => navigate('/pinjaman')}>
          <div className="action-icon" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}><Landmark size={20} /></div>
          <span>Ajukan Pinjaman</span>
        </button>
        <button className="action-card" onClick={() => navigate('/toko/penjualan')}>
          <div className="action-icon" style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e' }}><ShoppingCart size={20} /></div>
          <span>Transaksi Toko</span>
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-4 dashboard-stats">
        <div className="stat-card teal">
          <div className="stat-icon"><Users size={22} /></div>
          <div className="stat-value">{formatNumber(stats.anggota.aktif)}</div>
          <div className="stat-label">Anggota Aktif</div>
          {stats.anggota.baru_bulan_ini > 0 && (
            <div className="stat-trend up">
              <ArrowUpRight size={14} /> +{stats.anggota.baru_bulan_ini} bulan ini
            </div>
          )}
        </div>

        <div className="stat-card purple">
          <div className="stat-icon"><Wallet size={22} /></div>
          <div className="stat-value">{formatRupiah(stats.simpanan.total)}</div>
          <div className="stat-label">Total Simpanan</div>
        </div>

        <div className="stat-card amber">
          <div className="stat-icon"><Landmark size={22} /></div>
          <div className="stat-value">{formatRupiah(stats.pinjaman.outstanding)}</div>
          <div className="stat-label">Outstanding Pinjaman</div>
          <div className="stat-badges">
            {stats.pinjaman.pending > 0 && (
              <span className="stat-trend warn">
                <AlertTriangle size={14} /> {stats.pinjaman.pending} pending
              </span>
            )}
            {stats.angsuran?.overdue_count > 0 && (
              <span className="stat-trend warn" title="NPL — angsuran lewat jatuh tempo">
                <TrendingDown size={14} /> NPL: {stats.angsuran.overdue_count}
              </span>
            )}
          </div>
        </div>

        <div className="stat-card green">
          <div className="stat-icon"><Store size={22} /></div>
          <div className="stat-value">{formatRupiah(stats.toko.penjualan_bulan_ini)}</div>
          <div className="stat-label">Penjualan Bulan Ini</div>
          {stats.toko.stok_rendah > 0 && (
            <div className="stat-trend warn">
              <AlertTriangle size={14} /> {stats.toko.stok_rendah} stok rendah
            </div>
          )}
        </div>
      </div>

      {/* Overdue/Upcoming Alerts */}
      {stats.angsuran && (stats.angsuran.overdue_count > 0 || stats.angsuran.upcoming_count > 0) && (
        <div className="card" style={{ marginTop: 'var(--space-lg)', borderLeft: '4px solid var(--danger)' }}>
          <div className="flex items-center gap-md" style={{ marginBottom: 'var(--space-md)' }}>
            <Bell size={18} style={{ color: 'var(--danger)' }} />
            <h4>Angsuran Perlu Perhatian</h4>
          </div>
          {stats.angsuran.overdue_count > 0 && (
            <div style={{ marginBottom: 'var(--space-md)' }}>
              <p className="text-sm" style={{ color: 'var(--danger)', fontWeight: 600, marginBottom: 'var(--space-sm)' }}>
                ⚠ {stats.angsuran.overdue_count} angsuran lewat jatuh tempo
              </p>
              <div className="table-container">
                <table className="data-table">
                  <thead><tr><th>Anggota</th><th>No. Pinjaman</th><th>Ke-</th><th>Jatuh Tempo</th><th className="text-right">Jumlah</th><th>Terlambat</th></tr></thead>
                  <tbody>
                    {stats.angsuran.overdue.map(s => (
                      <tr key={s.id}>
                        <td><strong>{s.member_name}</strong></td>
                        <td className="font-mono text-sm">{s.loan_number}</td>
                        <td>{s.installment_number}</td>
                        <td className="text-sm">{formatDate(s.due_date)}</td>
                        <td className="text-right font-mono">{formatRupiah(s.total_amount)}</td>
                        <td><span className="badge badge-danger">{s.days_overdue} hari</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {stats.angsuran.upcoming_count > 0 && (
            <div>
              <p className="text-sm" style={{ color: 'var(--warning)', fontWeight: 600, marginBottom: 'var(--space-sm)' }}>
                <Clock size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> {stats.angsuran.upcoming_count} angsuran jatuh tempo 7 hari ke depan
              </p>
              <div className="table-container">
                <table className="data-table">
                  <thead><tr><th>Anggota</th><th>No. Pinjaman</th><th>Ke-</th><th>Jatuh Tempo</th><th className="text-right">Jumlah</th></tr></thead>
                  <tbody>
                    {stats.angsuran.upcoming.map(s => (
                      <tr key={s.id}>
                        <td><strong>{s.member_name}</strong></td>
                        <td className="font-mono text-sm">{s.loan_number}</td>
                        <td>{s.installment_number}</td>
                        <td className="text-sm">{formatDate(s.due_date)}</td>
                        <td className="text-right font-mono">{formatRupiah(s.total_amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-2 dashboard-charts">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Komposisi Simpanan</h3>
          </div>
          <div className="chart-container donut">
            <Doughnut data={savingsData} options={savingsOptions} />
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Ringkasan Keuangan</h3>
          </div>
          <div className="chart-container bar">
            <Bar data={overviewData} options={overviewOptions} />
          </div>
        </div>
      </div>

      {/* Quick Info Cards */}
      <div className="grid grid-3 dashboard-info">
        <div className="card info-card">
          <div className="flex items-center gap-md" style={{marginBottom: 'var(--space-md)'}}>
            <DollarSign size={18} className="text-muted" />
            <h4>Detail Simpanan</h4>
          </div>
          <div className="info-rows">
            <div className="info-row"><span>Simpanan Pokok</span><strong>{formatRupiah(stats.simpanan.pokok)}</strong></div>
            <div className="info-row"><span>Simpanan Wajib</span><strong>{formatRupiah(stats.simpanan.wajib)}</strong></div>
            <div className="info-row"><span>Simpanan Sukarela</span><strong>{formatRupiah(stats.simpanan.sukarela)}</strong></div>
          </div>
        </div>

        <div className="card info-card">
          <div className="flex items-center gap-md" style={{marginBottom: 'var(--space-md)'}}>
            <Landmark size={18} className="text-muted" />
            <h4>Detail Pinjaman</h4>
          </div>
          <div className="info-rows">
            <div className="info-row"><span>Aktif</span><strong>{stats.pinjaman.aktif} pinjaman</strong></div>
            <div className="info-row"><span>Pending</span><strong>{stats.pinjaman.pending} pengajuan</strong></div>
            <div className="info-row"><span>Outstanding</span><strong>{formatRupiah(stats.pinjaman.outstanding)}</strong></div>
          </div>
        </div>

        <div className="card info-card">
          <div className="flex items-center gap-md" style={{marginBottom: 'var(--space-md)'}}>
            <ShoppingCart size={18} className="text-muted" />
            <h4>Detail Toko</h4>
          </div>
          <div className="info-rows">
            <div className="info-row"><span>Total Produk</span><strong>{stats.toko.total_produk}</strong></div>
            <div className="info-row"><span>Stok Rendah</span><strong className="text-warning">{stats.toko.stok_rendah}</strong></div>
            <div className="info-row"><span>Penjualan Bulan Ini</span><strong>{formatRupiah(stats.toko.penjualan_bulan_ini)}</strong></div>
          </div>
        </div>
      </div>
    </div>
  );
}
