import { ChevronLeft, ChevronRight } from 'lucide-react';
import './Pagination.css';

/**
 * Reusable Pagination with page numbers.
 *
 * Props:
 *   currentPage: current page (1-indexed)
 *   lastPage:    total pages
 *   total:       total items
 *   onPageChange: (page) => void
 */
export default function Pagination({ currentPage, lastPage, total, onPageChange }) {
  if (!lastPage || lastPage <= 1) return null;

  // Generate visible page numbers with ellipsis
  const pages = [];
  const delta = 1; // pages around current
  for (let i = 1; i <= lastPage; i++) {
    if (i === 1 || i === lastPage || (i >= currentPage - delta && i <= currentPage + delta)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...');
    }
  }

  return (
    <div className="pagination-bar">
      <span className="pagination-info">
        Hal {currentPage} dari {lastPage} {total != null && `(${total} data)`}
      </span>
      <div className="pagination-pages">
        <button
          className="btn btn-ghost btn-sm"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          <ChevronLeft size={14} />
        </button>
        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`dots-${i}`} className="pagination-dots">…</span>
          ) : (
            <button
              key={p}
              className={`btn btn-sm ${p === currentPage ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => onPageChange(p)}
            >
              {p}
            </button>
          )
        )}
        <button
          className="btn btn-ghost btn-sm"
          disabled={currentPage >= lastPage}
          onClick={() => onPageChange(currentPage + 1)}
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
