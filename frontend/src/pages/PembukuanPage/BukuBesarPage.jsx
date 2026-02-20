import { useState, useEffect } from 'react';
import api from '../../lib/api';
import { formatRupiah, formatDate } from '../../lib/utils';
import { BookOpen, Printer, Search, ArrowDownCircle, ArrowUpCircle, Scale, Hash } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import './BukuBesarPage.css';

export default function BukuBesarPage() {
  const toast = useToast();

  // Account list
  const [accounts, setAccounts] = useState([]);

  // Selected state
  const [selectedCode, setSelectedCode] = useState('');
  const [startDate, setStartDate] = useState(new Date().getFullYear() + '-01-01');
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  // Ledger data
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // Load COA on mount
  useEffect(() => {
    api.get('/accounting/coa', { params: { active_only: true } })
      .then(res => setAccounts(res.data.data || []))
      .catch(() => toast.error('Gagal memuat daftar akun'));
  }, []);

  const selectedAccount = accounts.find(a => a.code === selectedCode);

  const fetchLedger = async () => {
    if (!selectedCode) {
      toast.error('Pilih akun terlebih dahulu');
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      const res = await api.get(`/accounting/ledger/${selectedCode}`, {
        params: { start_date: startDate, end_date: endDate },
      });
      const ledgerData = res.data.data || {};
      setEntries(ledgerData.entries || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal memuat buku besar');
      setEntries([]);
    }
    setLoading(false);
  };

  // Summary calculations
  const totalDebit = entries.reduce((s, e) => s + (parseFloat(e.debit) || 0), 0);
  const totalCredit = entries.reduce((s, e) => s + (parseFloat(e.credit) || 0), 0);
  const endingBalance = entries.length > 0 ? (parseFloat(entries[entries.length - 1].balance) || 0) : 0;

  return (
    <div className="page">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Buku Besar</h1>
          <p className="page-subtitle">Riwayat transaksi per akun dengan saldo berjalan</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="buku-besar-toolbar">
        <div className="form-group" style={{ flex: 1, minWidth: 250 }}>
          <label className="form-label">Akun</label>
          <select
            className="form-input"
            value={selectedCode}
            onChange={e => setSelectedCode(e.target.value)}
          >
            <option value="">— Pilih Akun —</option>
            {accounts.map(a => (
              <option key={a.id} value={a.code}>
                {a.code} — {a.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Dari</label>
          <input type="date" className="form-input"
            value={startDate} onChange={e => setStartDate(e.target.value)} />
        </div>

        <div className="form-group">
          <label className="form-label">Sampai</label>
          <input type="date" className="form-input"
            value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>

        <div className="toolbar-actions">
          <button className="btn btn-primary" onClick={fetchLedger} disabled={loading}>
            <Search size={16} /> {loading ? 'Memuat...' : 'Tampilkan'}
          </button>
          {entries.length > 0 && (
            <button className="btn btn-ghost no-print" onClick={() => window.print()}>
              <Printer size={16} /> Cetak
            </button>
          )}
        </div>
      </div>

      {/* Account Info + Summary */}
      {searched && selectedAccount && entries.length > 0 && (
        <>
          <div className="bb-account-header">
            <span className="bb-account-code">{selectedAccount.code}</span>
            <span className="bb-account-name">{selectedAccount.name}</span>
            <span className="bb-account-category">
              {selectedAccount.category} · Saldo Normal: {selectedAccount.normal_balance}
            </span>
          </div>

          <div className="buku-besar-summary">
            <div className="bb-summary-card bb-count">
              <span className="bb-label">Jumlah Transaksi</span>
              <span className="bb-value">{entries.length}</span>
            </div>
            <div className="bb-summary-card bb-debit">
              <span className="bb-label">Total Debit</span>
              <span className="bb-value">{formatRupiah(totalDebit)}</span>
            </div>
            <div className="bb-summary-card bb-credit">
              <span className="bb-label">Total Kredit</span>
              <span className="bb-value">{formatRupiah(totalCredit)}</span>
            </div>
            <div className="bb-summary-card bb-balance">
              <span className="bb-label">Saldo Akhir</span>
              <span className="bb-value">{formatRupiah(endingBalance)}</span>
            </div>
          </div>
        </>
      )}

      {/* Table */}
      {loading ? (
        <div className="page-loading" style={{ minHeight: 200 }}>
          <div className="spinner" />
          <span>Memuat buku besar...</span>
        </div>
      ) : !searched ? (
        <div className="empty-state" style={{ minHeight: '40vh' }}>
          <BookOpen size={48} />
          <h2>Pilih Akun</h2>
          <p className="text-muted">Pilih akun dan periode tanggal, lalu klik "Tampilkan" untuk melihat buku besar.</p>
        </div>
      ) : entries.length === 0 ? (
        <div className="empty-state" style={{ minHeight: '30vh' }}>
          <BookOpen size={48} />
          <h2>Tidak Ada Transaksi</h2>
          <p className="text-muted">Tidak ditemukan transaksi untuk akun ini pada periode yang dipilih.</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 100 }}>Tanggal</th>
                  <th style={{ width: 130 }}>No. Jurnal</th>
                  <th>Keterangan</th>
                  <th className="text-right" style={{ width: 130 }}>Debit</th>
                  <th className="text-right" style={{ width: 130 }}>Kredit</th>
                  <th className="text-right" style={{ width: 140 }}>Saldo</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, i) => (
                  <tr key={i}>
                    <td className="text-sm">{formatDate(entry.date || entry.transaction_date)}</td>
                    <td className="font-mono text-sm">{entry.entry_number || '-'}</td>
                    <td className="text-sm">{entry.description || '-'}</td>
                    <td className="text-right font-mono">
                      {entry.debit ? formatRupiah(entry.debit) : '-'}
                    </td>
                    <td className="text-right font-mono">
                      {entry.credit ? formatRupiah(entry.credit) : '-'}
                    </td>
                    <td className="text-right font-mono font-bold">
                      {formatRupiah(entry.balance || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ fontWeight: 700, background: 'var(--bg-elevated)' }}>
                  <td colSpan={3} className="text-right">Total</td>
                  <td className="text-right font-mono">{formatRupiah(totalDebit)}</td>
                  <td className="text-right font-mono">{formatRupiah(totalCredit)}</td>
                  <td className="text-right font-mono" style={{ color: 'var(--success)' }}>
                    {formatRupiah(endingBalance)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
