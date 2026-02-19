import { useState, useEffect } from 'react';
import api from '../../lib/api';
import { formatRupiah } from '../../lib/utils';
import { Package, Search, Plus, AlertTriangle, PackagePlus, Pencil } from 'lucide-react';
import ProductFormModal from './ProductFormModal';
import StockReceiveModal from './StockReceiveModal';

export default function ProdukPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showProductForm, setShowProductForm] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [showStockReceive, setShowStockReceive] = useState(false);

  const fetchProducts = () => {
    setLoading(true);
    api.get('/store/products').then(res => setProducts(res.data.data))
      .catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { fetchProducts(); }, []);

  const handleProductSuccess = () => { setShowProductForm(false); setEditProduct(null); fetchProducts(); };
  const handleStockSuccess = () => { setShowStockReceive(false); fetchProducts(); };

  const filtered = products.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.code?.includes(search)
  );

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Produk Toko</h1>
          <p className="page-subtitle">Kelola inventaris produk unit usaha toko</p>
        </div>
        <div className="flex gap-sm">
          <button className="btn btn-secondary" onClick={() => setShowStockReceive(true)}>
            <PackagePlus size={16} /> Terima Stok
          </button>
          <button className="btn btn-primary" onClick={() => setShowProductForm(true)}>
            <Plus size={16} /> Tambah Produk
          </button>
        </div>
      </div>

      <div className="toolbar">
        <div className="search-wrapper">
          <Search size={16} />
          <input className="search-input" placeholder="Cari produk..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <span className="text-sm text-muted">{filtered.length} produk</span>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Kode</th>
                <th>Nama Produk</th>
                <th className="text-right">Harga</th>
                <th className="text-right">Stok</th>
                <th className="text-right">Nilai</th>
                <th>Status</th>
                <th style={{ width: 50 }}></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center" style={{ padding: '2rem' }}>
                  <div className="spinner" style={{ margin: '0 auto' }} /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center text-muted" style={{ padding: '2rem' }}>
                  Tidak ada produk</td></tr>
              ) : filtered.map(p => (
                <tr key={p.id}>
                  <td className="font-mono">{p.code}</td>
                  <td><strong>{p.name}</strong></td>
                  <td className="text-right font-mono">{formatRupiah(p.sell_price || p.selling_price)}</td>
                  <td className="text-right">
                    <span className={p.stock <= (p.min_stock || 5) ? 'text-warning' : ''}>
                      {p.stock <= (p.min_stock || 5) && <AlertTriangle size={12} style={{ marginRight: 4 }} />}
                      {p.stock} {p.unit || 'pcs'}
                    </span>
                  </td>
                  <td className="text-right font-mono">{formatRupiah(p.stock * (p.avg_cost || p.average_cost || 0))}</td>
                  <td>
                    <span className={`badge ${p.is_active ? 'badge-success' : 'badge-neutral'}`}>
                      {p.is_active ? 'Aktif' : 'Non-aktif'}
                    </span>
                  </td>
                  <td>
                    <button className="btn btn-ghost btn-sm btn-icon" title="Edit"
                      onClick={() => { setEditProduct(p); setShowProductForm(true); }}>
                      <Pencil size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showProductForm && (
        <ProductFormModal
          product={editProduct}
          onClose={() => { setShowProductForm(false); setEditProduct(null); }}
          onSuccess={handleProductSuccess}
        />
      )}
      {showStockReceive && (
        <StockReceiveModal onClose={() => setShowStockReceive(false)} onSuccess={handleStockSuccess} />
      )}
    </div>
  );
}
