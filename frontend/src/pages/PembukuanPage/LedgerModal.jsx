import { useState, useEffect } from 'react';
import api from '../../lib/api';
import { formatRupiah, formatDate } from '../../lib/utils';
import { X, BookOpen } from 'lucide-react';

export default function LedgerModal({ account, onClose }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(new Date().getFullYear() + '-01-01');
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const fetchLedger = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/accounting/ledger/${account.code}`, {
        params: { start_date: startDate, end_date: endDate },
      });
      setEntries(res.data.data || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchLedger(); }, []);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 720 }}>
        <div className="modal-header">
          <div>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BookOpen size={18} /> Buku Besar
            </h3>
            <p className="text-sm text-muted" style={{ marginTop: '0.25rem' }}>
              {account.code} — {account.name}
            </p>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="modal-body">
          <div className="flex gap-sm items-center" style={{ marginBottom: 'var(--space-md)' }}>
            <input type="date" className="form-input" style={{ width: 140 }}
              value={startDate} onChange={e => setStartDate(e.target.value)} />
            <span className="text-muted text-sm">s/d</span>
            <input type="date" className="form-input" style={{ width: 140 }}
              value={endDate} onChange={e => setEndDate(e.target.value)} />
            <button className="btn btn-primary btn-sm" onClick={fetchLedger}>Filter</button>
          </div>

          {loading ? (
            <div className="page-loading" style={{ minHeight: 150 }}>
              <div className="spinner" />
            </div>
          ) : entries.length === 0 ? (
            <p className="text-muted text-center" style={{ padding: '2rem' }}>
              Tidak ada transaksi pada periode ini
            </p>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th>No. Jurnal</th>
                    <th>Keterangan</th>
                    <th className="text-right">Debit</th>
                    <th className="text-right">Kredit</th>
                    <th className="text-right">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e, i) => (
                    <tr key={i}>
                      <td className="text-sm">{formatDate(e.date || e.transaction_date)}</td>
                      <td className="font-mono text-sm">{e.entry_number || '-'}</td>
                      <td className="text-sm">{e.description || '-'}</td>
                      <td className="text-right font-mono">{e.debit ? formatRupiah(e.debit) : '-'}</td>
                      <td className="text-right font-mono">{e.credit ? formatRupiah(e.credit) : '-'}</td>
                      <td className="text-right font-mono font-bold">{formatRupiah(e.balance || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
