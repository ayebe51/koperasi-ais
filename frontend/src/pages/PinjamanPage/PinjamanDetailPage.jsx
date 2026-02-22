import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { formatRupiah, formatDate, statusBadge } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, CheckCircle, XCircle, DollarSign, CreditCard, AlertTriangle, Printer, Calendar, FileText } from 'lucide-react';
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
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectLoading, setRejectLoading] = useState(false);

  const fetchLoan = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/loans/${id}`);
      setLoan({
        ...res.data.data.loan,
        remaining_balance: res.data.data.outstanding_balance
      });
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
  const handleReject = async (e) => {
    e.preventDefault();
    setRejectLoading(true);
    try {
      await api.post(`/loans/${id}/reject`, { rejection_reason: rejectReason });
      setShowReject(false);
      setRejectReason('');
      fetchLoan();
    } catch {}
    setRejectLoading(false);
  };
  const handlePayment = async (e) => {
    e.preventDefault();
    setPayLoading(true);
    try {
      await api.post(`/loans/${id}/pay`, {
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: 'CASH'
      });
      setShowPayment(false);
      fetchLoan();
      // Refresh schedule
      api.get(`/loans/${id}/schedule`).then(res => setSchedule(res.data.data)).catch(()=>{});
    } catch {}
    setPayLoading(false);
  };

  if (loading) return <div className="page-loading"><div className="spinner" /><p>Memuat data...</p></div>;
  if (!loan) return null;

  const progress = loan.principal_amount > 0 ? ((loan.principal_amount - loan.remaining_balance) / loan.principal_amount * 100) : 0;
  const nextPayment = schedule?.schedule?.find(s => !s.is_paid);

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
          {((loan.status === 'PENDING' && isRole('ADMIN', 'MANAGER')) ||
            (loan.status === 'WAITING_CHAIRMAN_APPROVAL' && isRole('ADMIN', 'CHAIRMAN'))) && (
            <>
              <button className="btn btn-primary" onClick={handleApprove}>
                <CheckCircle size={14} /> Setujui
              </button>
              <button className="btn btn-danger" onClick={() => setShowReject(true)}>
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
            <div className="info-row">
              <span>Status</span>
              <span className={`badge badge-${statusBadge(loan.status)}`}>
                {loan.status === 'WAITING_CHAIRMAN_APPROVAL' ? 'Menunggu Ketua' : loan.status}
              </span>
            </div>
            {loan.status === 'REJECTED' && loan.rejection_reason && (
              <div className="info-row"><span>Alasan Penolakan</span><strong style={{ color: 'var(--danger)' }}>{loan.rejection_reason}</strong></div>
            )}
            <div className="info-row"><span>Plafon</span><strong>{formatRupiah(loan.principal_amount)}</strong></div>
            <div className="info-row"><span>Tenor</span><strong>{loan.term_months} bulan</strong></div>
            <div className="info-row"><span>Bunga</span><strong>{loan.interest_rate}% / bulan</strong></div>
            <div className="info-row"><span>Tujuan</span><strong>{loan.purpose || '-'}</strong></div>
            <div className="info-row"><span>Tgl Pengajuan</span><strong>{formatDate(loan.created_at)}</strong></div>
            <div className="info-row"><span>Tgl Pencairan</span><strong>{formatDate(loan.loan_date) || '-'}</strong></div>
            <div className="info-row"><span>Kolektibilitas</span><strong>{loan.collectibility || '-'}</strong></div>
            {loan.manager_approved_at && (
              <div className="info-row"><span>Disetujui Manajer</span><strong>{formatDate(loan.manager_approved_at)}</strong></div>
            )}
            {loan.chairman_approved_at && (
              <div className="info-row"><span>Disetujui Ketua</span><strong>{formatDate(loan.chairman_approved_at)}</strong></div>
            )}
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
            <div className="info-row"><span>Total Dibayar</span><strong style={{ color: 'var(--success)' }}>{formatRupiah(loan.principal_amount - loan.remaining_balance)}</strong></div>
            <div className="info-row"><span>Sisa Pinjaman</span><strong style={{ color: 'var(--warning)' }}>{formatRupiah(loan.remaining_balance)}</strong></div>
          </div>
        </div>

        {/* Documents */}
        {loan.documents && loan.documents.length > 0 && (
          <div className="card" style={{ gridColumn: '1 / -1' }}>
            <h4 style={{ marginBottom: 'var(--space-md)' }}>Dokumen Persyaratan</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-sm)' }}>
              {loan.documents.map(doc => (
                <a key={doc.id} href={`/storage/${doc.file_path}`} target="_blank" rel="noreferrer"
                  className="card" style={{ padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none', color: 'inherit', border: '1px solid var(--border)' }}>
                  <div style={{ background: 'var(--bg-muted)', padding: '0.5rem', borderRadius: 'var(--radius-sm)', color: 'var(--brand)' }}>
                    <FileText size={20} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>{doc.document_type}</div>
                    <div style={{ fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.file_name}</div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
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
                {nextPayment ? (
                  <>
                    <p className="text-sm text-muted" style={{ marginBottom: 'var(--space-md)' }}>
                      Konfirmasi pembayaran angsuran ke-<strong>{nextPayment.installment_number}</strong>
                    </p>
                    <div className="info-rows card" style={{ padding: '1rem', background: 'var(--bg-muted)' }}>
                      <div className="info-row"><span>Tagihan Pokok:</span><strong className="font-mono">{formatRupiah(nextPayment.principal_amount)}</strong></div>
                      <div className="info-row"><span>Bunga:</span><strong className="font-mono">{formatRupiah(nextPayment.interest_amount)}</strong></div>
                      <div className="info-row" style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px dashed var(--border)' }}>
                        <span><strong>Total Pembayaran:</strong></span>
                        <strong className="font-mono text-lg" style={{ color: 'var(--success)' }}>{formatRupiah(nextPayment.total_amount)}</strong>
                      </div>
                    </div>
                    <p className="text-xs text-muted" style={{ marginTop: 'var(--space-md)' }}>
                      Pembayaran akan memotong sisa pinjaman secara otomatis sesuai jadwal angsuran.
                    </p>
                  </>
                ) : (
                  <div className="text-center" style={{ padding: '2rem 1rem' }}>
                    <CheckCircle size={48} style={{ color: 'var(--success)', margin: '0 auto var(--space-md)' }} />
                    <p>Semua jadwal angsuran sudah lunas.</p>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowPayment(false)}>Batal</button>
                {nextPayment && (
                  <button type="submit" className="btn btn-primary" disabled={payLoading}>
                    {payLoading ? 'Memproses...' : 'Konfirmasi Bayar'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showReject && (
        <div className="modal-overlay" onClick={() => setShowReject(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h3>Tolak Pinjaman</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowReject(false)}><XCircle size={18} /></button>
            </div>
            <form onSubmit={handleReject}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Alasan Penolakan</label>
                  <textarea className="form-input" rows={3} placeholder="Masukkan alasan kenapa pinjaman ditolak"
                    value={rejectReason} onChange={e => setRejectReason(e.target.value)} required />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowReject(false)}>Batal</button>
                <button type="submit" className="btn btn-danger" disabled={rejectLoading}>
                  {rejectLoading ? 'Memproses...' : 'Tolak Pinjaman'}
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
