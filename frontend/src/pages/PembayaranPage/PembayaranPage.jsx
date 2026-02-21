import { useState, useEffect, useRef } from 'react';
import api from '../../lib/api';
import { formatRupiah, formatDate } from '../../lib/utils';
import { CreditCard, QrCode, Clock, CheckCircle, XCircle, History, Loader } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import './PembayaranPage.css';

export default function PembayaranPage() {
  const toast = useToast();

  // Form
  const [paymentType, setPaymentType] = useState('SIMPANAN_SUKARELA');
  const [amount, setAmount] = useState('');
  const [loanId, setLoanId] = useState('');
  const [loans, setLoans] = useState([]);
  const [creating, setCreating] = useState(false);

  // QR / Status
  const [qrData, setQrData] = useState(null); // { payment_id, qris_url, amount, expired_at, status }
  const [paymentStatus, setPaymentStatus] = useState(null); // 'PENDING' | 'PAID' | 'EXPIRED'
  const pollingRef = useRef(null);

  // History
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Load member's active loans for angsuran
  useEffect(() => {
    api.get('/me/loans').then(res => {
      const active = (res.data.data || []).filter(l => l.status === 'ACTIVE');
      setLoans(active);
    }).catch(() => {});
    fetchHistory();
  }, []);

  // Cleanup polling on unmount
  useEffect(() => () => { if (pollingRef.current) clearInterval(pollingRef.current); }, []);

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await api.get('/payments/history', { params: { per_page: 10 } });
      setHistory(res.data.data || []);
    } catch {}
    setHistoryLoading(false);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) < 1000) {
      toast.error('Minimum pembayaran QRIS adalah Rp 1.000');
      return;
    }
    if (paymentType === 'ANGSURAN_PINJAMAN' && !loanId) {
      toast.error('Pilih pinjaman untuk pembayaran angsuran');
      return;
    }

    setCreating(true);
    try {
      const res = await api.post('/payments/qris', {
        payment_type: paymentType,
        amount: parseFloat(amount),
        loan_id: paymentType === 'ANGSURAN_PINJAMAN' ? loanId : null,
      });
      const data = res.data.data;
      setQrData(data);
      setPaymentStatus('PENDING');
      toast.success('QR Code berhasil dibuat! Silakan scan untuk membayar.');
      startPolling(data.payment_id);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal membuat pembayaran QRIS');
    }
    setCreating(false);
  };

  const startPolling = (paymentId) => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(async () => {
      try {
        const res = await api.get(`/payments/${paymentId}/status`);
        const status = res.data.data?.status;
        if (status === 'PAID') {
          setPaymentStatus('PAID');
          clearInterval(pollingRef.current);
          pollingRef.current = null;
          toast.success('Pembayaran berhasil!');
          fetchHistory();
        } else if (status === 'EXPIRED' || status === 'FAILED') {
          setPaymentStatus('EXPIRED');
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
      } catch {}
    }, 5000);
  };

  const resetPayment = () => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    setQrData(null);
    setPaymentStatus(null);
    setAmount('');
  };

  const statusLabel = {
    PENDING: 'Menunggu Pembayaran',
    PAID: 'Pembayaran Berhasil',
    EXPIRED: 'Kedaluwarsa',
    FAILED: 'Gagal',
  };

  const statusBadge = (s) => {
    if (s === 'PAID') return 'success';
    if (s === 'PENDING') return 'warning';
    return 'danger';
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Pembayaran QRIS</h1>
          <p className="page-subtitle">Bayar simpanan atau angsuran pinjaman melalui QRIS</p>
        </div>
      </div>

      <div className="payment-layout">
        {/* Left: Payment Form */}
        <div className="payment-form-card">
          <h3><CreditCard size={18} /> Buat Pembayaran</h3>
          <form onSubmit={handleCreate}>
            <div className="form-group">
              <label className="form-label">Jenis Pembayaran</label>
              <select className="form-input" value={paymentType}
                onChange={e => setPaymentType(e.target.value)} disabled={!!qrData}>
                <option value="SIMPANAN_POKOK">Simpanan Pokok</option>
                <option value="SIMPANAN_WAJIB">Simpanan Wajib</option>
                <option value="SIMPANAN_SUKARELA">Simpanan Sukarela</option>
                <option value="ANGSURAN_PINJAMAN">Angsuran Pinjaman</option>
              </select>
            </div>

            {paymentType === 'ANGSURAN_PINJAMAN' && (
              <div className="form-group">
                <label className="form-label">Pinjaman</label>
                <select className="form-input" value={loanId}
                  onChange={e => setLoanId(e.target.value)} disabled={!!qrData}>
                  <option value="">— Pilih Pinjaman —</option>
                  {loans.map(l => (
                    <option key={l.id} value={l.id}>
                      {l.loan_number} — Sisa: {formatRupiah(l.remaining_balance)}
                    </option>
                  ))}
                </select>
                {loans.length === 0 && (
                  <span className="text-xs text-muted">Tidak ada pinjaman aktif</span>
                )}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Jumlah (Rp)</label>
              <input type="number" className="form-input" placeholder="Minimum Rp 1.000"
                value={amount} onChange={e => setAmount(e.target.value)}
                min={1000} disabled={!!qrData} />
            </div>

            {!qrData ? (
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 'var(--space-md)' }}
                disabled={creating}>
                {creating ? <><Loader size={16} className="spin" /> Memproses...</> : <><QrCode size={16} /> Generate QR Code</>}
              </button>
            ) : (
              <button type="button" className="btn btn-secondary" style={{ width: '100%', marginTop: 'var(--space-md)' }}
                onClick={resetPayment}>
                Buat Pembayaran Baru
              </button>
            )}
          </form>
        </div>

        {/* Right: QR Display */}
        <div className="qr-card">
          <h3><QrCode size={18} /> QR Code</h3>
          <div className="qr-container">
            {!qrData ? (
              <div className="qr-placeholder">
                <QrCode size={48} />
                <span>QR Code akan tampil di sini</span>
              </div>
            ) : (
              <>
                {qrData.qris_url ? (
                  <img src={qrData.qris_url} alt="QRIS QR Code" className="qr-image" />
                ) : (
                  <div className="qr-placeholder">
                    <QrCode size={48} />
                    <span className="text-sm">QR code tidak tersedia (mode simulasi)</span>
                  </div>
                )}
                <div className="qr-amount">{formatRupiah(qrData.amount)}</div>
                {qrData.expired_at && (
                  <div className="qr-expire">Berlaku hingga: {formatDate(qrData.expired_at)}</div>
                )}
              </>
            )}

            {paymentStatus === 'PENDING' && (
              <div className="qr-status polling"><Clock size={14} /> Menunggu pembayaran...</div>
            )}
            {paymentStatus === 'PAID' && (
              <div className="qr-status success"><CheckCircle size={14} /> Pembayaran berhasil!</div>
            )}
            {paymentStatus === 'EXPIRED' && (
              <div className="qr-status expired"><XCircle size={14} /> QR Code kedaluwarsa</div>
            )}
          </div>
        </div>
      </div>

      {/* Payment History */}
      <div className="payment-history">
        <h3><History size={18} /> Riwayat Pembayaran</h3>
        <div className="card" style={{ padding: 0 }}>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Order ID</th>
                  <th>Jenis</th>
                  <th className="text-right">Jumlah</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {historyLoading ? (
                  <tr><td colSpan={5} className="text-center" style={{ padding: '2rem' }}>
                    <div className="spinner" style={{ margin: '0 auto' }} />
                  </td></tr>
                ) : history.length === 0 ? (
                  <tr><td colSpan={5} className="text-center text-muted" style={{ padding: '2rem' }}>
                    Belum ada riwayat pembayaran
                  </td></tr>
                ) : history.map(p => (
                  <tr key={p.id}>
                    <td className="text-sm">{formatDate(p.created_at)}</td>
                    <td className="font-mono text-sm">{p.midtrans_order_id || p.id?.slice(0, 8)}</td>
                    <td>
                      <span className={`payment-type-badge ${p.payment_type?.includes('SIMPANAN') ? 'simpanan' : 'angsuran'}`}>
                        {p.payment_type === 'SIMPANAN_POKOK' ? 'Simp. Pokok'
                          : p.payment_type === 'SIMPANAN_WAJIB' ? 'Simp. Wajib'
                          : p.payment_type === 'SIMPANAN_SUKARELA' ? 'Simp. Sukarela'
                          : 'Angsuran'}
                      </span>
                    </td>
                    <td className="text-right font-mono">{formatRupiah(p.amount)}</td>
                    <td><span className={`badge badge-${statusBadge(p.status)}`}>{p.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
