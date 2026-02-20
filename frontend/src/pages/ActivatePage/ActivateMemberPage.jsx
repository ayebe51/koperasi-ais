import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/api';
import { Landmark, UserPlus, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import '../LoginPage/LoginPage.css';

export default function ActivateMemberPage() {
  const [form, setForm] = useState({ member_number: '', nik: '', email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { setAuthData } = useAuth();
  const navigate = useNavigate();

  const handleChange = (field) => (e) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
    setFieldErrors(prev => ({ ...prev, [field]: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    setLoading(true);
    try {
      const res = await api.post('/auth/activate-member', form);
      const { user, token } = res.data.data;
      setSuccess(true);
      // Auto-login after 2 seconds
      setTimeout(() => {
        setAuthData(user, token);
        navigate('/portal');
      }, 2000);
    } catch (err) {
      const data = err.response?.data;
      if (data?.errors) {
        setFieldErrors(data.errors);
      } else {
        setError(data?.message || 'Gagal mengaktivasi akun');
      }
    }
    setLoading(false);
  };

  if (success) {
    return (
      <div className="login-page">
        <div className="login-bg">
          <div className="bg-shape shape-1" />
          <div className="bg-shape shape-2" />
          <div className="bg-shape shape-3" />
        </div>
        <div className="login-card" style={{ textAlign: 'center' }}>
          <div style={{ margin: '1rem 0' }}>
            <CheckCircle2 size={56} style={{ color: 'var(--success)' }} />
          </div>
          <h2 style={{ marginBottom: '0.5rem' }}>Aktivasi Berhasil!</h2>
          <p className="text-muted">Akun portal Anda sudah aktif. Mengalihkan ke portal...</p>
          <div className="spinner" style={{ margin: '1.5rem auto', width: 24, height: 24 }} />
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-bg">
        <div className="bg-shape shape-1" />
        <div className="bg-shape shape-2" />
        <div className="bg-shape shape-3" />
      </div>

      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">
            <UserPlus size={28} />
          </div>
          <h1>Aktivasi Portal Anggota</h1>
          <p className="text-muted">Masukkan data untuk mengaktifkan akun portal Anda</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="alert alert-danger"><span>{error}</span></div>}

          <div className="form-group">
            <label className="form-label">Nomor Anggota</label>
            <input
              className={`form-input ${fieldErrors.member_number ? 'input-error' : ''}`}
              placeholder="Contoh: AGT-001"
              value={form.member_number}
              onChange={handleChange('member_number')}
              required
              autoFocus
            />
            {fieldErrors.member_number && <p className="form-error">{fieldErrors.member_number[0]}</p>}
          </div>

          <div className="form-group">
            <label className="form-label">NIK (KTP)</label>
            <input
              className={`form-input ${fieldErrors.nik ? 'input-error' : ''}`}
              placeholder="16 digit NIK"
              value={form.nik}
              onChange={handleChange('nik')}
              maxLength={16}
              required
            />
            {fieldErrors.nik && <p className="form-error">{fieldErrors.nik[0]}</p>}
          </div>

          <div className="form-group">
            <label className="form-label">Email (untuk login)</label>
            <input
              type="email"
              className={`form-input ${fieldErrors.email ? 'input-error' : ''}`}
              placeholder="email@contoh.com"
              value={form.email}
              onChange={handleChange('email')}
              required
            />
            {fieldErrors.email && <p className="form-error">{fieldErrors.email[0]}</p>}
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="password-wrapper">
              <input
                type={showPw ? 'text' : 'password'}
                className={`form-input ${fieldErrors.password ? 'input-error' : ''}`}
                placeholder="Minimal 8 karakter"
                value={form.password}
                onChange={handleChange('password')}
                minLength={8}
                required
              />
              <button type="button" className="pw-toggle" onClick={() => setShowPw(!showPw)}>
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {fieldErrors.password && <p className="form-error">{fieldErrors.password[0]}</p>}
          </div>

          <button type="submit" className="btn btn-primary btn-login" disabled={loading}>
            {loading ? <span className="spinner" style={{width: 18, height: 18, borderWidth: 2}} /> : null}
            {loading ? 'Memproses...' : 'Aktivasi Akun'}
          </button>
        </form>

        <div className="login-footer" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center' }}>
          <Link to="/login" className="text-sm" style={{ color: 'var(--primary)' }}>
            ← Kembali ke halaman login
          </Link>
          <p className="text-xs text-muted">© 2026 Koperasi AIS Ma'arif NU Cilacap</p>
        </div>
      </div>
    </div>
  );
}
