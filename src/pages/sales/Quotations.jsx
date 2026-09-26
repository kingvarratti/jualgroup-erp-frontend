import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import {
  Eye, Check, X, Send, Download, Plus, Trash2, AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { salesApi } from '../../api/sales';
import { procurementApi } from '../../api/procurement';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import FormField from '../../components/FormField';
import StatusBadge from '../../components/StatusBadge';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../utils/constants';

const FINANCE_THRESHOLD = 100000;

export default function Quotations() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [status, setStatus] = useState('');
  const [modal, setModal] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['quotations', status],
    queryFn: () => salesApi.quotations.list({ status, page_size: 100 }),
    keepPreviousData: true,
  });

  const { data: enquiries } = useQuery({
    queryKey: ['enquiries-for-quote'],
    queryFn: () => salesApi.enquiries.list({ page_size: 500 }),
  });

  const { data: inventory } = useQuery({
    queryKey: ['inventory-for-quote'],
    queryFn: () => procurementApi.inventory.list({ page_size: 500 }),
  });

  const approve = useMutation({
    mutationFn: (id) => salesApi.quotations.custom(id, 'finance_approve'),
    onSuccess: () => {
      toast.success('Approved');
      qc.invalidateQueries({ queryKey: ['quotations'] });
    },
  });

  const reject = useMutation({
    mutationFn: (id) => salesApi.quotations.custom(id, 'finance_reject'),
    onSuccess: () => {
      toast.success('Rejected');
      qc.invalidateQueries({ queryKey: ['quotations'] });
    },
  });

  const submit = useMutation({
    mutationFn: (id) => salesApi.quotations.custom(id, 'submit_to_client'),
    onSuccess: () => {
      toast.success('Submitted to client');
      qc.invalidateQueries({ queryKey: ['quotations'] });
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Submit failed'),
  });

  const isFinance =
    [ROLES.FINANCE, ROLES.ADMIN, ROLES.ACCOUNTANT, ROLES.ACCOUNTS].includes(
      user?.role
    );
  const isSales =
    [ROLES.SALES_ENG, ROLES.PROJ_ENG_SALES, ROLES.DESIGN_ENG_SALES, ROLES.ADMIN].includes(
      user?.role
    );

  const columns = [
    {
      key: 'quote_no',
      label: 'Quote No.',
      render: (r) => (
        <span className="font-medium text-blue-700">{r.quote_no}</span>
      ),
    },
    { key: 'enquiry_ref', label: 'Enquiry Ref' },
    {
      key: 'total_amount',
      label: 'Amount',
      className: 'text-right',
      render: (r) => formatCurrency(r.total_amount, r.currency),
    },
    { key: 'valid_until', label: 'Valid Until', render: (r) => formatDate(r.valid_until) },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="input w-56"
        >
          <option value="">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="PENDING_FINANCE">Pending Finance</option>
          <option value="APPROVED_FINANCE">Approved</option>
          <option value="SUBMITTED">Submitted</option>
        </select>

        {isSales && (
          <button className="btn-primary" onClick={() => setModal(true)}>
            <Plus className="w-4 h-4" /> New Quotation
          </button>
        )}
      </div>

      <div className="card">
        <DataTable
          columns={columns}
          data={data?.results}
          loading={isLoading}
          emptyTitle="No quotations yet"
          emptyMessage="Create your first quotation from an enquiry."
          emptyIcon={Plus}
          emptyAction={
            isSales ? (
              <button className="btn-primary" onClick={() => setModal(true)}>
                <Plus className="w-4 h-4" /> Create First Quotation
              </button>
            ) : null
          }
          actions={(r) => (
            <div className="flex justify-end gap-1">
              <Link
                to={`/sales/quotations/${r.id}`}
                className="btn-ghost !p-2"
                title="View"
              >
                <Eye className="w-4 h-4" />
              </Link>
              <button
                onClick={() =>
                  salesApi.quotations.pdf(r.id, `${r.quote_no}.pdf`)
                }
                className="btn-ghost !p-2 text-slate-600"
                title="Download PDF"
              >
                <Download className="w-4 h-4" />
              </button>
              {isFinance && r.status === 'PENDING_FINANCE' && (
                <>
                  <button
                    onClick={() => approve.mutate(r.id)}
                    className="btn-ghost !p-2 text-green-600"
                    title="Approve"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => reject.mutate(r.id)}
                    className="btn-ghost !p-2 text-red-600"
                    title="Reject"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </>
              )}
              {isSales && r.status === 'APPROVED_FINANCE' && (
                <button
                  onClick={() => submit.mutate(r.id)}
                  className="btn-ghost !p-2 text-blue-600"
                  title="Submit to Client"
                >
                  <Send className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        />
      </div>

      <QuotationModal
        open={modal}
        onClose={() => setModal(false)}
        enquiries={enquiries?.results || []}
        inventory={inventory?.results || []}
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: ['quotations'] });
          setModal(false);
        }}
      />
    </div>
  );
}


function QuotationModal({ open, onClose, enquiries, inventory, onSuccess }) {
  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm();
  const [lineItems, setLineItems] = useState([
    { item: '', description: '', quantity: 1, unit_price: 0 },
  ]);
  const [submitting, setSubmitting] = useState(false);

  const createMutation = useMutation({
    mutationFn: (payload) => salesApi.quotations.create(payload),
    onSuccess: () => {
      toast.success('Quotation created');
      reset();
      setLineItems([{ item: '', description: '', quantity: 1, unit_price: 0 }]);
      onSuccess();
    },
    onError: (err) => {
      console.error('Quotation error:', err.response?.data || err);
      let msg = 'Failed to create quotation';
      const data = err.response?.data;
      if (typeof data === 'string') msg = data;
      else if (data?.detail) msg = data.detail;
      else if (data && typeof data === 'object') {
        const parts = [];
        const walk = (obj, prefix = '') => {
          if (typeof obj === 'string') parts.push(prefix ? `${prefix}: ${obj}` : obj);
          else if (Array.isArray(obj)) obj.forEach((v) => walk(v, prefix));
          else if (obj && typeof obj === 'object')
            Object.entries(obj).forEach(([k, v]) =>
              walk(v, prefix ? `${prefix}.${k}` : k)
            );
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
        updated[idx].unit_price = Number(invItem.unit_price) || Number(invItem.unit_cost) || 0;
      }
    }
    setLineItems(updated);
  };

  const lineTotal = (row) => Number(row.quantity || 0) * Number(row.unit_price || 0);
  const grandTotal = lineItems.reduce((sum, row) => sum + lineTotal(row), 0);
  const needsFinance = grandTotal > FINANCE_THRESHOLD;

  const onSubmit = (values) => {
    const validItems = lineItems.filter((li) => li.description?.trim());
    if (validItems.length === 0) {
      toast.error('Please add at least one line item');
      return;
    }

    setSubmitting(true);

    const payload = {
      enquiry: values.enquiry,
      total_amount: grandTotal.toString(),
      currency: values.currency || 'GHS',
      terms: values.terms || '',
      valid_until: values.valid_until || null,
      line_items: validItems.map((li) => ({
        description: li.description,
        quantity: li.quantity.toString(),
        unit_price: li.unit_price.toString(),
      })),
    };

    createMutation.mutate(payload, { onSettled: () => setSubmitting(false) });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New Quotation"
      size="xl"
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Top section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Enquiry" required error={errors.enquiry}>
            <select
              {...register('enquiry', { required: 'Required' })}
              className="input"
            >
              <option value="">— Select Enquiry —</option>
              {enquiries.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.reference_no} — {e.client_name}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Currency">
            <select {...register('currency')} className="input" defaultValue="GHS">
              <option value="GHS">GHS</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
            </select>
          </FormField>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Valid Until">
            <input type="date" {...register('valid_until')} className="input" />
          </FormField>
          <FormField label="Terms (optional)">
            <input
              {...register('terms')}
              placeholder="e.g. Net 30 days"
              className="input"
            />
          </FormField>
        </div>

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
                        <Trash2 className="w-4 h-4" />
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

        {/* Finance gate warning */}
        {needsFinance && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-amber-800">
                Finance Approval Required
              </p>
              <p className="text-amber-700 mt-1">
                This quotation exceeds {formatCurrency(FINANCE_THRESHOLD)}. It
                will be marked <strong>Pending Finance</strong> and locked from
                client submission until Finance approves it.
              </p>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 mt-4">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting
              ? 'Creating...'
              : needsFinance
              ? 'Create & Request Finance'
              : 'Create Quotation'}
          </button>
        </div>
      </form>
    </Modal>
  );
}