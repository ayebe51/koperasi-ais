import { useState, useEffect } from 'react';
import api from '../../lib/api';
import { formatDate } from '../../lib/utils';
import { useToast } from '../../contexts/ToastContext';
import {
  Users, Plus, Search, Edit2, Trash2, KeyRound,
  X, ChevronLeft, ChevronRight
} from 'lucide-react';
import './UserManagementPage.css';
import ConfirmDialog from '../../components/ConfirmDialog/ConfirmDialog';
import EmptyState from '../../components/EmptyState/EmptyState';

const ROLES = ['ADMIN', 'MANAGER', 'ACCOUNTANT', 'TELLER', 'MEMBER'];

export default function UserManagementPage() {
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');

  // Modal states
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'TELLER' });
  const [formLoading, setFormLoading] = useState(false);

  const [showResetPw, setShowResetPw] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchUsers = async (p = page, q = search, role = filterRole) => {
    setLoading(true);
    try {
      const params = { page: p, per_page: 15 };
      if (q) params.search = q;
      if (role) params.role = role;
      const res = await api.get('/users', { params });
      setUsers(res.data.data);
      setMeta(res.data.meta || {});
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, [page]);

  const handleSearch = (e) => { e.preventDefault(); setPage(1); fetchUsers(1, search, filterRole); };
  const handleFilter = (role) => { setFilterRole(role); setPage(1); fetchUsers(1, search, role); };

  const openAddModal = () => {
    setEditUser(null);
    setFormData({ name: '', email: '', password: '', role: 'TELLER' });
    setShowForm(true);
  };

  const openEditModal = (user) => {
    setEditUser(user);
    setFormData({ name: user.name, email: user.email, password: '', role: user.role });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      if (editUser) {
        await api.put(`/users/${editUser.id}`, {
          name: formData.name,
          email: formData.email,
          role: formData.role,
        });
        toast.success('User berhasil diperbarui');
      } else {
        await api.post('/users', formData);
        toast.success('User berhasil dibuat');
      }
      setShowForm(false);
      fetchUsers(1, '', '');
    } catch (err) {
      const msg = err.response?.data?.message || 'Gagal menyimpan user';
      toast.error(msg);
    }
    setFormLoading(false);
  };

  const handleDelete = async (user) => {
    setDeleteLoading(true);
    try {
      await api.delete(`/users/${user.id}`);
      toast.success('User berhasil dihapus');
      setConfirmDelete(null);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menghapus user');
    }
    setDeleteLoading(false);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setResetLoading(true);
    try {
      await api.post(`/users/${showResetPw.id}/reset-password`, { password: newPassword });
      toast.success('Password berhasil direset');
      setShowResetPw(null);
      setNewPassword('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal reset password');
    }
    setResetLoading(false);
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">Kelola akun pengguna dan hak akses</p>
        </div>
        <button className="btn btn-primary" onClick={openAddModal}>
          <Plus size={16} /> Tambah User
        </button>
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <form onSubmit={handleSearch} className="search-wrapper">
          <Search size={16} />
          <input className="search-input" placeholder="Cari nama atau email..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </form>
        <div className="flex gap-sm">
          <select className="form-input" style={{ width: 150 }}
            value={filterRole} onChange={e => handleFilter(e.target.value)}>
            <option value="">Semua Role</option>
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0 }}>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nama</th>
                <th>Email</th>
                <th>Role</th>
                <th>Terdaftar</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center" style={{ padding: '2rem' }}>
                  <div className="spinner" style={{ margin: '0 auto' }} />
                </td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={5}>
                  <EmptyState icon={Users} title="Belum ada user" message="Tambah user baru untuk mengelola akses sistem" />
                </td></tr>
              ) : users.map(u => (
                <tr key={u.id}>
                  <td><strong>{u.name}</strong></td>
                  <td className="text-sm">{u.email}</td>
                  <td><span className={`user-role-badge ${u.role}`}>{u.role}</span></td>
                  <td className="text-sm text-muted">{formatDate(u.created_at)}</td>
                  <td>
                    <div className="user-actions">
                      <button className="btn btn-ghost btn-sm btn-icon" title="Edit"
                        onClick={() => openEditModal(u)}><Edit2 size={14} /></button>
                      <button className="btn btn-ghost btn-sm btn-icon" title="Reset Password"
                        onClick={() => { setShowResetPw(u); setNewPassword(''); }}>
                        <KeyRound size={14} /></button>
                      <button className="btn btn-ghost btn-sm btn-icon" title="Hapus"
                        onClick={() => setConfirmDelete(u)}><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {meta.last_page > 1 && (
          <div className="pagination" style={{ padding: '0.75rem 1rem' }}>
            <span>Hal {meta.current_page} dari {meta.last_page} ({meta.total} user)</span>
            <div className="pagination-buttons">
              <button className="btn btn-ghost btn-sm" disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}><ChevronLeft size={14} /> Prev</button>
              <button className="btn btn-ghost btn-sm" disabled={page >= meta.last_page}
                onClick={() => setPage(p => p + 1)}>Next <ChevronRight size={14} /></button>
            </div>
          </div>
        )}
      </div>

      {/* ── Add / Edit Modal ── */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <h3>{editUser ? 'Edit User' : 'Tambah User Baru'}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowForm(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Nama Lengkap *</label>
                  <input className="form-input" required value={formData.name}
                    onChange={e => setFormData(d => ({ ...d, name: e.target.value }))} autoFocus />
                </div>
                <div className="form-group">
                  <label className="form-label">Email *</label>
                  <input className="form-input" type="email" required value={formData.email}
                    onChange={e => setFormData(d => ({ ...d, email: e.target.value }))} />
                </div>
                {!editUser && (
                  <div className="form-group">
                    <label className="form-label">Password *</label>
                    <input className="form-input" type="password" required minLength={8}
                      value={formData.password} placeholder="Minimal 8 karakter"
                      onChange={e => setFormData(d => ({ ...d, password: e.target.value }))} />
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">Role *</label>
                  <select className="form-input" required value={formData.role}
                    onChange={e => setFormData(d => ({ ...d, role: e.target.value }))}>
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Batal</button>
                <button type="submit" className="btn btn-primary" disabled={formLoading}>
                  {formLoading ? 'Menyimpan...' : (editUser ? 'Simpan' : 'Buat User')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Reset Password Modal ── */}
      {showResetPw && (
        <div className="modal-overlay" onClick={() => setShowResetPw(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h3>Reset Password</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowResetPw(null)}><X size={18} /></button>
            </div>
            <form onSubmit={handleResetPassword}>
              <div className="modal-body">
                <p className="text-sm text-muted" style={{ marginBottom: 'var(--space-md)' }}>
                  Reset password untuk <strong>{showResetPw.name}</strong> ({showResetPw.email}).
                  User akan dipaksa login ulang.
                </p>
                <div className="form-group">
                  <label className="form-label">Password Baru *</label>
                  <input className="form-input" type="password" required minLength={8}
                    value={newPassword} placeholder="Minimal 8 karakter"
                    onChange={e => setNewPassword(e.target.value)} autoFocus />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowResetPw(null)}>Batal</button>
                <button type="submit" className="btn btn-primary" disabled={resetLoading}>
                  {resetLoading ? 'Memproses...' : 'Reset Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation ── */}
      {confirmDelete && (
        <ConfirmDialog
          title="Hapus User"
          message={<>Hapus user <strong>{confirmDelete.name}</strong>? Semua token aktif akan dihapus.</>}
          confirmText="Hapus"
          variant="danger"
          loading={deleteLoading}
          onConfirm={() => handleDelete(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
