import { useState, useEffect } from 'react';
import api from '../../lib/api';
import { formatRupiah } from '../../lib/utils';
import { Printer } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import './LaporanPage.css';

const REPORT_MAP = {
  'neraca': { endpoint: '/accounting/reports/balance-sheet', label: 'Neraca' },
  'laba-rugi': { endpoint: '/accounting/reports/income-statement', label: 'Laba Rugi' },
  'arus-kas': { endpoint: '/accounting/reports/cash-flow', label: 'Arus Kas' },
  'buku-besar': { endpoint: '/accounting/trial-balance', label: 'Neraca Saldo' },
};

export default function LaporanKeuanganPage() {
  const toast = useToast();
  const [reportType, setReportType] = useState('neraca');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(new Date().getFullYear() + '-01-01');
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const fetchReport = async () => {
    setLoading(true);
    setReport(null);
    try {
      const { endpoint } = REPORT_MAP[reportType];
      const params = reportType === 'neraca'
        ? { as_of_date: endDate }
        : { start_date: startDate, end_date: endDate };
      const res = await api.get(endpoint, { params });
      setReport(res.data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal memuat laporan');
    }
    setLoading(false);
  };

  useEffect(() => { fetchReport(); }, [reportType]);

  const renderSections = () => {
    if (!report?.sections) return null;
    return report.sections.map((section, i) => (
      <div key={i} className="report-section">
        <h4 className="report-section-title">{section.title}</h4>
        <div className="report-rows">
          {section.accounts?.map((acc, j) => (
            <div key={j} className="report-row">
              <div className="report-row-label">
                <span className="font-mono text-xs text-muted">{acc.code}</span>
                <span>{acc.name}</span>
              </div>
              <span className="font-mono">{formatRupiah(acc.balance)}</span>
            </div>
          ))}
          <div className="report-row report-total">
            <span><strong>Total {section.title}</strong></span>
            <strong className="font-mono">{formatRupiah(section.total)}</strong>
          </div>
        </div>
      </div>
    ));
  };

  const renderTrialBalance = () => {
    if (!report?.accounts) return null;
    return (
      <div className="report-section">
        <div className="report-rows">
          <div className="report-row report-total" style={{ marginBottom: 'var(--space-sm)' }}>
            <div className="report-row-label"><strong>Kode</strong> <strong>Nama Akun</strong></div>
            <div style={{ display: 'flex', gap: 'var(--space-xl)' }}>
              <strong className="font-mono" style={{ minWidth: 120, textAlign: 'right' }}>Debit</strong>
              <strong className="font-mono" style={{ minWidth: 120, textAlign: 'right' }}>Kredit</strong>
            </div>
          </div>
          {report.accounts.map((acc, j) => (
            <div key={j} className="report-row">
              <div className="report-row-label">
                <span className="font-mono text-xs text-muted">{acc.code}</span>
                <span>{acc.name}</span>
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-xl)' }}>
                <span className="font-mono" style={{ minWidth: 120, textAlign: 'right' }}>{acc.debit ? formatRupiah(acc.debit) : '-'}</span>
                <span className="font-mono" style={{ minWidth: 120, textAlign: 'right' }}>{acc.credit ? formatRupiah(acc.credit) : '-'}</span>
              </div>
            </div>
          ))}
          {report.totals && (
            <div className="report-row report-total">
              <span><strong>Total</strong></span>
              <div style={{ display: 'flex', gap: 'var(--space-xl)' }}>
                <strong className="font-mono" style={{ minWidth: 120, textAlign: 'right' }}>{formatRupiah(report.totals.debit)}</strong>
                <strong className="font-mono" style={{ minWidth: 120, textAlign: 'right' }}>{formatRupiah(report.totals.credit)}</strong>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Laporan Keuangan</h1>
          <p className="page-subtitle">Neraca, Laba Rugi, dan Arus Kas</p>
        </div>
        <button className="btn btn-secondary no-print" disabled={!report} onClick={() => window.print()}>
          <Printer size={16} /> Cetak
        </button>
      </div>

      {/* Report selector */}
      <div className="toolbar">
        <div className="report-tabs">
          {Object.entries(REPORT_MAP).map(([key, { label }]) => (
            <button key={key}
              className={`btn ${reportType === key ? 'btn-primary' : 'btn-ghost'} btn-sm`}
              onClick={() => setReportType(key)}>
              {label}
            </button>
          ))}
        </div>
        <div className="flex gap-sm items-center">
          <input type="date" className="form-input" style={{ width: 150 }}
            value={startDate} onChange={e => setStartDate(e.target.value)} />
          <span className="text-muted">s/d</span>
          <input type="date" className="form-input" style={{ width: 150 }}
            value={endDate} onChange={e => setEndDate(e.target.value)} />
          <button className="btn btn-primary btn-sm" onClick={fetchReport}>Tampilkan</button>
        </div>
      </div>

      {/* Report content */}
      <div className="card report-card">
        {loading ? (
          <div className="page-loading"><div className="spinner" /></div>
        ) : !report ? (
          <div className="empty-state"><p>Pilih jenis laporan dan periode, lalu klik Tampilkan</p></div>
        ) : (
          <div className="report-content">
            <div className="report-header-info">
              <h3>{report.title || REPORT_MAP[reportType].label}</h3>
              <p className="text-sm text-muted">Periode: {report.period || `${startDate} s/d ${endDate}`}</p>
            </div>
            {reportType === 'buku-besar' ? renderTrialBalance() : renderSections()}
          </div>
        )}
      </div>
    </div>
  );
}
