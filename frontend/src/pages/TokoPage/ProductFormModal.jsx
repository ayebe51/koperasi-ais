import { useState } from 'react';
import api from '../../lib/api';
import { X, Package } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';

export default function ProductFormModal({ onClose, onSuccess, product = null }) {
  const isEdit = !!product;
  const toast = useToast();
  const [form, setForm] = useState({
    code: product?.code || '',
    name: product?.name || '',
    sell_price: product?.sell_price || product?.selling_price || '',
    unit: product?.unit || 'pcs',
    is_active: product?.is_active ?? true,
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    setErrors(prev => ({ ...prev, [name]: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    try {
      const payload = {
        ...form,
        sell_price: parseFloat(form.sell_price),
      };
      if (isEdit) {
        await api.put(`/store/products/${product.id}`, payload);
      } else {
        await api.post('/store/products', payload);
      }
      toast.success(isEdit ? 'Produk berhasil diperbarui!' : 'Produk baru berhasil ditambahkan!');
      onSuccess();
    } catch (err) {
      if (err.response?.status === 422) {
        setErrors(err.response.data.errors || {});
        toast.error('Data tidak valid, periksa kembali form');
      } else {
        toast.error(err.response?.data?.message || 'Gagal menyimpan produk');
      }
    }
    setLoading(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <div className="flex items-center gap-sm">
            <Package size={18} style={{ color: 'var(--primary)' }} />
            <h3>{isEdit ? 'Edit Produk' : 'Tambah Produk Baru'}</h3>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Kode Produk *</label>
                <input className="form-input" name="code" value={form.code}
                  onChange={handleChange} required placeholder="PRD-001" />
                {errors.code && <p className="form-error">{errors.code[0]}</p>}
              </div>
              <div className="form-group">
                <label className="form-label">Satuan</label>
                <select className="form-input form-select" name="unit" value={form.unit} onChange={handleChange}>
                  <option value="pcs">pcs</option>
                  <option value="rim">rim</option>
                  <option value="btl">btl</option>
                  <option value="pak">pak</option>
                  <option value="box">box</option>
                  <option value="set">set</option>
                  <option value="lusin">lusin</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Nama Produk *</label>
              <input className="form-input" name="name" value={form.name}
                onChange={handleChange} required placeholder="Buku Tulis Kiky 58" />
              {errors.name && <p className="form-error">{errors.name[0]}</p>}
            </div>

            <div className="form-group">
              <label className="form-label">Harga Jual (Rp) *</label>
              <input className="form-input" type="number" name="sell_price" min="100" step="100"
                value={form.sell_price} onChange={handleChange} required placeholder="4500" />
              {errors.sell_price && <p className="form-error">{errors.sell_price[0]}</p>}
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Batal</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Tambah Produk'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
