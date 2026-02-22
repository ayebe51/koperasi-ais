/**
 * Utility functions for exporting data from the browser.
 */

/**
 * Konversi Array of Objects menjadi string CSV
 * @param {Array} data - Array data referensi (e.g. [{nama: "Budi", umur: 20}])
 * @param {Array} columns - (opsional) Array judul kolom dan key { header: "Nama", key: "nama" }
 * @returns {string} String format CSV
 */
const convertToCSV = (data, columns = null) => {
    if (!data || !data.length) return '';

    // Jika tidak ada columns, ekstrak dari object pertama
    const keys = columns ? columns.map(c => c.key) : Object.keys(data[0]);
    const headers = columns ? columns.map(c => c.header) : keys;

    const csvRows = [];

    // Header row
    csvRows.push(headers.map(header => `"${(header || '').toString().replace(/"/g, '""')}"`).join(','));

    // Data rows
    for (const row of data) {
      const values = keys.map(k => {
        let val = row[k];
        if (val === null || val === undefined) val = '';
        return `"${val.toString().replace(/"/g, '""')}"`; // Escape quotes
      });
      csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
  };

  /**
   * Mengunduh file CSV secara on-the-fly dari browser
   * @param {Array} data - Data yang akan diekspor
   * @param {string} filename - Nama file (otomatis ditambah .csv)
   * @param {Array} columns - Struktur kolom (opsional)
   */
  export const exportToCSV = (data, filename = 'export', columns = null) => {
    const csvData = convertToCSV(data, columns);
    const blob = new Blob(['\uFEFF' + csvData], { type: 'text/csv;charset=utf-8;' }); // \uFEFF for Excel UTF-8 BOM
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${filename}.csv`);

    document.body.appendChild(link);
    link.click();

    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

