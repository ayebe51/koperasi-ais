import { useState, useEffect } from 'react';
import api from '../../lib/api';
import { formatRupiah, formatDate } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { FileText, Search, ChevronLeft, ChevronRight, Eye, Plus } from 'lucide-react';
import JournalFormModal from './JournalFormModal';

export default function JurnalPage() {
  const [journals, setJournals] = useState([]);
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const { isRole } = useAuth();

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
                <th style={{ width: 60 }}></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center" style={{ padding: '2rem' }}>
                  <div className="spinner" style={{ margin: '0 auto' }} />
                </td></tr>
              ) : journals.length === 0 ? (
                <tr><td colSpan={5} className="text-center text-muted" style={{ padding: '2rem' }}>
                  Belum ada jurnal
                </td></tr>
              ) : journals.map(j => (
                <>
                  <tr key={j.id} style={{ cursor: 'pointer' }} onClick={() => toggleExpand(j.id)}>
                    <td><span className="font-mono">{j.entry_number}</span></td>
                    <td>{formatDate(j.transaction_date)}</td>
                    <td>{j.description}</td>
                    <td className="text-right font-mono">{formatRupiah(j.total_debit || j.lines?.reduce((s, l) => l.type === 'DEBIT' ? s + parseFloat(l.amount) : s, 0))}</td>
                    <td>
                      <button className="btn btn-ghost btn-sm btn-icon"><Eye size={14} /></button>
                    </td>
                  </tr>
                  {expanded === j.id && j.lines && (
                    <tr key={`${j.id}-detail`}>
                      <td colSpan={5} style={{ padding: 0, background: 'var(--bg-primary)' }}>
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
                              <tr key={i}>
                                <td className="font-mono text-sm">{line.account?.code || '-'}</td>
                                <td className="text-sm">{line.account?.name || '-'}</td>
                                <td className="text-right font-mono">{line.type === 'DEBIT' ? formatRupiah(line.amount) : '-'}</td>
                                <td className="text-right font-mono">{line.type === 'CREDIT' ? formatRupiah(line.amount) : '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </>
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
    </div>
  );
}
