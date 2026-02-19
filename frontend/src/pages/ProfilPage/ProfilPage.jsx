import { useState, useEffect } from 'react';
import api from '../../lib/api';
import { formatRupiah, formatDate } from '../../lib/utils';
import {
  User, Wallet, Landmark, ChevronDown, ChevronUp,
  ArrowDownCircle, ArrowUpCircle, ChevronLeft, ChevronRight
} from 'lucide-react';
import './ProfilPage.css';

export default function ProfilPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingsTab, setSavingsTab] = useState('all');
  const [savingsData, setSavingsData] = useState([]);
  const [savingsMeta, setSavingsMeta] = useState({});
  const [savingsPage, setSavingsPage] = useState(1);
  const [savingsLoading, setSavingsLoading] = useState(false);
  const [openSchedules, setOpenSchedules] = useState({});

  // Fetch dashboard summary
  useEffect(() => {
    api.get('/me/dashboard')
      .then(res => setData(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Fetch savings history
  const fetchSavings = async (page = 1, type = savingsTab) => {
    setSavingsLoading(true);
    try {
      const params = { page, per_page: 10 };
      if (type !== 'all') params.type = type;
      const res = await api.get('/me/savings', { params });
      setSavingsData(res.data.data);
      setSavingsMeta(res.data.meta || {});
    } catch {}
    setSavingsLoading(false);
  };

  useEffect(() => { fetchSavings(1, savingsTab); }, [savingsTab]);

  const toggleSchedule = (loanId) => {
    setOpenSchedules(prev => ({ ...prev, [loanId]: !prev[loanId] }));
  };

  if (loading) {
    return (
      <div className="page-loading">
        <div className="spinner" />
        <span>Memuat data Anda...</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="page">
        <div className="empty-state" style={{ minHeight: '60vh' }}>
          <User size={48} />
          <h2>Data Anggota Tidak Ditemukan</h2>
          <p className="text-muted">Akun Anda belum terhubung ke data keanggotaan koperasi. Hubungi admin.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      {/* Welcome Banner */}
      <div className="portal-welcome">
        <div className="portal-avatar">{data.member.name?.charAt(0) || 'A'}</div>
        <div className="portal-info">
          <h2>{data.member.name}</h2>
          <p>No. Anggota: {data.member.member_number} &nbsp;·&nbsp; {data.member.unit_kerja || '-'}</p>
          <p>Bergabung sejak {formatDate(data.member.join_date)}</p>
        </div>
      </div>

      {/* Savings Summary */}
      <div className="section-header">
        <Wallet size={20} />
        <h2>Ringkasan Simpanan</h2>
      </div>
      <div className="savings-cards">
        <div className="saving-card">
          <div className="label">Simpanan Pokok</div>
          <div className="amount">{formatRupiah(data.savings.pokok)}</div>
        </div>
        <div className="saving-card">
          <div className="label">Simpanan Wajib</div>
          <div className="amount">{formatRupiah(data.savings.wajib)}</div>
        </div>
        <div className="saving-card">
          <div className="label">Simpanan Sukarela</div>
          <div className="amount">{formatRupiah(data.savings.sukarela)}</div>
        </div>
        <div className="saving-card total">
          <div className="label">Total Simpanan</div>
          <div className="amount">{formatRupiah(data.savings.total)}</div>
        </div>
      </div>

      {/* Active Loans */}
      {data.active_loans.length > 0 && (
        <>
          <div className="section-header">
            <Landmark size={20} />
            <h2>Pinjaman Aktif</h2>
          </div>
          {data.active_loans.map(loan => (
            <div key={loan.id} className="loan-card">
              <div className="loan-card-header">
                <h3>{loan.loan_number}</h3>
                <span className={`badge badge-${loan.status === 'ACTIVE' ? 'success' : loan.status === 'PENDING' ? 'warning' : 'info'}`}>
                  {loan.status}
                </span>
              </div>
              <div className="loan-detail-grid">
                <div className="loan-detail-item">
                  <div className="label">Pokok Pinjaman</div>
                  <div className="value">{formatRupiah(loan.principal_amount)}</div>
                </div>
                <div className="loan-detail-item">
                  <div className="label">Sisa Pinjaman</div>
                  <div className="value">{formatRupiah(loan.outstanding_balance)}</div>
                </div>
                <div className="loan-detail-item">
                  <div className="label">Angsuran / Bulan</div>
                  <div className="value">{formatRupiah(loan.monthly_payment)}</div>
                </div>
                <div className="loan-detail-item">
                  <div className="label">Tenor</div>
                  <div className="value">{loan.term_months} bulan</div>
                </div>
                <div className="loan-detail-item">
                  <div className="label">Bunga</div>
                  <div className="value">{loan.interest_rate}%</div>
                </div>
                <div className="loan-detail-item">
                  <div className="label">Jatuh Tempo</div>
                  <div className="value">{formatDate(loan.due_date)}</div>
                </div>
              </div>
            </div>
          ))}
        </>
      )}

      {/* Savings Transaction History */}
      <div className="section-header" style={{ marginTop: 'var(--space-lg)' }}>
        <Wallet size={20} />
        <h2>Riwayat Transaksi Simpanan</h2>
      </div>

      {/* Type filter tabs */}
      <div className="flex gap-sm" style={{ marginBottom: 'var(--space-md)', flexWrap: 'wrap' }}>
        {[
          { key: 'all', label: 'Semua' },
          { key: 'POKOK', label: 'Pokok' },
          { key: 'WAJIB', label: 'Wajib' },
          { key: 'SUKARELA', label: 'Sukarela' },
        ].map(tab => (
          <button
            key={tab.key}
            className={`btn btn-sm ${savingsTab === tab.key ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => { setSavingsTab(tab.key); setSavingsPage(1); }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Jenis</th>
                <th>Tipe</th>
                <th className="text-right">Jumlah</th>
                <th className="text-right">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {savingsLoading ? (
                <tr><td colSpan={5} className="text-center" style={{ padding: '2rem' }}>
                  <div className="spinner" style={{ margin: '0 auto' }} />
                </td></tr>
              ) : savingsData.length === 0 ? (
                <tr><td colSpan={5} className="text-center text-muted" style={{ padding: '2rem' }}>
                  Belum ada transaksi simpanan
                </td></tr>
              ) : savingsData.map(tx => (
                <tr key={tx.id}>
                  <td>{formatDate(tx.transaction_date)}</td>
                  <td><span className="badge badge-info">{tx.type}</span></td>
                  <td>
                    <span className={`badge ${tx.transaction_type === 'DEPOSIT' ? 'badge-success' : 'badge-warning'}`}>
                      {tx.transaction_type === 'DEPOSIT' ? '↓ Setor' : '↑ Tarik'}
                    </span>
                  </td>
                  <td className="text-right font-mono">{formatRupiah(tx.amount)}</td>
                  <td className="text-right font-mono">{formatRupiah(tx.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {savingsMeta.last_page > 1 && (
          <div className="pagination" style={{ padding: '0.75rem 1rem' }}>
            <span>Hal {savingsMeta.current_page} dari {savingsMeta.last_page}</span>
            <div className="pagination-buttons">
              <button className="btn btn-ghost btn-sm" disabled={savingsPage <= 1}
                onClick={() => { setSavingsPage(p => p - 1); fetchSavings(savingsPage - 1); }}>
                <ChevronLeft size={14} /> Prev
              </button>
              <button className="btn btn-ghost btn-sm" disabled={savingsPage >= savingsMeta.last_page}
                onClick={() => { setSavingsPage(p => p + 1); fetchSavings(savingsPage + 1); }}>
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
