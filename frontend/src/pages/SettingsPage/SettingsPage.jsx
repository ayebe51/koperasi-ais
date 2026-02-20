import { useState, useEffect } from 'react';
import api from '../../lib/api';
import { useToast } from '../../contexts/ToastContext';
import { Settings, Save } from 'lucide-react';

export default function SettingsPage() {
  const toast = useToast();
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/settings')
      .then(res => setForm(res.data.data))
      .catch(() => toast.error('Gagal memuat pengaturan'))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (key, value) => {
    setForm(f => ({ ...f, [key]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/settings', form);
      toast.success('Pengaturan berhasil disimpan');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan');
    }
    setSaving(false);
  };

  if (loading) return <div className="page-loading"><div className="spinner" /><p>Memuat pengaturan...</p></div>;
  if (!form) return null;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Pengaturan Koperasi</h1>
          <p className="page-subtitle">Konfigurasi umum dan parameter koperasi</p>
        </div>
      </div>

      <form onSubmit={handleSave}>
        <div className="grid grid-2" style={{ gap: 'var(--space-lg)' }}>
          {/* Info Koperasi */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Informasi Koperasi</h3>
            </div>
            <div className="form-group">
              <label className="form-label">Nama Koperasi</label>
              <input className="form-input" value={form.nama_koperasi}
                onChange={e => handleChange('nama_koperasi', e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Alamat</label>
              <textarea className="form-input" rows={2} value={form.alamat || ''}
                onChange={e => handleChange('alamat', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Telepon</label>
              <input className="form-input" value={form.telepon || ''}
                onChange={e => handleChange('telepon', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" value={form.email_koperasi || ''}
                onChange={e => handleChange('email_koperasi', e.target.value)} />
            </div>
          </div>

          {/* Parameter Keuangan */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Parameter Keuangan</h3>
            </div>
            <div className="grid grid-2" style={{ gap: 'var(--space-md)' }}>
              <div className="form-group">
                <label className="form-label">Bunga Pinjaman (%/bulan)</label>
                <input className="form-input" type="number" step="0.01" min="0" max="100"
                  value={form.bunga_pinjaman} onChange={e => handleChange('bunga_pinjaman', parseFloat(e.target.value) || 0)} />
              </div>
              <div className="form-group">
                <label className="form-label">Denda Keterlambatan (%/hari)</label>
                <input className="form-input" type="number" step="0.01" min="0" max="100"
                  value={form.denda_keterlambatan} onChange={e => handleChange('denda_keterlambatan', parseFloat(e.target.value) || 0)} />
              </div>
              <div className="form-group">
                <label className="form-label">Simpanan Pokok (Rp)</label>
                <input className="form-input" type="number" min="0"
                  value={form.simpanan_pokok} onChange={e => handleChange('simpanan_pokok', parseInt(e.target.value) || 0)} />
              </div>
              <div className="form-group">
                <label className="form-label">Simpanan Wajib (Rp)</label>
                <input className="form-input" type="number" min="0"
                  value={form.simpanan_wajib} onChange={e => handleChange('simpanan_wajib', parseInt(e.target.value) || 0)} />
              </div>
            </div>
          </div>
        </div>

        {/* SHU Distribution */}
        <div className="card" style={{ marginTop: 'var(--space-lg)' }}>
          <div className="card-header">
            <h3 className="card-title">Distribusi SHU (%)</h3>
          </div>
          <div className="grid grid-3" style={{ gap: 'var(--space-md)' }}>
            {[
              ['persentase_shu_anggota', 'Jasa Anggota'],
              ['persentase_shu_cadangan', 'Cadangan Umum'],
              ['persentase_shu_maarif', "Lembaga Ma'arif"],
              ['persentase_shu_pendidikan', 'Dana Pendidikan'],
              ['persentase_shu_sosial', 'Dana Sosial'],
              ['persentase_shu_pengurus', 'Dana Pengurus'],
            ].map(([key, label]) => (
              <div className="form-group" key={key}>
                <label className="form-label">{label}</label>
                <input className="form-input" type="number" step="0.1" min="0" max="100"
                  value={form[key]} onChange={e => handleChange(key, parseFloat(e.target.value) || 0)} />
              </div>
            ))}
          </div>
          <p className="text-sm text-muted" style={{ marginTop: 'var(--space-sm)' }}>
            Total: <strong>{
              (form.persentase_shu_anggota + form.persentase_shu_cadangan +
               form.persentase_shu_maarif + form.persentase_shu_pendidikan +
               form.persentase_shu_sosial + form.persentase_shu_pengurus).toFixed(1)
            }%</strong> (harus 100%)
          </p>
        </div>

        <div style={{ marginTop: 'var(--space-lg)', display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            <Save size={16} /> {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
          </button>
        </div>
      </form>
    </div>
  );
}
