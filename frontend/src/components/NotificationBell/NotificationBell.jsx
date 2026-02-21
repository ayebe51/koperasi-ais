import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { formatRupiah, formatDate } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { Bell, AlertTriangle, Clock, CreditCard, X, Info } from 'lucide-react';
import './NotificationBell.css';

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();
  const { isRole } = useAuth();

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      let notifs = [];
      const notifRes = await api.get('/notifications');
      if (notifRes.data?.data) {
        notifs = notifRes.data.data.map(n => ({
          id: `db-${n.id}`,
          rawId: n.id,
          type: n.type === 'LOAN_REJECTED' ? 'danger' : n.type.includes('APPROVED') ? 'success' : 'info',
          icon: n.type.includes('REJECTED') ? AlertTriangle : n.type.includes('APPROVED') ? CreditCard : Info,
          title: n.title,
          message: n.message,
          time: n.created_at_raw,
          link: n.data?.loan_id ? (isRole('MEMBER') ? '/portal' : `/pinjaman/${n.data.loan_id}`) : null,
          read: n.read,
        }));
      }

      if (isRole('ADMIN', 'MANAGER')) {
        const res = await api.get('/dashboard/stats');
        const data = res.data.data;

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
      }

      setNotifications(notifs);
    } catch {}
    setLoading(false);
  };

  const fetchUnreadCount = async () => {
    try {
      const res = await api.get('/notifications/unread-count');
      let count = res.data.data?.count || 0;

      // Add admin notification counts if applicable
      if (isRole('ADMIN', 'MANAGER')) {
        const statsRes = await api.get('/dashboard/stats');
        const pending = statsRes.data.data?.pinjaman?.pending || 0;
        const lowStock = statsRes.data.data?.toko?.stok_rendah > 0 ? 1 : 0;
        const overdue = statsRes.data.data?.angsuran?.overdue?.length || 0;
        count += pending + lowStock + overdue;
      }
      setUnreadCount(count);
    } catch {}
  };

  // Poll unread count every 60 seconds
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 60000);
    return () => clearInterval(interval);
  }, []);

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

  const handleClick = async (notif) => {
    if (notif.rawId && !notif.read) {
      try { await api.post(`/notifications/${notif.rawId}/read`); fetchUnreadCount(); } catch {}
    }
    if (notif.link) navigate(notif.link);
    setOpen(false);
  };

  const handleMarkAllRead = async () => {
    try {
      await api.post('/notifications/read-all');
      fetchUnreadCount();
      fetchNotifications();
    } catch {}
  };

  return (
    <div className="notif-bell" ref={ref}>
      <button className="btn-icon notif-bell-btn" onClick={() => setOpen(!open)}
        title={`${unreadCount} notifikasi`} style={{ color: 'var(--text-secondary)' }}>
        <Bell size={18} />
        {unreadCount > 0 && <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>

      {open && (
        <div className="notif-dropdown">
          <div className="notif-dropdown-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4>Notifikasi</h4>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-ghost btn-sm" style={{ padding: '0 0.25rem', fontSize: '0.8rem' }} onClick={handleMarkAllRead}>Tandai Dibaca</button>
              <button className="btn-icon" onClick={() => setOpen(false)}><X size={16} /></button>
            </div>
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
                <button key={n.id} className={`notif-item notif-${n.type} ${n.read === false ? 'unread' : ''}`} onClick={() => handleClick(n)}>
                  <div className="notif-item-icon">
                    <n.icon size={16} />
                  </div>
                  <div className="notif-item-content">
                    <span className="notif-item-title" style={{ fontWeight: n.read === false ? 600 : 400 }}>{n.title}</span>
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
