import { useState, useEffect, Fragment } from 'react';
import api from '../../lib/api';
import { formatRupiah, formatDate } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { FileText, ChevronLeft, ChevronRight, Eye, Plus, RotateCcw, Trash2 } from 'lucide-react';
import JournalFormModal from './JournalFormModal';
import ConfirmDialog from '../../components/ConfirmDialog/ConfirmDialog';

export default function JurnalPage() {
  const [journals, setJournals] = useState([]);
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const { isRole } = useAuth();
  const toast = useToast();

  const fetchJournals = () => {
    setLoading(true);
    api.get('/accounting/journals', { params: { page, per_page: 15 } })
      .then(res => { setJournals(res.data.data); setMeta(res.data.meta || {}); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchJournals(); }, [page]);

  const toggleExpand = (id) => setExpanded(prev => prev === id ? null : id);

  const handleSuccess = () => {
    setShowForm(false);
    fetchJournals();
  };

  const handleReverse = async (journal) => {
    setConfirmAction({
      title: 'Reverse Jurnal',
      message: `Yakin ingin me-reverse jurnal "${journal.entry_number}"? Ini akan membuat jurnal pembalikan otomatis.`,
      confirmText: 'Reverse',
      variant: 'warning',
      onConfirm: async () => {
        setActionLoading(true);
        try {
          await api.post(`/accounting/journals/${journal.id}/reverse`, { reason: 'Koreksi manual' });
          toast.success('Jurnal berhasil di-reverse');
          setConfirmAction(null);
          fetchJournals();
        } catch (err) {
          toast.error(err.response?.data?.message || 'Gagal reverse jurnal');
        }
        setActionLoading(false);
      },
    });
  };

  const handleDelete = async (journal) => {
    setConfirmAction({
      title: 'Hapus Jurnal',
      message: `Yakin ingin menghapus jurnal "${journal.entry_number}"? Tindakan ini tidak dapat dibatalkan.`,
      confirmText: 'Hapus',
      variant: 'danger',
      onConfirm: async () => {
        setActionLoading(true);
        try {
          await api.delete(`/accounting/journals/${journal.id}`);
          toast.success('Jurnal berhasil dihapus');
          setConfirmAction(null);
          fetchJournals();
        } catch (err) {
          toast.error(err.response?.data?.message || 'Gagal menghapus jurnal');
        }
        setActionLoading(false);
      },
    });
  };

  // Helper: compute total debit from lines
  const getTotalDebit = (journal) => {
    if (journal.lines && journal.lines.length > 0) {
      return journal.lines.reduce((sum, l) => sum + parseFloat(l.debit || 0), 0);
    }
    return 0;
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Jurnal Umum</h1>
          <p className="page-subtitle">Catatan seluruh transaksi koperasi</p>
        </div>
        {isRole('ADMIN', 'ACCOUNTANT') && (
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            <Plus size={16} /> Buat Jurnal
          </button>
        )}
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>No. Jurnal</th>
                <th>Tanggal</th>
                <th>Keterangan</th>
                <th className="text-right">Jumlah</th>
                <th>Status</th>
                <th style={{ width: 120 }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center" style={{ padding: '2rem' }}>
                  <div className="spinner" style={{ margin: '0 auto' }} />
                </td></tr>
              ) : journals.length === 0 ? (
                <tr><td colSpan={6} className="text-center text-muted" style={{ padding: '2rem' }}>
                  Belum ada jurnal
                </td></tr>
              ) : journals.map(j => (
                <Fragment key={j.id}>
                  <tr style={{ cursor: 'pointer' }} onClick={() => toggleExpand(j.id)}>
                    <td><span className="font-mono">{j.entry_number}</span></td>
                    <td>{formatDate(j.entry_date || j.transaction_date)}</td>
                    <td>
                      {j.description}
                      {j.is_reversed && <span className="badge badge-neutral" style={{ marginLeft: 6 }}>Reversed</span>}
                    </td>
                    <td className="text-right font-mono">{formatRupiah(getTotalDebit(j))}</td>
                    <td>
                      <span className={`badge badge-${j.is_posted ? 'success' : 'warning'}`}>
                        {j.is_posted ? 'Posted' : 'Draft'}
                      </span>
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      <div className="flex gap-xs">
                        <button className="btn btn-ghost btn-sm btn-icon" title="Detail"
                          onClick={() => toggleExpand(j.id)}>
                          <Eye size={14} />
                        </button>
                        {isRole('ADMIN', 'ACCOUNTANT') && !j.is_reversed && j.is_posted && (
                          <button className="btn btn-ghost btn-sm btn-icon" title="Reverse jurnal"
                            onClick={() => handleReverse(j)} style={{ color: 'var(--warning)' }}>
                            <RotateCcw size={14} />
                          </button>
                        )}
                        {isRole('ADMIN', 'ACCOUNTANT') && !j.is_posted && (
                          <button className="btn btn-ghost btn-sm btn-icon" title="Hapus jurnal draft"
                            onClick={() => handleDelete(j)} style={{ color: 'var(--danger)' }}>
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {expanded === j.id && j.lines && (
                    <tr>
                      <td colSpan={6} style={{ padding: 0, background: 'var(--bg-primary)' }}>
                        <table className="data-table" style={{ margin: '0.5rem 1rem', width: 'calc(100% - 2rem)' }}>
                          <thead>
                            <tr>
                              <th>Kode</th>
                              <th>Akun</th>
                              <th className="text-right">Debit</th>
                              <th className="text-right">Kredit</th>
                            </tr>
                          </thead>
                          <tbody>
                            {j.lines.map((line, i) => (
                              <tr key={line.id || i}>
                                <td className="font-mono text-sm">{line.account?.code || '-'}</td>
                                <td className="text-sm">{line.account?.name || '-'}</td>
                                <td className="text-right font-mono">{parseFloat(line.debit) > 0 ? formatRupiah(line.debit) : '-'}</td>
                                <td className="text-right font-mono">{parseFloat(line.credit) > 0 ? formatRupiah(line.credit) : '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {meta.last_page > 1 && (
          <div className="pagination" style={{ padding: '0.75rem 1rem' }}>
            <span>Hal {meta.current_page} dari {meta.last_page}</span>
            <div className="pagination-buttons">
              <button className="btn btn-ghost btn-sm" disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}><ChevronLeft size={14} /> Prev</button>
              <button className="btn btn-ghost btn-sm" disabled={page >= meta.last_page}
                onClick={() => setPage(p => p + 1)}>Next <ChevronRight size={14} /></button>
            </div>
          </div>
        )}
      </div>

      {showForm && <JournalFormModal onClose={() => setShowForm(false)} onSuccess={handleSuccess} />}

      {confirmAction && (
        <ConfirmDialog
          title={confirmAction.title}
          message={confirmAction.message}
          confirmText={confirmAction.confirmText}
          variant={confirmAction.variant}
          loading={actionLoading}
          onConfirm={confirmAction.onConfirm}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  );
}
