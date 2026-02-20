import { useState } from 'react';
import api from '../../lib/api';
import { formatRupiah } from '../../lib/utils';
import { X, Calculator, Landmark } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';

export default function LoanFormModal({ onClose, onSuccess }) {
  const toast = useToast();
  const [form, setForm] = useState({
    member_id: '',
    amount: '',
    term_months: '12',
    interest_rate: '12',
    purpose: '',
  });
  const [memberQuery, setMemberQuery] = useState('');
  const [memberResults, setMemberResults] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [simulation, setSimulation] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [simLoading, setSimLoading] = useState(false);

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

  const handleSimulate = async () => {
    if (!form.amount || !form.term_months || !form.interest_rate) return;
    setSimLoading(true);
    try {
      const res = await api.post('/loans/simulate', {
        principal_amount: parseFloat(form.amount),
        term_months: parseInt(form.term_months),
        interest_rate: parseFloat(form.interest_rate),
      });
      setSimulation(res.data.data);
    } catch {}
    setSimLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    try {
      await api.post('/loans/apply', {
        member_id: form.member_id,
        principal_amount: parseFloat(form.amount),
        term_months: parseInt(form.term_months),
        interest_rate: parseFloat(form.interest_rate),
        purpose: form.purpose,
      });
      toast.success('Pengajuan pinjaman berhasil dibuat!');
      onSuccess();
    } catch (err) {
      if (err.response?.status === 422) {
        setErrors(err.response.data.errors || {});
        toast.error('Data tidak valid, periksa kembali form');
      } else {
        toast.error(err.response?.data?.message || 'Gagal mengajukan pinjaman');
      }
    }
    setLoading(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
        <div className="modal-header">
          <div className="flex items-center gap-sm">
            <Landmark size={18} style={{ color: 'var(--primary)' }} />
            <h3>Ajukan Pinjaman Baru</h3>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Member search */}
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
                <label className="form-label">Jumlah Pinjaman (Rp) *</label>
                <input className="form-input" type="number" min="500000" step="100000"
                  value={form.amount} onChange={e => setForm(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="5000000" required />
                {errors.amount && <p className="form-error">{errors.amount[0]}</p>}
              </div>
              <div className="form-group">
                <label className="form-label">Tenor (bulan) *</label>
                <select className="form-input form-select" value={form.term_months}
                  onChange={e => setForm(prev => ({ ...prev, term_months: e.target.value }))}>
                  {[6, 12, 18, 24, 36].map(n => (
                    <option key={n} value={n}>{n} bulan</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Suku Bunga (% / tahun) *</label>
                <input className="form-input" type="number" min="0" step="0.5" max="50"
                  value={form.interest_rate} onChange={e => setForm(prev => ({ ...prev, interest_rate: e.target.value }))}
                  required />
              </div>
              <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" style={{ width: '100%' }}
                  onClick={handleSimulate} disabled={simLoading || !form.amount}>
                  <Calculator size={14} /> {simLoading ? 'Menghitung...' : 'Simulasi'}
                </button>
              </div>
            </div>

            {simulation && (
              <div className="card" style={{ background: 'var(--glass-bg)', marginBottom: 'var(--space-md)', padding: 'var(--space-md)' }}>
                <div className="info-rows">
                  <div className="info-row"><span>Angsuran / bulan</span><strong style={{ color: 'var(--primary)' }}>{formatRupiah(simulation.monthly_payment)}</strong></div>
                  <div className="info-row"><span>Total Bayar</span><strong>{formatRupiah(simulation.total_payment)}</strong></div>
                  <div className="info-row"><span>Total Bunga</span><strong style={{ color: 'var(--warning)' }}>{formatRupiah(simulation.total_interest)}</strong></div>
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Alasan / Tujuan Pinjaman *</label>
              <textarea className="form-input form-textarea" name="purpose" value={form.purpose}
                onChange={e => setForm(prev => ({ ...prev, purpose: e.target.value }))}
                rows={2} placeholder="Contoh: Modal usaha, pendidikan anak..." required />
              {errors.purpose && <p className="form-error">{errors.purpose[0]}</p>}
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Batal</button>
            <button type="submit" className="btn btn-primary" disabled={loading || !form.member_id}>
              {loading ? 'Memproses...' : 'Ajukan Pinjaman'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
