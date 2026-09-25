import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Plus, Download, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { salesApi } from '../../api/sales';
import { procurementApi } from '../../api/procurement';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import FormField from '../../components/FormField';
import StatusBadge from '../../components/StatusBadge';
import { formatCurrency, formatDate } from '../../utils/formatters';

export default function ClientPOs() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['clientpos'],
    queryFn: () => salesApi.clientPOs.list({ page_size: 100 }),
  });

  const { data: quotations } = useQuery({
    queryKey: ['quotations-for-cpo'],
    queryFn: () => salesApi.quotations.list({ page_size: 500 }),
  });

  const { data: inventory } = useQuery({
    queryKey: ['inventory-for-cpo'],
    queryFn: () => procurementApi.inventory.list({ page_size: 500 }),
  });

  const columns = [
    {
      key: 'internal_order_no',
      label: 'Order No.',
      render: (r) => (
        <span className="font-medium text-blue-700">{r.internal_order_no}</span>
      ),
    },
    { key: 'client_po_number', label: 'Client PO' },
    {
      key: 'total_value',
      label: 'Value',
      className: 'text-right',
      render: (r) => formatCurrency(r.total_value),
    },
    { key: 'po_date', label: 'PO Date', render: (r) => formatDate(r.po_date) },
    {
      key: 'items',
      label: 'Items',
      className: 'text-center',
      render: (r) => (
        <span className="text-xs text-slate-500">{r.items?.length || 0}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (r) => <StatusBadge status={r.status} />,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button className="btn-primary" onClick={() => setModal(true)}>
          <Plus className="w-4 h-4" /> Record Client PO
        </button>
      </div>

      <div className="card">
        <DataTable
          columns={columns}
          data={data?.results}
          loading={isLoading}
          emptyTitle="No client POs yet"
          emptyMessage="Record your first client order to start the project pipeline."
          emptyIcon={Plus}
          actions={(r) => (
            <div className="flex justify-end gap-1">
              <button
                onClick={() =>
                  salesApi.clientPOs.pdf(r.id, `${r.internal_order_no}.pdf`)
                }
                className="btn-ghost !p-2 text-slate-600"
                title="Download PDF"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          )}
        />
      </div>

      <ClientPOModal
        open={modal}
        onClose={() => setModal(false)}
        quotations={quotations?.results || []}
        inventory={inventory?.results || []}
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: ['clientpos'] });
          setModal(false);
        }}
      />
    </div>
  );
}


function ClientPOModal({ open, onClose, quotations, inventory, onSuccess }) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm();
  const [lineItems, setLineItems] = useState([
    { item: '', description: '', quantity: 1, unit_price: 0 },
  ]);
  const [submitting, setSubmitting] = useState(false);

  const createMutation = useMutation({
    mutationFn: (fd) => salesApi.clientPOs.create(fd),
    onSuccess: () => {
      toast.success('Client PO recorded');
      reset();
      setLineItems([{ item: '', description: '', quantity: 1, unit_price: 0 }]);
      onSuccess();
    },
    onError: (err) => {
      console.error('ClientPO error:', err.response?.data || err);
      let msg = 'Failed to create Client PO';
      const data = err.response?.data;
      if (typeof data === 'string') msg = data;
      else if (data?.detail) msg = data.detail;
      else if (data && typeof data === 'object') {
        const parts = [];
        const walk = (obj, prefix = '') => {
          if (typeof obj === 'string') parts.push(prefix ? `${prefix}: ${obj}` : obj);
          else if (Array.isArray(obj)) obj.forEach((v) => walk(v, prefix));
          else if (obj && typeof obj === 'object')
            Object.entries(obj).forEach(([k, v]) => walk(v, prefix ? `${prefix}.${k}` : k));
        };
        walk(data);
        msg = parts.join(' • ') || msg;
      }
      toast.error(msg, { duration: 6000 });
    },
  });

  const addRow = () => {
    setLineItems([
      ...lineItems,
      { item: '', description: '', quantity: 1, unit_price: 0 },
    ]);
  };

  const removeRow = (idx) => {
    if (lineItems.length === 1) return;
    setLineItems(lineItems.filter((_, i) => i !== idx));
  };

  const updateRow = (idx, field, value) => {
    const updated = [...lineItems];
    updated[idx] = { ...updated[idx], [field]: value };

    if (field === 'item' && value) {
      const invItem = inventory.find((i) => i.id === value);
      if (invItem) {
        updated[idx].description = invItem.description;
        updated[idx].unit_price = Number(invItem.unit_cost) || 0;
      }
    }
    setLineItems(updated);
  };

  const lineTotal = (row) => Number(row.quantity || 0) * Number(row.unit_price || 0);
  const grandTotal = lineItems.reduce((sum, row) => sum + lineTotal(row), 0);

  const onSubmit = (values) => {
    const validItems = lineItems.filter((li) => li.description?.trim());
    if (validItems.length === 0) {
      toast.error('Please add at least one line item');
      return;
    }

    setSubmitting(true);

    // Always use FormData because client_po_file/urs_document are files
    const fd = new FormData();
    if (values.quotation) fd.append('quotation', values.quotation);
    fd.append('client_po_number', values.client_po_number);
    fd.append('po_date', values.po_date);
    fd.append('total_value', grandTotal.toString());
    if (values.user_requirements) fd.append('user_requirements', values.user_requirements);
    if (values.client_po_file?.[0]) fd.append('client_po_file', values.client_po_file[0]);
    if (values.urs_document?.[0]) fd.append('urs_document', values.urs_document[0]);

    // Line items as JSON string (Django parses nested field via serializers)
    fd.append('items', JSON.stringify(
      validItems.map((li) => ({
        item: li.item || null,
        description: li.description,
        quantity: li.quantity.toString(),
        unit_price: li.unit_price.toString(),
      }))
    ));

    createMutation.mutate(fd, { onSettled: () => setSubmitting(false) });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Record Client Purchase Order"
      size="xl"
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Top section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Linked Quotation">
            <select {...register('quotation')} className="input">
              <option value="">— Optional —</option>
              {quotations.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.quote_no} — {formatCurrency(q.total_amount)}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Client PO Number" required error={errors.client_po_number}>
            <input
              {...register('client_po_number', { required: 'Required' })}
              className="input"
              placeholder="e.g. CPO-2026-001"
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="PO Date" required error={errors.po_date}>
            <input
              type="date"
              {...register('po_date', { required: 'Required' })}
              className="input"
            />
          </FormField>
          <FormField label="Client PO File (PDF)">
            <input
              type="file"
              {...register('client_po_file')}
              className="input"
              accept=".pdf,.jpg,.jpeg,.png"
            />
          </FormField>
        </div>

        <FormField label="URS Document (optional)">
          <input
            type="file"
            {...register('urs_document')}
            className="input"
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
          />
        </FormField>

        {/* Line items */}
        <div className="mt-6 mb-2">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-slate-800">Line Items</h4>
            <button
              type="button"
              onClick={addRow}
              className="btn-secondary text-xs"
            >
              <Plus className="w-3 h-3" /> Add Row
            </button>
          </div>

          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-slate-600 uppercase">
                    Item
                  </th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-slate-600 uppercase">
                    Description
                  </th>
                  <th className="text-right px-3 py-2 text-xs font-semibold text-slate-600 uppercase w-24">
                    Qty
                  </th>
                  <th className="text-right px-3 py-2 text-xs font-semibold text-slate-600 uppercase w-32">
                    Unit Price
                  </th>
                  <th className="text-right px-3 py-2 text-xs font-semibold text-slate-600 uppercase w-32">
                    Total
                  </th>
                  <th className="w-12"></th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((row, idx) => (
                  <tr key={idx} className="border-t border-slate-100">
                    <td className="px-2 py-2">
                      <select
                        value={row.item}
                        onChange={(e) => updateRow(idx, 'item', e.target.value)}
                        className="input !py-1.5 !text-xs w-full min-w-[140px]"
                      >
                        <option value="">— Free text —</option>
                        {inventory.map((inv) => (
                          <option key={inv.id} value={inv.id}>
                            {inv.part_number}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-2">
                      <input
                        value={row.description}
                        onChange={(e) =>
                          updateRow(idx, 'description', e.target.value)
                        }
                        placeholder="Item description"
                        className="input !py-1.5 !text-xs w-full min-w-[200px]"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        step="0.01"
                        value={row.quantity}
                        onChange={(e) =>
                          updateRow(idx, 'quantity', e.target.value)
                        }
                        className="input !py-1.5 !text-xs text-right w-full"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        step="0.01"
                        value={row.unit_price}
                        onChange={(e) =>
                          updateRow(idx, 'unit_price', e.target.value)
                        }
                        className="input !py-1.5 !text-xs text-right w-full"
                      />
                    </td>
                    <td className="px-2 py-2 text-right font-medium text-slate-700 whitespace-nowrap">
                      {formatCurrency(lineTotal(row))}
                    </td>
                    <td className="px-2 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => removeRow(idx)}
                        disabled={lineItems.length === 1}
                        className="text-red-500 hover:text-red-700 disabled:opacity-30 p-1"
                        title="Remove row"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                <tr>
                  <td
                    colSpan={4}
                    className="px-3 py-3 text-right font-semibold text-slate-700"
                  >
                    Grand Total:
                  </td>
                  <td className="px-3 py-3 text-right font-bold text-blue-700 text-base">
                    {formatCurrency(grandTotal)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <FormField label="User Requirements / Notes">
          <textarea
            rows={2}
            {...register('user_requirements')}
            className="input"
            placeholder="Special requirements, delivery notes, etc."
          />
        </FormField>

        <div className="flex justify-end gap-2 mt-4">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? 'Recording...' : 'Record Client PO'}
          </button>
        </div>
      </form>
    </Modal>
  );
}