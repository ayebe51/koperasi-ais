import { useState, useEffect } from 'react';
import api from '../../lib/api';
import { useToast } from '../../contexts/ToastContext';
import { X, Plus, Trash2 } from 'lucide-react';
import { formatRupiah } from '../../lib/utils';

const emptyLine = () => ({ account_code: '', type: 'DEBIT', amount: '' });

export default function JournalFormModal({ onClose, onSuccess }) {
  const toast = useToast();
  const [accounts, setAccounts] = useState([]);
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
  });
  const [lines, setLines] = useState([emptyLine(), emptyLine()]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/accounting/coa').then(res => setAccounts(res.data.data || [])).catch(() => {});
  }, []);

  const updateLine = (index, key, value) => {
    setLines(prev => prev.map((l, i) => i === index ? { ...l, [key]: value } : l));
  };

  const addLine = () => setLines(prev => [...prev, emptyLine()]);

  const removeLine = (index) => {
    if (lines.length <= 2) return;
    setLines(prev => prev.filter((_, i) => i !== index));
  };

  const totalDebit = lines.reduce((s, l) => l.type === 'DEBIT' ? s + (parseFloat(l.amount) || 0) : s, 0);
  const totalCredit = lines.reduce((s, l) => l.type === 'CREDIT' ? s + (parseFloat(l.amount) || 0) : s, 0);
  const isBalanced = totalDebit > 0 && totalDebit === totalCredit;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isBalanced) {
      toast.error('Total Debit harus sama dengan total Kredit');
      return;
    }
    setLoading(true);
    try {
      await api.post('/accounting/journals', {
        date: form.date,
        description: form.description,
        auto_post: true,
        lines: lines.map(l => ({
          account_code: l.account_code,
          debit: l.type === 'DEBIT' ? parseFloat(l.amount) || 0 : 0,
          credit: l.type === 'CREDIT' ? parseFloat(l.amount) || 0 : 0,
        })),
      });
      toast.success('Jurnal berhasil dibuat');
      onSuccess?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal membuat jurnal');
    }
    setLoading(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 680 }}>
        <div className="modal-header">
          <h3>Buat Jurnal Manual</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="grid grid-2" style={{ gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Tanggal Transaksi *</label>
                <input type="date" className="form-input" required value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Keterangan *</label>
                <input className="form-input" required value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Deskripsi transaksi" />
              </div>
            </div>

            <div className="table-container" style={{ marginBottom: 'var(--space-md)' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Akun</th>
                    <th style={{ width: 100 }}>D/K</th>
                    <th style={{ width: 150 }} className="text-right">Jumlah</th>
                    <th style={{ width: 40 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, i) => (
                    <tr key={i}>
                      <td>
                        <select className="form-input form-select" value={line.account_code}
                          onChange={e => updateLine(i, 'account_code', e.target.value)} required
                          style={{ fontSize: '0.8rem' }}>
                          <option value="">— Pilih Akun —</option>
                          {accounts.map(a => (
                            <option key={a.id} value={a.code}>{a.code} — {a.name}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select className="form-input form-select" value={line.type}
                          onChange={e => updateLine(i, 'type', e.target.value)}
                          style={{ fontSize: '0.8rem' }}>
                          <option value="DEBIT">Debit</option>
                          <option value="CREDIT">Kredit</option>
                        </select>
                      </td>
                      <td>
                        <input className="form-input" type="number" min="0" step="1"
                          value={line.amount} onChange={e => updateLine(i, 'amount', e.target.value)}
                          required placeholder="0" style={{ textAlign: 'right', fontSize: '0.8rem' }} />
                      </td>
                      <td>
                        <button type="button" className="btn btn-ghost btn-sm btn-icon"
                          onClick={() => removeLine(i)} disabled={lines.length <= 2}
                          title="Hapus baris">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={4} style={{ padding: '0.5rem 1rem' }}>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={addLine}>
                        <Plus size={14} /> Tambah Baris
                      </button>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="flex justify-between items-center" style={{
              padding: 'var(--space-sm) var(--space-md)',
              background: 'var(--bg-elevated)',
              borderRadius: 'var(--radius-md)',
            }}>
              <div className="flex gap-lg">
                <span className="text-sm">Debit: <strong style={{ color: 'var(--primary-400)' }}>{formatRupiah(totalDebit)}</strong></span>
                <span className="text-sm">Kredit: <strong style={{ color: 'var(--warning)' }}>{formatRupiah(totalCredit)}</strong></span>
              </div>
              {isBalanced ? (
                <span className="badge badge-success">✓ Balance</span>
              ) : (
                <span className="badge badge-danger">✗ Tidak Balance</span>
              )}
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Batal</button>
            <button type="submit" className="btn btn-primary" disabled={loading || !isBalanced}>
              {loading ? 'Menyimpan...' : 'Simpan Jurnal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
