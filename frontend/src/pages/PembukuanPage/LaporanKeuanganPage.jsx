import { useState, useEffect } from 'react';
import api from '../../lib/api';
import { formatRupiah } from '../../lib/utils';
import { FileText, Download } from 'lucide-react';
import './LaporanPage.css';

export default function LaporanKeuanganPage() {
  const [reportType, setReportType] = useState('neraca');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(new Date().getFullYear() + '-01-01');
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/accounting/reports/${reportType}`, {
        params: { start_date: startDate, end_date: endDate }
      });
      setReport(res.data.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchReport(); }, [reportType]);

  const renderNeraca = () => {
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

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Laporan Keuangan</h1>
          <p className="page-subtitle">Neraca, Laba Rugi, dan Arus Kas</p>
        </div>
      </div>

      {/* Report selector */}
      <div className="toolbar">
        <div className="report-tabs">
          {[
            { key: 'neraca', label: 'Neraca' },
            { key: 'laba-rugi', label: 'Laba Rugi' },
            { key: 'arus-kas', label: 'Arus Kas' },
            { key: 'buku-besar', label: 'Buku Besar' },
          ].map(tab => (
            <button key={tab.key}
              className={`btn ${reportType === tab.key ? 'btn-primary' : 'btn-ghost'} btn-sm`}
              onClick={() => setReportType(tab.key)}>
              {tab.label}
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
          <div className="empty-state"><p>Pilih jenis laporan dan periode</p></div>
        ) : (
          <div className="report-content">
            <div className="report-header-info">
              <h3>{report.title || reportType.replace('-', ' ').toUpperCase()}</h3>
              <p className="text-sm text-muted">Periode: {report.period || `${startDate} s/d ${endDate}`}</p>
            </div>
            {renderNeraca()}
          </div>
        )}
      </div>
    </div>
  );
}
