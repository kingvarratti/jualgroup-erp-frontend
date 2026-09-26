import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Package, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from './Modal';
import FormField from './FormField';
import { procurementApi } from '../api/procurement';
import { formatCurrency } from '../utils/formatters';

export default function GRNModal({ po, onClose }) {
  const qc = useQueryClient();
  const [lines, setLines] = useState([]);
  const [notes, setNotes] = useState('');
  const [hasDiscrepancies, setHasDiscrepancies] = useState(false);

  useEffect(() => {
    if (po?.items) {
      setLines(
        po.items.map((item) => ({
          po_item: item.id,
          description: item.description,
          ordered: Number(item.quantity),
          unit_price: Number(item.unit_price),
          quantity_received: Number(item.quantity),
          quantity_rejected: 0,
          remarks: '',
        }))
      );
      setNotes('');
      setHasDiscrepancies(false);
    }
  }, [po]);

  const mutation = useMutation({
    mutationFn: (payload) => procurementApi.grns.create(payload),
    onSuccess: (data) => {
      toast.success(`GRN ${data.grn_no} recorded`);
      qc.invalidateQueries({ queryKey: ['pos'] });
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['grns'] });
      onClose();
    },
    onError: (err) => {
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.error ||
        'Failed to create GRN';
      toast.error(typeof msg === 'string' ? msg : 'Failed to create GRN');
    },
  });

  if (!po) return null;

  const updateLine = (idx, field, value) => {
    const updated = [...lines];
    updated[idx] = { ...updated[idx], [field]: value };
    setLines(updated);
  };

  const totalReceived = lines.reduce(
    (s, l) => s + Number(l.quantity_received || 0),
    0
  );

  const handleSubmit = () => {
    const validLines = lines.filter((l) => Number(l.quantity_received) > 0);
    if (validLines.length === 0) {
      toast.error('Enter at least one received quantity');
      return;
    }

    const payload = {
      po: po.id,
      notes: notes.trim(),
      has_discrepancies: hasDiscrepancies,
      items: validLines.map((l) => ({
        po_item: l.po_item,
        quantity_received: String(l.quantity_received),
        quantity_rejected: String(l.quantity_rejected || 0),
        remarks: l.remarks || '',
      })),
    };
    mutation.mutate(payload);
  };

  return (
    <Modal
      open={!!po}
      onClose={onClose}
      title={`Receive Goods — ${po.po_no}`}
      size="xl"
    >
      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-5 flex items-start gap-3">
        <Package className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-semibold text-blue-900">Goods Received Note (GRN)</p>
          <p className="text-blue-700 mt-1">
            Enter the quantities actually received. The system will automatically
            add them to inventory.
          </p>
          <p className="text-blue-700 mt-1">
            <strong>Supplier:</strong> {po.supplier_name}
          </p>
        </div>
      </div>

      {/* Line items table */}
      <div className="border border-slate-200 rounded-lg overflow-hidden mb-5">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left px-3 py-2 text-xs font-semibold text-slate-600 uppercase">
                Item
              </th>
              <th className="text-right px-3 py-2 text-xs font-semibold text-slate-600 uppercase w-24">
                Ordered
              </th>
              <th className="text-right px-3 py-2 text-xs font-semibold text-slate-600 uppercase w-32">
                Received
              </th>
              <th className="text-right px-3 py-2 text-xs font-semibold text-slate-600 uppercase w-32">
                Rejected
              </th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-slate-600 uppercase w-48">
                Remarks
              </th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, idx) => (
              <tr key={idx} className="border-t border-slate-100">
                <td className="px-3 py-2">
                  <span className="text-slate-700 line-clamp-2">
                    {line.description}
                  </span>
                </td>
                <td className="px-3 py-2 text-right text-slate-500">
                  {line.ordered}
                </td>
                <td className="px-2 py-2">
                  <input
                    type="number"
                    step="0.01"
                    value={line.quantity_received}
                    onChange={(e) =>
                      updateLine(idx, 'quantity_received', e.target.value)
                    }
                    className="input !py-1.5 !text-xs text-right w-full"
                  />
                </td>
                <td className="px-2 py-2">
                  <input
                    type="number"
                    step="0.01"
                    value={line.quantity_rejected}
                    onChange={(e) =>
                      updateLine(idx, 'quantity_rejected', e.target.value)
                    }
                    className="input !py-1.5 !text-xs text-right w-full"
                  />
                </td>
                <td className="px-2 py-2">
                  <input
                    value={line.remarks}
                    onChange={(e) => updateLine(idx, 'remarks', e.target.value)}
                    placeholder="Optional"
                    className="input !py-1.5 !text-xs w-full"
                  />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-slate-50 border-t-2 border-slate-200">
            <tr>
              <td colSpan={2} className="px-3 py-3 text-right font-semibold text-slate-700">
                Total received:
              </td>
              <td className="px-3 py-3 text-right font-bold text-blue-700 text-base">
                {totalReceived}
              </td>
              <td colSpan={2}></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <FormField label="Notes">
        <textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="input"
          placeholder="Delivery note reference, driver name, etc."
        />
      </FormField>

      <div className="mb-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={hasDiscrepancies}
            onChange={(e) => setHasDiscrepancies(e.target.checked)}
          />
          <span className="text-amber-700 font-medium">
            ⚠ Mark this GRN as having discrepancies
          </span>
        </label>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 flex items-start gap-2 text-xs text-green-800">
        <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <div>
          On submit, inventory will automatically be increased by the received
          quantities, and a stock movement will be logged.
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button
          onClick={onClose}
          className="btn-secondary"
          disabled={mutation.isPending}
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={mutation.isPending}
          className="btn-primary"
        >
          {mutation.isPending ? 'Recording...' : 'Record GRN & Update Stock'}
        </button>
      </div>
    </Modal>
  );
}