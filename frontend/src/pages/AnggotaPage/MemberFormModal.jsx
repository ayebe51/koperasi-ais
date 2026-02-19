import { useState } from 'react';
import api from '../../lib/api';
import { X } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';

export default function MemberFormModal({ onClose, onSuccess, member = null }) {
  const isEdit = !!member;
  const toast = useToast();
  const [form, setForm] = useState({
    member_number: member?.member_number || '',
    name: member?.name || '',
    email: member?.email || '',
    phone: member?.phone || '',
    address: member?.address || '',
    nik: member?.nik || '',
    nuptk: member?.nuptk || '',
    join_date: member?.join_date?.split('T')[0] || new Date().toISOString().split('T')[0],
    unit_kerja: member?.unit_kerja || '',
    jabatan: member?.jabatan || '',
    status_karyawan: member?.status_karyawan || '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setErrors(prev => ({ ...prev, [e.target.name]: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    try {
      if (isEdit) {
        await api.put(`/members/${member.id}`, form);
      } else {
        await api.post('/members', form);
      }
      toast.success(isEdit ? 'Data anggota berhasil diperbarui!' : 'Anggota baru berhasil ditambahkan!');
      onSuccess();
    } catch (err) {
      if (err.response?.status === 422) {
        setErrors(err.response.data.errors || {});
        toast.error('Data tidak valid, periksa kembali form');
      } else {
        toast.error(err.response?.data?.message || 'Gagal menyimpan data anggota');
      }
    }
    setLoading(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{isEdit ? 'Edit Anggota' : 'Tambah Anggota Baru'}</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">No. Anggota *</label>
                <input className="form-input" name="member_number" value={form.member_number}
                  onChange={handleChange} required placeholder="AGT-001" />
                {errors.member_number && <p className="form-error">{errors.member_number[0]}</p>}
              </div>
              <div className="form-group">
                <label className="form-label">Tgl Masuk *</label>
                <input className="form-input" type="date" name="join_date" value={form.join_date}
                  onChange={handleChange} required />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Nama Lengkap *</label>
              <input className="form-input" name="name" value={form.name}
                onChange={handleChange} required placeholder="Nama lengkap anggota" />
              {errors.name && <p className="form-error">{errors.name[0]}</p>}
            </div>

            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">NIK (16 digit) *</label>
                <input className="form-input" name="nik" value={form.nik}
                  onChange={handleChange} required maxLength={16} placeholder="3301xxxxxxxxxx" />
                {errors.nik && <p className="form-error">{errors.nik[0]}</p>}
              </div>
              <div className="form-group">
                <label className="form-label">NUPTK</label>
                <input className="form-input" name="nuptk" value={form.nuptk}
                  onChange={handleChange} placeholder="Opsional" />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Unit Kerja *</label>
              <input className="form-input" name="unit_kerja" value={form.unit_kerja}
                onChange={handleChange} required placeholder="Contoh: MTs Ma'arif NU 01 Cilacap" />
              {errors.unit_kerja && <p className="form-error">{errors.unit_kerja[0]}</p>}
            </div>

            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Jabatan</label>
                <input className="form-input" name="jabatan" value={form.jabatan}
                  onChange={handleChange} placeholder="Contoh: Guru" />
              </div>
              <div className="form-group">
                <label className="form-label">Status Karyawan</label>
                <select className="form-input form-select" name="status_karyawan" value={form.status_karyawan}
                  onChange={handleChange}>
                  <option value="">-- Pilih --</option>
                  <option value="PNS">PNS</option>
                  <option value="GTY">GTY</option>
                  <option value="GTT">GTT</option>
                  <option value="Honorer">Honorer</option>
                </select>
              </div>
            </div>

            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" name="email" value={form.email}
                  onChange={handleChange} placeholder="email@contoh.com" />
                {errors.email && <p className="form-error">{errors.email[0]}</p>}
              </div>
              <div className="form-group">
                <label className="form-label">No. HP</label>
                <input className="form-input" name="phone" value={form.phone}
                  onChange={handleChange} placeholder="08xxxxxxxxxx" />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Alamat</label>
              <textarea className="form-input form-textarea" name="address" value={form.address}
                onChange={handleChange} rows={2} placeholder="Alamat lengkap" />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Batal</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Tambah Anggota'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
