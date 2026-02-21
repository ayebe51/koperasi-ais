import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import api from '../lib/api';
import {
  LayoutDashboard, Users, Wallet, Landmark, BookOpen, FileText,
  Store, TrendingUp, Settings, LogOut, Menu, X, ChevronDown,
  Receipt, BarChart3, Calculator, QrCode, UserCircle, Sun, Moon, Edit2, KeyRound, HelpCircle
} from 'lucide-react';
import ConfirmDialog from '../components/ConfirmDialog/ConfirmDialog';
import GlobalSearch from '../components/GlobalSearch/GlobalSearch';
import ShortcutsModal from '../components/ShortcutsModal/ShortcutsModal';
import NotificationBell from '../components/NotificationBell/NotificationBell';
import './AppLayout.css';

const menuItems = [
  { to: '/',                  icon: LayoutDashboard, label: 'Dashboard',             roles: ['ADMIN','MANAGER','TELLER','ACCOUNTANT'] },
  { to: '/portal',             icon: Wallet,          label: 'Portal Saya',           roles: ['MEMBER'] },
  { to: '/profil',             icon: UserCircle,      label: 'Akun Saya',             roles: null },
  { to: '/anggota',           icon: Users,           label: 'Keanggotaan',           roles: ['ADMIN','MANAGER','TELLER'] },
  { to: '/simpanan',          icon: Wallet,          label: 'Simpanan',              roles: ['ADMIN','MANAGER','TELLER'] },
  { to: '/verifikasi-pembayaran', icon: Receipt, label: 'Verifikasi Pembayaran', roles: ['ADMIN','MANAGER','TELLER'], badgeKey: 'payment_verifications' },
  { to: '/pembayaran',        icon: QrCode,          label: 'Pembayaran QRIS',       roles: null },
  { to: '/pinjaman',          icon: Landmark,        label: 'Pinjaman',              roles: ['ADMIN','MANAGER','TELLER','ACCOUNTANT'], badgeKey: 'pinjaman' },
  {
    icon: BookOpen, label: 'Pembukuan', roles: ['ADMIN','MANAGER','ACCOUNTANT'],
    children: [
      { to: '/pembukuan/coa',         label: 'Chart of Account' },
      { to: '/pembukuan/jurnal',      label: 'Jurnal Umum' },
      { to: '/pembukuan/buku-besar',  label: 'Buku Besar' },
      { to: '/pembukuan/laporan',     label: 'Laporan Keuangan' },
    ],
  },
  { to: '/shu',               icon: Calculator,      label: 'SHU',                   roles: ['ADMIN','MANAGER','ACCOUNTANT'] },
  {
    icon: Store, label: 'Unit Toko', roles: ['ADMIN','MANAGER','TELLER'], badgeKey: 'toko',
    children: [
      { to: '/toko/produk',     label: 'Produk' },
      { to: '/toko/penjualan',  label: 'Penjualan' },
    ],
  },
  {
    icon: BarChart3, label: 'Laporan', roles: ['ADMIN','MANAGER','ACCOUNTANT'],
    children: [
      { to: '/laporan/toko',        label: 'Unit Toko' },
      { to: '/laporan/pembiayaan',  label: 'Unit Pembiayaan' },
    ],
  },
  { to: '/users',              icon: Settings,        label: 'User Management',       roles: ['ADMIN'] },
  { to: '/activity-log',       icon: FileText,        label: 'Log Aktivitas',         roles: ['ADMIN','MANAGER'] },
  { to: '/settings',            icon: Settings,        label: 'Pengaturan',            roles: ['ADMIN'] },
  { to: '/panduan',              icon: HelpCircle,      label: 'Panduan',               roles: null },
];

export default function AppLayout() {
  const { user, logout, setUser } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openSubmenu, setOpenSubmenu] = useState(null);

  // Dark mode
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : true; // default dark
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  // Fetch badge counts
  useEffect(() => {
    api.get('/dashboard/stats').then(res => {
      const d = res.data.data;
      setBadges({
        pinjaman: d?.pinjaman?.pending || 0,
        toko: d?.toko?.stok_rendah || 0,
      });
    }).catch(() => {});
  }, []);

  // Profile edit
  const [showProfile, setShowProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', email: '' });
  const [profileLoading, setProfileLoading] = useState(false);
  const [showPwForm, setShowPwForm] = useState(false);
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', new_password_confirmation: '' });
  const [pwLoading, setPwLoading] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [badges, setBadges] = useState({});
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Keyboard Shortcuts
  useEffect(() => {
    const handler = (e) => {
      // Ignore if typing in input/textarea
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

      if (e.key === '?') {
        setShowShortcuts(s => !s);
      }

      // Navigation Shortcuts (G + key)
      if (e.key === 'g' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const handleNav = (e2) => {
          const k = e2.key.toLowerCase();
          if (k === 'd') navigate('/');
          if (k === 'a') navigate('/anggota');
          if (k === 'p') navigate('/pinjaman');
          if (k === 's') navigate('/simpanan');
          document.removeEventListener('keydown', handleNav);
        };
        document.addEventListener('keydown', handleNav, { once: true });
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [navigate]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const visibleItems = menuItems.filter(item =>
    !item.roles || item.roles.includes(user?.role)
  );

  const toggleSubmenu = (label) => {
    setOpenSubmenu(prev => prev === label ? null : label);
  };

  const openProfileModal = () => {
    setProfileForm({ name: user?.name || '', email: user?.email || '' });
    setShowProfile(true);
    setShowPwForm(false);
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    try {
      const res = await api.put('/auth/profile', profileForm);
      if (setUser) setUser(res.data.data);
      toast.success('Profil berhasil diperbarui');
      setShowProfile(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan profil');
    }
    setProfileLoading(false);
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwLoading(true);
    try {
      await api.put('/auth/password', pwForm);
      toast.success('Password berhasil diubah');
      setShowPwForm(false);
      setPwForm({ current_password: '', new_password: '', new_password_confirmation: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal mengubah password');
    }
    setPwLoading(false);
  };

  return (
    <div className={`app-layout ${sidebarOpen ? '' : 'sidebar-collapsed'}`}>
      {/* Mobile overlay */}
      {mobileOpen && <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />}

      {/* Sidebar */}
      <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="logo-icon">K</div>
            {sidebarOpen && <span className="logo-text">Koperasi AIS</span>}
          </div>
        </div>

        <nav className="sidebar-nav">
          {visibleItems.map((item) =>
            item.children ? (
              <div key={item.label} className={`nav-group ${openSubmenu === item.label ? 'open' : ''}`}>
                <button className="nav-item nav-group-toggle" onClick={() => toggleSubmenu(item.label)}>
                <item.icon size={20} />
                {sidebarOpen && (
                  <>
                    <span>{item.label}</span>
                    {item.badgeKey && badges[item.badgeKey] > 0 && (
                      <span className="sidebar-badge">{badges[item.badgeKey]}</span>
                    )}
                    <ChevronDown size={14} className="chevron" />
                  </>
                )}
                </button>
                {sidebarOpen && openSubmenu === item.label && (
                  <div className="nav-children">
                    {item.children.map(child => (
                      <NavLink key={child.to} to={child.to} className="nav-item nav-child"
                        onClick={() => setMobileOpen(false)}>
                        <span>{child.label}</span>
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <NavLink key={item.to} to={item.to} end={item.to === '/'} className="nav-item"
                onClick={() => setMobileOpen(false)}>
                <item.icon size={20} />
                {sidebarOpen && (
                  <>
                    <span>{item.label}</span>
                    {item.badgeKey && badges[item.badgeKey] > 0 && (
                      <span className="sidebar-badge">{badges[item.badgeKey]}</span>
                    )}
                  </>
                )}
              </NavLink>
            )
          )}
        </nav>

        <div className="sidebar-footer">
          <button className="nav-item logout-btn" onClick={handleLogout}>
            <LogOut size={20} />
            {sidebarOpen && <span>Keluar</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="main-wrapper">
        <header className="navbar no-print">
          <div className="navbar-left">
            <button className="btn-icon mobile-toggle" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <button className="btn-icon desktop-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <Menu size={20} />
            </button>
          </div>
          <div className="navbar-center">
            <GlobalSearch />
          </div>
          <div className="navbar-right">
            <button className="btn-icon" onClick={() => setDarkMode(d => !d)} title={darkMode ? 'Light Mode' : 'Dark Mode'}
              style={{ color: 'var(--text-secondary)' }}>
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <NotificationBell />
            <div className="user-info" onClick={openProfileModal} style={{ cursor: 'pointer' }} title="Edit Profil">
              <div className="user-avatar">{user?.name?.charAt(0) || 'U'}</div>
              <div className="user-meta">
                <span className="user-name">{user?.name}</span>
                <span className="user-role badge badge-info">{user?.role}</span>
              </div>
            </div>
          </div>
        </header>

        <main className="main-content">
          <Outlet />
        </main>
      </div>

      {/* Profile Edit Modal */}
      {showProfile && (
        <div className="modal-overlay" onClick={() => setShowProfile(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <h3>Edit Profil</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowProfile(false)}><X size={18} /></button>
            </div>

            {!showPwForm ? (
              <form onSubmit={handleProfileSave}>
                <div className="modal-body">
                  <div className="form-group">
                    <label className="form-label">Nama Lengkap</label>
                    <input className="form-input" required value={profileForm.name}
                      onChange={e => setProfileForm(p => ({ ...p, name: e.target.value }))} autoFocus />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input className="form-input" type="email" required value={profileForm.email}
                      onChange={e => setProfileForm(p => ({ ...p, email: e.target.value }))} />
                  </div>
                  <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 'var(--space-sm)' }}
                    onClick={() => setShowPwForm(true)}>
                    <KeyRound size={14} /> Ubah Password
                  </button>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowProfile(false)}>Batal</button>
                  <button type="submit" className="btn btn-primary" disabled={profileLoading}>
                    {profileLoading ? 'Menyimpan...' : 'Simpan'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handlePasswordChange}>
                <div className="modal-body">
                  <div className="form-group">
                    <label className="form-label">Password Lama</label>
                    <input className="form-input" type="password" required value={pwForm.current_password}
                      onChange={e => setPwForm(p => ({ ...p, current_password: e.target.value }))} autoFocus />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Password Baru</label>
                    <input className="form-input" type="password" required minLength={8} value={pwForm.new_password}
                      onChange={e => setPwForm(p => ({ ...p, new_password: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Konfirmasi Password Baru</label>
                    <input className="form-input" type="password" required minLength={8} value={pwForm.new_password_confirmation}
                      onChange={e => setPwForm(p => ({ ...p, new_password_confirmation: e.target.value }))} />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowPwForm(false)}>Kembali</button>
                  <button type="submit" className="btn btn-primary" disabled={pwLoading}>
                    {pwLoading ? 'Menyimpan...' : 'Ubah Password'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}
    </div>
  );
}
