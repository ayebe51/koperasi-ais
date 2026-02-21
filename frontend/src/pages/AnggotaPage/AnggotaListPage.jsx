import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api, { downloadExport } from '../../lib/api';
import { formatDate, statusBadge } from '../../lib/utils';
import { useToast } from '../../contexts/ToastContext';
import { FileText, FileSpreadsheet } from 'lucide-react';
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

  const handleCreateAccount = async (member) => {
    try {
      const res = await api.post(`/members/${member.id}/create-account`);
      const d = res.data.data;
      toast.success(
        `Akun portal berhasil dibuat!\nEmail: ${d.email}\nPassword: ${d.default_password}`,
        { duration: 15000 }
      );
      fetchMembers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal membuat akun portal');
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Keanggotaan</h1>
          <p className="page-subtitle">Kelola data anggota koperasi</p>
        </div>
        <div className="flex gap-sm">
          <button className="btn btn-outline btn-sm" onClick={async () => {
             const url = api.defaults.baseURL.replace('/api', '') + '/api/export/members/excel';
             window.open(url, '_blank');
          }}><FileSpreadsheet size={16} /> Excel</button>

          <button className="btn btn-outline btn-sm" onClick={async () => {
             const url = api.defaults.baseURL.replace('/api', '') + '/api/export/members/pdf';
             window.open(url, '_blank');
          }}><FileText size={16} /> PDF</button>

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
                <th>Akun</th>
                <th style={{ width: 60 }}></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center" style={{ padding: '2rem' }}>
                  <div className="spinner" style={{ margin: '0 auto' }} />
                </td></tr>
              ) : members.length === 0 ? (
                <tr><td colSpan={7} className="text-center text-muted" style={{ padding: '2rem' }}>
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
                    {m.has_account ? (
                      <span className="badge badge-success" title="Sudah punya akun portal">
                        <UserCheck size={12} /> Aktif
                      </span>
                    ) : (
                      <button className="btn btn-ghost btn-sm" title="Buatkan Akun Portal"
                        style={{ fontSize: '0.75rem', gap: '0.25rem' }}
                        onClick={() => handleCreateAccount(m)}>
                        <UserPlus size={14} /> Buat Akun
                      </button>
                    )}
                  </td>
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
