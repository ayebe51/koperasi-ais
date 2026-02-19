import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { formatRupiah, formatDate, statusBadge } from '../../lib/utils';
import { ArrowLeft, Edit3, Trash2, Wallet, Landmark } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import MemberFormModal from './MemberFormModal';
import Breadcrumb from '../../components/Breadcrumb/Breadcrumb';
import ConfirmDialog from '../../components/ConfirmDialog/ConfirmDialog';
import './AnggotaPage.css';

export default function AnggotaDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const toast = useToast();

  const fetchMember = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/members/${id}`);
      setData(res.data.data);
    } catch { navigate('/anggota'); }
    setLoading(false);
  };

  useEffect(() => { fetchMember(); }, [id]);

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await api.delete(`/members/${id}`);
      toast.success('Anggota berhasil dihapus');
      navigate('/anggota');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menghapus anggota');
    }
    setDeleteLoading(false);
  };

  const handleUpdated = () => {
    setShowEdit(false);
    fetchMember();
  };

  if (loading) return <div className="page-loading"><div className="spinner" /><p>Memuat data...</p></div>;
  if (!data) return null;

  const member = data.member?.data || data.member || data;
  const savings = data.savings_summary || {};
  const loans = data.active_loans || [];

  return (
    <div className="page">
      <Breadcrumb
        items={[{ label: 'Keanggotaan', to: '/anggota' }]}
        current={member.name}
      />
      <div className="page-header">
        <div className="flex items-center gap-md">
          <Link to="/anggota" className="btn btn-ghost btn-icon"><ArrowLeft size={18} /></Link>
          <div>
            <h1 className="page-title">{member.name}</h1>
            <p className="page-subtitle">{member.member_number} • {member.unit_kerja || '-'}</p>
          </div>
        </div>
        <div className="flex gap-sm">
          <button className="btn btn-secondary" onClick={() => setShowEdit(true)}>
            <Edit3 size={14} /> Edit
          </button>
          <button className="btn btn-danger" onClick={() => setShowDeleteConfirm(true)}>
            <Trash2 size={14} /> Hapus
          </button>
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-3 member-detail-grid">
        {/* Profile card */}
        <div className="card member-profile-card">
          <div className="profile-header">
            <div className="profile-avatar">{member.name?.charAt(0)}</div>
            <div>
              <h3>{member.name}</h3>
              <span className={`badge badge-${statusBadge(member.status)}`}>{member.status}</span>
            </div>
          </div>
          <div className="info-rows" style={{ marginTop: 'var(--space-lg)' }}>
            <div className="info-row"><span>No. Anggota</span><strong className="font-mono">{member.member_number}</strong></div>
            <div className="info-row"><span>Tanggal Masuk</span><strong>{formatDate(member.join_date)}</strong></div>
            <div className="info-row"><span>NIK</span><strong className="font-mono">{member.nik || '-'}</strong></div>
            <div className="info-row"><span>NUPTK</span><strong className="font-mono">{member.nuptk || '-'}</strong></div>
            <div className="info-row"><span>Unit Kerja</span><strong>{member.unit_kerja || '-'}</strong></div>
            <div className="info-row"><span>Jabatan</span><strong>{member.jabatan || '-'}</strong></div>
            <div className="info-row"><span>Email</span><strong>{member.email || '-'}</strong></div>
            <div className="info-row"><span>Telepon</span><strong>{member.phone || '-'}</strong></div>
            <div className="info-row"><span>Alamat</span><strong>{member.address || '-'}</strong></div>
          </div>
        </div>

        {/* Savings summary */}
        <div className="card">
          <div className="flex items-center gap-md" style={{ marginBottom: 'var(--space-lg)' }}>
            <Wallet size={18} className="text-muted" />
            <h4>Ringkasan Simpanan</h4>
          </div>
          <div className="info-rows">
            <div className="info-row"><span>Simpanan Pokok</span><strong>{formatRupiah(savings.simpanan_pokok || 0)}</strong></div>
            <div className="info-row"><span>Simpanan Wajib</span><strong>{formatRupiah(savings.simpanan_wajib || 0)}</strong></div>
            <div className="info-row"><span>Simpanan Sukarela</span><strong>{formatRupiah(savings.simpanan_sukarela || 0)}</strong></div>
            <div className="info-row" style={{ borderTop: '2px solid var(--border-color)', paddingTop: 'var(--space-md)' }}>
              <span><strong>Total Simpanan</strong></span>
              <strong style={{ color: 'var(--primary-400)', fontSize: '1.1rem' }}>
                {formatRupiah((savings.simpanan_pokok || 0) + (savings.simpanan_wajib || 0) + (savings.simpanan_sukarela || 0))}
              </strong>
            </div>
          </div>
        </div>

        {/* Active loans */}
        <div className="card">
          <div className="flex items-center gap-md" style={{ marginBottom: 'var(--space-lg)' }}>
            <Landmark size={18} className="text-muted" />
            <h4>Pinjaman Aktif</h4>
          </div>
          {loans.length === 0 ? (
            <p className="text-muted text-sm">Tidak ada pinjaman aktif</p>
          ) : (
            <div className="info-rows">
              {loans.map(loan => (
                <div key={loan.id} className="info-row">
                  <div>
                    <Link to={`/pinjaman/${loan.id}`} className="font-mono text-sm">{loan.loan_number}</Link>
                    <div className="text-xs text-muted">{formatRupiah(loan.amount)}</div>
                  </div>
                  <strong>{formatRupiah(loan.remaining_balance)}</strong>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showEdit && <MemberFormModal member={member} onClose={() => setShowEdit(false)} onSuccess={handleUpdated} />}

      {showDeleteConfirm && (
        <ConfirmDialog
          title="Hapus Anggota"
          message={<>Yakin ingin menghapus anggota <strong>{member.name}</strong>? Data simpanan dan pinjaman terkait juga akan terpengaruh.</>}
          confirmText="Hapus"
          variant="danger"
          loading={deleteLoading}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  );
}
