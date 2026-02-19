import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { formatRupiah, formatDate } from '../../lib/utils';
import { Bell, AlertTriangle, Clock, CreditCard, X } from 'lucide-react';
import './NotificationBell.css';

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.get('/dashboard/stats');
      const data = res.data.data;
      const notifs = [];

      // Overdue installments
      if (data.angsuran?.overdue?.length > 0) {
        data.angsuran.overdue.forEach(s => {
          notifs.push({
            id: `overdue-${s.id}`,
            type: 'danger',
            icon: AlertTriangle,
            title: `Angsuran terlambat ${s.days_overdue} hari`,
            message: `${s.member_name} — ${s.loan_number} #${s.installment_number} (${formatRupiah(s.total_amount)})`,
            time: s.due_date,
            link: '/pinjaman',
          });
        });
      }

      // Upcoming installments
      if (data.angsuran?.upcoming?.length > 0) {
        data.angsuran.upcoming.forEach(s => {
          notifs.push({
            id: `upcoming-${s.id}`,
            type: 'warning',
            icon: Clock,
            title: 'Angsuran jatuh tempo',
            message: `${s.member_name} — ${s.loan_number} #${s.installment_number} (${formatRupiah(s.total_amount)})`,
            time: s.due_date,
            link: '/pinjaman',
          });
        });
      }

      // Pending loans
      if (data.pinjaman?.pending > 0) {
        notifs.push({
          id: 'pending-loans',
          type: 'info',
          icon: CreditCard,
          title: `${data.pinjaman.pending} pengajuan pinjaman menunggu`,
          message: 'Klik untuk review',
          link: '/pinjaman',
        });
      }

      // Low stock
      if (data.toko?.stok_rendah > 0) {
        notifs.push({
          id: 'low-stock',
          type: 'warning',
          icon: AlertTriangle,
          title: `${data.toko.stok_rendah} produk stok rendah`,
          message: 'Segera lakukan restok',
          link: '/toko/produk',
        });
      }

      setNotifications(notifs);
    } catch {}
    setLoading(false);
  };

  // Close on click outside
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Fetch on open
  useEffect(() => {
    if (open) fetchNotifications();
  }, [open]);

  const handleClick = (notif) => {
    if (notif.link) navigate(notif.link);
    setOpen(false);
  };

  const count = notifications.length;

  return (
    <div className="notif-bell" ref={ref}>
      <button className="btn-icon notif-bell-btn" onClick={() => setOpen(!open)}
        title={`${count} notifikasi`} style={{ color: 'var(--text-secondary)' }}>
        <Bell size={18} />
        {count > 0 && <span className="notif-badge">{count > 9 ? '9+' : count}</span>}
      </button>

      {open && (
        <div className="notif-dropdown">
          <div className="notif-dropdown-header">
            <h4>Notifikasi</h4>
            <button className="btn-icon" onClick={() => setOpen(false)}><X size={16} /></button>
          </div>
          <div className="notif-dropdown-body">
            {loading ? (
              <div className="notif-loading"><div className="spinner" style={{ width: 24, height: 24 }} /></div>
            ) : notifications.length === 0 ? (
              <div className="notif-empty">
                <Bell size={24} style={{ opacity: 0.2 }} />
                <span>Tidak ada notifikasi</span>
              </div>
            ) : (
              notifications.map(n => (
                <button key={n.id} className={`notif-item notif-${n.type}`} onClick={() => handleClick(n)}>
                  <div className="notif-item-icon">
                    <n.icon size={16} />
                  </div>
                  <div className="notif-item-content">
                    <span className="notif-item-title">{n.title}</span>
                    <span className="notif-item-message">{n.message}</span>
                    {n.time && <span className="notif-item-time">{formatDate(n.time)}</span>}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
