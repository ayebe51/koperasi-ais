import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { Search, X, Users, Landmark, ArrowRight } from 'lucide-react';
import './GlobalSearch.css';

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
  }, [open]);

  const doSearch = async (q) => {
    if (!q || q.length < 2) { setResults(null); return; }
    setLoading(true);
    try {
      const [membersRes, loansRes] = await Promise.all([
        api.get('/members', { params: { search: q, per_page: 5 } }),
        api.get('/loans', { params: { search: q, per_page: 5 } }),
      ]);
      setResults({
        members: membersRes.data.data || [],
        loans: loansRes.data.data || [],
      });
    } catch {
      setResults({ members: [], loans: [] });
    }
    setLoading(false);
  };

  const handleInput = (val) => {
    setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 300);
  };

  const goTo = (path) => {
    navigate(path);
    setOpen(false);
    setQuery('');
    setResults(null);
  };

  // Keyboard shortcut: Ctrl+K
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(o => !o);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  if (!open) {
    return (
      <button className="global-search-trigger" onClick={() => setOpen(true)} title="Cari (Ctrl+K)">
        <Search size={16} />
        <span className="global-search-hint">Cari...</span>
        <kbd className="global-search-kbd">⌘K</kbd>
      </button>
    );
  }

  return (
    <div className="global-search-overlay" onClick={() => setOpen(false)}>
      <div className="global-search-modal" onClick={e => e.stopPropagation()}>
        <div className="global-search-input-wrap">
          <Search size={18} className="text-muted" />
          <input
            ref={inputRef}
            className="global-search-input"
            placeholder="Cari anggota atau pinjaman..."
            value={query}
            onChange={e => handleInput(e.target.value)}
          />
          {query && (
            <button className="btn-icon" onClick={() => { setQuery(''); setResults(null); }}>
              <X size={16} />
            </button>
          )}
        </div>

        {loading && <div className="global-search-loading"><div className="spinner" style={{ width: 20, height: 20 }} /></div>}

        {results && !loading && (
          <div className="global-search-results">
            {results.members.length === 0 && results.loans.length === 0 ? (
              <div className="global-search-empty">Tidak ditemukan hasil untuk "{query}"</div>
            ) : (
              <>
                {results.members.length > 0 && (
                  <div className="search-result-group">
                    <div className="search-result-label"><Users size={14} /> Anggota</div>
                    {results.members.map(m => (
                      <button key={m.id} className="search-result-item" onClick={() => goTo(`/anggota/${m.id}`)}>
                        <div>
                          <strong>{m.name}</strong>
                          <span className="text-sm text-muted"> — {m.member_number}</span>
                        </div>
                        <ArrowRight size={14} className="text-muted" />
                      </button>
                    ))}
                  </div>
                )}
                {results.loans.length > 0 && (
                  <div className="search-result-group">
                    <div className="search-result-label"><Landmark size={14} /> Pinjaman</div>
                    {results.loans.map(l => (
                      <button key={l.id} className="search-result-item" onClick={() => goTo(`/pinjaman/${l.id}`)}>
                        <div>
                          <strong>{l.loan_number}</strong>
                          <span className="text-sm text-muted"> — {l.member?.name}</span>
                        </div>
                        <ArrowRight size={14} className="text-muted" />
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        <div className="global-search-footer">
          <span className="text-xs text-muted">ESC untuk tutup · ↑↓ navigasi · ↵ pilih</span>
        </div>
      </div>
    </div>
  );
}
