import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Package, Plus, X, Check, AlertTriangle, Building2, Send,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from './Modal';
import FormField from './FormField';
import { salesApi } from '../api/sales';
import { procurementApi } from '../api/procurement';
import { coreApi } from '../api/core';
import { formatCurrency } from '../utils/formatters';

export default function StockCheckModal({ enquiry, onClose, onSuccess }) {
  const [rows, setRows] = useState([
    { item_id: '', description: '', quantity: 1 },
  ]);
  const [result, setResult] = useState(null);
  const [branchId, setBranchId] = useState('');
  const [purpose, setPurpose] = useState('');

  const { data: inventory } = useQuery({
    queryKey: ['inventory-stockcheck'],
    queryFn: () => procurementApi.inventory.list({ page_size: 500 }),
    enabled: !!enquiry,
  });

  const { data: branches } = useQuery({
    queryKey: ['branches-stockcheck'],
    queryFn: () => coreApi.branches.list(),
    enabled: !!enquiry,
  });

  const checkMutation = useMutation({
    mutationFn: (items) =>
      salesApi.enquiries.custom(enquiry.id, 'check_stock', { items }),
    onSuccess: (data) => setResult(data),
    onError: () => toast.error('Stock check failed'),
  });

  const requestMutation = useMutation({
    mutationFn: (payload) =>
      salesApi.enquiries.custom(enquiry.id, 'request_stock', payload),
    onSuccess: (data) => {
      toast.success(data.message || 'Requisition created');
      onSuccess(data);
      onClose();
    },
    onError: (err) => {
      const msg = err.response?.data?.error || 'Failed to create requisition';
      toast.error(msg);
    },
  });

  if (!enquiry) return null;

  const addRow = () =>
    setRows([...rows, { item_id: '', description: '', quantity: 1 }]);
  const removeRow = (i) => {
    if (rows.length === 1) return;
    setRows(rows.filter((_, idx) => idx !== i));
  };
  const updateRow = (i, field, value) => {
    const u = [...rows];
    u[i] = { ...u[i], [field]: value };
    if (field === 'item_id' && value) {
      const inv = inventory?.results?.find((x) => x.id === value);
      if (inv) u[i].description = inv.description;
    }
    setRows(u);
    setResult(null);
  };

  const handleCheck = () => {
    const items = rows
      .filter((r) => r.item_id && Number(r.quantity) > 0)
      .map((r) => ({
        item_id: r.item_id,
        quantity: Number(r.quantity),
      }));
    if (items.length === 0) {
      toast.error('Add at least one item with quantity');
      return;
    }
    checkMutation.mutate(items);
  };

  const handleRequest = () => {
    const items = rows
      .filter((r) => r.item_id && Number(r.quantity) > 0)
      .map((r) => ({
        item_id: r.item_id,
        quantity: Number(r.quantity),
      }));
    if (items.length === 0) {
      toast.error('Add at least one item');
      return;
    }
    requestMutation.mutate({
      items,
      branch: branchId || null,
      purpose: purpose || `Sales request for ${enquiry.reference_no}`,
    });
  };

  const allSufficient =
    result &&
    result.length > 0 &&
    result.every((r) => r.sufficient);
  const anyInsufficient =
    result && result.some((r) => !r.sufficient);

  return (
    <Modal
      open={!!enquiry}
      onClose={onClose}
      title={`Check Stock Availability — ${enquiry.reference_no}`}
      size="xl"
    >
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-5 text-sm">
        <p className="font-semibold text-blue-900">Stock availability check</p>
        <p className="text-blue-700 mt-1">
          Select items from inventory and enter the quantities needed. The system
          will check availability across all branches.
        </p>
      </div>

      {/* Items builder */}
      <div className="border border-slate-200 rounded-lg overflow-hidden mb-4">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left px-3 py-2 text-xs font-semibold text-slate-600 uppercase">
                Item
              </th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-slate-600 uppercase">
                Description
              </th>
              <th className="text-right px-3 py-2 text-xs font-semibold text-slate-600 uppercase w-28">
                Qty Needed
              </th>
              <th className="w-12"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx} className="border-t border-slate-100">
                <td className="px-2 py-2">
                  <select
                    value={row.item_id}
                    onChange={(e) => updateRow(idx, 'item_id', e.target.value)}
                    className="input !py-1.5 !text-xs w-full min-w-[180px]"
                  >
                    <option value="">— Select Item —</option>
                    {inventory?.results?.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.part_number}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-2 py-2">
                  <span className="text-xs text-slate-600 line-clamp-1">
                    {row.description || '—'}
                  </span>
                </td>
                <td className="px-2 py-2">
                  <input
                    type="number"
                    step="0.01"
                    value={row.quantity}
                    onChange={(e) => updateRow(idx, 'quantity', e.target.value)}
                    className="input !py-1.5 !text-xs text-right w-full"
                  />
                </td>
                <td className="px-2 py-2 text-center">
                  <button
                    type="button"
                    onClick={() => removeRow(idx)}
                    disabled={rows.length === 1}
                    className="text-red-500 hover:text-red-700 disabled:opacity-30 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={addRow}
        className="btn-secondary text-xs mb-5"
      >
        <Plus className="w-3 h-3" /> Add Item
      </button>

      {/* Check button */}
      <div className="flex justify-end mb-5">
        <button
          onClick={handleCheck}
          disabled={checkMutation.isPending}
          className="btn-primary"
        >
          <Package className="w-4 h-4" />
          {checkMutation.isPending ? 'Checking...' : 'Check Availability'}
        </button>
      </div>

      {/* Results */}
      {result && (
        <>
          <div className="border-t border-slate-200 pt-5 mb-5">
            <h4 className="font-semibold text-slate-800 mb-3">
              Availability Results
            </h4>
            <div className="space-y-3">
              {result.map((r) => (
                <div
                  key={r.item_id}
                  className={`border rounded-lg p-3 ${
                    r.sufficient
                      ? 'border-green-200 bg-green-50/30'
                      : 'border-amber-200 bg-amber-50/30'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-slate-800">
                        {r.part_number}
                      </p>
                      <p className="text-xs text-slate-500">{r.description}</p>
                    </div>
                    {r.sufficient ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-100 px-2 py-1 rounded">
                        <Check className="w-3 h-3" /> Sufficient
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-1 rounded">
                        <AlertTriangle className="w-3 h-3" /> Insufficient
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-600 mb-2">
                    <span>
                      <strong>Requested:</strong> {r.requested_quantity} {r.uom}
                    </span>
                    <span>
                      <strong>Available:</strong>{' '}
                      <span
                        className={
                          r.sufficient
                            ? 'text-green-700 font-bold'
                            : 'text-amber-700 font-bold'
                        }
                      >
                        {r.total_available} {r.uom}
                      </span>
                    </span>
                  </div>

                  {r.branches.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {r.branches.map((b) => (
                        <div
                          key={b.branch_id}
                          className="inline-flex items-center gap-1.5 text-xs bg-white border border-slate-200 rounded px-2 py-1"
                        >
                          <Building2 className="w-3 h-3 text-slate-400" />
                          <span className="font-medium text-slate-700">
                            {b.branch_name}
                          </span>
                          <span
                            className={
                              b.quantity <= 0
                                ? 'text-red-600 font-semibold'
                                : 'text-slate-600'
                            }
                          >
                            {b.quantity}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Recommendation */}
          {allSufficient ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4 text-sm">
              <p className="font-semibold text-green-800">
                ✓ All items are in stock
              </p>
              <p className="text-green-700 mt-1">
                You can safely quote the client. Create a requisition to hold
                the items for this sale.
              </p>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4 text-sm">
              <p className="font-semibold text-amber-800">
                ⚠ Some items are not fully in stock
              </p>
              <p className="text-amber-700 mt-1">
                Request a requisition anyway — Stores will route the missing
                items to Supply Chain for sourcing. Or adjust your quote to
                reflect longer delivery times.
              </p>
            </div>
          )}

          {/* Request form */}
          <div className="border-t border-slate-200 pt-5">
            <h4 className="font-semibold text-slate-800 mb-3">
              Create Stock Requisition
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <FormField label="Preferred Branch (optional)" helper="Leave blank to let Stores decide">
                <select
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  className="input"
                >
                  <option value="">— Any Branch —</option>
                  {branches?.results?.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Purpose">
                <input
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="input"
                  placeholder={`e.g. Sales quote for ${enquiry.client_name}`}
                />
              </FormField>
            </div>
            <div className="flex justify-end">
              <button
                onClick={handleRequest}
                disabled={requestMutation.isPending}
                className="btn-primary"
              >
                <Send className="w-4 h-4" />
                {requestMutation.isPending
                  ? 'Creating...'
                  : 'Create Requisition'}
              </button>
            </div>
          </div>
        </>
      )}

      <div className="flex justify-end mt-5 pt-4 border-t border-slate-200">
        <button onClick={onClose} className="btn-secondary">
          Close
        </button>
      </div>
    </Modal>
  );
}