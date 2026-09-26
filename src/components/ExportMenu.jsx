import { useState, useRef, useEffect } from 'react';
import {
  Download, FileSpreadsheet, FileText, ChevronDown,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { exportToExcel, exportToPDF } from '../utils/exportUtils';

export default function ExportMenu({
  columns,
  data,
  filename = 'export',
  title = 'Report',
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const disabled = !data?.length;

  const handleExcel = () => {
    try {
      exportToExcel(columns, data, filename, title);
      toast.success(`Exported ${data.length} rows to Excel`);
    } catch (err) {
      console.error(err);
      toast.error('Excel export failed');
    }
    setOpen(false);
  };

  const handlePDF = () => {
    try {
      exportToPDF(columns, data, filename, title);
      toast.success(`Exported ${data.length} rows to PDF`);
    } catch (err) {
      console.error(err);
      toast.error('PDF export failed');
    }
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        className="btn-secondary"
        onClick={() => setOpen(!open)}
        disabled={disabled}
        title={disabled ? 'No data to export' : 'Export data'}
      >
        <Download className="w-4 h-4" /> Export
        <ChevronDown className="w-3 h-3" />
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-56 bg-white rounded-lg border border-slate-200 shadow-xl z-20 overflow-hidden">
          <button
            onClick={handleExcel}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-slate-50 transition"
          >
            <FileSpreadsheet className="w-4 h-4 text-green-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-slate-800">Excel (.xlsx)</p>
              <p className="text-xs text-slate-500">Spreadsheet with all columns</p>
            </div>
          </button>
          <button
            onClick={handlePDF}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-slate-50 transition border-t border-slate-100"
          >
            <FileText className="w-4 h-4 text-red-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-slate-800">PDF</p>
              <p className="text-xs text-slate-500">Branded, print-ready</p>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}