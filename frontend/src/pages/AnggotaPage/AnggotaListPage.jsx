import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api, { downloadExport } from '../../lib/api';
import { formatDate, statusBadge } from '../../lib/utils';
import { Users, Plus, Search, ChevronLeft, ChevronRight, Eye, Download } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import MemberFormModal from './MemberFormModal';
import './AnggotaPage.css';

export default function AnggotaListPage() {
  const [members, setMembers] = useState([]);
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const toast = useToast();

  const fetchMembers = async (p = page, q = search) => {
    setLoading(true);
    try {
      const res = await api.get('/members', { params: { page: p, search: q, per_page: 15 } });
      setMembers(res.data.data);
      setMeta(res.data.meta || {});
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchMembers(); }, [page]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchMembers(1, search);
  };

  const handleCreated = () => {
    setShowForm(false);
    fetchMembers(1, '');
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Keanggotaan</h1>
          <p className="page-subtitle">Kelola data anggota koperasi</p>
        </div>
        <div className="flex gap-sm">
          <button className="btn btn-secondary" onClick={async () => {
            try { await downloadExport('/export/members', {}, `anggota_${new Date().toISOString().slice(0,10)}.csv`); toast.success('Export anggota berhasil!'); }
            catch { toast.error('Gagal export data anggota'); }
          }}><Download size={16} /> Export CSV</button>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            <Plus size={16} /> Tambah Anggota
          </button>
        </div>
      </div>

      <div className="toolbar">
        <form onSubmit={handleSearch} className="search-wrapper">
          <Search size={16} />
          <input
            className="search-input"
            placeholder="Cari nama / no. anggota..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </form>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>No. Anggota</th>
                <th>Nama</th>
                <th>Unit Kerja</th>
                <th>Tgl Masuk</th>
                <th>Status</th>
                <th style={{ width: 60 }}></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center" style={{ padding: '2rem' }}>
                  <div className="spinner" style={{ margin: '0 auto' }} />
                </td></tr>
              ) : members.length === 0 ? (
                <tr><td colSpan={6} className="text-center text-muted" style={{ padding: '2rem' }}>
                  Tidak ada data anggota
                </td></tr>
              ) : members.map(m => (
                <tr key={m.id}>
                  <td><span className="font-mono">{m.member_number}</span></td>
                  <td><strong>{m.name}</strong></td>
                  <td>{m.unit_kerja || '-'}</td>
                  <td>{formatDate(m.join_date)}</td>
                  <td><span className={`badge badge-${statusBadge(m.status)}`}>{m.status}</span></td>
                  <td>
                    <Link to={`/anggota/${m.id}`} className="btn btn-ghost btn-sm btn-icon" title="Detail">
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
                onClick={() => setPage(p => p - 1)}>
                <ChevronLeft size={14} /> Prev
              </button>
              <button className="btn btn-ghost btn-sm" disabled={page >= meta.last_page}
                onClick={() => setPage(p => p + 1)}>
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {showForm && <MemberFormModal onClose={() => setShowForm(false)} onSuccess={handleCreated} />}
    </div>
  );
}
