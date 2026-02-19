import { AlertTriangle } from 'lucide-react';

/**
 * ConfirmDialog — Reusable confirmation modal.
 *
 * Props:
 *   title:     Dialog title
 *   message:   Confirmation message (string or JSX)
 *   confirmText: Button label (default "Hapus")
 *   variant:   'danger' | 'warning' | 'primary' (default 'danger')
 *   loading:   boolean
 *   onConfirm: callback
 *   onCancel:  callback
 */
export default function ConfirmDialog({
  title = 'Konfirmasi',
  message,
  confirmText = 'Hapus',
  variant = 'danger',
  loading = false,
  onConfirm,
  onCancel,
}) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
        <div className="modal-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={18} style={{ color: `var(--${variant === 'primary' ? 'primary-400' : variant})` }} />
            {title}
          </h3>
        </div>
        <div className="modal-body">
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>{message}</p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onCancel} disabled={loading}>
            Batal
          </button>
          <button className={`btn btn-${variant}`} onClick={onConfirm} disabled={loading}>
            {loading ? 'Memproses...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
