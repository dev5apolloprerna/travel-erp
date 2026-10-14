// Export an array of flat objects to a CSV file (opens in Excel). No external dependency.
export function exportToCsv(filename, rows) {
  const data = Array.isArray(rows) ? rows : [];
  if (data.length === 0) { alert('Nothing to export.'); return; }
  const headers = Object.keys(data[0]);
  const esc = (v) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.join(','), ...data.map((r) => headers.map((h) => esc(r[h])).join(','))].join('\n');
  // BOM so Excel reads UTF-8 correctly.
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}
