export function formatRupiah(amount) {
  if (amount == null) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(num) {
  if (num == null) return '0';
  return new Intl.NumberFormat('id-ID').format(num);
}

export function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function statusBadge(status) {
  const map = {
    ACTIVE: 'success', APPROVED: 'success', PAID_OFF: 'success', PAID: 'success',
    PENDING: 'warning',
    REJECTED: 'danger', DEFAULTED: 'danger',
    INACTIVE: 'neutral', RESIGNED: 'neutral',
  };
  return map[status] || 'neutral';
}

export function truncate(str, len = 30) {
  if (!str) return '';
  return str.length > len ? str.slice(0, len) + '…' : str;
}
