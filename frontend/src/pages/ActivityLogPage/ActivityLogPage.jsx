import { useState, useEffect } from 'react';
import api from '../../lib/api';
import { formatDate } from '../../lib/utils';
import { Activity, Filter } from 'lucide-react';
import Pagination from '../../components/Pagination/Pagination';
import EmptyState from '../../components/EmptyState/EmptyState';

const TYPE_LABELS = {
  member: { label: 'Anggota', color: 'info' },
  loan: { label: 'Pinjaman', color: 'purple' },
  saving: { label: 'Simpanan', color: 'success' },
  payment: { label: 'Pembayaran', color: 'warning' },
  user: { label: 'User', color: 'danger' },
  settings: { label: 'Pengaturan', color: 'info' },
};

export default function ActivityLogPage() {
  const [logs, setLogs] = useState([]);
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState('');

  const fetchLogs = async (p = page, t = typeFilter) => {
    setLoading(true);
    try {
      const params = { page: p, per_page: 20 };
      if (t) params.type = t;
      const res = await api.get('/activity-logs', { params });
      setLogs(res.data.data);
      setMeta(res.data.meta || {});
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchLogs(); }, [page]);

  const handleFilter = (type) => {
    setTypeFilter(type);
    setPage(1);
    fetchLogs(1, type);
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Log Aktivitas</h1>
          <p className="page-subtitle">Riwayat aksi pengguna dalam sistem</p>
        </div>
      </div>

      <div className="toolbar">
        <div className="flex gap-sm" style={{ flexWrap: 'wrap' }}>
          <button className={`btn btn-sm ${!typeFilter ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => handleFilter('')}>Semua</button>
          {Object.entries(TYPE_LABELS).map(([key, val]) => (
            <button key={key} className={`btn btn-sm ${typeFilter === key ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => handleFilter(key)}>{val.label}</button>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 160 }}>Waktu</th>
                <th style={{ width: 100 }}>Tipe</th>
                <th>Deskripsi</th>
                <th style={{ width: 140 }}>User</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="text-center" style={{ padding: '2rem' }}>
                  <div className="spinner" style={{ margin: '0 auto' }} />
                </td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={4}>
                  <EmptyState icon={Activity} title="Belum ada aktivitas" message="Log aktivitas akan muncul setelah pengguna melakukan aksi" />
                </td></tr>
              ) : logs.map(log => {
                const typeInfo = TYPE_LABELS[log.type] || { label: log.type, color: 'info' };
                return (
                  <tr key={log.id}>
                    <td className="text-sm text-muted">
                      {new Date(log.created_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td><span className={`badge badge-${typeInfo.color}`}>{typeInfo.label}</span></td>
                    <td>{log.description}</td>
                    <td className="text-sm">{log.user_name || '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={meta.current_page}
          lastPage={meta.last_page}
          total={meta.total}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}
