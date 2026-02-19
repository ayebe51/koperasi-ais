import { useState, useEffect } from 'react';
import api from '../../lib/api';
import { formatRupiah, formatDate } from '../../lib/utils';
import { ShoppingCart, Search, ChevronLeft, ChevronRight, Plus, Eye } from 'lucide-react';
import SaleFormModal from './SaleFormModal';
import SaleDetailModal from './SaleDetailModal';

export default function PenjualanPage() {
  const [sales, setSales] = useState([]);
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [detailId, setDetailId] = useState(null);

  const fetchSales = () => {
    setLoading(true);
    api.get('/store/sales', { params: { page, per_page: 15 } })
      .then(res => { setSales(res.data.data); setMeta(res.data.meta || {}); })
      .catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { fetchSales(); }, [page]);

  const handleSuccess = () => { setShowForm(false); fetchSales(); };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Penjualan</h1>
          <p className="page-subtitle">Riwayat transaksi penjualan toko</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          <Plus size={16} /> Buat Penjualan
        </button>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>No. Nota</th>
                <th>Tanggal</th>
                <th>Pembeli</th>
                <th className="text-right">Subtotal</th>
                <th className="text-right">Diskon</th>
                <th className="text-right">Total</th>
                <th>Status</th>
                <th style={{ width: 60 }}></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center" style={{ padding: '2rem' }}>
                  <div className="spinner" style={{ margin: '0 auto' }} /></td></tr>
              ) : sales.length === 0 ? (
                <tr><td colSpan={8} className="text-center text-muted" style={{ padding: '2rem' }}>
                  Belum ada penjualan</td></tr>
              ) : sales.map(s => (
                <tr key={s.id} style={{ cursor: 'pointer' }} onClick={() => setDetailId(s.id)}>
                  <td className="font-mono">{s.sale_number}</td>
                  <td>{formatDate(s.sale_date)}</td>
                  <td>{s.member?.name || 'Umum'}</td>
                  <td className="text-right font-mono">{formatRupiah(s.subtotal)}</td>
                  <td className="text-right font-mono">{formatRupiah(s.discount)}</td>
                  <td className="text-right font-mono font-bold">{formatRupiah(s.total)}</td>
                  <td><span className={`badge badge-${s.payment_status === 'PAID' ? 'success' : 'warning'}`}>
                    {s.payment_status}</span></td>
                  <td>
                    <button className="btn btn-ghost btn-sm btn-icon" title="Detail"
                      onClick={e => { e.stopPropagation(); setDetailId(s.id); }}>
                      <Eye size={14} />
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

      {showForm && <SaleFormModal onClose={() => setShowForm(false)} onSuccess={handleSuccess} />}
      {detailId && <SaleDetailModal saleId={detailId} onClose={() => setDetailId(null)} />}
    </div>
  );
}
