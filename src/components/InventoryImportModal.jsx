import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Upload, Download, FileText, CheckCircle2, XCircle, AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from './Modal';
import { procurementApi } from '../api/procurement';

export default function InventoryImportModal({ open, onClose }) {
  const qc = useQueryClient();
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);

  const reset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.name.toLowerCase().endsWith('.csv')) {
      toast.error('Please select a .csv file');
      return;
    }
    setFile(f);
    setResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const rows = text.split(/\r?\n/).filter((r) => r.trim());
        const header = rows[0]
          .split(',')
          .map((h) => h.trim().replace(/^"|"$/g, ''));
        const dataRows = rows
          .slice(1, 6)
          .map((r) => r.split(',').map((c) => c.trim().replace(/^"|"$/g, '')));
        setPreview({
          headers: header,
          rows: dataRows,
          totalRows: rows.length - 1,
        });
      } catch (err) {
        toast.error('Could not parse CSV preview');
      }
    };
    reader.readAsText(f);
  };

  const uploadMutation = useMutation({
    mutationFn: (formData) => procurementApi.inventory.bulkImport(formData),
    onSuccess: (data) => {
      setResult(data);
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['inventory-stats'] });
      if (data.errors?.length) {
        toast.error(`Imported with ${data.errors.length} error(s)`);
      } else {
        toast.success(`Imported: ${data.created} new, ${data.updated} updated`);
      }
    },
    onError: (err) => {
      const msg = err.response?.data?.error || 'Import failed';
      toast.error(msg);
    },
  });

  const handleImport = () => {
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    uploadMutation.mutate(fd);
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Bulk Import Inventory"
      size="lg"
    >
      {!result && (
        <>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-5 flex items-start gap-3">
            <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-blue-900">
                Step 1: Download the template
              </p>
              <p className="text-blue-700 mt-1">
                Fill it in Excel or Google Sheets. Save as CSV.
              </p>
              <button
                onClick={() => procurementApi.inventory.template()}
                className="btn-secondary mt-2 text-xs"
              >
                <Download className="w-3 h-3" /> Download CSV Template
              </button>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-5">
            <p className="text-sm font-semibold text-slate-800 mb-2">
              Step 2: Upload your filled CSV
            </p>

            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />

            {!file ? (
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full border-2 border-dashed border-slate-300 rounded-lg py-8 hover:border-blue-400 hover:bg-blue-50/40 transition text-slate-500 flex flex-col items-center gap-2"
              >
                <Upload className="w-8 h-8 text-slate-400" />
                <span className="text-sm font-medium">
                  Click to choose a CSV file
                </span>
                <span className="text-xs text-slate-400">
                  Required columns: part_number, description, uom
                </span>
              </button>
            ) : (
              <div className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-4 py-3">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-5 h-5 text-blue-600 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-slate-500">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <button
                  onClick={reset}
                  className="text-xs text-red-600 hover:text-red-700"
                >
                  Remove
                </button>
              </div>
            )}
          </div>

          {preview && (
            <div className="mb-5">
              <p className="text-sm font-semibold text-slate-800 mb-2">
                Preview ({preview.totalRows} rows total, showing first 5)
              </p>
              <div className="border border-slate-200 rounded-lg overflow-x-auto">
                <table className="text-xs w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      {preview.headers.map((h, i) => (
                        <th
                          key={i}
                          className="text-left px-2 py-1.5 font-semibold text-slate-600 uppercase whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.map((row, i) => (
                      <tr key={i} className="border-t border-slate-100">
                        {row.map((cell, j) => (
                          <td
                            key={j}
                            className="px-2 py-1.5 text-slate-700 whitespace-nowrap"
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button onClick={handleClose} className="btn-secondary">
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={!file || uploadMutation.isPending}
              className="btn-primary"
            >
              {uploadMutation.isPending
                ? 'Importing...'
                : `Import ${preview?.totalRows || ''} Items`}
            </button>
          </div>
        </>
      )}

      {result && (
        <>
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span className="text-xs font-semibold text-green-700 uppercase">
                  Created
                </span>
              </div>
              <p className="text-2xl font-bold text-green-700">
                {result.created}
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="w-5 h-5 text-blue-600" />
                <span className="text-xs font-semibold text-blue-700 uppercase">
                  Updated
                </span>
              </div>
              <p className="text-2xl font-bold text-blue-700">
                {result.updated}
              </p>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <XCircle className="w-5 h-5 text-red-600" />
                <span className="text-xs font-semibold text-red-700 uppercase">
                  Errors
                </span>
              </div>
              <p className="text-2xl font-bold text-red-700">
                {result.errors?.length || 0}
              </p>
            </div>
          </div>

          {result.errors?.length > 0 && (
            <div className="mb-5">
              <p className="text-sm font-semibold text-red-800 mb-2 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                Errors ({result.errors.length})
              </p>
              <div className="border border-red-200 bg-red-50 rounded-lg max-h-64 overflow-y-auto">
                <table className="text-xs w-full">
                  <thead className="bg-red-100">
                    <tr>
                      <th className="text-left px-3 py-2 font-semibold text-red-800 uppercase">
                        Row
                      </th>
                      <th className="text-left px-3 py-2 font-semibold text-red-800 uppercase">
                        Error
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.errors.map((err, i) => (
                      <tr key={i} className="border-t border-red-200">
                        <td className="px-3 py-1.5 font-mono text-red-800">
                          {err.row}
                        </td>
                        <td className="px-3 py-1.5 text-red-700">
                          {err.error}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button onClick={reset} className="btn-secondary">
              Import More
            </button>
            <button onClick={handleClose} className="btn-primary">
              Done
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}