import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FileCheck, Upload, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from './Modal';
import FormField from './FormField';
import { procurementApi } from '../api/procurement';

export default function OrderConfirmationModal({ po, onClose }) {
  const qc = useQueryClient();
  const [ref, setRef] = useState('');
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState(null);

  useEffect(() => {
    if (po) {
      setRef(po.order_confirmation_ref || '');
      setDate(po.order_confirmation_date || new Date().toISOString().slice(0, 10));
      setNotes('');
      setFile(null);
    }
  }, [po]);

  const mutation = useMutation({
    mutationFn: (fd) =>
      procurementApi.purchaseOrders.custom(po.id, 'confirm_order', fd),
    onSuccess: () => {
      toast.success('Order confirmation recorded');
      qc.invalidateQueries({ queryKey: ['pos'] });
      onClose();
    },
    onError: (err) => {
      const msg = err.response?.data?.error || 'Failed to record confirmation';
      toast.error(msg);
    },
  });

  if (!po) return null;

  const handleSubmit = () => {
    if (!ref.trim()) {
      toast.error('Supplier reference is required');
      return;
    }
    const fd = new FormData();
    fd.append('order_confirmation_ref', ref.trim());
    if (date) fd.append('order_confirmation_date', date);
    if (notes.trim()) fd.append('notes', notes.trim());
    if (file) fd.append('order_confirmation_file', file);
    mutation.mutate(fd);
  };

  return (
    <Modal
      open={!!po}
      onClose={onClose}
      title={`Record Order Confirmation — ${po.po_no}`}
      size="md"
    >
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-5 flex items-start gap-3">
        <FileCheck className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-semibold text-blue-900">Supplier Confirmation</p>
          <p className="text-blue-700 mt-1">
            Enter the supplier's confirmation reference and attach their confirmation
            document. This will mark the PO as <strong>CONFIRMED</strong>.
          </p>
        </div>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-5 text-sm">
        <p className="text-slate-700">
          <strong>{po.supplier_name}</strong> — {po.po_no}
        </p>
        <p className="text-xs text-slate-500 mt-1">
          Total: {po.currency} {Number(po.total_cost || 0).toLocaleString()}
        </p>
      </div>

      <FormField
        label="Supplier Confirmation Reference"
        required
        helper="e.g. KSB-CONF-2026-042"
      >
        <input
          value={ref}
          onChange={(e) => setRef(e.target.value)}
          className="input"
          placeholder="The supplier's order confirmation number"
          autoFocus
        />
      </FormField>

      <FormField label="Confirmation Date">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="input"
        />
      </FormField>

      <FormField label="Confirmation File (PDF, email, screenshot)">
        <div className="flex items-center gap-3">
          <label className="btn-secondary cursor-pointer">
            <Upload className="w-4 h-4" /> Choose File
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="hidden"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.eml,.msg"
            />
          </label>
          {file && (
            <span className="text-sm text-slate-600 truncate">
              {file.name} ({(file.size / 1024).toFixed(1)} KB)
            </span>
          )}
          {!file && po.order_confirmation_file && (
            <a
              href={po.order_confirmation_file}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3" /> View current file
            </a>
          )}
        </div>
      </FormField>

      <FormField label="Notes">
        <textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="input"
          placeholder="Any additional notes about this confirmation"
        />
      </FormField>

      <div className="flex justify-end gap-2 mt-2">
        <button
          onClick={onClose}
          className="btn-secondary"
          disabled={mutation.isPending}
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={mutation.isPending || !ref.trim()}
          className="btn-primary"
        >
          {mutation.isPending ? 'Recording...' : 'Confirm Order'}
        </button>
      </div>
    </Modal>
  );
}