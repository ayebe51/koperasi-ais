import { useState, useEffect } from 'react';
import { X, Keyboard } from 'lucide-react';
import './ShortcutsModal.css';

const SHORTCUTS = [
  { keys: ['Ctrl', 'K'], desc: 'Buka pencarian global' },
  { keys: ['Esc'], desc: 'Tutup dialog / modal' },
  { keys: ['?'], desc: 'Tampilkan pintasan keyboard' },
];

const NAV_SHORTCUTS = [
  { keys: ['G', 'D'], desc: 'Buka Dashboard' },
  { keys: ['G', 'A'], desc: 'Buka Keanggotaan' },
  { keys: ['G', 'P'], desc: 'Buka Pinjaman' },
  { keys: ['G', 'S'], desc: 'Buka Simpanan' },
];

export default function ShortcutsModal({ onClose }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="shortcuts-overlay" onClick={onClose}>
      <div className="shortcuts-modal" onClick={e => e.stopPropagation()}>
        <div className="shortcuts-header">
          <div className="flex items-center gap-sm">
            <Keyboard size={18} />
            <h3>Pintasan Keyboard</h3>
          </div>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="shortcuts-body">
          <div className="shortcut-group">
            <h4>Umum</h4>
            {SHORTCUTS.map((s, i) => (
              <div key={i} className="shortcut-row">
                <span className="shortcut-desc">{s.desc}</span>
                <span className="shortcut-keys">
                  {s.keys.map((k, j) => (
                    <span key={j}><kbd>{k}</kbd>{j < s.keys.length - 1 && ' + '}</span>
                  ))}
                </span>
              </div>
            ))}
          </div>

          <div className="shortcut-group">
            <h4>Navigasi</h4>
            {NAV_SHORTCUTS.map((s, i) => (
              <div key={i} className="shortcut-row">
                <span className="shortcut-desc">{s.desc}</span>
                <span className="shortcut-keys">
                  {s.keys.map((k, j) => (
                    <span key={j}><kbd>{k}</kbd>{j < s.keys.length - 1 && ' lalu '}</span>
                  ))}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
