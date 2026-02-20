import { useState } from 'react';
import api from '../../lib/api';
import { formatRupiah } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { Calculator, Play, CheckCircle } from 'lucide-react';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import './SHUPage.css';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function SHUPage() {
  const { isRole } = useAuth();
  const [year, setYear] = useState(new Date().getFullYear());
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [distributing, setDistributing] = useState(false);
  const [message, setMessage] = useState('');

  const calculate = async () => {
    setLoading(true); setMessage('');
    try {
      const res = await api.get('/shu/calculate', { params: { year } });
      setPreview(res.data.data);
    } catch { setMessage('Gagal menghitung SHU'); }
    setLoading(false);
  };

  const distribute = async () => {
    if (!confirm('Distribusikan SHU tahun ' + year + '? Proses ini tidak dapat dibatalkan.')) return;
    setDistributing(true);
    try {
      await api.post('/shu/distribute', { year });
      setMessage('SHU berhasil didistribusikan!');
      setPreview(null);
    } catch (e) { setMessage(e.response?.data?.message || 'Gagal distribusi'); }
    setDistributing(false);
  };

  const alloc = preview?.allocations;
  const chartData = alloc ? {
    labels: ['Jasa Anggota', 'Cadangan', "Ma'arif", 'Pendidikan', 'Sosial', 'Pengurus'],
    datasets: [{
      data: [alloc.total_jasa_anggota, alloc.cadangan_umum, alloc.lembaga_maarif,
             alloc.dana_pendidikan, alloc.dana_sosial, alloc.dana_pengurus],
      backgroundColor: ['#0891b2','#6366f1','#f59e0b','#22c55e','#ec4899','#8b5cf6'],
      borderWidth: 0, hoverOffset: 8,
    }],
  } : null;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Sisa Hasil Usaha</h1>
          <p className="page-subtitle">Hitung dan distribusikan SHU tahunan</p>
        </div>
      </div>

      <div className="toolbar">
        <div className="flex items-center gap-md">
          <label className="form-label" style={{ margin: 0 }}>Tahun Buku:</label>
          <input type="number" className="form-input" style={{ width: 110 }} min="2020" max="2030"
            value={year} onChange={e => setYear(parseInt(e.target.value))} />
          <button className="btn btn-primary" onClick={calculate} disabled={loading}>
            <Calculator size={14} /> {loading ? 'Menghitung...' : 'Hitung SHU'}
          </button>
        </div>
      </div>

      {message && <div className={`alert ${message.includes('berhasil') ? 'alert-success' : 'alert-danger'}`}><span>{message}</span></div>}

      {preview && (
        <div className="grid grid-2 shu-grid">
          <div className="card">
            <h4 style={{ marginBottom: 'var(--space-lg)' }}>Alokasi SHU {year}</h4>
            <div className="info-rows">
              <div className="info-row"><span>Pendapatan</span><strong>{formatRupiah(preview.revenue)}</strong></div>
              <div className="info-row"><span>Beban</span><strong style={{ color: 'var(--danger)' }}>{formatRupiah(preview.expenses)}</strong></div>
              <div className="info-row report-total"><span><strong>Net SHU</strong></span><strong style={{ color: 'var(--success)', fontSize: '1.1rem' }}>{formatRupiah(preview.net_shu)}</strong></div>
            </div>
            <div className="info-rows" style={{ marginTop: 'var(--space-lg)' }}>
              <div className="info-row"><span>Jasa Anggota (40%)</span><strong>{formatRupiah(alloc.total_jasa_anggota)}</strong></div>
              <div className="info-row" style={{ paddingLeft: '1.5rem' }}><span className="text-sm">↳ Jasa Simpanan</span><span className="font-mono text-sm">{formatRupiah(alloc.jasa_simpanan)}</span></div>
              <div className="info-row" style={{ paddingLeft: '1.5rem' }}><span className="text-sm">↳ Jasa Pinjaman</span><span className="font-mono text-sm">{formatRupiah(alloc.jasa_pinjaman)}</span></div>
              <div className="info-row"><span>Cadangan Umum (20%)</span><strong>{formatRupiah(alloc.cadangan_umum)}</strong></div>
              <div className="info-row"><span>Lembaga Ma'arif (17.5%)</span><strong>{formatRupiah(alloc.lembaga_maarif)}</strong></div>
              <div className="info-row"><span>Dana Pendidikan (5%)</span><strong>{formatRupiah(alloc.dana_pendidikan)}</strong></div>
              <div className="info-row"><span>Dana Sosial (5%)</span><strong>{formatRupiah(alloc.dana_sosial)}</strong></div>
              <div className="info-row"><span>Dana Pengurus (12.5%)</span><strong>{formatRupiah(alloc.dana_pengurus)}</strong></div>
            </div>

            {isRole('ADMIN') && (
              <button className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: 'var(--space-xl)', justifyContent: 'center' }}
                onClick={distribute} disabled={distributing}>
                <CheckCircle size={16} /> {distributing ? 'Memproses...' : 'Distribusikan SHU'}
              </button>
            )}
          </div>

          <div className="card">
            <h4 style={{ marginBottom: 'var(--space-lg)' }}>Visualisasi Alokasi</h4>
            <div style={{ height: 300 }}>
              {chartData && <Doughnut data={chartData} options={{
                responsive: true, maintainAspectRatio: false,
                plugins: {
                  legend: { position: 'bottom', labels: { color: getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim(), padding: 12, usePointStyle: true } },
                  tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${formatRupiah(ctx.raw)}` } },
                },
              }} />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
