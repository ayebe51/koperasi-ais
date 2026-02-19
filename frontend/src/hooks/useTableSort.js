import { useState, useCallback, useMemo } from 'react';

/**
 * useTableSort — Hook for sortable table columns.
 *
 * Usage:
 *   const { sortedData, sortConfig, requestSort, getSortIcon } = useTableSort(data, { key: 'name', dir: 'asc' });
 *
 * Returns:
 *   sortedData - sorted array
 *   sortConfig - { key, dir }
 *   requestSort(key) - toggle sort on column
 *   getSortIcon(key) - returns ▲ ▼ or ⇅
 */
export default function useTableSort(data = [], defaultSort = { key: null, dir: 'asc' }) {
  const [sortConfig, setSortConfig] = useState(defaultSort);

  const requestSort = useCallback((key) => {
    setSortConfig(prev => ({
      key,
      dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc',
    }));
  }, []);

  const sortedData = useMemo(() => {
    if (!sortConfig.key || !data.length) return data;

    return [...data].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];

      if (aVal == null) return 1;
      if (bVal == null) return -1;

      let cmp;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        cmp = aVal - bVal;
      } else {
        cmp = String(aVal).localeCompare(String(bVal), 'id', { sensitivity: 'base' });
      }

      return sortConfig.dir === 'desc' ? -cmp : cmp;
    });
  }, [data, sortConfig]);

  const getSortIcon = useCallback((key) => {
    if (sortConfig.key !== key) return '⇅';
    return sortConfig.dir === 'asc' ? '▲' : '▼';
  }, [sortConfig]);

  return { sortedData, sortConfig, requestSort, getSortIcon };
}
