import { useState, useEffect } from 'react';
import api from '../../lib/api';
import { formatRupiah, formatNumber } from '../../lib/utils';
import { BarChart3, TrendingUp, Package, DollarSign, ShoppingCart, Download, Printer } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { exportToCSV } from '../../lib/exportUtils';
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

  const handleExportExcel = () => {
    if (!report) return;

    let data = [];
    const filename = `Laporan_Unit_Toko_${endDate}`;

    // Sales Summary
    data.push({ Kategori: 'Ringkasan Penjualan', Metrik: '', Nilai: '' });
    data.push({ Kategori: '', Metrik: 'Jumlah Transaksi', Nilai: report.penjualan.jumlah_transaksi });
    data.push({ Kategori: '', Metrik: 'Total Penjualan (Rp)', Nilai: report.penjualan.total_penjualan });
    data.push({ Kategori: '', Metrik: 'Total Diskon (Rp)', Nilai: report.penjualan.total_diskon });
    data.push({ Kategori: '', Metrik: 'HPP (Rp)', Nilai: report.penjualan.total_hpp });
    data.push({ Kategori: '', Metrik: 'Laba Kotor (Rp)', Nilai: report.penjualan.laba_kotor });
    data.push({ Kategori: '', Metrik: 'Margin Profit (%)', Nilai: report.penjualan.margin_persen });
    data.push({ Kategori: '', Metrik: '', Nilai: '' });

    // Stock Summary
    data.push({ Kategori: 'Ringkasan Persediaan', Metrik: '', Nilai: '' });
    data.push({ Kategori: '', Metrik: 'Total Produk Aktif', Nilai: report.persediaan.total_produk_aktif });
    data.push({ Kategori: '', Metrik: 'Nilai Persediaan (Rp)', Nilai: report.persediaan.nilai_persediaan });
    data.push({ Kategori: '', Metrik: '', Nilai: '' });

    // Stock Details Table
    if (report.persediaan.rincian?.length > 0) {
      data.push({ Kategori: '--- RINCIAN PERGERAKAN STOK ---', Metrik: '', Nilai: '' });
      report.persediaan.rincian.forEach((stok) => {
        data.push({
          Kategori: stok.code,
          Metrik: stok.name,
          Nilai: `Stok Tersisa: ${stok.stock} ${stok.unit} | Harga Jual: Rp ${stok.sell_price.toLocaleString('id-ID')} | HPP: Rp ${stok.average_cost.toLocaleString('id-ID')} | Total Nilai Aset: Rp ${stok.total_value.toLocaleString('id-ID')}`
        });
      });
    }

    exportToCSV(data, filename);
  };

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
        <div className="flex gap-sm">
          <button className="btn btn-outline btn-sm no-print" disabled={!report} onClick={handleExportExcel}>
            <Download size={16} /> Excel
          </button>
          <button className="btn btn-secondary btn-sm no-print" disabled={!report} onClick={() => window.print()}>
            <Printer size={16} /> Cetak
          </button>
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

          {report.persediaan.rincian?.length > 0 && (
            <div className="card" style={{ marginTop: 'var(--space-lg)' }}>
              <h4 style={{ marginBottom: 'var(--space-md)' }}>Rincian Pergerakan Stok</h4>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Kode</th>
                      <th>Nama Barang</th>
                      <th className="text-right">Sisa Stok</th>
                      <th className="text-right">Harga Pokok (HPP)</th>
                      <th className="text-right">Harga Jual</th>
                      <th className="text-right">Total Nilai Aset (Rp)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.persediaan.rincian.map(stok => (
                      <tr key={stok.code}>
                        <td><span className="font-mono">{stok.code}</span></td>
                        <td><strong>{stok.name}</strong></td>
                        <td className="text-right">
                          <span className={`badge badge-${stok.stock > 10 ? 'success' : stok.stock > 0 ? 'warning' : 'danger'}`}>
                            {formatNumber(stok.stock)} {stok.unit}
                          </span>
                        </td>
                        <td className="text-right font-mono text-muted">{formatRupiah(stok.average_cost)}</td>
                        <td className="text-right font-mono" style={{ color: 'var(--primary-600)' }}>{formatRupiah(stok.sell_price)}</td>
                        <td className="text-right font-mono"><strong>{formatRupiah(stok.total_value)}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
