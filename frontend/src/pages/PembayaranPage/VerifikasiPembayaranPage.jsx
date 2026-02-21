import { useState, useEffect } from 'react';
import api from '../../lib/api';
import { formatRupiah, formatDate } from '../../lib/utils';
import { useToast } from '../../contexts/ToastContext';
import { CheckCircle, XCircle, FileText, Search, ZoomIn } from 'lucide-react';
import EmptyState from '../../components/EmptyState/EmptyState';
import Pagination from '../../components/Pagination/Pagination';

export default function VerifikasiPembayaranPage() {
  const toast = useToast();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({});
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  // Approval modal
  const [processingId, setProcessingId] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // Image zoom modal
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    fetchPayments();
  }, [page]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (page === 1) fetchPayments();
      else setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const res = await api.get('/payments/verifications', {
        params: { page, search, per_page: 15 }
      });
      setPayments(res.data.data);
      setMeta(res.data.meta);
    } catch {
      toast.error('Gagal mengambil antrean verifikasi');
    }
    setLoading(false);
  };

  const handleApprove = async (id) => {
    if (!window.confirm('Verifikasi dan setujui bukti pembayaran ini?')) return;
    setProcessingId(id);
    try {
      await api.post(`/payments/${id}/approve-manual`);
      toast.success('Pembayaran berhasil disetujui');
      fetchPayments();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menyetujui');
    }
    setProcessingId(null);
  };

  const openReject = (id) => {
    setRejectReason('');
    setProcessingId(id);
    setShowRejectModal(true);
  };

  const submitReject = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/payments/${processingId}/reject-manual`, { reason: rejectReason });
      toast.success('Pembayaran ditolak');
      setShowRejectModal(false);
      fetchPayments();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menolak pembayaran');
    }
  };

  const openImage = (url) => {
    setSelectedImage(url);
    setShowImageModal(true);
  };

  return (
    <div className="page fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Verifikasi Pembayaran</h1>
          <p className="page-subtitle">Periksa dan setujui bukti pembayaran (QRIS/Transfer Manual) yang diunggah anggota</p>
        </div>
      </div>

      <div className="toolbar">
        <div className="search-wrapper">
          <Search size={16} />
          <input
            className="search-input"
            type="text"
            placeholder="Cari nama anggota / pesanan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>No</th>
                <th>Tgl Bayar</th>
                <th>Nomor Pesanan</th>
                <th>Anggota</th>
                <th>Jenis</th>
                <th className="text-right">Nominal</th>
                <th>Metode</th>
                <th>Bukti / Struk</th>
                <th className="text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" className="text-center py-8">
                    <div className="spinner" style={{ margin: '0 auto' }} />
                    <p className="mt-2 text-muted">Memuat data...</p>
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan="9" className="p-0">
                    <EmptyState
                      icon={FileText}
                      title="Tidak ada antrean"
                      message="Tidak ada bukti pembayaran manual yang menunggu untuk diverifikasi."
                    />
                  </td>
                </tr>
              ) : payments.map((p, index) => {
                const imgUrl = p.metadata?.proof_file ? `${api.defaults.baseURL.replace('/api', '')}/storage/${p.metadata.proof_file}` : null;
                const payMethod = p.metadata?.payment_method || 'TRANSFER';

                return (
                  <tr key={p.id}>
                    <td>{(meta.current_page - 1) * meta.per_page + index + 1}</td>
                    <td>{formatDate(p.created_at, true)}</td>
                    <td className="font-mono text-sm">{p.midtrans_order_id}</td>
                    <td>
                      <div className="font-medium">{p.member?.name}</div>
                      <div className="text-xs text-muted">{p.member?.member_number}</div>
                    </td>
                    <td>
                      <span className="badge badge-info">{p.payment_type.replace('_', ' ')}</span>
                    </td>
                    <td className="text-right font-mono font-medium">
                      {formatRupiah(p.amount)}
                    </td>
                    <td>
                      <span className={`badge ${payMethod === 'QRIS' ? 'badge-primary' : 'badge-warning'}`}>
                        {payMethod}-Manual
                      </span>
                    </td>
                    <td>
                      {imgUrl ? (
                         <button className="btn btn-outline btn-sm" onClick={() => openImage(imgUrl)}>
                           <ZoomIn size={14} /> Lihat
                         </button>
                      ) : (
                         <span className="text-muted text-xs">Tak ada struk</span>
                      )}
                    </td>
                    <td>
                      <div className="action-buttons justify-center">
                        <button
                          className="btn btn-icon btn-success"
                          title="Setujui Pembayaran"
                          disabled={processingId === p.id}
                          onClick={() => handleApprove(p.id)}
                        >
                          <CheckCircle size={18} />
                        </button>
                        <button
                          className="btn btn-icon btn-danger"
                          title="Tolak Pembayaran"
                          disabled={processingId === p.id}
                          onClick={() => openReject(p.id)}
                        >
                          <XCircle size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!loading && payments.length > 0 && (
          <Pagination
            currentPage={page}
            totalPages={meta.last_page}
            onPageChange={setPage}
          />
        )}
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="modal-overlay" onClick={() => setShowRejectModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h3>Tolak Pembayaran</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowRejectModal(false)}>
                <XCircle size={18} />
              </button>
            </div>
            <form onSubmit={submitReject}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Alasan Penolakan *</label>
                  <textarea
                    className="form-input"
                    rows="3"
                    required
                    autoFocus
                    value={rejectReason}
                    onChange={e => setRejectReason(e.target.value)}
                    placeholder="Contoh: Bukti transfer blur, atau nominal tidak sesuai..."
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowRejectModal(false)}>
                  Batal
                </button>
                <button type="submit" className="btn btn-danger" disabled={!rejectReason.trim()}>
                  Tolak Pembayaran
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Image Viewer Modal */}
      {showImageModal && (
        <div className="modal-overlay" style={{ zIndex: 1000 }} onClick={() => setShowImageModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600, padding: 0, overflow: 'hidden', background: 'transparent' }}>
             <img src={selectedImage} alt="Bukti Pembayaran" style={{ width: '100%', display: 'block', borderRadius: '8px' }} />
             <button title="Tutup" onClick={() => setShowImageModal(false)} className="btn btn-icon btn-danger" style={{ position: 'absolute', top: 10, right: 10 }}>
               <XCircle size={24} />
             </button>
          </div>
        </div>
      )}
    </div>
  );
}
