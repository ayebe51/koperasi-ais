import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { formatRupiah, formatDate, statusBadge } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, CheckCircle, XCircle, DollarSign, CreditCard, AlertTriangle, Printer, Calendar } from 'lucide-react';
import ReceiptModal from '../../components/Receipt/ReceiptModal';
import Breadcrumb from '../../components/Breadcrumb/Breadcrumb';
import './PinjamanPage.css';

export default function PinjamanDetailPage() {
  const { id } = useParams();
  const { isRole } = useAuth();
  const navigate = useNavigate();
  const [loan, setLoan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPayment, setShowPayment] = useState(false);
  const [payForm, setPayForm] = useState({ amount: '' });
  const [payLoading, setPayLoading] = useState(false);
  const [receiptId, setReceiptId] = useState(null);
  const [schedule, setSchedule] = useState(null);

  const fetchLoan = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/loans/${id}`);
      setLoan(res.data.data);
    } catch { navigate('/pinjaman'); }
    setLoading(false);
  };

  useEffect(() => { fetchLoan(); }, [id]);

  useEffect(() => {
    api.get(`/loans/${id}/schedule`)
      .then(res => setSchedule(res.data.data))
      .catch(() => {});
  }, [id]);

  const handleApprove = async () => {
    if (!confirm('Setujui pinjaman ini?')) return;
    try { await api.post(`/loans/${id}/approve`); fetchLoan(); } catch {}
  };
  const handleReject = async () => {
    if (!confirm('Tolak pinjaman ini?')) return;
    try { await api.post(`/loans/${id}/reject`); fetchLoan(); } catch {}
  };
  const handlePayment = async (e) => {
    e.preventDefault();
    setPayLoading(true);
    try {
      await api.post(`/loans/${id}/pay`, { amount: parseFloat(payForm.amount) });
      setShowPayment(false);
      setPayForm({ amount: '' });
      fetchLoan();
    } catch {}
    setPayLoading(false);
  };

  if (loading) return <div className="page-loading"><div className="spinner" /><p>Memuat data...</p></div>;
  if (!loan) return null;

  const progress = loan.amount > 0 ? ((loan.amount - loan.remaining_balance) / loan.amount * 100) : 0;

  return (
    <div className="page">
      <Breadcrumb
        items={[{ label: 'Pinjaman', to: '/pinjaman' }]}
        current={loan.loan_number}
      />
      <div className="page-header">
        <div className="flex items-center gap-md">
          <Link to="/pinjaman" className="btn btn-ghost btn-icon"><ArrowLeft size={18} /></Link>
          <div>
            <h1 className="page-title">{loan.loan_number}</h1>
            <p className="page-subtitle">{loan.member?.name} — {loan.member?.member_number}</p>
          </div>
        </div>
        <div className="flex gap-sm">
          {loan.status === 'PENDING' && isRole('ADMIN', 'MANAGER') && (
            <>
              <button className="btn btn-primary" onClick={handleApprove}>
                <CheckCircle size={14} /> Setujui
              </button>
              <button className="btn btn-danger" onClick={handleReject}>
                <XCircle size={14} /> Tolak
              </button>
            </>
          )}
          {loan.status === 'ACTIVE' && (
            <button className="btn btn-primary" onClick={() => setShowPayment(true)}>
              <CreditCard size={14} /> Bayar Angsuran
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-2 loan-detail-grid">
        {/* Loan info */}
        <div className="card">
          <h4 style={{ marginBottom: 'var(--space-lg)' }}>Informasi Pinjaman</h4>
          <div className="info-rows">
            <div className="info-row"><span>Status</span><span className={`badge badge-${statusBadge(loan.status)}`}>{loan.status}</span></div>
            <div className="info-row"><span>Plafon</span><strong>{formatRupiah(loan.amount)}</strong></div>
            <div className="info-row"><span>Tenor</span><strong>{loan.tenor_months} bulan</strong></div>
            <div className="info-row"><span>Bunga</span><strong>{loan.interest_rate}% / bulan</strong></div>
            <div className="info-row"><span>Tgl Pengajuan</span><strong>{formatDate(loan.application_date)}</strong></div>
            <div className="info-row"><span>Tgl Pencairan</span><strong>{formatDate(loan.disbursement_date)}</strong></div>
            <div className="info-row"><span>Kolektibilitas</span><strong>{loan.collectibility || '-'}</strong></div>
          </div>
        </div>

        {/* Payment progress */}
        <div className="card">
          <h4 style={{ marginBottom: 'var(--space-lg)' }}>Progress Pembayaran</h4>
          <div className="progress-circle-wrap">
            <div className="progress-bar-container">
              <div className="progress-bar-fill" style={{ width: `${Math.min(progress, 100)}%` }} />
            </div>
            <div className="progress-label">{progress.toFixed(1)}% lunas</div>
          </div>
          <div className="info-rows" style={{ marginTop: 'var(--space-lg)' }}>
            <div className="info-row"><span>Total Dibayar</span><strong style={{ color: 'var(--success)' }}>{formatRupiah(loan.amount - loan.remaining_balance)}</strong></div>
            <div className="info-row"><span>Sisa Pinjaman</span><strong style={{ color: 'var(--warning)' }}>{formatRupiah(loan.remaining_balance)}</strong></div>
          </div>
        </div>
      </div>

      {/* Jadwal Angsuran */}
      {schedule && schedule.schedule && schedule.schedule.length > 0 && (
        <div className="card" style={{ padding: 0, marginTop: 'var(--space-lg)' }}>
          <div style={{ padding: 'var(--space-lg) var(--space-lg) 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="flex items-center gap-md">
              <Calendar size={18} className="text-muted" />
              <h4>Jadwal Angsuran</h4>
            </div>
            <span className="text-sm text-muted">
              {schedule.paid_count} / {schedule.paid_count + schedule.remaining_count} terbayar
            </span>
          </div>
          <div className="table-container" style={{ marginTop: 'var(--space-md)' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Jatuh Tempo</th>
                  <th className="text-right">Pokok</th>
                  <th className="text-right">Bunga</th>
                  <th className="text-right">Total</th>
                  <th className="text-right">Sisa</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {schedule.schedule.map(s => (
                  <tr key={s.id} style={{ opacity: s.is_paid ? 0.6 : 1 }}>
                    <td className="font-mono text-sm">{s.installment_number}</td>
                    <td>{formatDate(s.due_date)}</td>
                    <td className="text-right font-mono">{formatRupiah(s.principal_amount)}</td>
                    <td className="text-right font-mono">{formatRupiah(s.interest_amount)}</td>
                    <td className="text-right font-mono font-bold">{formatRupiah(s.total_amount)}</td>
                    <td className="text-right font-mono">{formatRupiah(s.ending_balance)}</td>
                    <td>
                      {s.is_paid ? (
                        <span className="badge badge-success">✓ Lunas</span>
                      ) : (
                        <span className="badge badge-warning">Belum</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payment history */}
      {loan.payments && loan.payments.length > 0 && (
        <div className="card" style={{ padding: 0, marginTop: 'var(--space-lg)' }}>
          <div style={{ padding: 'var(--space-lg) var(--space-lg) 0' }}>
            <h4>Riwayat Pembayaran</h4>
          </div>
          <div className="table-container" style={{ marginTop: 'var(--space-md)' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>No. Kwitansi</th>
                  <th className="text-right">Pokok</th>
                  <th className="text-right">Bunga</th>
                  <th className="text-right">Total</th>
                  <th className="text-right">Sisa</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {loan.payments.map(pay => (
                  <tr key={pay.id}>
                    <td>{formatDate(pay.payment_date)}</td>
                    <td className="font-mono text-sm">{pay.receipt_number || '-'}</td>
                    <td className="text-right font-mono">{formatRupiah(pay.principal_paid)}</td>
                    <td className="text-right font-mono">{formatRupiah(pay.interest_paid)}</td>
                    <td className="text-right font-mono font-bold">{formatRupiah(pay.total_paid)}</td>
                    <td className="text-right font-mono">{formatRupiah(pay.outstanding_balance)}</td>
                    <td>
                      <button className="btn btn-ghost btn-sm btn-icon" title="Cetak Struk"
                        onClick={() => setReceiptId(pay.id)}>
                        <Printer size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payment modal */}
      {showPayment && (
        <div className="modal-overlay" onClick={() => setShowPayment(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h3>Bayar Angsuran</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowPayment(false)}><XCircle size={18} /></button>
            </div>
            <form onSubmit={handlePayment}>
              <div className="modal-body">
                <p className="text-sm text-muted" style={{ marginBottom: 'var(--space-md)' }}>
                  Sisa pinjaman: <strong>{formatRupiah(loan.remaining_balance)}</strong>
                </p>
                <div className="form-group">
                  <label className="form-label">Jumlah Bayar (Rp) *</label>
                  <input className="form-input" type="number" min="1000" step="1000"
                    value={payForm.amount}
                    onChange={e => setPayForm({ amount: e.target.value })}
                    placeholder="Jumlah angsuran" required autoFocus />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowPayment(false)}>Batal</button>
                <button type="submit" className="btn btn-primary" disabled={payLoading}>
                  {payLoading ? 'Memproses...' : 'Bayar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {receiptId && (
        <ReceiptModal type="loan-payment" id={receiptId} onClose={() => setReceiptId(null)} />
      )}
    </div>
  );
}
