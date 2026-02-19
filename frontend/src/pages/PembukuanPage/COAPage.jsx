import { useState, useEffect } from 'react';
import api from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { BookOpen, Plus, Search, Eye } from 'lucide-react';
import COAFormModal from './COAFormModal';
import LedgerModal from './LedgerModal';

export default function COAPage() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [ledgerAccount, setLedgerAccount] = useState(null);
  const { isRole } = useAuth();

  const fetchAccounts = () => {
    setLoading(true);
    api.get('/accounting/coa').then(res => {
      setAccounts(res.data.data);
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { fetchAccounts(); }, []);

  const filtered = accounts.filter(a =>
    !search || a.code.includes(search) || a.name.toLowerCase().includes(search.toLowerCase())
  );

  const grouped = filtered.reduce((groups, acc) => {
    const cat = acc.category || 'OTHER';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(acc);
    return groups;
  }, {});

  const categoryLabels = {
    ASSET: 'Aset', LIABILITY: 'Kewajiban', EQUITY: 'Ekuitas',
    REVENUE: 'Pendapatan', EXPENSE: 'Beban', OTHER: 'Lainnya'
  };
  const categoryColors = {
    ASSET: 'teal', LIABILITY: 'amber', EQUITY: 'purple',
    REVENUE: 'green', EXPENSE: 'danger', OTHER: 'neutral'
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    fetchAccounts();
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Chart of Account</h1>
          <p className="page-subtitle">Daftar akun pembukuan koperasi</p>
        </div>
        {isRole('ADMIN', 'ACCOUNTANT') && (
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            <Plus size={16} /> Tambah Akun
          </button>
        )}
      </div>

      <div className="toolbar">
        <div className="search-wrapper">
          <Search size={16} />
          <input className="search-input" placeholder="Cari kode / nama akun..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <span className="text-sm text-muted">{filtered.length} akun</span>
      </div>

      {loading ? (
        <div className="page-loading"><div className="spinner" /></div>
      ) : (
        Object.entries(grouped).map(([cat, accs]) => (
          <div key={cat} className="card" style={{ marginBottom: 'var(--space-md)', padding: 0 }}>
            <div style={{ padding: 'var(--space-md) var(--space-lg)', borderBottom: '1px solid var(--border-color)' }}>
              <span className={`badge badge-${categoryColors[cat] || 'neutral'}`}>{categoryLabels[cat] || cat}</span>
              <span className="text-sm text-muted" style={{ marginLeft: 'var(--space-sm)' }}>{accs.length} akun</span>
            </div>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: 100 }}>Kode</th>
                    <th>Nama Akun</th>
                    <th style={{ width: 120 }}>Saldo Normal</th>
                    <th style={{ width: 80 }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {accs.map(a => (
                    <tr key={a.id}>
                      <td><span className="font-mono font-bold">{a.code}</span></td>
                      <td>{a.name}</td>
                      <td><span className="badge badge-neutral">{a.normal_balance}</span></td>
                      <td>
                        <button className="btn btn-ghost btn-sm btn-icon" title="Buku Besar"
                          onClick={() => setLedgerAccount(a)}>
                          <Eye size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}

      {showForm && (
        <COAFormModal accounts={accounts} onClose={() => setShowForm(false)} onSuccess={handleFormSuccess} />
      )}

      {ledgerAccount && (
        <LedgerModal account={ledgerAccount} onClose={() => setLedgerAccount(null)} />
      )}
    </div>
  );
}
