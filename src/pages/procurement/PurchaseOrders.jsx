import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import {
  Check, Send, ShoppingCart, Download, PackageCheck, Plus, Trash2, X,
  Truck, FileCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { procurementApi } from '../../api/procurement';
import { salesApi } from '../../api/sales';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import FormField from '../../components/FormField';
import StatusBadge from '../../components/StatusBadge';
import ExportMenu from '../../components/ExportMenu';
import GRNModal from '../../components/GRNModal';
import OrderConfirmationModal from '../../components/OrderConfirmationModal';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../utils/constants';

const SOURCING_TYPES = [
  { value: 'LOCAL', label: 'Local Supplier' },
  { value: 'INTERNATIONAL', label: 'International' },
  { value: 'KSB', label: 'KSB Direct' },
];

const CARRIERS = [
  { value: '', label: '— Not specified —' },
  { value: 'DHL', label: 'DHL' },
  { value: 'FEDEX', label: 'FedEx' },
  { value: 'UPS', label: 'UPS' },
  { value: 'FREIGHT_FORWARDER', label: 'Freight Forwarder' },
  { value: 'LOCAL_COURIER', label: 'Local Courier' },
  { value: 'SUPPLIER', label: 'Supplier Ships Directly' },
  { value: 'OTHER', label: 'Other' },
];

export default function PurchaseOrders() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [status, setStatus] = useState('');
  const [modal, setModal] = useState(false);
  const [receivePO, setReceivePO] = useState(null);
  const [confirmPO, setConfirmPO] = useState(null);
  const [transitPO, setTransitPO] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['pos', status],
    queryFn: () => procurementApi.purchaseOrders.list({ status, page_size: 100 }),
    keepPreviousData: true,
  });

  const { data: suppliers } = useQuery({
    queryKey: ['suppliers-for-po'],
    queryFn: () => procurementApi.suppliers.list({ page_size: 500 }),
  });

  const { data: clientPOs } = useQuery({
    queryKey: ['clientpos-for-po'],
    queryFn: () => salesApi.clientPOs.list({ page_size: 500 }),
  });

  const { data: inventory } = useQuery({
    queryKey: ['inventory-for-po'],
    queryFn: () => procurementApi.inventory.list({ page_size: 500 }),
  });

  const approve = useMutation({
    mutationFn: (id) => procurementApi.purchaseOrders.custom(id, 'approve'),
    onSuccess: () => {
      toast.success('PO approved');
      qc.invalidateQueries({ queryKey: ['pos'] });
    },
  });

  const send = useMutation({
    mutationFn: (id) => procurementApi.purchaseOrders.custom(id, 'send_to_supplier'),
    onSuccess: () => {
      toast.success('Sent to supplier');
      qc.invalidateQueries({ queryKey: ['pos'] });
    },
  });

  const markInTransit = useMutation({
    mutationFn: ({ id, payload }) =>
      procurementApi.purchaseOrders.custom(id, 'mark_in_transit', payload),
    onSuccess: () => {
      toast.success('Marked as In Transit');
      qc.invalidateQueries({ queryKey: ['pos'] });
      setTransitPO(null);
    },
    onError: () => toast.error('Failed to update status'),
  });

  const isFinance = [ROLES.FINANCE, ROLES.ADMIN].includes(user?.role);
  const isSupplyChain = [ROLES.SUPPLY_CHAIN, ROLES.ADMIN].includes(user?.role);

  const columns = [
    {
      key: 'po_no',
      label: 'PO No.',
      render: (r) => <span className="font-medium text-blue-700">{r.po_no}</span>,
    },
    { key: 'supplier_name', label: 'Supplier' },
    { key: 'client_po_no', label: 'Client PO' },
    {
      key: 'sourcing_type',
      label: 'Sourcing',
      render: (r) =>
        r.sourcing_type ? (
          <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700">
            {r.sourcing_type}
          </span>
        ) : null,
    },
    {
      key: 'total_cost',
      label: 'Amount',
      className: 'text-right',
      render: (r) => formatCurrency(r.total_cost, r.currency),
    },
    {
      key: 'expected_delivery',
      label: 'Expected',
      render: (r) => formatDate(r.expected_delivery),
    },
    {
      key: 'status',
      label: 'Status',
      render: (r) => <StatusBadge status={r.status} />,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="input w-64"
        >
          <option value="">All Statuses</option>
          <option value="PENDING_PROFITABILITY">Pending Profitability</option>
          <option value="PENDING_FINANCE">Pending Finance</option>
          <option value="APPROVED">Approved</option>
          <option value="SENT">Sent to Supplier</option>
          <option value="CONFIRMED">Order Confirmed</option>
          <option value="IN_TRANSIT">In Transit</option>
          <option value="RECEIVED">Received</option>
        </select>

        <div className="flex items-center gap-2">
          <ExportMenu
            columns={columns}
            data={data?.results || []}
            filename={`purchase-orders-${new Date().toISOString().slice(0, 10)}`}
            title="Purchase Orders"
          />
          {isSupplyChain && (
            <button className="btn-primary" onClick={() => setModal(true)}>
              <Plus className="w-4 h-4" /> New Purchase Order
            </button>
          )}
        </div>
      </div>

      <div className="card">
        <DataTable
          columns={columns}
          data={data?.results}
          loading={isLoading}
          emptyTitle="No purchase orders"
          emptyMessage="Purchase orders are raised from suppliers to fulfill client POs."
          emptyIcon={ShoppingCart}
          actions={(r) => (
            <div className="flex justify-end gap-1">
              <button
                onClick={() =>
                  procurementApi.purchaseOrders.pdf(r.id, `${r.po_no}.pdf`)
                }
                className="btn-ghost !p-2 text-slate-600"
                title="Download PDF"
              >
                <Download className="w-4 h-4" />
              </button>
              {isFinance && r.status === 'PENDING_PROFITABILITY' && (
                <button
                  onClick={() => approve.mutate(r.id)}
                  className="btn-ghost !p-2 text-green-600"
                  title="Approve"
                >
                  <Check className="w-4 h-4" />
                </button>
              )}
              {isSupplyChain && r.status === 'APPROVED' && (
                <button
                  onClick={() => send.mutate(r.id)}
                  className="btn-ghost !p-2 text-blue-600"
                  title="Send to Supplier"
                >
                  <Send className="w-4 h-4" />
                </button>
              )}
              {isSupplyChain && ['SENT', 'APPROVED'].includes(r.status) && (
                <button
                  onClick={() => setConfirmPO(r)}
                  className="btn-ghost !p-2 text-indigo-600"
                  title="Record Order Confirmation"
                >
                  <FileCheck className="w-4 h-4" />
                </button>
              )}
              {isSupplyChain &&
                ['CONFIRMED', 'SENT'].includes(r.status) && (
                  <button
                    onClick={() => setTransitPO(r)}
                    className="btn-ghost !p-2 text-cyan-600"
                    title="Mark as In Transit"
                  >
                    <Truck className="w-4 h-4" />
                  </button>
                )}
              {(isSupplyChain || isFinance) &&
                ['SENT', 'CONFIRMED', 'IN_TRANSIT', 'APPROVED'].includes(r.status) && (
                  <button
                    onClick={() => setReceivePO(r)}
                    className="btn-ghost !p-2 text-emerald-600"
                    title="Receive Goods"
                  >
                    <PackageCheck className="w-4 h-4" />
                  </button>
                )}
            </div>
          )}
        />
      </div>

      <POModal
        open={modal}
        onClose={() => setModal(false)}
        suppliers={suppliers?.results || []}
        clientPOs={clientPOs?.results || []}
        inventory={inventory?.results || []}
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: ['pos'] });
          setModal(false);
        }}
      />

      <GRNModal po={receivePO} onClose={() => setReceivePO(null)} />

      <OrderConfirmationModal
        po={confirmPO}
        onClose={() => setConfirmPO(null)}
      />

      <InTransitModal
        po={transitPO}
        onClose={() => setTransitPO(null)}
        onSubmit={(payload) =>
          markInTransit.mutate({ id: transitPO.id, payload })
        }
        loading={markInTransit.isPending}
      />
    </div>
  );
}


function POModal({ open, onClose, suppliers, clientPOs, inventory, onSuccess }) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm();
  const [lineItems, setLineItems] = useState([
    { item: '', description: '', quantity: 1, unit_price: 0 },
  ]);
  const [sourcingType, setSourcingType] = useState('LOCAL');
  const [submitting, setSubmitting] = useState(false);

  const createMutation = useMutation({
    mutationFn: (fd) => procurementApi.purchaseOrders.create(fd),
    onSuccess: () => {
      toast.success('Purchase order created');
      reset();
      setLineItems([{ item: '', description: '', quantity: 1, unit_price: 0 }]);
      setSourcingType('LOCAL');
      onSuccess();
    },
    onError: (err) => {
      let msg = 'Failed to create PO';
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
        updated[idx].unit_price = Number(invItem.unit_cost) || 0;
      }
    }
    setLineItems(updated);
  };

  const lineTotal = (row) => Number(row.quantity || 0) * Number(row.unit_price || 0);
  const goodsTotal = lineItems.reduce((s, r) => s + lineTotal(r), 0);

  const onSubmit = (values) => {
    const validItems = lineItems.filter((li) => li.description?.trim());
    if (validItems.length === 0) {
      toast.error('Please add at least one line item');
      return;
    }

    setSubmitting(true);

    const fd = new FormData();
    fd.append('supplier', values.supplier);
    fd.append('client_po', values.client_po);
    fd.append('sourcing_type', sourcingType);
    fd.append('total_cost', goodsTotal.toString());
    fd.append('freight_cost', (values.freight_cost || 0).toString());
    fd.append('currency', values.currency || 'GHS');
    fd.append('expected_delivery', values.expected_delivery || '');
    fd.append('carrier', values.carrier || '');
    fd.append('carrier_name', values.carrier_name || '');
    fd.append('tracking_number', values.tracking_number || '');
    fd.append('shipping_notes', values.shipping_notes || '');
    fd.append('notes', values.notes || '');
    fd.append(
      'items',
      JSON.stringify(
        validItems.map((li) => ({
          item: li.item || null,
          description: li.description,
          quantity: li.quantity.toString(),
          unit_price: li.unit_price.toString(),
        }))
      )
    );

    createMutation.mutate(fd, { onSettled: () => setSubmitting(false) });
  };

  return (
    <Modal open={open} onClose={onClose} title="New Purchase Order" size="xl">
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Supplier" required error={errors.supplier}>
            <select {...register('supplier', { required: 'Required' })} className="input">
              <option value="">— Select Supplier —</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {s.is_ksb_partner ? ' 🏭 KSB' : ''}
                  {s.is_international ? ' (Intl)' : ''}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Client PO" required error={errors.client_po}>
            <select {...register('client_po', { required: 'Required' })} className="input">
              <option value="">— Select Client PO —</option>
              {clientPOs.map((po) => (
                <option key={po.id} value={po.id}>
                  {po.internal_order_no} — {formatCurrency(po.total_value)}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <FormField label="Sourcing Type" required>
          <div className="grid grid-cols-3 gap-2">
            {SOURCING_TYPES.map((st) => (
              <button
                key={st.value}
                type="button"
                onClick={() => setSourcingType(st.value)}
                className={`p-2 rounded-lg border-2 text-sm font-medium transition ${
                  sourcingType === st.value
                    ? 'border-blue-500 bg-blue-50 text-blue-800'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </FormField>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField label="Currency">
            <select {...register('currency')} className="input" defaultValue="GHS">
              <option value="GHS">GHS</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
            </select>
          </FormField>
          <FormField label="Expected Delivery">
            <input type="date" {...register('expected_delivery')} className="input" />
          </FormField>
          <FormField label="Freight Cost">
            <input
              type="number"
              step="0.01"
              {...register('freight_cost')}
              className="input"
              defaultValue={0}
            />
          </FormField>
        </div>

        <div className="mt-6 mb-2">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-slate-800">Line Items</h4>
            <button type="button" onClick={addRow} className="btn-secondary text-xs">
              <Plus className="w-3 h-3" /> Add Row
            </button>
          </div>

          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-slate-600 uppercase">Item</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-slate-600 uppercase">Description</th>
                  <th className="text-right px-3 py-2 text-xs font-semibold text-slate-600 uppercase w-24">Qty</th>
                  <th className="text-right px-3 py-2 text-xs font-semibold text-slate-600 uppercase w-32">Unit Price</th>
                  <th className="text-right px-3 py-2 text-xs font-semibold text-slate-600 uppercase w-32">Total</th>
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
                        onChange={(e) => updateRow(idx, 'description', e.target.value)}
                        placeholder="Item description"
                        className="input !py-1.5 !text-xs w-full min-w-[200px]"
                      />
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
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        step="0.01"
                        value={row.unit_price}
                        onChange={(e) => updateRow(idx, 'unit_price', e.target.value)}
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
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                <tr>
                  <td colSpan={4} className="px-3 py-3 text-right font-semibold text-slate-700">
                    Goods Total:
                  </td>
                  <td className="px-3 py-3 text-right font-bold text-blue-700 text-base">
                    {formatCurrency(goodsTotal)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div className="border border-slate-200 rounded-lg p-4 mt-4 bg-slate-50/50">
          <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <Truck className="w-4 h-4 text-slate-600" /> Shipping & Logistics
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Carrier">
              <select {...register('carrier')} className="input" defaultValue="">
                {CARRIERS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Carrier / Forwarder Name (if 'Other')">
              <input
                {...register('carrier_name')}
                className="input"
                placeholder="e.g. Maersk, Kuehne+Nagel"
              />
            </FormField>
          </div>
          <FormField label="Tracking Number">
            <input
              {...register('tracking_number')}
              className="input"
              placeholder="e.g. JD014000123456789"
            />
          </FormField>
          <FormField label="Shipping Notes">
            <textarea
              rows={2}
              {...register('shipping_notes')}
              className="input"
              placeholder="Special shipping instructions, port, incoterms, etc."
            />
          </FormField>
        </div>

        <FormField label="General Notes">
          <textarea rows={2} {...register('notes')} className="input" />
        </FormField>

        <div className="flex justify-end gap-2 mt-4">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? 'Creating...' : 'Create Purchase Order'}
          </button>
        </div>
      </form>
    </Modal>
  );
}


function InTransitModal({ po, onClose, onSubmit, loading }) {
  const [tracking, setTracking] = useState('');
  const [carrier, setCarrier] = useState('');

  if (!po) return null;

  return (
    <Modal
      open={!!po}
      onClose={onClose}
      title={`Mark In Transit — ${po.po_no}`}
      size="sm"
    >
      <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4 mb-5 flex items-start gap-3">
        <Truck className="w-5 h-5 text-cyan-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-semibold text-cyan-900">Shipment In Progress</p>
          <p className="text-cyan-700 mt-1">
            Mark this PO as shipped. You can add the tracking number and carrier now,
            or update it later.
          </p>
        </div>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-5 text-sm">
        <p className="text-slate-700">
          <strong>{po.supplier_name}</strong>
        </p>
        {po.order_confirmation_ref && (
          <p className="text-xs text-slate-500 mt-1">
            Supplier Ref: {po.order_confirmation_ref}
          </p>
        )}
      </div>

      <FormField label="Carrier">
        <select
          value={carrier || po.carrier || ''}
          onChange={(e) => setCarrier(e.target.value)}
          className="input"
        >
          {CARRIERS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label="Tracking Number" helper="Airway bill, tracking ID, container #">
        <input
          value={tracking || po.tracking_number || ''}
          onChange={(e) => setTracking(e.target.value)}
          className="input"
          placeholder="e.g. JD014000123456789"
        />
      </FormField>

      <div className="flex justify-end gap-2 mt-2">
        <button onClick={onClose} className="btn-secondary" disabled={loading}>
          Cancel
        </button>
        <button
          onClick={() =>
            onSubmit({
              carrier: carrier || po.carrier || '',
              tracking_number: tracking || po.tracking_number || '',
            })
          }
          disabled={loading}
          className="btn-primary"
        >
          {loading ? 'Updating...' : 'Mark In Transit'}
        </button>
      </div>
    </Modal>
  );
}