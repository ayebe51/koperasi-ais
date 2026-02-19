import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../../lib/api';
import './PembayaranPage.css';

const PAYMENT_TYPES = [
  { value: 'SIMPANAN_POKOK',    label: 'Simpanan Pokok',    icon: '🏦' },
  { value: 'SIMPANAN_WAJIB',    label: 'Simpanan Wajib',    icon: '📋' },
  { value: 'SIMPANAN_SUKARELA', label: 'Simpanan Sukarela', icon: '💰' },
  { value: 'ANGSURAN_PINJAMAN', label: 'Angsuran Pinjaman', icon: '📄' },
];

const STATUS_LABELS = {
  PAID: 'Berhasil',
  PENDING: 'Menunggu',
  EXPIRED: 'Kedaluwarsa',
  FAILED: 'Gagal',
};

const TYPE_LABELS = {
  SIMPANAN_POKOK: 'Simpanan Pokok',
  SIMPANAN_WAJIB: 'Simpanan Wajib',
  SIMPANAN_SUKARELA: 'Simpanan Sukarela',
  ANGSURAN_PINJAMAN: 'Angsuran Pinjaman',
};

function formatRupiah(num) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function PembayaranPage() {
  // ── State ──
  const [step, setStep] = useState('form'); // form | qr | result
  const [paymentType, setPaymentType] = useState('');
  const [amount, setAmount] = useState('');
  const [loanId, setLoanId] = useState('');
  const [loans, setLoans] = useState([]);
  const [nextInstallment, setNextInstallment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // QR state
  const [qrData, setQrData] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);

  // Result state
  const [resultStatus, setResultStatus] = useState('');

  // History
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Polling ref
  const pollRef = useRef(null);
  const timerRef = useRef(null);

  // ── Load active loans ──
  useEffect(() => {
    if (paymentType === 'ANGSURAN_PINJAMAN') {
      api.get('/loans', { params: { status: 'ACTIVE' } })
        .then(res => {
          const data = res.data?.data || [];
          setLoans(data);
        })
        .catch(() => setLoans([]));
    }
  }, [paymentType]);

  // ── Load next installment when loan selected ──
  useEffect(() => {
    if (loanId) {
      api.get(`/loans/${loanId}/schedule`)
        .then(res => {
          const schedules = res.data?.data?.schedule || [];
          const next = schedules.find(s => !s.is_paid);
          if (next) {
            setNextInstallment(next);
            const total = parseFloat(next.principal_amount) + parseFloat(next.interest_amount);
            setAmount(String(Math.round(total)));
          }
        })
        .catch(() => setNextInstallment(null));
    } else {
      setNextInstallment(null);
    }
  }, [loanId]);

  // ── Load payment history ──
  const loadHistory = useCallback(() => {
    setHistoryLoading(true);
    api.get('/payments/history')
      .then(res => setHistory(res.data?.data || []))
      .catch(() => {})
      .finally(() => setHistoryLoading(false));
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  // ── Cleanup polling/timer on unmount ──
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // ── Create QRIS Payment ──
  const handleCreateQris = async () => {
    setError('');
    if (!paymentType) { setError('Pilih jenis pembayaran'); return; }
    if (!amount || parseInt(amount) < 1000) { setError('Minimum pembayaran Rp 1.000'); return; }
    if (paymentType === 'ANGSURAN_PINJAMAN' && !loanId) { setError('Pilih pinjaman'); return; }

    setLoading(true);
    try {
      const payload = {
        payment_type: paymentType,
        amount: parseInt(amount),
      };
      if (paymentType === 'ANGSURAN_PINJAMAN') {
        payload.loan_id = loanId;
      }

      const res = await api.post('/payments/qris', payload);
      const data = res.data?.data;
      setQrData(data);
      setStep('qr');

      // Start countdown timer
      const expiresAt = new Date(data.expired_at);
      const updateTimer = () => {
        const diff = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
        setTimeLeft(diff);
        if (diff <= 0) {
          clearInterval(timerRef.current);
          clearInterval(pollRef.current);
          setResultStatus('EXPIRED');
          setStep('result');
        }
      };
      updateTimer();
      timerRef.current = setInterval(updateTimer, 1000);

      // Start polling for status every 3 seconds
      pollRef.current = setInterval(async () => {
        try {
          const statusRes = await api.get(`/payments/${data.payment_id}/status`);
          const status = statusRes.data?.data?.status;
          if (status === 'PAID') {
            clearInterval(pollRef.current);
            clearInterval(timerRef.current);
            setResultStatus('PAID');
            setStep('result');
            loadHistory();
          } else if (status === 'EXPIRED' || status === 'FAILED') {
            clearInterval(pollRef.current);
            clearInterval(timerRef.current);
            setResultStatus(status);
            setStep('result');
          }
        } catch { /* ignore polling errors */ }
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal membuat QRIS');
    } finally {
      setLoading(false);
    }
  };

  // ── Reset to form ──
  const handleNewPayment = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    setStep('form');
    setQrData(null);
    setResultStatus('');
    setPaymentType('');
    setAmount('');
    setLoanId('');
    setError('');
    loadHistory();
  };

  // ── Format timer ──
  const formatTimer = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="pembayaran-page">
      <h2 style={{ marginBottom: '1.5rem' }}>💳 Pembayaran QRIS</h2>

      {/* ═══ STEP 1: Form ═══ */}
      {step === 'form' && (
        <>
          {/* Payment Type Selection */}
          <div className="payment-types">
            {PAYMENT_TYPES.map(pt => (
              <div
                key={pt.value}
                className={`payment-type-card ${paymentType === pt.value ? 'selected' : ''}`}
                onClick={() => { setPaymentType(pt.value); setLoanId(''); setAmount(''); setNextInstallment(null); }}
              >
                <div className="card-icon">{pt.icon}</div>
                <div className="card-label">{pt.label}</div>
              </div>
            ))}
          </div>

          {/* Form */}
          {paymentType && (
            <div className="payment-form-section">
              <h3>Detail Pembayaran</h3>

              {/* Loan selector for installment */}
              {paymentType === 'ANGSURAN_PINJAMAN' && (
                <div className="form-group">
                  <label>Pilih Pinjaman</label>
                  <select value={loanId} onChange={e => setLoanId(e.target.value)}>
                    <option value="">-- Pilih pinjaman aktif --</option>
                    {loans.map(loan => (
                      <option key={loan.id} value={loan.id}>
                        {loan.loan_number} — {formatRupiah(loan.principal_amount)}
                      </option>
                    ))}
                  </select>
                  {nextInstallment && (
                    <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#94a3b8' }}>
                      Angsuran ke-{nextInstallment.installment_number}: Pokok {formatRupiah(nextInstallment.principal_amount)} + Bunga {formatRupiah(nextInstallment.interest_amount)}
                    </div>
                  )}
                </div>
              )}

              {/* Amount */}
              <div className="form-group">
                <label>Jumlah Pembayaran (Rp)</label>
                {paymentType === 'ANGSURAN_PINJAMAN' && nextInstallment ? (
                  <div className="amount-display">{formatRupiah(amount)}</div>
                ) : (
                  <input
                    type="number"
                    min="1000"
                    step="1000"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="Masukkan jumlah"
                  />
                )}
              </div>

              {error && (
                <div style={{ color: '#ef4444', marginBottom: '1rem', fontSize: '0.9rem' }}>
                  ⚠️ {error}
                </div>
              )}

              <button
                className="btn-qris"
                onClick={handleCreateQris}
                disabled={loading}
              >
                {loading ? '⏳ Membuat QRIS...' : '📱 Bayar dengan QRIS'}
              </button>
            </div>
          )}
        </>
      )}

      {/* ═══ STEP 2: QR Code Display ═══ */}
      {step === 'qr' && qrData && (
        <div className="qr-section">
          <h3>Scan QR Code untuk Membayar</h3>
          <p className="qr-subtitle">Gunakan aplikasi e-wallet (GoPay, OVO, DANA, ShopeePay, dll)</p>

          <div className="qr-code-wrapper">
            <img src={qrData.qris_url} alt="QRIS QR Code" />
          </div>

          <div className="qr-amount">{formatRupiah(qrData.amount)}</div>

          <div className="qr-timer-label" style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
            Sisa waktu
          </div>
          <div className={`qr-timer ${timeLeft < 60 ? 'expiring' : ''}`}>
            {formatTimer(timeLeft)}
          </div>

          <div className="polling-indicator">
            <span className="polling-dot"></span>
            Menunggu pembayaran...
          </div>

          <div style={{ marginTop: '1.5rem' }}>
            <button className="btn-new-payment" onClick={handleNewPayment}>
              ← Batalkan
            </button>
          </div>
        </div>
      )}

      {/* ═══ STEP 3: Result ═══ */}
      {step === 'result' && (
        <div className={`payment-result ${resultStatus === 'PAID' ? 'success' : resultStatus === 'EXPIRED' ? 'expired' : 'failed'}`}>
          <div className="result-icon">
            {resultStatus === 'PAID' ? '✅' : resultStatus === 'EXPIRED' ? '⏰' : '❌'}
          </div>
          <div className="result-title">
            {resultStatus === 'PAID' && 'Pembayaran Berhasil!'}
            {resultStatus === 'EXPIRED' && 'Pembayaran Kedaluwarsa'}
            {resultStatus === 'FAILED' && 'Pembayaran Gagal'}
          </div>
          <div className="result-desc">
            {resultStatus === 'PAID' && 'Dana telah diterima dan dicatat dalam sistem.'}
            {resultStatus === 'EXPIRED' && 'Silakan buat pembayaran baru.'}
            {resultStatus === 'FAILED' && 'Terjadi kesalahan. Silakan coba lagi.'}
          </div>
          {qrData && (
            <div style={{ marginBottom: '1.5rem', fontSize: '0.9rem', color: '#94a3b8' }}>
              Order ID: {qrData.order_id} &middot; {formatRupiah(qrData.amount)}
            </div>
          )}
          <button className="btn-new-payment" onClick={handleNewPayment}>
            Buat Pembayaran Baru
          </button>
        </div>
      )}

      {/* ═══ Payment History ═══ */}
      <div className="history-section">
        <h3>📜 Riwayat Pembayaran QRIS</h3>
        {historyLoading ? (
          <div className="empty-history">Memuat...</div>
        ) : history.length === 0 ? (
          <div className="empty-history">Belum ada riwayat pembayaran</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="history-table">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Jenis</th>
                  <th>Jumlah</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {history.map(p => (
                  <tr key={p.id}>
                    <td>{formatDate(p.created_at)}</td>
                    <td>{TYPE_LABELS[p.payment_type] || p.payment_type}</td>
                    <td>{formatRupiah(p.amount)}</td>
                    <td><span className={`status-badge ${p.status}`}>{STATUS_LABELS[p.status] || p.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
