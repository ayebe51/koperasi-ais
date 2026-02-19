import './Skeleton.css';

/**
 * Skeleton — Shimmer loading placeholder.
 *
 * Props:
 *   variant: 'text' | 'title' | 'card' | 'row' | 'circle' | 'stat'
 *   width:   CSS width (optional)
 *   height:  CSS height (optional)
 *   count:   repeat count (default 1)
 */
export default function Skeleton({ variant = 'text', width, height, count = 1, className = '' }) {
  if (variant === 'stat') {
    return (
      <div className={`skeleton-stat ${className}`}>
        <div className="skeleton skeleton-icon" />
        <div className="skeleton skeleton-value" />
        <div className="skeleton skeleton-label" />
      </div>
    );
  }

  const items = Array.from({ length: count }, (_, i) => (
    <div
      key={i}
      className={`skeleton skeleton-${variant} ${className}`}
      style={{ width, height }}
    />
  ));

  return count === 1 ? items[0] : <>{items}</>;
}

/**
 * TableSkeleton — Skeleton for table rows.
 */
export function TableSkeleton({ rows = 5, cols = 4 }) {
  return (
    <tbody>
      {Array.from({ length: rows }, (_, r) => (
        <tr key={r}>
          {Array.from({ length: cols }, (_, c) => (
            <td key={c}><div className="skeleton skeleton-text" style={{ width: `${60 + Math.random() * 30}%` }} /></td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}
