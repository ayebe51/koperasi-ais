import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api, { downloadExport } from '../../lib/api';
import { formatRupiah, formatDate, statusBadge } from '../../lib/utils';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { FileText, FileSpreadsheet, ShieldAlert, Plus, Search, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import LoanFormModal from './LoanFormModal';

export default function PinjamanListPage() {
  const [loans, setLoans] = useState([]);
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [ckpnLoading, setCkpnLoading] = useState(false);
  const toast = useToast();
  const { isRole } = useAuth();

  const fetchLoans = async (p = page, q = search, s = status) => {
    setLoading(true);
    try {
      const params = { page: p, per_page: 15 };
      if (q) params.search = q;
      if (s) params.status = s;
      const res = await api.get('/loans', { params });
      setLoans(res.data.data);
      setMeta(res.data.meta || {});
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchLoans(); }, [page]);

  const handleSearch = (e) => { e.preventDefault(); setPage(1); fetchLoans(1, search, status); };
  const handleCreated = () => { setShowForm(false); fetchLoans(1, '', ''); };

  const handleRunCKPN = async () => {
    if (!confirm('Jalankan perhitungan CKPN? Ini akan memperbarui kolektibilitas dan provisioning semua pinjaman aktif.')) return;
    setCkpnLoading(true);
    try {
      const period = new Date().toISOString().split('T')[0];
      const res = await api.post('/loans/ckpn', { period });
      const data = res.data.data || res.data;
      toast.success(`CKPN selesai — ${data.processed || 0} pinjaman diproses, total provisi: Rp ${(data.total_provision || 0).toLocaleString('id-ID')}`);
      fetchLoans();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menjalankan CKPN');
    }
    setCkpnLoading(false);
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Pinjaman</h1>
          <p className="page-subtitle">Kelola pengajuan dan angsuran pinjaman anggota</p>
        </div>
        <div className="flex gap-sm">
          {isRole('ADMIN', 'ACCOUNTANT') && (
            <button className="btn btn-secondary" onClick={handleRunCKPN} disabled={ckpnLoading}>
              <ShieldAlert size={16} /> {ckpnLoading ? 'Memproses...' : 'Run CKPN'}
            </button>
          )}

          <button className="btn btn-outline btn-sm" onClick={async () => {
             const url = api.defaults.baseURL.replace('/api', '') + '/api/export/loans/excel';
             window.open(url, '_blank');
          }}><FileSpreadsheet size={16} /> Excel</button>

          <button className="btn btn-outline btn-sm" onClick={async () => {
             const url = api.defaults.baseURL.replace('/api', '') + '/api/export/loans/pdf';
             window.open(url, '_blank');
          }}><FileText size={16} /> PDF</button>

          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            <Plus size={16} /> Ajukan Pinjaman
          </button>
        </div>
      </div>

      <div className="toolbar">
        <form onSubmit={handleSearch} className="search-wrapper">
          <Search size={16} />
          <input className="search-input" placeholder="Cari nama / no. pinjaman..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </form>
        <select className="form-input form-select" style={{ width: 160 }}
          value={status} onChange={e => { setStatus(e.target.value); setPage(1); fetchLoans(1, search, e.target.value); }}>
          <option value="">Semua Status</option>
          <option value="PENDING">Pending (Manajer)</option>
          <option value="WAITING_CHAIRMAN_APPROVAL">Menunggu Ketua</option>
          <option value="APPROVED">Approved</option>
          <option value="ACTIVE">Aktif</option>
          <option value="PAID_OFF">Lunas</option>
          <option value="DEFAULTED">Macet</option>
          <option value="REJECTED">Ditolak</option>
        </select>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>No. Pinjaman</th>
                <th>Anggota</th>
                <th>Tgl Pengajuan</th>
                <th className="text-right">Plafon</th>
                <th className="text-right">Sisa</th>
                <th>Status</th>
                <th style={{ width: 60 }}></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center" style={{ padding: '2rem' }}>
                  <div className="spinner" style={{ margin: '0 auto' }} />
                </td></tr>
              ) : loans.length === 0 ? (
                <tr><td colSpan={7} className="text-center text-muted" style={{ padding: '2rem' }}>
                  Tidak ada data pinjaman
                </td></tr>
              ) : loans.map(loan => (
                <tr key={loan.id}>
                  <td><span className="font-mono">{loan.loan_number}</span></td>
                  <td>
                    <strong>{loan.member?.name || '-'}</strong>
                    <div className="text-xs text-muted">{loan.member?.member_number}</div>
                  </td>
                  <td>{formatDate(loan.created_at)}</td>
                  <td className="text-right font-mono">{formatRupiah(loan.principal_amount)}</td>
                  <td className="text-right font-mono">{formatRupiah(loan.remaining_balance)}</td>
                  <td>
                    <span className={`badge badge-${statusBadge(loan.status)}`}>
                      {loan.status === 'WAITING_CHAIRMAN_APPROVAL' ? 'Menunggu Ketua' : loan.status}
                    </span>
                  </td>
                  <td>
                    <Link to={`/pinjaman/${loan.id}`} className="btn btn-ghost btn-sm btn-icon" title="Detail">
                      <Eye size={16} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {meta.last_page > 1 && (
          <div className="pagination" style={{ padding: '0.75rem 1rem' }}>
            <span>Hal {meta.current_page} dari {meta.last_page} ({meta.total} data)</span>
            <div className="pagination-buttons">
              <button className="btn btn-ghost btn-sm" disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}><ChevronLeft size={14} /> Prev</button>
              <button className="btn btn-ghost btn-sm" disabled={page >= meta.last_page}
                onClick={() => setPage(p => p + 1)}>Next <ChevronRight size={14} /></button>
            </div>
          </div>
        )}
      </div>

      {showForm && <LoanFormModal onClose={() => setShowForm(false)} onSuccess={handleCreated} />}
    </div>
  );
}
