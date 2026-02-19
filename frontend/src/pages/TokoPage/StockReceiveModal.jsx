import { useState, useEffect } from 'react';
import api from '../../lib/api';
import { X, PackagePlus } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';

export default function StockReceiveModal({ onClose, onSuccess }) {
  const toast = useToast();
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({
    product_id: '',
    quantity: '',
    unit_cost: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/store/products').then(res => setProducts(res.data.data)).catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    try {
      await api.post(`/store/products/${form.product_id}/receive`, {
        quantity: parseInt(form.quantity),
        unit_cost: parseFloat(form.unit_cost),
      });
      toast.success('Stok berhasil diterima!');
      onSuccess();
    } catch (err) {
      if (err.response?.status === 422) {
        setErrors(err.response.data.errors || {});
        toast.error('Data tidak valid, periksa kembali form');
      } else {
        toast.error(err.response?.data?.message || 'Gagal menerima stok');
      }
    }
    setLoading(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
        <div className="modal-header">
          <div className="flex items-center gap-sm">
            <PackagePlus size={18} style={{ color: 'var(--success)' }} />
            <h3>Terima Stok</h3>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Produk *</label>
              <select className="form-input form-select" value={form.product_id}
                onChange={e => setForm(prev => ({ ...prev, product_id: e.target.value }))} required>
                <option value="">-- Pilih Produk --</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.code} — {p.name} (stok: {p.stock})</option>
                ))}
              </select>
            </div>

            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Jumlah *</label>
                <input className="form-input" type="number" min="1"
                  value={form.quantity} onChange={e => setForm(prev => ({ ...prev, quantity: e.target.value }))}
                  required placeholder="50" />
                {errors.quantity && <p className="form-error">{errors.quantity[0]}</p>}
              </div>
              <div className="form-group">
                <label className="form-label">Harga Beli / unit (Rp) *</label>
                <input className="form-input" type="number" min="100" step="100"
                  value={form.unit_cost} onChange={e => setForm(prev => ({ ...prev, unit_cost: e.target.value }))}
                  required placeholder="3500" />
                {errors.unit_cost && <p className="form-error">{errors.unit_cost[0]}</p>}
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Batal</button>
            <button type="submit" className="btn btn-primary" disabled={loading || !form.product_id}>
              {loading ? 'Memproses...' : 'Terima Stok'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
