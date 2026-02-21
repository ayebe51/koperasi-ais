import { useState } from 'react';
import {
  HelpCircle, Users, Wallet, Landmark, Store, BookOpen, Calculator,
  CreditCard, ChevronDown, BarChart3, Search, Printer, FileDown
} from 'lucide-react';
import './PanduanPage.css';

const MODULES = [
  {
    icon: Users,
    color: '#0891b2',
    bg: 'rgba(8,145,178,0.12)',
    title: 'Keanggotaan',
    desc: 'Kelola data anggota: tambah, edit, dan lihat detail anggota koperasi. Tersedia fitur export CSV.',
  },
  {
    icon: Wallet,
    color: '#6366f1',
    bg: 'rgba(99,102,241,0.12)',
    title: 'Simpanan',
    desc: 'Catat setoran & penarikan simpanan (Pokok, Wajib, Sukarela). Print struk dan export data.',
  },
  {
    icon: Landmark,
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.12)',
    title: 'Pinjaman',
    desc: 'Ajukan pinjaman, kelola jadwal angsuran, bayar cicilan, dan pantau NPL. Cetak struk pembayaran.',
  },
  {
    icon: Store,
    color: '#22c55e',
    bg: 'rgba(34,197,94,0.12)',
    title: 'Unit Toko',
    desc: 'Kelola produk, stok, dan penjualan toko koperasi. Fitur POS untuk kasir.',
  },
  {
    icon: BookOpen,
    color: '#8b5cf6',
    bg: 'rgba(139,92,246,0.12)',
    title: 'Pembukuan',
    desc: 'Chart of Account, Jurnal Umum, Buku Besar, dan Laporan Keuangan (Neraca, Laba Rugi, Arus Kas).',
  },
  {
    icon: Calculator,
    color: '#ec4899',
    bg: 'rgba(236,72,153,0.12)',
    title: 'SHU',
    desc: 'Hitung dan distribusikan Sisa Hasil Usaha (SHU) per anggota berdasarkan kontribusi simpanan & pinjaman.',
  },
  {
    icon: CreditCard,
    color: '#14b8a6',
    bg: 'rgba(20,184,166,0.12)',
    title: 'Pembayaran QRIS',
    desc: 'Bayar simpanan atau angsuran pinjaman via QRIS. Scan QR Code dan status otomatis terupdate.',
  },
  {
    icon: BarChart3,
    color: '#f97316',
    bg: 'rgba(249,115,22,0.12)',
    title: 'Laporan',
    desc: 'Laporan Unit Toko dan Pembiayaan. Cetak dan export laporan keuangan.',
  },
];

const FAQS = [
  {
    q: 'Bagaimana cara menambah anggota baru?',
    a: 'Buka menu <b>Keanggotaan</b>, klik tombol <b>+ Tambah Anggota</b>. Isi data lengkap seperti NIK, nama, alamat, unit kerja, dan tanggal bergabung. Simpanan pokok akan otomatis tercatat.',
  },
  {
    q: 'Bagaimana cara mencatat setoran simpanan?',
    a: 'Buka menu <b>Simpanan</b>, pilih anggota, lalu klik tombol <b>+ Transaksi</b>. Pilih tipe simpanan (Pokok/Wajib/Sukarela), jenis transaksi (Setoran/Penarikan), dan isi jumlah.',
  },
  {
    q: 'Bagaimana cara mengajukan pinjaman?',
    a: 'Buka menu <b>Pinjaman</b>, klik <b>+ Pengajuan</b>. Pilih anggota, isi jumlah pinjaman, tenor, dan suku bunga. Pinjaman akan berstatus <b>PENDING</b> hingga disetujui oleh Manager/Admin.',
  },
  {
    q: 'Bagaimana cara membayar angsuran pinjaman?',
    a: 'Ada 2 cara:<ol><li><b>Via Teller:</b> Buka detail pinjaman → klik <b>Bayar Angsuran</b> pada jadwal yang sesuai.</li><li><b>Via QRIS:</b> Buka menu <b>Pembayaran QRIS</b> → pilih Angsuran Pinjaman → generate QR Code.</li></ol>',
  },
  {
    q: 'Bagaimana cara mencetak laporan keuangan?',
    a: 'Buka menu <b>Pembukuan → Laporan Keuangan</b>. Pilih jenis laporan (Neraca/Laba Rugi/Arus Kas/Neraca Saldo), atur periode, lalu klik <b>Cetak</b>.',
  },
  {
    q: 'Bagaimana cara menghitung SHU?',
    a: 'Buka menu <b>SHU</b>. Sistem akan otomatis menghitung SHU berdasarkan pendapatan dan beban pada periode tersebut, lalu mendistribusikan ke anggota berdasarkan kontribusi simpanan & pinjaman.',
  },
  {
    q: 'Apa itu fitur Global Search?',
    a: 'Klik ikon <b>🔍</b> di navbar atau tekan <b>Ctrl + K</b>. Ketik nama anggota, nomor pinjaman, atau kata kunci untuk mencari data di seluruh sistem.',
  },
  {
    q: 'Bagaimana cara export data ke CSV?',
    a: 'Di halaman Anggota, Simpanan, atau Pinjaman, klik tombol <b>Export CSV</b> di pojok kanan atas. File akan otomatis terdownload.',
  },
  {
    q: 'Bagaimana anggota mengakses portal?',
    a: 'Anggota bisa mengakses portal melalui halaman login → klik <b>Aktivasi Akun</b>. Masukkan No. Anggota dan NIK untuk verifikasi, lalu buat password.',
  },
];

export default function PanduanPage() {
  const [openFaq, setOpenFaq] = useState(null);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Panduan Penggunaan</h1>
          <p className="page-subtitle">Panduan lengkap fitur-fitur Koperasi AIS</p>
        </div>
      </div>

      {/* Module Guide Cards */}
      <h3 style={{ marginBottom: 'var(--space-md)' }}>Modul Aplikasi</h3>
      <div className="panduan-grid">
        {MODULES.map((m, i) => (
          <div key={i} className="guide-card">
            <div className="guide-card-icon" style={{ background: m.bg, color: m.color }}>
              <m.icon size={22} />
            </div>
            <h4>{m.title}</h4>
            <p>{m.desc}</p>
          </div>
        ))}
      </div>

      {/* FAQ */}
      <h3 style={{ marginBottom: 'var(--space-md)' }}>Pertanyaan Umum (FAQ)</h3>
      <div className="faq-list">
        {FAQS.map((faq, i) => (
          <div key={i} className="faq-item">
            <button
              className={`faq-question ${openFaq === i ? 'open' : ''}`}
              onClick={() => setOpenFaq(openFaq === i ? null : i)}
            >
              {faq.q}
              <ChevronDown size={16} />
            </button>
            {openFaq === i && (
              <div className="faq-answer" dangerouslySetInnerHTML={{ __html: faq.a }} />
            )}
          </div>
        ))}
      </div>

      {/* Tips Section */}
      <div className="card" style={{ marginTop: 'var(--space-xl)' }}>
        <h4 style={{ marginBottom: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <HelpCircle size={16} /> Tips & Pintasan
        </h4>
        <div className="shortcut-grid">
          <div className="shortcut-item">
            <span className="shortcut-key">Ctrl + K</span>
            <span className="text-sm">Pencarian cepat</span>
          </div>
          <div className="shortcut-item">
            <span className="shortcut-key">Ctrl + P</span>
            <span className="text-sm">Cetak halaman</span>
          </div>
          <div className="shortcut-item">
            <span className="shortcut-key"><Printer size={12} /></span>
            <span className="text-sm">Print struk transaksi</span>
          </div>
          <div className="shortcut-item">
            <span className="shortcut-key"><FileDown size={12} /></span>
            <span className="text-sm">Export data ke CSV</span>
          </div>
        </div>
      </div>
    </div>
  );
}
