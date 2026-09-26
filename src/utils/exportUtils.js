import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

/**
 * Export array of objects to Excel (.xlsx)
 * @param {Array} columns - [{ key, label }]
 * @param {Array} data - array of records
 * @param {string} filename - without extension
 * @param {string} sheetName - worksheet name
 */
export const exportToExcel = (
  columns,
  data,
  filename = 'export',
  sheetName = 'Data'
) => {
  if (!data?.length) return;

  const headers = columns.map((c) => c.label);
  const rows = data.map((row) =>
    columns.map((col) => {
      const val = row[col.key];
      if (val === null || val === undefined) return '';
      if (typeof val === 'object') return JSON.stringify(val);
      return val;
    })
  );

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  // Auto-size columns
  const colWidths = headers.map((h, i) => {
    const maxLen = Math.max(
      h.length,
      ...rows.map((r) => String(r[i] || '').length)
    );
    return { wch: Math.min(maxLen + 2, 50) };
  });
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${filename}.xlsx`);
};

/**
 * Export array of objects to PDF with branded header
 * @param {Array} columns - [{ key, label }]
 * @param {Array} data - array of records
 * @param {string} filename - without extension
 * @param {string} title - document title
 */
export const exportToPDF = (
  columns,
  data,
  filename = 'export',
  title = 'Report'
) => {
  if (!data?.length) return;

  const doc = new jsPDF({
    orientation: columns.length > 5 ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // --- Company header ---
  doc.setFontSize(16);
  doc.setTextColor(30, 58, 138);
  doc.setFont('helvetica', 'bold');
  doc.text('JualGroup Ghana Ltd', 14, 15);

  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.setFont('helvetica', 'normal');
  doc.text('Industrial Automation & Engineering', 14, 21);
  doc.text('Industrial Area, Accra, Ghana', 14, 26);

  // --- Report title ---
  doc.setFontSize(13);
  doc.setTextColor(30, 58, 138);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 14, 36);

  // --- Meta line ---
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date().toLocaleString('en-GB')}`, 14, 42);
  doc.text(`Total records: ${data.length}`, 14, 47);

  // --- Table ---
  const head = [columns.map((c) => c.label)];
  const body = data.map((row) =>
    columns.map((col) => {
      const val = row[col.key];
      if (val === null || val === undefined) return '—';
      if (typeof val === 'object') return JSON.stringify(val);
      return String(val);
    })
  );

  doc.autoTable({
    startY: 52,
    head,
    body,
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: [30, 58, 138],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 7.5,
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 10, right: 10, bottom: 15 },
    didDrawPage: (dataDraw) => {
      // Footer with page number
      const pageCount = doc.internal.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `Page ${doc.internal.getCurrentPageInfo().pageNumber} of ${pageCount}`,
        doc.internal.pageSize.width - 14,
        doc.internal.pageSize.height - 6,
        { align: 'right' }
      );
      doc.text(
        'JualGroup ERP',
        14,
        doc.internal.pageSize.height - 6
      );
    },
  });

  doc.save(`${filename}.pdf`);
};

/**
 * Format a value for export (handles dates, numbers, etc.)
 */
export const formatExportValue = (val) => {
  if (val === null || val === undefined) return '';
  return val;
};