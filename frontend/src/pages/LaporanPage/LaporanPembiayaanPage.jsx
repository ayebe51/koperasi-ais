import { useState, useEffect } from 'react';
import api from '../../lib/api';
import { formatRupiah, formatNumber } from '../../lib/utils';
import { Landmark, AlertTriangle, TrendingUp, CreditCard, Users } from 'lucide-react';

export default function LaporanPembiayaanPage() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(new Date().getFullYear() + '-01-01');
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await api.get('/reports/unit-pembiayaan', { params: { start_date: startDate, end_date: endDate } });
      setReport(res.data.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchReport(); }, []);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Laporan Unit Pembiayaan</h1>
          <p className="page-subtitle">Ringkasan portfolio dan penagihan pinjaman</p>
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
              <div className="stat-icon"><Users size={20} /></div>
              <div className="stat-value">{formatNumber(report.portfolio.pinjaman_aktif)}</div>
              <div className="stat-label">Pinjaman Aktif</div>
            </div>
            <div className="stat-card purple">
              <div className="stat-icon"><Landmark size={20} /></div>
              <div className="stat-value">{formatRupiah(report.portfolio.total_outstanding)}</div>
              <div className="stat-label">Total Outstanding</div>
            </div>
            <div className="stat-card green">
              <div className="stat-icon"><CreditCard size={20} /></div>
              <div className="stat-value">{formatRupiah(report.penagihan_periode.total_diterima)}</div>
              <div className="stat-label">Penagihan Diterima</div>
            </div>
            <div className="stat-card amber">
              <div className="stat-icon"><AlertTriangle size={20} /></div>
              <div className="stat-value">{report.kualitas_kredit.npl_ratio}%</div>
              <div className="stat-label">NPL Ratio</div>
            </div>
          </div>

          <div className="grid grid-3">
            <div className="card">
              <h4 style={{ marginBottom: 'var(--space-lg)' }}>Portfolio Pinjaman</h4>
              <div className="info-rows">
                <div className="info-row"><span>Aktif</span><strong>{report.portfolio.pinjaman_aktif}</strong></div>
                <div className="info-row"><span>Lunas</span><strong>{report.portfolio.pinjaman_lunas}</strong></div>
                <div className="info-row"><span>Pending</span><strong>{report.portfolio.pinjaman_pending}</strong></div>
                <div className="info-row"><span>Plafon Aktif</span><strong>{formatRupiah(report.portfolio.total_plafon_aktif)}</strong></div>
                <div className="info-row"><span>Outstanding</span><strong>{formatRupiah(report.portfolio.total_outstanding)}</strong></div>
              </div>
            </div>

            <div className="card">
              <h4 style={{ marginBottom: 'var(--space-lg)' }}>Penagihan Periode</h4>
              <div className="info-rows">
                <div className="info-row"><span>Jumlah Bayar</span><strong>{report.penagihan_periode.jumlah_pembayaran}</strong></div>
                <div className="info-row"><span>Pokok</span><strong>{formatRupiah(report.penagihan_periode.pokok_diterima)}</strong></div>
                <div className="info-row"><span>Bunga</span><strong>{formatRupiah(report.penagihan_periode.bunga_diterima)}</strong></div>
                <div className="info-row report-total"><span><strong>Total</strong></span><strong style={{ color: 'var(--success)' }}>{formatRupiah(report.penagihan_periode.total_diterima)}</strong></div>
              </div>
            </div>

            <div className="card">
              <h4 style={{ marginBottom: 'var(--space-lg)' }}>Kualitas Kredit</h4>
              <div className="info-rows">
                <div className="info-row"><span>NPL Count</span><strong>{report.kualitas_kredit.npl_count}</strong></div>
                <div className="info-row"><span>NPL Amount</span><strong style={{ color: 'var(--danger)' }}>{formatRupiah(report.kualitas_kredit.npl_amount)}</strong></div>
                <div className="info-row"><span>NPL Ratio</span>
                  <strong className={report.kualitas_kredit.npl_ratio > 5 ? '' : ''} style={{ color: report.kualitas_kredit.npl_ratio > 5 ? 'var(--danger)' : 'var(--success)' }}>
                    {report.kualitas_kredit.npl_ratio}%
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
