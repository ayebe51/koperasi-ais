import { useState, useEffect } from 'react';
import api from '../../lib/api';
import { formatRupiah } from '../../lib/utils';
import { X, ShoppingCart, Plus, Trash2 } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';

export default function SaleFormModal({ onClose, onSuccess }) {
  const toast = useToast();
  const [products, setProducts] = useState([]);
  const [items, setItems] = useState([{ product_id: '', quantity: 1 }]);
  const [discount, setDiscount] = useState(0);
  const [memberQuery, setMemberQuery] = useState('');
  const [memberResults, setMemberResults] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/store/products').then(res => setProducts(res.data.data)).catch(() => {});
  }, []);

  const searchMember = async (q) => {
    setMemberQuery(q);
    if (q.length < 2) { setMemberResults([]); return; }
    try {
      const res = await api.get('/members', { params: { search: q, per_page: 5 } });
      setMemberResults(res.data.data);
    } catch {}
  };

  const selectMember = (m) => {
    setSelectedMember(m);
    setMemberQuery(m.name);
    setMemberResults([]);
  };

  const addItem = () => setItems(prev => [...prev, { product_id: '', quantity: 1 }]);
  const removeItem = (i) => setItems(prev => prev.filter((_, idx) => idx !== i));
  const updateItem = (i, field, value) => {
    setItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item));
  };

  const getProductPrice = (productId) => {
    const p = products.find(pr => pr.id == productId);
    return p ? (p.sell_price || p.selling_price || 0) : 0;
  };

  const subtotal = items.reduce((sum, item) => {
    return sum + (getProductPrice(item.product_id) * (item.quantity || 0));
  }, 0);
  const total = Math.max(subtotal - discount, 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/store/sales', {
        member_id: selectedMember?.id || null,
        items: items.filter(i => i.product_id).map(i => ({
          product_id: i.product_id,
          quantity: parseInt(i.quantity),
        })),
        discount: parseFloat(discount) || 0,
      });
      toast.success('Penjualan berhasil disimpan!');
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan penjualan');
    }
    setLoading(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 620 }}>
        <div className="modal-header">
          <div className="flex items-center gap-sm">
            <ShoppingCart size={18} style={{ color: 'var(--primary)' }} />
            <h3>Buat Penjualan</h3>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Member (Optional) */}
            <div className="form-group">
              <label className="form-label">Pembeli (opsional, untuk anggota)</label>
              <div style={{ position: 'relative' }}>
                <input className="form-input" value={memberQuery}
                  onChange={e => searchMember(e.target.value)}
                  placeholder="Cari nama anggota atau kosongkan..." />
                {memberResults.length > 0 && (
                  <div className="member-dropdown">
                    {memberResults.map(m => (
                      <div key={m.id} className="member-dropdown-item" onClick={() => selectMember(m)}>
                        <strong>{m.name}</strong>
                        <span className="text-xs text-muted">{m.member_number}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Cart items */}
            <div className="form-group">
              <label className="form-label">Item Penjualan *</label>
              {items.map((item, i) => (
                <div key={i} className="flex gap-sm items-center" style={{ marginBottom: 'var(--space-xs)' }}>
                  <select className="form-input form-select" style={{ flex: 2 }}
                    value={item.product_id}
                    onChange={e => updateItem(i, 'product_id', e.target.value)} required>
                    <option value="">-- Pilih Produk --</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.code} — {p.name} ({formatRupiah(p.sell_price || p.selling_price)})</option>
                    ))}
                  </select>
                  <input className="form-input" type="number" min="1" style={{ flex: 0, width: 70 }}
                    value={item.quantity}
                    onChange={e => updateItem(i, 'quantity', e.target.value)} placeholder="Qty" />
                  <span className="font-mono text-sm" style={{ flex: 0, minWidth: 90, textAlign: 'right' }}>
                    {formatRupiah(getProductPrice(item.product_id) * (item.quantity || 0))}
                  </span>
                  {items.length > 1 && (
                    <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => removeItem(i)}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
              <button type="button" className="btn btn-ghost btn-sm" onClick={addItem} style={{ marginTop: 'var(--space-xs)' }}>
                <Plus size={14} /> Tambah Item
              </button>
            </div>

            {/* Discount + Total */}
            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Diskon (Rp)</label>
                <input className="form-input" type="number" min="0" step="500"
                  value={discount} onChange={e => setDiscount(e.target.value)} placeholder="0" />
              </div>
              <div className="form-group">
                <label className="form-label">Total</label>
                <div className="form-input" style={{ background: 'var(--glass-bg)', fontWeight: 700, fontSize: '1.1rem', color: 'var(--success)' }}>
                  {formatRupiah(total)}
                </div>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Batal</button>
            <button type="submit" className="btn btn-primary"
              disabled={loading || items.every(i => !i.product_id)}>
              {loading ? 'Memproses...' : 'Simpan Penjualan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
