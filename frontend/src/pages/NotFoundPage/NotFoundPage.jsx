import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '80vh', textAlign: 'center',
      padding: '2rem',
    }}>
      <div style={{
        fontSize: '6rem', fontWeight: 800, lineHeight: 1,
        background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent', marginBottom: 'var(--space-md)',
      }}>
        404
      </div>
      <h2 style={{ marginBottom: 'var(--space-sm)' }}>Halaman Tidak Ditemukan</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-xl)', maxWidth: 400 }}>
        Halaman yang Anda cari tidak ada atau telah dipindahkan.
      </p>
      <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
        <button className="btn btn-secondary" onClick={() => window.history.back()}>
          <ArrowLeft size={16} /> Kembali
        </button>
        <Link to="/" className="btn btn-primary">
          <Home size={16} /> Dashboard
        </Link>
      </div>
    </div>
  );
}
