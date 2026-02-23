import { useState, useEffect } from 'react';
import api from '../../lib/api';
import { formatRupiah, formatNumber } from '../../lib/utils';
import { useToast } from '../../contexts/ToastContext';
import { Upload, CheckCircle, AlertCircle, XCircle, Search, FileText, ChevronRight, Info } from 'lucide-react';
import './LaporanPage.css'; // Reuse table and card styles

export default function BankReconciliationPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [mutations, setMutations] = useState([]);
  const [pagination, setPagination] = useState({});
  const [page, setPage] = useState(1);
  const [bankType, setBankType] = useState('BCA');
  const [selectedFile, setSelectedFile] = useState(null);
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

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;

    setUploadLoading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('bank_type', bankType);

    try {
      await api.post('/accounting/reconciliation/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('File mutasi berhasil diunggah.');
      setSelectedFile(null);
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

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">Rekonsiliasi Bank</h2>
      </div>

      <div className="grid grid-3" style={{ marginBottom: 'var(--space-lg)' }}>
        <div className="card col-span-2">
          <h4>Upload Mutasi Bank (CSV)</h4>
          <p className="text-muted" style={{ marginBottom: 'var(--space-md)' }}>
            Unggah file CSV mutasi dari Internet Banking untuk mencocokkan transaksi otomatis.
          </p>
          <form className="flex flex-col gap-md" onSubmit={handleFileUpload}>
            <div className="flex gap-md items-center">
              <select
                className="form-input"
                style={{ width: 150 }}
                value={bankType}
                onChange={e => setBankType(e.target.value)}
              >
                <option value="BCA">KlikBCA (CSV)</option>
                <option value="GENERIC">Format Umum</option>
              </select>
              <input
                type="file"
                accept=".csv,.txt"
                className="form-input"
                onChange={e => setSelectedFile(e.target.files[0])}
              />
              <button
                className="btn btn-primary"
                disabled={!selectedFile || uploadLoading}
              >
                {uploadLoading ? 'Memproses...' : <><Upload size={18} /> Unggah Mutasi</>}
              </button>
            </div>
          </form>
        </div>

        <div className="card">
          <div className="flex items-start gap-md">
            <div className="stat-icon purple" style={{ padding: 'var(--space-sm)' }}>
              <Info size={24} />
            </div>
            <div>
              <h4 style={{ margin: 0 }}>Cara Kerja</h4>
              <ol className="text-muted" style={{ paddingLeft: 'var(--space-lg)', marginTop: 'var(--space-xs)' }}>
                <li>Pilih format Bank</li>
                <li>Upload file CSV mutasi</li>
                <li>Sistem mencocokkan nominal</li>
                <li>Klik Konfirmasi atau Abaikan</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-md)' }}>
          <h3 style={{ margin: 0 }}>Daftar Mutasi Pending</h3>
          <div className="text-muted">Total: {pagination.total || 0} Transaksi</div>
        </div>

        {loading ? <div className="page-loading"><div className="spinner" /></div> : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Keterangan</th>
                  <th className="text-right">Nominal</th>
                  <th>Saran Kecocokan</th>
                  <th className="text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {mutations.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-xl">
                      <div className="flex flex-col items-center gap-sm text-muted">
                        <CheckCircle size={48} opacity={0.2} />
                        Semua mutasi telah direkonsiliasi atau belum ada data.
                      </div>
                    </td>
                  </tr>
                ) : mutations.map(m => (
                  <tr key={m.id}>
                    <td style={{ verticalAlign: 'top' }}>
                      <span className="font-mono">{new Date(m.transaction_date).toLocaleDateString('id-ID')}</span>
                    </td>
                    <td style={{ maxWidth: 300, fontSize: '0.875rem' }}>
                      <div className="text-muted">{m.description}</div>
                      <span className={`badge badge-${m.type === 'CREDIT' ? 'success' : 'danger'}`} style={{ marginTop: 'var(--space-xs)' }}>
                        {m.type === 'CREDIT' ? 'CR (Masuk)' : 'DB (Keluar)'}
                      </span>
                    </td>
                    <td className="text-right font-mono" style={{ verticalAlign: 'top' }}>
                      <strong>{formatRupiah(m.amount)}</strong>
                    </td>
                    <td>
                      {m.suggestions?.length > 0 ? (
                        <div className="flex flex-col gap-xs">
                          {m.suggestions.map((s, idx) => (
                            <div key={idx} className="flex flex-col gap-xs p-xs border rounded-sm bg-light">
                              <div className="flex justify-between items-center">
                                <span className="text-xs font-semibold text-primary">{s.label}</span>
                                <span className={`badge badge-${s.confidence === 'HIGH' ? 'success' : 'warning'}`} style={{ fontSize: '0.6rem' }}>
                                  {s.confidence} MATCH
                                </span>
                              </div>
                              <button
                                className="btn btn-primary btn-xs"
                                onClick={() => handleReconcile(m.id, s.type, s.id)}
                              >
                                Cocokkan & Simpan
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted italic">Tidak ada saran otomatis</span>
                      )}
                    </td>
                    <td className="text-center" style={{ verticalAlign: 'top' }}>
                      <button
                        className="btn btn-ghost btn-danger btn-sm"
                        title="Abaikan"
                        onClick={() => handleIgnore(m.id)}
                      >
                        <XCircle size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pagination.last_page > 1 && (
          <div className="flex justify-center gap-sm mt-lg">
            <button
              className="btn btn-outline btn-sm"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              Prev
            </button>
            <span className="flex items-center text-sm px-md">Halaman {page} dari {pagination.last_page}</span>
            <button
              className="btn btn-outline btn-sm"
              disabled={page === pagination.last_page}
              onClick={() => setPage(page + 1)}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
