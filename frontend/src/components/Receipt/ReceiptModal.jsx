import { useState, useEffect } from 'react';
import api from '../../lib/api';
import { Printer, X, Download } from 'lucide-react';
import './Receipt.css';

/**
 * ReceiptModal — Reusable receipt viewer/printer.
 *
 * Props:
 *   type:  'saving' | 'loan-payment' | 'sale'
 *   id:    entity id to fetch
 *   onClose: callback
 */
export default function ReceiptModal({ type, id, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/receipts/${type}/${id}`)
      .then(res => setData(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [type, id]);

  const handlePrint = () => window.print();

  const fmt = (n) => {
    const num = parseFloat(n) || 0;
    return 'Rp ' + num.toLocaleString('id-ID');
  };

  return (
    <div className="receipt-overlay" onClick={onClose}>
      <div className="receipt-wrapper" onClick={e => e.stopPropagation()}>
        {/* Action bar */}
        <div className="receipt-actions">
          <button className="btn btn-primary btn-sm" onClick={handlePrint}>
            <Printer size={14} /> Cetak
          </button>
          <div style={{ flex: 1 }} />
          <button className="btn btn-ghost btn-sm btn-icon" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Receipt body */}
        <div className="receipt-scroll">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <div className="spinner" style={{ margin: '0 auto' }} />
              <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Memuat struk...</p>
            </div>
          ) : !data ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
              Gagal memuat data struk
            </div>
          ) : (
            <div className="receipt">
              {/* Header */}
              <div className="receipt-header">
                <h2>{data.koperasi}</h2>
                <p>Struk Transaksi</p>
              </div>

              {/* Type label */}
              <div className="receipt-type">
                {data.receipt_type === 'SIMPANAN' && '📋 TRANSAKSI SIMPANAN'}
                {data.receipt_type === 'ANGSURAN_PINJAMAN' && '🏦 PEMBAYARAN ANGSURAN'}
                {data.receipt_type === 'PENJUALAN' && '🛒 PENJUALAN TOKO'}
              </div>

              {/* Member info */}
              {data.anggota && (
                <div className="receipt-section">
                  <div className="receipt-section-title">Anggota</div>
                  <div className="receipt-row">
                    <span className="label">No. Anggota</span>
                    <span className="value">{data.anggota.nomor}</span>
                  </div>
                  <div className="receipt-row">
                    <span className="label">Nama</span>
                    <span className="value">{data.anggota.nama}</span>
                  </div>
                  {data.anggota.unit && (
                    <div className="receipt-row">
                      <span className="label">Unit</span>
                      <span className="value">{data.anggota.unit}</span>
                    </div>
                  )}
                </div>
              )}

              {/* ── SIMPANAN ── */}
              {data.receipt_type === 'SIMPANAN' && (
                <div className="receipt-section">
                  <div className="receipt-section-title">Detail Transaksi</div>
                  <div className="receipt-row">
                    <span className="label">Tanggal</span>
                    <span className="value">{data.transaksi.tanggal}</span>
                  </div>
                  <div className="receipt-row">
                    <span className="label">Jenis</span>
                    <span className="value">{data.transaksi.jenis_simpanan}</span>
                  </div>
                  <div className="receipt-row">
                    <span className="label">Tipe</span>
                    <span className="value">{data.transaksi.tipe_transaksi === 'DEPOSIT' ? 'Setoran' : 'Penarikan'}</span>
                  </div>
                  {data.transaksi.referensi && (
                    <div className="receipt-row">
                      <span className="label">Referensi</span>
                      <span className="value">{data.transaksi.referensi}</span>
                    </div>
                  )}
                  <div className="receipt-row total">
                    <span className="label">Jumlah</span>
                    <span className="value">{fmt(data.transaksi.jumlah)}</span>
                  </div>
                  <div className="receipt-row">
                    <span className="label">Saldo Akhir</span>
                    <span className="value">{fmt(data.transaksi.saldo_akhir)}</span>
                  </div>
                </div>
              )}

              {/* ── ANGSURAN PINJAMAN ── */}
              {data.receipt_type === 'ANGSURAN_PINJAMAN' && (
                <div className="receipt-section">
                  <div className="receipt-section-title">Detail Pembayaran</div>
                  <div className="receipt-row">
                    <span className="label">No. Kwitansi</span>
                    <span className="value">{data.transaksi.no_kwitansi || '-'}</span>
                  </div>
                  <div className="receipt-row">
                    <span className="label">No. Pinjaman</span>
                    <span className="value">{data.pinjaman.nomor}</span>
                  </div>
                  <div className="receipt-row">
                    <span className="label">Tgl Bayar</span>
                    <span className="value">{data.transaksi.tanggal_bayar}</span>
                  </div>
                  <div className="receipt-row">
                    <span className="label">Pokok</span>
                    <span className="value">{fmt(data.transaksi.pokok)}</span>
                  </div>
                  <div className="receipt-row">
                    <span className="label">Bunga</span>
                    <span className="value">{fmt(data.transaksi.bunga)}</span>
                  </div>
                  <div className="receipt-row total">
                    <span className="label">Total Bayar</span>
                    <span className="value">{fmt(data.transaksi.total_bayar)}</span>
                  </div>
                  <div className="receipt-row">
                    <span className="label">Sisa Pinjaman</span>
                    <span className="value">{fmt(data.transaksi.sisa_pinjaman)}</span>
                  </div>
                </div>
              )}

              {/* ── PENJUALAN ── */}
              {data.receipt_type === 'PENJUALAN' && (
                <>
                  <div className="receipt-section">
                    <div className="receipt-section-title">Detail Penjualan</div>
                    <div className="receipt-row">
                      <span className="label">No. Nota</span>
                      <span className="value">{data.transaksi.nomor}</span>
                    </div>
                    <div className="receipt-row">
                      <span className="label">Tanggal</span>
                      <span className="value">{data.transaksi.tanggal}</span>
                    </div>
                    {data.kasir && (
                      <div className="receipt-row">
                        <span className="label">Kasir</span>
                        <span className="value">{data.kasir}</span>
                      </div>
                    )}
                  </div>

                  <div className="receipt-section">
                    <table className="receipt-items">
                      <thead>
                        <tr>
                          <th>Item</th>
                          <th>Qty</th>
                          <th>Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.items?.map((item, i) => (
                          <tr key={i}>
                            <td>{item.produk}</td>
                            <td>{item.qty}x {fmt(item.harga_satuan)}</td>
                            <td>{fmt(item.subtotal)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="receipt-section">
                    <div className="receipt-row">
                      <span className="label">Subtotal</span>
                      <span className="value">{fmt(data.transaksi.subtotal)}</span>
                    </div>
                    {parseFloat(data.transaksi.diskon) > 0 && (
                      <div className="receipt-row">
                        <span className="label">Diskon</span>
                        <span className="value">-{fmt(data.transaksi.diskon)}</span>
                      </div>
                    )}
                    <div className="receipt-row total">
                      <span className="label">TOTAL</span>
                      <span className="value">{fmt(data.transaksi.total)}</span>
                    </div>
                    <div className="receipt-row">
                      <span className="label">Pembayaran</span>
                      <span className="value">{data.transaksi.metode_bayar}</span>
                    </div>
                  </div>
                </>
              )}

              {/* Footer */}
              <div className="receipt-footer">
                <p>Dicetak: {data.tanggal_cetak}</p>
                <p>Terima kasih atas kepercayaan Anda</p>
                <p>═══════════════════════</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
