import { useState, useEffect } from 'react';
import api from '../../lib/api';
import { formatRupiah, formatNumber } from '../../lib/utils';
import { BarChart3, TrendingUp, Package, DollarSign, ShoppingCart } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export default function LaporanTokoPage() {
  const toast = useToast();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 7) + '-01');
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await api.get('/reports/unit-toko', { params: { start_date: startDate, end_date: endDate } });
      setReport(res.data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal memuat laporan toko');
    }
    setLoading(false);
  };

  useEffect(() => { fetchReport(); }, []);

  const topChart = report?.produk_terlaris ? {
    labels: report.produk_terlaris.map(p => p.product),
    datasets: [{
      label: 'Pendapatan (Rp)',
      data: report.produk_terlaris.map(p => p.revenue),
      backgroundColor: 'rgba(8,145,178,0.7)',
      borderRadius: 6, borderSkipped: false,
    }],
  } : null;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Laporan Unit Toko</h1>
          <p className="page-subtitle">Ringkasan performa unit usaha toko</p>
        </div>
      </div>

      <div className="toolbar">
        <div className="flex gap-sm items-center">
          <input type="date" className="form-input" style={{ width: 150 }}
            value={startDate} onChange={e => setStartDate(e.target.value)} />
          <span className="text-muted">s/d</span>
          <input type="date" className="form-input" style={{ width: 150 }}
            value={endDate} onChange={e => setEndDate(e.target.value)} />
          <button className="btn btn-primary btn-sm" onClick={fetchReport}>Tampilkan</button>
        </div>
      </div>

      {loading ? <div className="page-loading"><div className="spinner" /></div> : report && (
        <>
          <div className="grid grid-4" style={{ marginBottom: 'var(--space-lg)' }}>
            <div className="stat-card teal">
              <div className="stat-icon"><ShoppingCart size={20} /></div>
              <div className="stat-value">{formatNumber(report.penjualan.jumlah_transaksi)}</div>
              <div className="stat-label">Transaksi</div>
            </div>
            <div className="stat-card purple">
              <div className="stat-icon"><DollarSign size={20} /></div>
              <div className="stat-value">{formatRupiah(report.penjualan.total_penjualan)}</div>
              <div className="stat-label">Total Penjualan</div>
            </div>
            <div className="stat-card green">
              <div className="stat-icon"><TrendingUp size={20} /></div>
              <div className="stat-value">{formatRupiah(report.penjualan.laba_kotor)}</div>
              <div className="stat-label">Laba Kotor</div>
            </div>
            <div className="stat-card amber">
              <div className="stat-icon"><Package size={20} /></div>
              <div className="stat-value">{formatRupiah(report.persediaan.nilai_persediaan)}</div>
              <div className="stat-label">Nilai Persediaan</div>
            </div>
          </div>

          <div className="grid grid-2">
            <div className="card">
              <h4 style={{ marginBottom: 'var(--space-lg)' }}>Produk Terlaris</h4>
              {topChart && <div style={{ height: 280 }}>
                <Bar data={topChart} options={{
                  responsive: true, maintainAspectRatio: false, indexAxis: 'y',
                  plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => formatRupiah(ctx.raw) } } },
                  scales: { x: { ticks: { color: '#64748b', callback: v => formatRupiah(v) }, grid: { color: 'rgba(148,163,184,0.08)' } },
                    y: { ticks: { color: '#94a3b8' }, grid: { display: false } } },
                }} />
              </div>}
            </div>

            <div className="card">
              <h4 style={{ marginBottom: 'var(--space-lg)' }}>Detail Penjualan</h4>
              <div className="info-rows">
                <div className="info-row"><span>Total Penjualan</span><strong>{formatRupiah(report.penjualan.total_penjualan)}</strong></div>
                <div className="info-row"><span>Total Diskon</span><strong>{formatRupiah(report.penjualan.total_diskon)}</strong></div>
                <div className="info-row"><span>HPP</span><strong>{formatRupiah(report.penjualan.total_hpp)}</strong></div>
                <div className="info-row"><span>Laba Kotor</span><strong style={{ color: 'var(--success)' }}>{formatRupiah(report.penjualan.laba_kotor)}</strong></div>
                <div className="info-row"><span>Margin</span><strong style={{ color: 'var(--primary-400)' }}>{report.penjualan.margin_persen}%</strong></div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
