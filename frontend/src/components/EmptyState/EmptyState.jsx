import { FileX } from 'lucide-react';
import './EmptyState.css';

/**
 * EmptyState — Reusable placeholder for empty lists/tables.
 *
 * Props:
 *   icon:    Lucide icon component (default FileX)
 *   title:   heading text
 *   message: description text
 *   action:  optional JSX (e.g. button)
 */
export default function EmptyState({
  icon: Icon = FileX,
  title = 'Tidak ada data',
  message = 'Belum ada data yang tersedia.',
  action,
}) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        <Icon size={40} />
      </div>
      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-message">{message}</p>
      {action && <div className="empty-state-action">{action}</div>}
    </div>
  );
}
