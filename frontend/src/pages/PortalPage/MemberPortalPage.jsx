import { useState, useEffect } from 'react';
import api from '../../lib/api';
import { formatRupiah, formatDate } from '../../lib/utils';
import {
  User, Wallet, CreditCard, TrendingUp,
  ChevronLeft, ChevronRight, Clock, CheckCircle2, AlertTriangle
} from 'lucide-react';
import './MemberPortalPage.css';

export default function MemberPortalPage() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview'); // overview | savings | loans
  const [savings, setSavings] = useState([]);
  const [savingsMeta, setSavingsMeta] = useState({});
  const [savingsPage, setSavingsPage] = useState(1);
  const [loans, setLoans] = useState([]);
  const [savingsLoading, setSavingsLoading] = useState(false);
  const [loansLoading, setLoansLoading] = useState(false);

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
      setLoansLoading(true);
      api.get('/me/loans')
        .then(res => setLoans(res.data.data || []))
        .catch(() => {}).finally(() => setLoansLoading(false));
    }
  }, [tab, savingsPage]);

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

  const { member, savings: savingsSummary, active_loans, recent_savings } = dashboard;

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
    </div>
  );
}
