import { useState, useEffect } from 'react';
import api from '../../lib/api';
import { formatRupiah, formatDate } from '../../lib/utils';
import { X, ShoppingCart, Printer } from 'lucide-react';
import ReceiptModal from '../../components/Receipt/ReceiptModal';

export default function SaleDetailModal({ saleId, onClose }) {
  const [sale, setSale] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showReceipt, setShowReceipt] = useState(false);

  useEffect(() => {
    api.get(`/store/sales/${saleId}`)
      .then(res => setSale(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [saleId]);

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
          <div className="modal-header">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShoppingCart size={18} /> Detail Penjualan
            </h3>
            <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
          </div>

          <div className="modal-body">
            {loading ? (
              <div className="page-loading" style={{ minHeight: 150 }}>
                <div className="spinner" />
              </div>
            ) : !sale ? (
              <p className="text-muted text-center">Data tidak ditemukan</p>
            ) : (
              <>
                <div className="info-rows" style={{ marginBottom: 'var(--space-lg)' }}>
                  <div className="info-row">
                    <span>No. Transaksi</span>
                    <strong className="font-mono">{sale.sale_number || sale.id}</strong>
                  </div>
                  <div className="info-row">
                    <span>Tanggal</span>
                    <strong>{formatDate(sale.sale_date || sale.created_at)}</strong>
                  </div>
                  <div className="info-row">
                    <span>Kasir</span>
                    <strong>{sale.cashier?.name || sale.user?.name || '-'}</strong>
                  </div>
                  {sale.member && (
                    <div className="info-row">
                      <span>Anggota</span>
                      <strong>{sale.member.name} ({sale.member.member_number})</strong>
                    </div>
                  )}
                </div>

                <h4 style={{ marginBottom: 'var(--space-sm)', fontSize: '0.95rem' }}>Item Pembelian</h4>
                <div className="table-container" style={{ marginBottom: 'var(--space-lg)' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Produk</th>
                        <th className="text-right">Harga</th>
                        <th className="text-right">Qty</th>
                        <th className="text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(sale.items || []).map((item, i) => (
                        <tr key={i}>
                          <td>{item.product?.name || item.product_name || '-'}</td>
                          <td className="text-right font-mono">{formatRupiah(item.price || item.unit_price)}</td>
                          <td className="text-right">{item.quantity}</td>
                          <td className="text-right font-mono">{formatRupiah(item.subtotal || (item.quantity * (item.price || item.unit_price)))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="info-rows">
                  <div className="info-row">
                    <span>Subtotal</span>
                    <strong>{formatRupiah(sale.subtotal || sale.total_before_discount || 0)}</strong>
                  </div>
                  {(sale.discount || 0) > 0 && (
                    <div className="info-row">
                      <span>Diskon</span>
                      <strong style={{ color: 'var(--danger)' }}>-{formatRupiah(sale.discount)}</strong>
                    </div>
                  )}
                  <div className="info-row" style={{ borderTop: '2px solid var(--border-color)', paddingTop: 'var(--space-md)' }}>
                    <span><strong>Total</strong></span>
                    <strong style={{ color: 'var(--success)', fontSize: '1.1rem' }}>
                      {formatRupiah(sale.total || sale.grand_total || 0)}
                    </strong>
                  </div>
                </div>
              </>
            )}
          </div>

          {sale && (
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowReceipt(true)}>
                <Printer size={14} /> Cetak Struk
              </button>
              <button className="btn btn-primary" onClick={onClose}>Tutup</button>
            </div>
          )}
        </div>
      </div>

      {showReceipt && (
        <ReceiptModal type="sale" id={saleId} onClose={() => setShowReceipt(false)} />
      )}
    </>
  );
}
