import { useState, useEffect, useRef } from 'react';
import api from '../../lib/api';
import { formatRupiah } from '../../lib/utils';
import { useToast } from '../../contexts/ToastContext';
import {
  Upload, CheckCircle, XCircle, FileText,
  HelpCircle, ArrowRight, Zap
} from 'lucide-react';
import './BankReconciliationPage.css';

export default function BankReconciliationPage() {
  const toast = useToast();
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [mutations, setMutations] = useState([]);
  const [pagination, setPagination] = useState({});
  const [page, setPage] = useState(1);
  const [bankType, setBankType] = useState('BCA');
  const [dragging, setDragging] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);

  useEffect(() => {
    fetchMutations();
  }, [page]);

  const fetchMutations = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/accounting/reconciliation?status=PENDING&page=${page}`);
      setMutations(response.data.data);
      setPagination(response.data.meta || response.data);
    } catch (err) {
      toast.error('Gagal mengambil data mutasi.');
    } finally {
      setLoading(false);
    }
  };

  const onFileSelect = (file) => {
    if (!file) return;
    handleUpload(file);
  };

  const handleUpload = async (file) => {
    setUploadLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('bank_type', bankType);

    try {
      await api.post('/accounting/reconciliation/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('File mutasi berhasil diunggah.');
      setPage(1);
      fetchMutations();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal mengunggah file.');
    } finally {
      setUploadLoading(false);
    }
  };

  const handleReconcile = async (mutationId, toType, toId) => {
    try {
      await api.post(`/accounting/reconciliation/${mutationId}/reconcile`, {
        to_type: toType,
        to_id: toId,
        action: 'confirm'
      });
      toast.success('Mutasi berhasil direkonsiliasi.');
      fetchMutations();
    } catch (err) {
      toast.error('Gagal melakukan rekonsiliasi.');
    }
  };

  const handleIgnore = async (mutationId) => {
    if (!window.confirm('Abaikan mutasi ini?')) return;
    try {
      await api.post(`/accounting/reconciliation/${mutationId}/reconcile`, {
        to_type: 'ignored',
        action: 'ignore'
      });
      toast.success('Mutasi diabaikan.');
      fetchMutations();
    } catch (err) {
      toast.error('Gagal mengabaikan mutasi.');
    }
  };

  const onDragOver = (e) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = () => { setDragging(false); };
  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files?.[0]) onFileSelect(e.dataTransfer.files[0]);
  };

  return (
    <div className="page recon-page">
      <div className="recon-header">
        <div className="flex justify-between items-start">
          <div>
            <h2>Rekonsiliasi Bank</h2>
            <p>Sinkronkan transaksi rekening koran dengan pembukuan internal Koperasi.</p>
          </div>
          <div className="flex gap-sm">
            <Zap size={24} className="text-yellow-400" />
            <span className="font-semibold text-white">Fase 2: AI Automatch</span>
          </div>
        </div>
      </div>

      <div className="upload-container">
        <div
          className={`upload-zone ${dragging ? 'dragging' : ''}`}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="upload-icon">
            {uploadLoading ? <div className="spinner" /> : <Upload size={32} />}
          </div>
          <h3>{uploadLoading ? 'Memproses File...' : 'Klik atau Seret Rekening Koran ke Sini'}</h3>
          <p className="text-muted">Mendukung format CSV dan TXT dari Internet Banking</p>

          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={(e) => onFileSelect(e.target.files[0])}
          />
        </div>

        <div className="card">
          <h4>Konfigurasi</h4>
          <div className="form-group" style={{ marginTop: 'var(--space-md)' }}>
            <label className="form-label">Format Bank</label>
            <div className="bank-selector">
              <div
                className={`chip ${bankType === 'BCA' ? 'active' : ''}`}
                onClick={() => setBankType('BCA')}
              >BCA</div>
              <div
                className={`chip ${bankType === 'GENERIC' ? 'active' : ''}`}
                onClick={() => setBankType('GENERIC')}
              >Umum</div>
            </div>
          </div>
          <hr style={{ margin: 'var(--space-md) 0' }} />
          <div className="flex items-center gap-sm text-xs text-muted">
            <HelpCircle size={14} />
            <span>Ekspor mutasi dari CMS Bank ke format CSV untuk hasil terbaik.</span>
          </div>
        </div>
      </div>

      <div className="mutation-card">
        <div className="flex justify-between items-center p-lg border-b">
          <h3 style={{ margin: 0 }} className="flex items-center gap-sm">
            <FileText size={20} className="text-primary-500" />
            Daftar Mutasi Tertunda
          </h3>
          <span className="badge badge-info">{pagination.total || 0} Menunggu</span>
        </div>

        {loading ? (
          <div className="page-loading"><div className="spinner" /></div>
        ) : mutations.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <CheckCircle size={40} />
            </div>
            <h3>Pekerjaan Selesai!</h3>
            <p>Tidak ada mutasi baru yang perlu direkonsiliasi saat ini.</p>
          </div>
        ) : (
          <div className="mutation-list">
            {mutations.map(m => (
              <div key={m.id} className="mutation-item">
                <div className="mutation-date">{new Date(m.transaction_date).toLocaleDateString('id-ID')}</div>
                <div className="mutation-desc">
                  <div className="font-semibold text-sm">{m.description}</div>
                  <span className={`badge badge-${m.type === 'CREDIT' ? 'success' : 'danger'}`} style={{ fontSize: '0.65rem' }}>
                    {m.type === 'CREDIT' ? 'DANA MASUK' : 'DANA KELUAR'}
                  </span>
                </div>
                <div className={`mutation-amount ${m.type === 'CREDIT' ? 'credit' : 'debit'}`}>
                  {formatRupiah(m.amount)}
                </div>
                <div className="mutation-suggestions">
                  {m.suggestions?.length > 0 ? (
                    <div className="suggestion-box">
                      {m.suggestions.map((s, idx) => (
                        <div key={idx} className="flex flex-col gap-xs">
                          <div className="flex items-center justify-between">
                            <span className="match-badge">{s.confidence} Match</span>
                            <ArrowRight size={12} className="text-primary-400" />
                          </div>
                          <span className="text-xs font-bold truncate" title={s.label}>{s.label}</span>
                          <button
                            className="btn btn-primary btn-xs"
                            onClick={() => handleReconcile(m.id, s.type, s.id)}
                            style={{ width: '100%', marginTop: 4 }}
                          >
                            Konfirmasi
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-muted italic text-xs">Pencarian manual...</span>
                  )}
                </div>
                <div className="text-center">
                  <button
                    className="btn btn-ghost btn-sm text-danger"
                    onClick={() => handleIgnore(m.id)}
                    title="Abaikan"
                  >
                    <XCircle size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {pagination.last_page > 1 && (
          <div className="flex justify-center gap-sm p-lg border-t">
            <button className="btn btn-outline btn-sm" disabled={page === 1} onClick={() => setPage(page - 1)}>Prev</button>
            <span className="flex items-center text-sm px-md">Halaman {page} dari {pagination.last_page}</span>
            <button className="btn btn-outline btn-sm" disabled={page === pagination.last_page} onClick={() => setPage(page + 1)}>Next</button>
          </div>
        )}
      </div>
    </div>
  );
}

