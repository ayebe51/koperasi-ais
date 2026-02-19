import { useState } from 'react';
import api from '../../lib/api';
import { X, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';

export default function SavingFormModal({ type, onClose, onSuccess }) {
  const isDeposit = type === 'deposit';
  const toast = useToast();
  const [form, setForm] = useState({
    member_id: '',
    type: 'SUKARELA',
    amount: '',
    description: '',
  });
  const [memberQuery, setMemberQuery] = useState('');
  const [memberResults, setMemberResults] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

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
    setForm(prev => ({ ...prev, member_id: m.id }));
    setMemberQuery(m.name);
    setMemberResults([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    try {
      const endpoint = isDeposit ? '/savings/deposit' : '/savings/withdraw';
      await api.post(endpoint, {
        member_id: form.member_id,
        type: form.type,
        amount: parseFloat(form.amount),
        description: form.description,
      });
      toast.success(isDeposit ? 'Setoran simpanan berhasil!' : 'Penarikan simpanan berhasil!');
      onSuccess();
    } catch (err) {
      if (err.response?.status === 422) {
        setErrors(err.response.data.errors || {});
        toast.error('Data tidak valid, periksa kembali form');
      } else {
        toast.error(err.response?.data?.message || 'Terjadi kesalahan');
      }
    }
    setLoading(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="flex items-center gap-sm">
            {isDeposit ? <ArrowDownCircle size={18} style={{ color: 'var(--success)' }} />
              : <ArrowUpCircle size={18} style={{ color: 'var(--warning)' }} />}
            <h3>{isDeposit ? 'Setor Simpanan' : 'Tarik Simpanan'}</h3>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Anggota *</label>
              <div style={{ position: 'relative' }}>
                <input className="form-input" value={memberQuery}
                  onChange={e => searchMember(e.target.value)}
                  placeholder="Ketik nama / no. anggota..." required />
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
              {errors.member_id && <p className="form-error">{errors.member_id[0]}</p>}
            </div>

            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Jenis Simpanan *</label>
                <select className="form-input form-select" value={form.type}
                  onChange={e => setForm(prev => ({ ...prev, type: e.target.value }))}>
                  <option value="POKOK">Pokok</option>
                  <option value="WAJIB">Wajib</option>
                  <option value="SUKARELA">Sukarela</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Jumlah (Rp) *</label>
                <input className="form-input" type="number" min="1000" step="1000"
                  value={form.amount} onChange={e => setForm(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="100000" required />
                {errors.amount && <p className="form-error">{errors.amount[0]}</p>}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Keterangan</label>
              <input className="form-input" value={form.description}
                onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Opsional" />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Batal</button>
            <button type="submit" className="btn btn-primary" disabled={loading || !form.member_id}>
              {loading ? 'Memproses...' : isDeposit ? 'Setor Simpanan' : 'Tarik Simpanan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
