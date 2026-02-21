import { useState, useEffect } from 'react';
import api from '../../lib/api';
import { formatRupiah, formatDate } from '../../lib/utils';
import { useToast } from '../../contexts/ToastContext';
import {
  User, Wallet, CreditCard, TrendingUp, Plus, X, Loader, Upload, Trash2,
  ChevronLeft, ChevronRight, Clock, CheckCircle2, AlertTriangle, BarChart2
} from 'lucide-react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, Title as ChartTitle, Tooltip, Legend
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import './MemberPortalPage.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ChartTitle, Tooltip, Legend);

export default function MemberPortalPage() {
  const toast = useToast();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview'); // overview | savings | loans
  const [savings, setSavings] = useState([]);
  const [savingsMeta, setSavingsMeta] = useState({});
  const [savingsPage, setSavingsPage] = useState(1);
  const [loans, setLoans] = useState([]);
  const [savingsLoading, setSavingsLoading] = useState(false);
  const [loansLoading, setLoansLoading] = useState(false);

  // Loan application
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applyForm, setApplyForm] = useState({ principal_amount: '', term_months: '', purpose: '' });
  const [applyDocs, setApplyDocs] = useState([]); // [{ file, type }]
  const [applying, setApplying] = useState(false);

  const DOC_TYPES = [
    { value: 'KTP', label: 'KTP' },
    { value: 'SLIP_GAJI', label: 'Slip Gaji' },
    { value: 'SURAT_PERMOHONAN', label: 'Surat Permohonan' },
    { value: 'JAMINAN', label: 'Dokumen Jaminan' },
    { value: 'LAINNYA', label: 'Lainnya' },
  ];

  useEffect(() => {
    api.get('/me/dashboard')
      .then(res => setDashboard(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (tab === 'savings') {
      setSavingsLoading(true);
      api.get('/me/savings', { params: { page: savingsPage, per_page: 10 } })
        .then(res => { setSavings(res.data.data); setSavingsMeta(res.data.meta || {}); })
        .catch(() => {}).finally(() => setSavingsLoading(false));
    }
    if (tab === 'loans' && loans.length === 0) {
      fetchLoans();
    }
  }, [tab, savingsPage]);

  const fetchLoans = () => {
    setLoansLoading(true);
    api.get('/me/loans')
      .then(res => setLoans(res.data.data || []))
      .catch(() => {}).finally(() => setLoansLoading(false));
  };

  const handleAddDoc = (e) => {
    const files = Array.from(e.target.files);
    const newDocs = [];
    for (const file of files) {
      if (applyDocs.length + newDocs.length >= 5) { toast.error('Maksimal 5 dokumen'); break; }
      if (file.size > 512 * 1024) { toast.error(`${file.name} melebihi 500KB`); continue; }
      if (!['application/pdf','image/jpeg','image/png','image/jpg'].includes(file.type)) {
        toast.error(`${file.name}: format harus PDF, JPG, atau PNG`); continue;
      }
      newDocs.push({ file, type: 'LAINNYA' });
    }
    setApplyDocs(prev => [...prev, ...newDocs]);
    e.target.value = '';
  };

  const handleRemoveDoc = (idx) => setApplyDocs(prev => prev.filter((_, i) => i !== idx));
  const handleDocTypeChange = (idx, type) => setApplyDocs(prev => prev.map((d, i) => i === idx ? { ...d, type } : d));

  const handleApplyLoan = async (e) => {
    e.preventDefault();
    setApplying(true);
    try {
      const fd = new FormData();
      fd.append('principal_amount', parseFloat(applyForm.principal_amount));
      fd.append('term_months', parseInt(applyForm.term_months));
      if (applyForm.purpose) fd.append('purpose', applyForm.purpose);
      applyDocs.forEach((d, i) => {
        fd.append(`documents[${i}]`, d.file);
        fd.append(`document_types[${i}]`, d.type);
      });
      await api.post('/me/loans/apply', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Pengajuan pinjaman berhasil! Menunggu persetujuan admin.');
      setShowApplyModal(false);
      setApplyForm({ principal_amount: '', term_months: '', purpose: '' });
      setApplyDocs([]);
      fetchLoans();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal mengajukan pinjaman');
    }
    setApplying(false);
  };

  if (loading) return <div className="page-loading"><div className="spinner" /></div>;

  if (!dashboard) {
    return (
      <div className="page">
        <div className="empty-state" style={{ padding: '4rem 2rem' }}>
          <User size={48} style={{ opacity: 0.3 }} />
          <h3>Akun belum terhubung</h3>
          <p className="text-muted">Akun Anda belum terhubung ke data anggota. Hubungi admin koperasi.</p>
        </div>
      </div>
    );
  }

  const { member, savings: savingsSummary, active_loans, recent_savings, statistics } = dashboard;

  const chartData = {
    labels: statistics?.map(s => s.month) || [],
    datasets: [
      {
        label: 'Setoran Simpanan',
        data: statistics?.map(s => s.savings) || [],
        backgroundColor: 'rgba(52, 211, 153, 0.6)',
        borderColor: 'rgb(52, 211, 153)',
        borderWidth: 1,
        borderRadius: 4,
      },
      {
        label: 'Pembayaran Angsuran',
        data: statistics?.map(s => s.installments) || [],
        backgroundColor: 'rgba(96, 165, 250, 0.6)',
        borderColor: 'rgb(96, 165, 250)',
        borderWidth: 1,
        borderRadius: 4,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top', align: 'end', labels: { usePointStyle: true, boxWidth: 6 } },
      tooltip: {
        callbacks: {
          label: (context) => context.dataset.label + ': ' + formatRupiah(context.raw)
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value) => value >= 1000000 ? 'Rp ' + (value / 1000000) + 'Jt' : 'Rp ' + (value / 1000) + 'k'
        },
        grid: { borderDash: [4, 4] }
      },
      x: { grid: { display: false } }
    }
  };

  return (
    <div className="page portal-page">
      {/* Header */}
      <div className="portal-header">
        <div className="portal-member-info">
          <div className="portal-avatar">
            {member.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="portal-name">{member.name}</h1>
            <p className="text-muted text-sm">
              {member.member_number} · {member.unit_kerja || '-'} · Anggota sejak {formatDate(member.join_date)}
            </p>
          </div>
        </div>
      </div>

      {/* Tab Nav */}
      <div className="portal-tabs">
        {[
          { key: 'overview', label: 'Ringkasan', icon: TrendingUp },
          { key: 'savings', label: 'Simpanan', icon: Wallet },
          { key: 'loans', label: 'Pinjaman', icon: CreditCard },
        ].map(t => (
          <button key={t.key}
            className={`portal-tab ${tab === t.key ? 'active' : ''}`}
            onClick={() => setTab(t.key)}>
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB: Overview ── */}
      {tab === 'overview' && (
        <>
          {/* Savings cards */}
          <div className="portal-cards">
            <div className="portal-card savings-pokok">
              <span className="portal-card-label">Simpanan Pokok</span>
              <span className="portal-card-value">{formatRupiah(savingsSummary.pokok)}</span>
            </div>
            <div className="portal-card savings-wajib">
              <span className="portal-card-label">Simpanan Wajib</span>
              <span className="portal-card-value">{formatRupiah(savingsSummary.wajib)}</span>
            </div>
            <div className="portal-card savings-sukarela">
              <span className="portal-card-label">Simpanan Sukarela</span>
              <span className="portal-card-value">{formatRupiah(savingsSummary.sukarela)}</span>
            </div>
            <div className="portal-card savings-total">
              <span className="portal-card-label">Total Simpanan</span>
              <span className="portal-card-value">{formatRupiah(savingsSummary.total)}</span>
            </div>
          </div>

          {/* Statistics Chart */}
          {statistics && statistics.length > 0 && (
            <div className="card" style={{ marginTop: 'var(--space-lg)' }}>
              <div className="card-header">
                <h3><BarChart2 size={16} /> Statistik 6 Bulan Terakhir</h3>
              </div>
              <div style={{ height: 300, padding: 'var(--space-md) 0' }}>
                <Bar data={chartData} options={chartOptions} />
              </div>
            </div>
          )}

          {/* Active Loans */}
          {active_loans.length > 0 && (
            <div className="card" style={{ marginTop: 'var(--space-lg)' }}>
              <div className="card-header">
                <h3><CreditCard size={16} /> Pinjaman Aktif</h3>
              </div>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>No. Pinjaman</th>
                      <th className="text-right">Pokok</th>
                      <th className="text-right">Angsuran/bln</th>
                      <th className="text-right">Sisa</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {active_loans.map(loan => (
                      <tr key={loan.id}>
                        <td className="font-mono">{loan.loan_number}</td>
                        <td className="text-right font-mono">{formatRupiah(loan.principal_amount)}</td>
                        <td className="text-right font-mono">{formatRupiah(loan.monthly_payment)}</td>
                        <td className="text-right font-mono font-bold">{formatRupiah(loan.outstanding_balance)}</td>
                        <td>
                          <span className={`badge badge-${loan.status === 'ACTIVE' ? 'success' : loan.status === 'PENDING' ? 'warning' : 'info'}`}>
                            {loan.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Recent Savings */}
          {recent_savings.length > 0 && (
            <div className="card" style={{ marginTop: 'var(--space-lg)' }}>
              <div className="card-header">
                <h3><Clock size={16} /> Transaksi Terakhir</h3>
              </div>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Tanggal</th>
                      <th>Jenis</th>
                      <th>Tipe</th>
                      <th className="text-right">Jumlah</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent_savings.map(s => (
                      <tr key={s.id}>
                        <td>{formatDate(s.transaction_date)}</td>
                        <td><span className="badge badge-neutral">{s.saving_type || s.type}</span></td>
                        <td>
                          <span className={`badge badge-${s.transaction_type === 'DEPOSIT' ? 'success' : 'danger'}`}>
                            {s.transaction_type === 'DEPOSIT' ? 'Setor' : 'Tarik'}
                          </span>
                        </td>
                        <td className="text-right font-mono">{formatRupiah(s.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── TAB: Savings History ── */}
      {tab === 'savings' && (
        <div className="card" style={{ padding: 0 }}>
          {savingsLoading ? (
            <div className="page-loading" style={{ minHeight: 200 }}><div className="spinner" /></div>
          ) : savings.length === 0 ? (
            <div className="empty-state" style={{ padding: '2rem' }}>
              <p className="text-muted">Belum ada transaksi simpanan</p>
            </div>
          ) : (
            <>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Tanggal</th>
                      <th>Jenis</th>
                      <th>Tipe</th>
                      <th className="text-right">Jumlah</th>
                      <th className="text-right">Saldo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {savings.map(s => (
                      <tr key={s.id}>
                        <td>{formatDate(s.transaction_date)}</td>
                        <td><span className="badge badge-neutral">{s.saving_type || s.type}</span></td>
                        <td>
                          <span className={`badge badge-${s.transaction_type === 'DEPOSIT' ? 'success' : 'danger'}`}>
                            {s.transaction_type === 'DEPOSIT' ? 'Setor' : 'Tarik'}
                          </span>
                        </td>
                        <td className="text-right font-mono">{formatRupiah(s.amount)}</td>
                        <td className="text-right font-mono font-bold">{formatRupiah(s.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {savingsMeta.last_page > 1 && (
                <div className="pagination" style={{ padding: '0.75rem 1rem' }}>
                  <span>Hal {savingsMeta.current_page} dari {savingsMeta.last_page}</span>
                  <div className="pagination-buttons">
                    <button className="btn btn-ghost btn-sm" disabled={savingsPage <= 1}
                      onClick={() => setSavingsPage(p => p - 1)}><ChevronLeft size={14} /> Prev</button>
                    <button className="btn btn-ghost btn-sm" disabled={savingsPage >= savingsMeta.last_page}
                      onClick={() => setSavingsPage(p => p + 1)}>Next <ChevronRight size={14} /></button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── TAB: Loans ── */}
      {tab === 'loans' && (
        <div className="portal-loans">
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-md)' }}>
            <button className="btn btn-primary btn-sm" onClick={() => setShowApplyModal(true)}>
              <Plus size={14} /> Ajukan Pinjaman
            </button>
          </div>
          {loansLoading ? (
            <div className="page-loading" style={{ minHeight: 200 }}><div className="spinner" /></div>
          ) : loans.length === 0 ? (
            <div className="empty-state card" style={{ padding: '2rem' }}>
              <p className="text-muted">Belum ada pinjaman</p>
            </div>
          ) : loans.map(loan => (
            <div key={loan.id} className="card portal-loan-card">
              <div className="portal-loan-header">
                <div>
                  <h4 className="font-mono">{loan.loan_number}</h4>
                  <p className="text-sm text-muted">{loan.purpose || 'Pinjaman'} · {loan.term_months} bulan</p>
                </div>
                <span className={`badge badge-${loan.status === 'ACTIVE' ? 'success' : loan.status === 'PAID' ? 'info' : 'warning'}`}>
                  {loan.status}
                </span>
              </div>

              <div className="portal-loan-stats">
                <div>
                  <span className="text-xs text-muted">Pokok</span>
                  <strong className="font-mono">{formatRupiah(loan.principal_amount)}</strong>
                </div>
                <div>
                  <span className="text-xs text-muted">Angsuran/bln</span>
                  <strong className="font-mono">{formatRupiah(loan.monthly_payment)}</strong>
                </div>
                <div>
                  <span className="text-xs text-muted">Sisa</span>
                  <strong className="font-mono" style={{ color: 'var(--warning)' }}>
                    {formatRupiah(loan.outstanding_balance)}
                  </strong>
                </div>
                <div>
                  <span className="text-xs text-muted">Terbayar</span>
                  <strong className="font-mono" style={{ color: 'var(--success)' }}>
                    {formatRupiah(loan.total_paid)}
                  </strong>
                </div>
              </div>

              {/* Schedule */}
              {loan.schedules && loan.schedules.length > 0 && (
                <details className="portal-schedule-details">
                  <summary>Jadwal Angsuran ({loan.schedules.length} bulan)</summary>
                  <div className="table-container" style={{ marginTop: 'var(--space-sm)' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Jatuh Tempo</th>
                          <th className="text-right">Pokok</th>
                          <th className="text-right">Bunga</th>
                          <th className="text-right">Total</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loan.schedules.map(s => (
                          <tr key={s.installment_number}>
                            <td>{s.installment_number}</td>
                            <td>{formatDate(s.due_date)}</td>
                            <td className="text-right font-mono">{formatRupiah(s.principal)}</td>
                            <td className="text-right font-mono">{formatRupiah(s.interest)}</td>
                            <td className="text-right font-mono">{formatRupiah(s.total)}</td>
                            <td>
                              {s.is_paid ? (
                                <span className="badge badge-success"><CheckCircle2 size={12} /> Lunas</span>
                              ) : (
                                <span className="badge badge-warning"><AlertTriangle size={12} /> Belum</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Loan Application Modal */}
      {showApplyModal && (
        <div className="modal-overlay" onClick={() => setShowApplyModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 540 }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CreditCard size={18} /> Ajukan Pinjaman
              </h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowApplyModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleApplyLoan}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Jumlah Pinjaman (Rp) *</label>
                  <input type="number" className="form-input" placeholder="Min. Rp 100.000"
                    value={applyForm.principal_amount}
                    onChange={e => setApplyForm(f => ({ ...f, principal_amount: e.target.value }))}
                    min={100000} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Jangka Waktu (bulan) *</label>
                  <input type="number" className="form-input" placeholder="1 - 120 bulan"
                    value={applyForm.term_months}
                    onChange={e => setApplyForm(f => ({ ...f, term_months: e.target.value }))}
                    min={1} max={120} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Keperluan / Tujuan</label>
                  <textarea className="form-input" rows={3} placeholder="Opsional"
                    value={applyForm.purpose}
                    onChange={e => setApplyForm(f => ({ ...f, purpose: e.target.value }))} />
                </div>

                {/* Document Upload Section */}
                <div className="form-group">
                  <label className="form-label">Dokumen Persyaratan</label>
                  <p className="text-xs text-muted" style={{ marginBottom: 'var(--space-sm)' }}>
                    Upload KTP, Slip Gaji, Surat Permohonan, dll. Maks 5 file (PDF/JPG/PNG, maks 500KB/file)
                  </p>

                  {applyDocs.length > 0 && (
                    <div className="doc-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: 'var(--space-sm)' }}>
                      {applyDocs.map((doc, idx) => (
                        <div key={idx} className="doc-item card" style={{
                          display: 'flex', alignItems: 'center', gap: '0.5rem',
                          padding: '0.5rem 0.75rem', fontSize: '0.85rem'
                        }}>
                          <select className="form-input" style={{ flex: '0 0 140px', padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                            value={doc.type} onChange={e => handleDocTypeChange(idx, e.target.value)}>
                            {DOC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                          </select>
                          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                            title={doc.file.name}>{doc.file.name}</span>
                          <span className="text-xs text-muted">{(doc.file.size / 1024).toFixed(0)}KB</span>
                          <button type="button" className="btn btn-ghost btn-icon" style={{ padding: '0.2rem' }}
                            onClick={() => handleRemoveDoc(idx)}>
                            <Trash2 size={14} style={{ color: 'var(--danger)' }} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {applyDocs.length < 5 && (
                    <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Upload size={14} /> Pilih File
                      <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png"
                        onChange={handleAddDoc} style={{ display: 'none' }} />
                    </label>
                  )}
                </div>

                <p className="text-xs text-muted" style={{ marginTop: 'var(--space-sm)' }}>
                  Suku bunga dan biaya administrasi akan ditentukan oleh admin saat persetujuan.
                </p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowApplyModal(false)}>Batal</button>
                <button type="submit" className="btn btn-primary" disabled={applying}>
                  {applying ? <><Loader size={14} className="spin" /> Mengirim...</> : 'Ajukan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
