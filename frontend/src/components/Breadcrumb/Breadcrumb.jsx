import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import './Breadcrumb.css';

const ROUTE_LABELS = {
  anggota: 'Keanggotaan',
  pinjaman: 'Pinjaman',
  simpanan: 'Simpanan',
  pembukuan: 'Pembukuan',
  pembayaran: 'Pembayaran',
  toko: 'Unit Toko',
  laporan: 'Laporan',
  users: 'User Management',
  settings: 'Pengaturan',
  profil: 'Profil',
  shu: 'SHU',
  coa: 'Chart of Accounts',
  jurnal: 'Jurnal',
  produk: 'Produk',
  penjualan: 'Penjualan',
  pembiayaan: 'Pembiayaan',
};

/**
 * Breadcrumb — Auto-generates breadcrumb trail from URL.
 *
 * Props:
 *   items: optional override array of { label, to } objects
 *   current: optional label for current page (overrides auto-detected)
 */
export default function Breadcrumb({ items, current }) {
  const location = useLocation();

  const crumbs = items || (() => {
    const segments = location.pathname.split('/').filter(Boolean);
    return segments.slice(0, -1).map((seg, i) => ({
      label: ROUTE_LABELS[seg] || seg.charAt(0).toUpperCase() + seg.slice(1),
      to: '/' + segments.slice(0, i + 1).join('/'),
    }));
  })();

  const lastSeg = location.pathname.split('/').filter(Boolean).pop();
  const currentLabel = current || ROUTE_LABELS[lastSeg] || lastSeg;

  return (
    <nav className="breadcrumb" aria-label="breadcrumb">
      <Link to="/" className="breadcrumb-item breadcrumb-home">
        <Home size={14} />
      </Link>
      {crumbs.map((c, i) => (
        <span key={i} className="breadcrumb-sep-item">
          <ChevronRight size={12} className="breadcrumb-sep" />
          <Link to={c.to} className="breadcrumb-item">{c.label}</Link>
        </span>
      ))}
      <ChevronRight size={12} className="breadcrumb-sep" />
      <span className="breadcrumb-item breadcrumb-current">{currentLabel}</span>
    </nav>
  );
}
