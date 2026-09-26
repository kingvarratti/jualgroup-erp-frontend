import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from './Modal';
import FormField from './FormField';
import { procurementApi } from '../api/procurement';
import { formatCurrency } from '../utils/formatters';

const REASONS = [
  { value: '', label: '— Select Reason —' },
  { value: 'PHYSICAL_COUNT', label: '📋 Physical count correction' },
  { value: 'DAMAGE', label: '💥 Damaged goods' },
  { value: 'EXPIRY', label: '⏰ Expired stock' },
  { value: 'LOSS', label: '🔍 Lost / missing' },
  { value: 'RETURN', label: '↩️ Customer return' },
  { value: 'DEMO', label: '🎯 Used for demo / repair' },
  { value: 'CANNIBAL', label: '🔧 Cannibalized for parts' },
  { value: 'TRANSFER', label: '🔀 Transfer to another branch' },
  { value: 'RECEIVED', label: '📥 Unrecorded receipt' },
  { value: 'OTHER', label: '❓ Other (specify in notes)' },
];

export default function StockAdjustmentModal({ item, onClose }) {
  const qc = useQueryClient();
  const [newQty, setNewQty] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (item) {
      setNewQty(String(item.quantity_on_hand || 0));
      setReason('');
      setNotes('');
    }
  }, [item]);

  const mutation = useMutation({
    mutationFn: (payload) =>
      procurementApi.inventory.custom(item.id, 'adjust_stock', payload),
    onSuccess: (data) => {
      toast.success(
        `Stock adjusted: ${data.old_quantity} → ${data.new_quantity}`
      );
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['inventory-stats'] });
      onClose();
    },
    onError: (err) => {
      const msg = err.response?.data?.error || 'Failed to adjust stock';
      toast.error(msg);
    },
  });

  if (!item) return null;

  const oldQty = Number(item.quantity_on_hand) || 0;
  const newQtyNum = Number(newQty) || 0;
  const delta = newQtyNum - oldQty;
  const isIncrease = delta > 0;
  const isDecrease = delta < 0;
  const noChange = delta === 0;

  const canSubmit =
    reason && !noChange && newQty !== '' && !mutation.isPending;

  const handleSubmit = () => {
    if (!canSubmit) return;
    mutation.mutate({
      new_quantity: newQty,
      reason,
      notes: notes.trim(),
    });
  };

  return (
    <Modal
      open={!!item}
      onClose={onClose}
      title={`Adjust Stock — ${item.part_number}`}
      size="md"
    >
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">
              {item.category_display || item.category}
            </p>
            <p className="text-base font-semibold text-slate-800">
              {item.part_number}
            </p>
            <p className="text-sm text-slate-600">{item.description}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">Current Stock</p>
            <p className="text-2xl font-bold text-slate-800">
              {oldQty}
              <span className="text-sm text-slate-500 font-normal ml-1">
                {item.uom}
              </span>
            </p>
          </div>
        </div>
      </div>

      <FormField
        label="New Quantity"
        required
        helper="Enter the actual physical count. The system records the difference."
      >
        <div className="flex items-center gap-3">
          <input
            type="number"
            step="0.01"
            value={newQty}
            onChange={(e) => setNewQty(e.target.value)}
            className="input text-lg font-semibold"
            autoFocus
          />
          <span className="text-sm text-slate-500 whitespace-nowrap">
            {item.uom}
          </span>
        </div>
      </FormField>

      {!noChange && newQty !== '' && (
        <div
          className={`rounded-lg p-3 mb-4 flex items-center gap-3 ${
            isIncrease
              ? 'bg-green-50 border border-green-200'
              : 'bg-red-50 border border-red-200'
          }`}
        >
          {isIncrease ? (
            <TrendingUp className="w-5 h-5 text-green-600 flex-shrink-0" />
          ) : (
            <TrendingDown className="w-5 h-5 text-red-600 flex-shrink-0" />
          )}
          <div className="flex-1">
            <p
              className={`text-sm font-semibold ${
                isIncrease ? 'text-green-800' : 'text-red-800'
              }`}
            >
              {isIncrease ? 'Increase' : 'Decrease'}: {delta > 0 ? '+' : ''}
              {delta} {item.uom}
            </p>
            <p
              className={`text-xs ${
                isIncrease ? 'text-green-700' : 'text-red-700'
              }`}
            >
              Stock value change:{' '}
              {formatCurrency(Math.abs(delta) * Number(item.unit_cost || 0))}
            </p>
          </div>
        </div>
      )}

      {noChange && newQty !== '' && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-4 flex items-center gap-2 text-sm text-slate-600">
          <AlertTriangle className="w-4 h-4" />
          No change — enter a different quantity to proceed.
        </div>
      )}

      <FormField label="Reason" required>
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="input"
        >
          {REASONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </FormField>

      <FormField
        label="Notes"
        helper="Optional details — reference numbers, incident info, etc."
      >
        <textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="input"
          placeholder="e.g. Container B-12 damaged during unloading"
        />
      </FormField>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 flex items-start gap-2 text-xs text-blue-800">
        <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <div>
          This adjustment will be logged with your name, the timestamp, and the
          reason. It will appear in the item&apos;s movement history.
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
          disabled={!canSubmit}
          className="btn-primary"
        >
          {mutation.isPending ? 'Adjusting...' : 'Confirm Adjustment'}
        </button>
      </div>
    </Modal>
  );
}