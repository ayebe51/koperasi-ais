import { useState, useEffect } from 'react';
import api from '../../lib/api';
import { formatRupiah, formatNumber } from '../../lib/utils';
import { Landmark, AlertTriangle, TrendingUp, CreditCard, Users, Download, Printer } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { exportToCSV } from '../../lib/exportUtils';

export default function LaporanPembiayaanPage() {
  const toast = useToast();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(new Date().getFullYear() + '-01-01');
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await api.get('/reports/unit-pembiayaan', { params: { start_date: startDate, end_date: endDate } });
      setReport(res.data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal memuat laporan pembiayaan');
    }
    setLoading(false);
  };

  useEffect(() => { fetchReport(); }, []);

  const handleExportExcel = () => {
    if (!report) return;

    let data = [];
    const filename = `Laporan_Unit_Pembiayaan_${endDate}`;

    // Portfolio Summary
    data.push({ Kategori: 'Portfolio Pinjaman', Metrik: '', Nilai: '' });
    data.push({ Kategori: '', Metrik: 'Pinjaman Aktif', Nilai: report.portfolio.pinjaman_aktif });
    data.push({ Kategori: '', Metrik: 'Pinjaman Lunas', Nilai: report.portfolio.pinjaman_lunas });
    data.push({ Kategori: '', Metrik: 'Plafon Aktif (Rp)', Nilai: report.portfolio.total_plafon_aktif });
    data.push({ Kategori: '', Metrik: 'Total Outstanding (Rp)', Nilai: report.portfolio.total_outstanding });
    data.push({ Kategori: '', Metrik: '', Nilai: '' });

    // Collection Summary
    data.push({ Kategori: 'Penagihan Periode', Metrik: '', Nilai: '' });
    data.push({ Kategori: '', Metrik: 'Jumlah Pembayaran', Nilai: report.penagihan_periode.jumlah_pembayaran });
    data.push({ Kategori: '', Metrik: 'Pokok Diterima (Rp)', Nilai: report.penagihan_periode.pokok_diterima });
    data.push({ Kategori: '', Metrik: 'Bunga Diterima (Rp)', Nilai: report.penagihan_periode.bunga_diterima });
    data.push({ Kategori: '', Metrik: 'Total Diterima (Rp)', Nilai: report.penagihan_periode.total_diterima });
    data.push({ Kategori: '', Metrik: '', Nilai: '' });

    // NPL summary
    data.push({ Kategori: 'Kualitas Kredit', Metrik: '', Nilai: '' });
    data.push({ Kategori: '', Metrik: 'NPL Count', Nilai: report.kualitas_kredit.npl_count });
    data.push({ Kategori: '', Metrik: 'NPL Amount (Rp)', Nilai: report.kualitas_kredit.npl_amount });
    data.push({ Kategori: '', Metrik: 'NPL Ratio (%)', Nilai: report.kualitas_kredit.npl_ratio });
    data.push({ Kategori: '', Metrik: '', Nilai: '' });

    // NPL Details Table
    if (report.kualitas_kredit.rincian?.length > 0) {
      data.push({ Kategori: '--- RINCIAN KREDIT BERMASALAH (NPL) ---', Metrik: '', Nilai: '' });
      report.kualitas_kredit.rincian.forEach(npl => {
        data.push({
          Kategori: npl.loan_number,
          Metrik: `${npl.member_name} (${npl.member_number})`,
          Nilai: `Sisa: Rp ${npl.outstanding.toLocaleString('id-ID')} | Status: ${npl.collectibility}`
        });
      });
    }

    exportToCSV(data, filename);
  };

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

          {report.kualitas_kredit.rincian?.length > 0 && (
            <div className="card" style={{ marginTop: 'var(--space-lg)' }}>
              <h4 style={{ marginBottom: 'var(--space-md)' }}>Rincian Kredit Bermasalah (NPL)</h4>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>No. Pinjaman</th>
                      <th>Nama Anggota</th>
                      <th className="text-right">Sisa Hutang (Rp)</th>
                      <th>Status Kolektibilitas</th>
                      <th>Keterlambatan (Hari)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.kualitas_kredit.rincian.map(npl => (
                      <tr key={npl.loan_number}>
                        <td><span className="font-mono">{npl.loan_number}</span></td>
                        <td>
                          <strong>{npl.member_name}</strong><br />
                          <small className="text-muted">{npl.member_number}</small>
                        </td>
                        <td className="text-right font-mono" style={{ color: 'var(--danger)' }}>
                          {formatRupiah(npl.outstanding)}
                        </td>
                        <td><span className="badge badge-danger">{npl.collectibility}</span></td>
                        <td>{npl.overdue_days} Hari</td>
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
