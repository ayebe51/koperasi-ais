import { useState } from 'react';
import api from '../../lib/api';
import { useToast } from '../../contexts/ToastContext';
import { X } from 'lucide-react';

const CATEGORIES = [
  { value: 'ASSET', label: 'Aset' },
  { value: 'LIABILITY', label: 'Kewajiban' },
  { value: 'EQUITY', label: 'Ekuitas' },
  { value: 'REVENUE', label: 'Pendapatan' },
  { value: 'EXPENSE', label: 'Beban' },
];

export default function COAFormModal({ accounts = [], onClose, onSuccess }) {
  const toast = useToast();
  const [form, setForm] = useState({
    code: '',
    name: '',
    category: 'ASSET',
    normal_balance: 'DEBIT',
    parent_id: '',
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (key, value) => setForm(f => ({ ...f, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...form };
      if (!payload.parent_id) delete payload.parent_id;
      await api.post('/accounting/coa', payload);
      toast.success('Akun berhasil ditambahkan');
      onSuccess?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menambah akun');
    }
    setLoading(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <h3>Tambah Akun Baru</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="grid grid-2" style={{ gap: 'var(--space-md)' }}>
              <div className="form-group">
                <label className="form-label">Kode Akun *</label>
                <input className="form-input" required value={form.code}
                  onChange={e => handleChange('code', e.target.value)}
                  placeholder="Contoh: 1100" autoFocus />
              </div>
              <div className="form-group">
                <label className="form-label">Kategori *</label>
                <select className="form-input form-select" value={form.category}
                  onChange={e => handleChange('category', e.target.value)}>
                  {CATEGORIES.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Nama Akun *</label>
              <input className="form-input" required value={form.name}
                onChange={e => handleChange('name', e.target.value)}
                placeholder="Contoh: Kas Kecil" />
            </div>
            <div className="grid grid-2" style={{ gap: 'var(--space-md)' }}>
              <div className="form-group">
                <label className="form-label">Saldo Normal *</label>
                <select className="form-input form-select" value={form.normal_balance}
                  onChange={e => handleChange('normal_balance', e.target.value)}>
                  <option value="DEBIT">Debit</option>
                  <option value="CREDIT">Kredit</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Akun Induk</label>
                <select className="form-input form-select" value={form.parent_id}
                  onChange={e => handleChange('parent_id', e.target.value)}>
                  <option value="">— Tidak ada —</option>
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Batal</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Menyimpan...' : 'Simpan Akun'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
