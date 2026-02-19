import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary';
import AppLayout from './layouts/AppLayout';

/* ── Pages ── */
import LoginPage from './pages/LoginPage/LoginPage';
import DashboardPage from './pages/DashboardPage/DashboardPage';
import AnggotaListPage from './pages/AnggotaPage/AnggotaListPage';
import AnggotaDetailPage from './pages/AnggotaPage/AnggotaDetailPage';
import SimpananPage from './pages/SimpananPage/SimpananPage';
import PinjamanListPage from './pages/PinjamanPage/PinjamanListPage';
import PinjamanDetailPage from './pages/PinjamanPage/PinjamanDetailPage';
import COAPage from './pages/PembukuanPage/COAPage';
import JurnalPage from './pages/PembukuanPage/JurnalPage';
import LaporanKeuanganPage from './pages/PembukuanPage/LaporanKeuanganPage';
import SHUPage from './pages/SHUPage/SHUPage';
import ProdukPage from './pages/TokoPage/ProdukPage';
import PenjualanPage from './pages/TokoPage/PenjualanPage';
import LaporanTokoPage from './pages/LaporanPage/LaporanTokoPage';
import LaporanPembiayaanPage from './pages/LaporanPage/LaporanPembiayaanPage';
import PembayaranPage from './pages/PembayaranPage/PembayaranPage';
import ProfilPage from './pages/ProfilPage/ProfilPage';
import UserManagementPage from './pages/UserPage/UserManagementPage';
import SettingsPage from './pages/SettingsPage/SettingsPage';
import ActivityLogPage from './pages/ActivityLogPage/ActivityLogPage';
import NotFoundPage from './pages/NotFoundPage/NotFoundPage';
import MemberPortalPage from './pages/PortalPage/MemberPortalPage';

function AuthRedirect({ children }) {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
      <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={
            <AuthRedirect><LoginPage /></AuthRedirect>
          } />

          {/* Protected - App Layout */}
          <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route index element={<DashboardPage />} />

            {/* Profil / Portal Anggota — All authenticated */}
            <Route path="profil" element={<ProfilPage />} />
            <Route path="portal" element={<MemberPortalPage />} />

            {/* Keanggotaan — ADMIN, MANAGER, TELLER */}
            <Route path="anggota" element={<ProtectedRoute roles={['ADMIN','MANAGER','TELLER']}><AnggotaListPage /></ProtectedRoute>} />
            <Route path="anggota/:id" element={<ProtectedRoute roles={['ADMIN','MANAGER','TELLER']}><AnggotaDetailPage /></ProtectedRoute>} />

            {/* Simpanan — ADMIN, MANAGER, TELLER */}
            <Route path="simpanan" element={<ProtectedRoute roles={['ADMIN','MANAGER','TELLER']}><SimpananPage /></ProtectedRoute>} />

            {/* Pembayaran QRIS — All authenticated */}
            <Route path="pembayaran" element={<PembayaranPage />} />

            {/* Pinjaman — ADMIN, MANAGER, TELLER, ACCOUNTANT */}
            <Route path="pinjaman" element={<ProtectedRoute roles={['ADMIN','MANAGER','TELLER','ACCOUNTANT']}><PinjamanListPage /></ProtectedRoute>} />
            <Route path="pinjaman/:id" element={<ProtectedRoute roles={['ADMIN','MANAGER','TELLER','ACCOUNTANT']}><PinjamanDetailPage /></ProtectedRoute>} />

            {/* Pembukuan — ADMIN, MANAGER, ACCOUNTANT */}
            <Route path="pembukuan/coa" element={<ProtectedRoute roles={['ADMIN','MANAGER','ACCOUNTANT']}><COAPage /></ProtectedRoute>} />
            <Route path="pembukuan/jurnal" element={<ProtectedRoute roles={['ADMIN','MANAGER','ACCOUNTANT']}><JurnalPage /></ProtectedRoute>} />
            <Route path="pembukuan/laporan" element={<ProtectedRoute roles={['ADMIN','MANAGER','ACCOUNTANT']}><LaporanKeuanganPage /></ProtectedRoute>} />

            {/* SHU — ADMIN, MANAGER, ACCOUNTANT */}
            <Route path="shu" element={<ProtectedRoute roles={['ADMIN','MANAGER','ACCOUNTANT']}><SHUPage /></ProtectedRoute>} />

            {/* Toko — ADMIN, MANAGER, TELLER */}
            <Route path="toko/produk" element={<ProtectedRoute roles={['ADMIN','MANAGER','TELLER']}><ProdukPage /></ProtectedRoute>} />
            <Route path="toko/penjualan" element={<ProtectedRoute roles={['ADMIN','MANAGER','TELLER']}><PenjualanPage /></ProtectedRoute>} />

            {/* Laporan — ADMIN, MANAGER, ACCOUNTANT */}
            <Route path="laporan/toko" element={<ProtectedRoute roles={['ADMIN','MANAGER','ACCOUNTANT']}><LaporanTokoPage /></ProtectedRoute>} />
            <Route path="laporan/pembiayaan" element={<ProtectedRoute roles={['ADMIN','MANAGER','ACCOUNTANT']}><LaporanPembiayaanPage /></ProtectedRoute>} />

            {/* User Management — ADMIN only */}
            <Route path="users" element={<ProtectedRoute roles={['ADMIN']}><UserManagementPage /></ProtectedRoute>} />

            {/* Settings — ADMIN only */}
            <Route path="settings" element={<ProtectedRoute roles={['ADMIN']}><SettingsPage /></ProtectedRoute>} />

            {/* Activity Log — ADMIN, MANAGER */}
            <Route path="activity-log" element={<ProtectedRoute roles={['ADMIN','MANAGER']}><ActivityLogPage /></ProtectedRoute>} />
          </Route>

          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
      </ErrorBoundary>
      </ToastProvider>
    </AuthProvider>
  );
}
