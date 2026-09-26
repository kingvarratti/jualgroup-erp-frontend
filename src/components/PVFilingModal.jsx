import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FolderArchive } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from './Modal';
import FormField from './FormField';
import { financeApi } from '../api/finance';

export default function PVFilingModal({ pv, onClose }) {
  const qc = useQueryClient();
  const [filingDate, setFilingDate] = useState('');
  const [location, setLocation] = useState('');
  const [reference, setReference] = useState('');

  useEffect(() => {
    if (pv) {
      setFilingDate(new Date().toISOString().slice(0, 10));
      setLocation('');
      setReference('');
    }
  }, [pv]);

  const mutation = useMutation({
    mutationFn: (payload) => financeApi.pvFilings.create(payload),
    onSuccess: () => {
      toast.success('Voucher filed successfully');
      qc.invalidateQueries({ queryKey: ['pvs'] });
      qc.invalidateQueries({ queryKey: ['pv-filings'] });
      onClose();
    },
    onError: () => toast.error('Failed to file voucher'),
  });

  if (!pv) return null;

  const handleSubmit = () => {
    if (!filingDate || !location) {
      toast.error('Filing date and location are required');
      return;
    }
    mutation.mutate({
      pv: pv.id,
      filing_date: filingDate,
      location: location.trim(),
      filing_reference: reference.trim(),
    });
  };

  return (
    <Modal
      open={!!pv}
      onClose={onClose}
      title={`File Payment Voucher — ${pv.pv_no}`}
      size="md"
    >
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-5 flex items-start gap-3">
        <FolderArchive className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-semibold text-blue-900">Physical Filing Record</p>
          <p className="text-blue-700 mt-1">
            Record where the physical copy of this payment voucher is stored for audit purposes.
          </p>
        </div>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-5 text-sm">
        <p className="text-slate-700">
          <strong>{pv.pv_no}</strong> — {pv.payable_to}
        </p>
        <p className="text-xs text-slate-500 mt-1">
          Amount: {pv.amount} | Purpose: {pv.purpose}
        </p>
      </div>

      <FormField label="Filing Date" required>
        <input
          type="date"
          value={filingDate}
          onChange={(e) => setFilingDate(e.target.value)}
          className="input"
        />
      </FormField>

      <FormField
        label="Filing Location"
        required
        helper="e.g. Finance Cabinet B-3, Shelf 2"
      >
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="input"
          placeholder="Where the physical voucher is stored"
        />
      </FormField>

      <FormField label="Filing Reference">
        <input
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          className="input"
          placeholder="e.g. 2026-Q3-FIN-042"
        />
      </FormField>

      <div className="flex justify-end gap-2 mt-2">
        <button onClick={onClose} className="btn-secondary" disabled={mutation.isPending}>
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={mutation.isPending}
          className="btn-primary"
        >
          {mutation.isPending ? 'Filing...' : 'Record Filing'}
        </button>
      </div>
    </Modal>
  );
}