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
      // balance-sheet & trial-balance use as_of_date; income-statement & cash-flow use start_date + end_date
      let params;
      if (reportType === 'neraca' || reportType === 'buku-besar') {
        params = { as_of_date: endDate };
      } else {
        params = { start_date: startDate, end_date: endDate };
      }
      const res = await api.get(endpoint, { params });
      setReport(res.data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal memuat laporan');
    }
    setLoading(false);
  };

  useEffect(() => { fetchReport(); }, [reportType]);

  /* ──────────── Account list helper ──────────── */
  const renderAccountRows = (accounts) => {
    if (!accounts || accounts.length === 0) return <p className="text-muted text-sm">Tidak ada data</p>;
    return accounts.map((acc, j) => (
      <div key={j} className="report-row">
        <div className="report-row-label">
          <span className="font-mono text-xs text-muted">{acc.code}</span>
          <span>{acc.name}</span>
        </div>
        <span className="font-mono">{formatRupiah(acc.balance)}</span>
      </div>
    ));
  };

  /* ──────────── NERACA (Balance Sheet) ──────────── */
  const renderNeraca = () => {
    if (!report) return null;
    const sections = [
      { title: 'Aset', data: report.assets },
      { title: 'Kewajiban', data: report.liabilities },
      { title: 'Ekuitas', data: report.equity },
    ];
    return (
      <>
        {sections.map((section, i) => (
          <div key={i} className="report-section">
            <h4 className="report-section-title">{section.title}</h4>
            <div className="report-rows">
              {renderAccountRows(section.data?.accounts)}
              <div className="report-row report-total">
                <span><strong>Total {section.title}</strong></span>
                <strong className="font-mono">{formatRupiah(section.data?.total || 0)}</strong>
              </div>
            </div>
          </div>
        ))}
        <div className="report-section">
          <div className="report-rows">
            <div className="report-row report-total" style={{ borderTop: '2px solid var(--primary)' }}>
              <span><strong>Total Kewajiban + Ekuitas</strong></span>
              <strong className="font-mono">{formatRupiah(report.total_liabilities_equity || 0)}</strong>
            </div>
            <div className="report-row">
              <span className="text-sm text-muted">Balance: {report.is_balanced ? '✅ Seimbang' : '⚠️ Tidak seimbang'}</span>
            </div>
          </div>
        </div>
      </>
    );
  };

  /* ──────────── LABA RUGI (Income Statement) ──────────── */
  const renderLabaRugi = () => {
    if (!report) return null;
    return (
      <>
        <div className="report-section">
          <h4 className="report-section-title">Pendapatan</h4>
          <div className="report-rows">
            {renderAccountRows(report.revenue?.accounts)}
            <div className="report-row report-total">
              <span><strong>Total Pendapatan</strong></span>
              <strong className="font-mono">{formatRupiah(report.revenue?.total || 0)}</strong>
            </div>
          </div>
        </div>
        <div className="report-section">
          <h4 className="report-section-title">Beban</h4>
          <div className="report-rows">
            {renderAccountRows(report.expenses?.accounts)}
            <div className="report-row report-total">
              <span><strong>Total Beban</strong></span>
              <strong className="font-mono">{formatRupiah(report.expenses?.total || 0)}</strong>
            </div>
          </div>
        </div>
        <div className="report-section">
          <div className="report-rows">
            <div className="report-row report-total" style={{ borderTop: '2px solid var(--primary)' }}>
              <span><strong>Sisa Hasil Usaha (SHU)</strong></span>
              <strong className="font-mono" style={{ color: (report.net_shu || 0) >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                {formatRupiah(report.net_shu || 0)}
              </strong>
            </div>
          </div>
        </div>
      </>
    );
  };

  /* ──────────── ARUS KAS (Cash Flow) ──────────── */
  const renderArusKas = () => {
    if (!report) return null;
    return (
      <div className="report-section">
        <div className="report-rows">
          <div className="report-row">
            <span>Penerimaan Kas (Inflow)</span>
            <span className="font-mono" style={{ color: 'var(--success)' }}>{formatRupiah(report.total_cash_inflow || 0)}</span>
          </div>
          <div className="report-row">
            <span>Pengeluaran Kas (Outflow)</span>
            <span className="font-mono" style={{ color: 'var(--danger)' }}>{formatRupiah(report.total_cash_outflow || 0)}</span>
          </div>
          <div className="report-row report-total" style={{ borderTop: '2px solid var(--primary)', marginTop: 'var(--space-sm)' }}>
            <span><strong>Arus Kas Bersih</strong></span>
            <strong className="font-mono" style={{ color: (report.net_cash_flow || 0) >= 0 ? 'var(--success)' : 'var(--danger)' }}>
              {formatRupiah(report.net_cash_flow || 0)}
            </strong>
          </div>
        </div>
      </div>
    );
  };

  /* ──────────── NERACA SALDO (Trial Balance) ──────────── */
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
                <span className="font-mono" style={{ minWidth: 120, textAlign: 'right' }}>
                  {acc.debit_balance ? formatRupiah(acc.debit_balance) : '-'}
                </span>
                <span className="font-mono" style={{ minWidth: 120, textAlign: 'right' }}>
                  {acc.credit_balance ? formatRupiah(acc.credit_balance) : '-'}
                </span>
              </div>
            </div>
          ))}
          <div className="report-row report-total">
            <span><strong>Total</strong></span>
            <div style={{ display: 'flex', gap: 'var(--space-xl)' }}>
              <strong className="font-mono" style={{ minWidth: 120, textAlign: 'right' }}>
                {formatRupiah(report.total_debit || 0)}
              </strong>
              <strong className="font-mono" style={{ minWidth: 120, textAlign: 'right' }}>
                {formatRupiah(report.total_credit || 0)}
              </strong>
            </div>
          </div>
          <div className="report-row">
            <span className="text-sm text-muted">Balance: {report.is_balanced ? '✅ Seimbang' : '⚠️ Tidak seimbang'}</span>
          </div>
        </div>
      </div>
    );
  };

  /* ──────────── Select renderer ──────────── */
  const renderReport = () => {
    switch (reportType) {
      case 'neraca': return renderNeraca();
      case 'laba-rugi': return renderLabaRugi();
      case 'arus-kas': return renderArusKas();
      case 'buku-besar': return renderTrialBalance();
      default: return null;
    }
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
              <h3>{report.report_name || REPORT_MAP[reportType].label}</h3>
              <p className="text-sm text-muted">
                Periode: {report.period
                  ? `${report.period.start} s/d ${report.period.end}`
                  : report.as_of_date
                    ? `Per ${report.as_of_date}`
                    : `${startDate} s/d ${endDate}`}
              </p>
            </div>
            {renderReport()}
          </div>
        )}
      </div>
    </div>
  );
}
