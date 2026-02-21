import { useState, useEffect } from 'react';
import api, { downloadExport } from '../../lib/api';
import { formatRupiah, formatDate, statusBadge } from '../../lib/utils';
import { Wallet, Plus, Search, ArrowDownCircle, ArrowUpCircle, ChevronLeft, ChevronRight, Download, Printer, FileText, FileSpreadsheet } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import SavingFormModal from './SavingFormModal';
import ReceiptModal from '../../components/Receipt/ReceiptModal';
import './SimpananPage.css';

export default function SimpananPage() {
  const [transactions, setTransactions] = useState([]);
  const [balances, setBalances] = useState(null);
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [modalType, setModalType] = useState(null); // 'deposit' | 'withdraw'
  const [receiptId, setReceiptId] = useState(null);
  const toast = useToast();

  const fetchData = async (p = page, q = search) => {
    setLoading(true);
    try {
      const [txRes, balRes] = await Promise.all([
        api.get('/savings', { params: { page: p, search: q, per_page: 15 } }),
        api.get('/savings/summary'),
      ]);
      setTransactions(txRes.data.data);
      setMeta(txRes.data.meta || {});
      setBalances(balRes.data.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [page]);

  const handleSearch = (e) => { e.preventDefault(); setPage(1); fetchData(1, search); };
  const handleSuccess = () => { setModalType(null); fetchData(1, ''); };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Simpanan</h1>
          <p className="page-subtitle">Kelola setoran dan penarikan simpanan anggota</p>
        </div>
        <div className="flex gap-sm">
          <button className="btn btn-outline btn-sm" onClick={async () => {
             const url = api.defaults.baseURL.replace('/api', '') + '/api/export/savings/excel';
             window.open(url, '_blank');
          }}><FileSpreadsheet size={16} /> Excel</button>

          <button className="btn btn-outline btn-sm" onClick={async () => {
             const url = api.defaults.baseURL.replace('/api', '') + '/api/export/savings/pdf';
             window.open(url, '_blank');
          }}><FileText size={16} /> PDF</button>

          <button className="btn btn-primary" onClick={() => setModalType('deposit')}>
            <ArrowDownCircle size={16} /> Setor
          </button>
          <button className="btn btn-secondary" onClick={() => setModalType('withdraw')}>
            <ArrowUpCircle size={16} /> Tarik
          </button>
        </div>
      </div>

      {/* Balance summary */}
      {balances && (
        <div className="grid grid-3 savings-summary mb-4">
          <div className="stat-card teal">
            <div className="stat-icon"><Wallet size={20} /></div>
            <div className="stat-value">{formatRupiah(balances.pokok)}</div>
            <div className="stat-label">Simpanan Pokok</div>
          </div>
          <div className="stat-card purple">
            <div className="stat-icon"><Wallet size={20} /></div>
            <div className="stat-value">{formatRupiah(balances.wajib)}</div>
            <div className="stat-label">Simpanan Wajib</div>
          </div>
          <div className="stat-card green">
            <div className="stat-icon"><Wallet size={20} /></div>
            <div className="stat-value">{formatRupiah(balances.sukarela)}</div>
            <div className="stat-label">Simpanan Sukarela</div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="toolbar">
        <form onSubmit={handleSearch} className="search-wrapper">
          <Search size={16} />
          <input className="search-input" placeholder="Cari nama anggota..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </form>
      </div>

      {/* Transaction table */}
      <div className="card" style={{ padding: 0 }}>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Anggota</th>
                <th>Jenis</th>
                <th>Tipe</th>
                <th className="text-right">Jumlah</th>
                <th className="text-right">Saldo</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center" style={{ padding: '2rem' }}>
                  <div className="spinner" style={{ margin: '0 auto' }} />
                </td></tr>
              ) : transactions.length === 0 ? (
                <tr><td colSpan={7} className="text-center text-muted" style={{ padding: '2rem' }}>
                  Belum ada transaksi simpanan
                </td></tr>
              ) : transactions.map(tx => (
                <tr key={tx.id}>
                  <td>{formatDate(tx.transaction_date)}</td>
                  <td>
                    <strong>{tx.member?.name || '-'}</strong>
                    <div className="text-xs text-muted">{tx.member?.member_number}</div>
                  </td>
                  <td><span className="badge badge-info">{tx.type}</span></td>
                  <td>
                    <span className={`badge ${tx.transaction_type === 'DEPOSIT' ? 'badge-success' : 'badge-warning'}`}>
                      {tx.transaction_type === 'DEPOSIT' ? '↓ Setor' : '↑ Tarik'}
                    </span>
                  </td>
                  <td className="text-right font-mono">{formatRupiah(tx.amount)}</td>
                  <td className="text-right font-mono">{formatRupiah(tx.balance)}</td>
                  <td>
                    <button className="btn btn-ghost btn-sm btn-icon" title="Cetak Struk"
                      onClick={() => setReceiptId(tx.id)}>
                      <Printer size={14} />
                    </button>
                  </td>
                </tr>
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

      {modalType && (
        <SavingFormModal type={modalType} onClose={() => setModalType(null)} onSuccess={handleSuccess} />
      )}

      {receiptId && (
        <ReceiptModal type="saving" id={receiptId} onClose={() => setReceiptId(null)} />
      )}
    </div>
  );
}
