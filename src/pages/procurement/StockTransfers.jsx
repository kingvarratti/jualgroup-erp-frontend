import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import {
  Plus, ArrowRight, Check, X, Truck, PackageCheck, Download,
  Building2, Package, Clock, Inbox, AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { procurementApi } from '../../api/procurement';
import { coreApi } from '../../api/core';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import FormField from '../../components/FormField';
import StatusBadge from '../../components/StatusBadge';
import StatCard from '../../components/StatCard';
import ExportMenu from '../../components/ExportMenu';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../utils/constants';

const STATUS_TABS = [
  { key: '', label: 'All', icon: Inbox },
  { key: 'REQUESTED', label: 'Requested', icon: Clock },
  { key: 'APPROVED', label: 'Approved', icon: Check },
  { key: 'DISPATCHED', label: 'Dispatched', icon: Truck },
  { key: 'RECEIVED', label: 'Received', icon: PackageCheck },
];

const TRANSFER_TYPES = [
  { value: 'STOCK', label: 'Stock Replenishment', desc: 'Regular stock top-up' },
  { value: 'PROJECT', label: 'Project Requirement', desc: 'For a specific project' },
];

export default function StockTransfers() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState('');
  const [modal, setModal] = useState(false);
  const [detailReq, setDetailReq] = useState(null);

  const isStores = [ROLES.STORES, ROLES.SUPPLY_CHAIN, ROLES.ADMIN].includes(user?.role);

  const { data: stats } = useQuery({
    queryKey: ['transfer-stats'],
    queryFn: () => procurementApi.transfers.stats(),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['transfers', tab],
    queryFn: () =>
      procurementApi.transfers.list({ status: tab, page_size: 500 }),
    keepPreviousData: true,
  });

  const columns = [
    {
      key: 'transfer_no',
      label: 'Transfer No.',
      render: (r) => <span className="font-medium text-blue-700">{r.transfer_no}</span>,
    },
    {
      key: 'route',
      label: 'Route',
      render: (r) => (
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium text-slate-700">{r.from_branch_name}</span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-medium text-slate-700">{r.to_branch_name}</span>
        </div>
      ),
    },
    {
      key: 'type_display',
      label: 'Type',
      render: (r) => (
        <span
          className={`text-xs px-2 py-0.5 rounded font-medium ${
            r.transfer_type === 'PROJECT'
              ? 'bg-purple-100 text-purple-700'
              : 'bg-blue-100 text-blue-700'
          }`}
        >
          {r.type_display}
        </span>
      ),
    },
    {
      key: 'item_count',
      label: 'Items',
      className: 'text-center',
      render: (r) => (
        <span className="text-xs bg-slate-100 text-slate-600 rounded-full px-2 py-0.5">
          {r.item_count}
        </span>
      ),
    },
    {
      key: 'requested_by_name',
      label: 'Requested By',
      render: (r) => r.requested_by_name || '—',
    },
    {
      key: 'status',
      label: 'Status',
      render: (r) => <StatusBadge status={r.status} />,
    },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Pending Approval"
          value={stats?.requested ?? '—'}
          icon={Clock}
          color="amber"
        />
        <StatCard
          label="Approved"
          value={stats?.approved ?? '—'}
          icon={Check}
          color="green"
        />
        <StatCard
          label="In Transit"
          value={stats?.dispatched ?? '—'}
          icon={Truck}
          color="brand"
        />
        <StatCard
          label="Received"
          value={stats?.received ?? '—'}
          icon={PackageCheck}
          color="purple"
        />
      </div>

      <div className="card">
        <div className="p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1">
              {STATUS_TABS.map((t) => {
                const active = tab === t.key;
                const Icon = t.icon;
                const count =
                  t.key === '' ? null :
                  t.key === 'REQUESTED' ? stats?.requested :
                  t.key === 'APPROVED' ? stats?.approved :
                  t.key === 'DISPATCHED' ? stats?.dispatched :
                  t.key === 'RECEIVED' ? stats?.received : null;
                return (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                      active
                        ? 'border-blue-600 text-blue-700'
                        : 'border-transparent text-slate-600 hover:text-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {t.label}
                    {count > 0 && (
                      <span className="ml-1 text-xs px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <ExportMenu
                columns={columns}
                data={data?.results || []}
                filename={`transfers-${new Date().toISOString().slice(0, 10)}`}
                title="Stock Transfers"
              />
              <button className="btn-primary" onClick={() => setModal(true)}>
                <Plus className="w-4 h-4" /> New Transfer
              </button>
            </div>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={data?.results}
          loading={isLoading}
          emptyTitle="No stock transfers"
          emptyMessage="Create a transfer to move stock between branches."
          emptyIcon={ArrowRight}
          onRowClick={(r) => setDetailReq(r)}
        />
      </div>

      <CreateTransferModal
        open={modal}
        onClose={() => setModal(false)}
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: ['transfers'] });
          qc.invalidateQueries({ queryKey: ['transfer-stats'] });
          setModal(false);
        }}
      />

      <TransferDetailModal
        transfer={detailReq}
        onClose={() => setDetailReq(null)}
        isStores={isStores}
        onUpdate={() => {
          qc.invalidateQueries({ queryKey: ['transfers'] });
          qc.invalidateQueries({ queryKey: ['transfer-stats'] });
        }}
      />
    </div>
  );
}


// ============================================================
// CREATE MODAL
// ============================================================
function CreateTransferModal({ open, onClose, onSuccess }) {
  const { register, handleSubmit, reset } = useForm();
  const [transferType, setTransferType] = useState('STOCK');
  const [lineItems, setLineItems] = useState([
    { item: '', description: '', uom: 'pcs', quantity_requested: 1 },
  ]);

  const { data: branches } = useQuery({
    queryKey: ['branches-list'],
    queryFn: () => coreApi.branches.list(),
  });
  const { data: inventory } = useQuery({
    queryKey: ['inventory-for-transfer'],
    queryFn: () => procurementApi.inventory.list({ page_size: 500 }),
  });

  const createMutation = useMutation({
    mutationFn: (payload) => procurementApi.transfers.create(payload),
    onSuccess: () => {
      toast.success('Transfer request created');
      reset();
      setLineItems([{ item: '', description: '', uom: 'pcs', quantity_requested: 1 }]);
      onSuccess();
    },
    onError: (err) => {
      const data = err.response?.data;
      let msg = 'Failed to create';
      if (typeof data === 'string') msg = data;
      else if (data?.detail) msg = data.detail;
      else if (data && typeof data === 'object') {
        const parts = [];
        const walk = (o, p = '') => {
          if (typeof o === 'string') parts.push(p ? `${p}: ${o}` : o);
          else if (Array.isArray(o)) o.forEach((v) => walk(v, p));
          else if (o && typeof o === 'object')
            Object.entries(o).forEach(([k, v]) => walk(v, p ? `${p}.${k}` : k));
        };
        walk(data);
        msg = parts.join(' • ') || msg;
      }
      toast.error(msg, { duration: 6000 });
    },
  });

  const addRow = () =>
    setLineItems([
      ...lineItems,
      { item: '', description: '', uom: 'pcs', quantity_requested: 1 },
    ]);
  const removeRow = (i) => {
    if (lineItems.length === 1) return;
    setLineItems(lineItems.filter((_, idx) => idx !== i));
  };
  const updateRow = (i, field, value) => {
    const u = [...lineItems];
    u[i] = { ...u[i], [field]: value };
    if (field === 'item' && value) {
      const inv = inventory?.results?.find((x) => x.id === value);
      if (inv) {
        u[i].description = inv.description;
        u[i].uom = inv.uom;
      }
    }
    setLineItems(u);
  };

  const onSubmit = (values) => {
    if (values.from_branch === values.to_branch) {
      toast.error('Source and destination branches must be different');
      return;
    }
    const valid = lineItems.filter((li) => li.description?.trim());
    if (valid.length === 0) {
      toast.error('Add at least one line item');
      return;
    }
    const payload = {
      from_branch: values.from_branch,
      to_branch: values.to_branch,
      transfer_type: transferType,
      purpose: values.purpose || '',
      notes: values.notes || '',
      items: valid.map((li) => ({
        item: li.item || null,
        description: li.description,
        uom: li.uom || 'pcs',
        quantity_requested: li.quantity_requested.toString(),
      })),
    };
    createMutation.mutate(payload);
  };

  return (
    <Modal open={open} onClose={onClose} title="New Stock Transfer" size="xl">
      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Route */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="From Branch (Source)" required>
            <select {...register('from_branch', { required: true })} className="input">
              <option value="">— Select Source —</option>
              {branches?.results?.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} — {b.location}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="To Branch (Destination)" required>
            <select {...register('to_branch', { required: true })} className="input">
              <option value="">— Select Destination —</option>
              {branches?.results?.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} — {b.location}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        {/* Transfer type */}
        <FormField label="Transfer Type" required>
          <div className="grid grid-cols-2 gap-2">
            {TRANSFER_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setTransferType(t.value)}
                className={`p-3 rounded-lg border-2 text-left transition ${
                  transferType === t.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <p className="text-sm font-medium text-slate-800">{t.label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{t.desc}</p>
              </button>
            ))}
          </div>
        </FormField>

        <FormField label="Purpose">
          <input
            {...register('purpose')}
            className="input"
            placeholder="Why this transfer is needed"
          />
        </FormField>

        {/* Line items */}
        <div className="mt-6 mb-2">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-slate-800">Items to Transfer</h4>
            <button type="button" onClick={addRow} className="btn-secondary text-xs">
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
                  <th className="text-left px-3 py-2 text-xs font-semibold text-slate-600 uppercase w-20">
                    UoM
                  </th>
                  <th className="text-right px-3 py-2 text-xs font-semibold text-slate-600 uppercase w-28">
                    Qty
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
                        {inventory?.results?.map((inv) => (
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
                        value={row.uom}
                        onChange={(e) => updateRow(idx, 'uom', e.target.value)}
                        className="input !py-1.5 !text-xs w-full"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        step="0.01"
                        value={row.quantity_requested}
                        onChange={(e) =>
                          updateRow(idx, 'quantity_requested', e.target.value)
                        }
                        className="input !py-1.5 !text-xs text-right w-full"
                      />
                    </td>
                    <td className="px-2 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => removeRow(idx)}
                        disabled={lineItems.length === 1}
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
        </div>

        <FormField label="Notes">
          <textarea rows={2} {...register('notes')} className="input" />
        </FormField>

        <div className="flex justify-end gap-2 mt-4">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="btn-primary"
          >
            {createMutation.isPending ? 'Creating...' : 'Create Transfer'}
          </button>
        </div>
      </form>
    </Modal>
  );
}


// ============================================================
// DETAIL MODAL
// ============================================================
function TransferDetailModal({ transfer, onClose, isStores, onUpdate }) {
  const qc = useQueryClient();
  const [rejectModal, setRejectModal] = useState(false);

  const actionMutation = useMutation({
    mutationFn: ({ id, action, payload }) =>
      procurementApi.transfers.custom(id, action, payload || {}),
    onSuccess: (_, vars) => {
      toast.success(vars.action.replace(/_/g, ' '));
      qc.invalidateQueries({ queryKey: ['transfer', transfer?.id] });
      onUpdate();
    },
    onError: (err) => {
      const msg = err.response?.data?.error || 'Action failed';
      toast.error(msg, { duration: 6000 });
    },
  });

  const { data: fresh } = useQuery({
    queryKey: ['transfer', transfer?.id],
    queryFn: () => procurementApi.transfers.get(transfer.id),
    enabled: !!transfer?.id,
  });

  if (!transfer) return null;
  const req = fresh || transfer;

  const canApprove = isStores && req.status === 'REQUESTED';
  const canReject = isStores && req.status === 'REQUESTED';
  const canDispatch = isStores && req.status === 'APPROVED';
  const canReceive = req.status === 'DISPATCHED';

  return (
    <Modal
      open={!!transfer}
      onClose={onClose}
      title={`${req.transfer_no}`}
      size="lg"
    >
      {/* Route banner */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4 mb-5">
        <div className="flex items-center justify-center gap-4">
          <div className="text-center">
            <p className="text-xs text-slate-500 uppercase tracking-wide">From</p>
            <p className="font-semibold text-slate-800">{req.from_branch_name}</p>
          </div>
          <ArrowRight className="w-6 h-6 text-blue-500" />
          <div className="text-center">
            <p className="text-xs text-slate-500 uppercase tracking-wide">To</p>
            <p className="font-semibold text-slate-800">{req.to_branch_name}</p>
          </div>
        </div>
      </div>

      {/* Info grid */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-5 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs text-slate-500">Status</p>
          <div className="mt-1">
            <StatusBadge status={req.status} />
          </div>
        </div>
        <div>
          <p className="text-xs text-slate-500">Type</p>
          <p className="font-medium text-slate-800">{req.type_display}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Requested By</p>
          <p className="font-medium text-slate-800">{req.requested_by_name || '—'}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Waybill No.</p>
          <p className="font-mono text-slate-700 text-xs">{req.waybill_no || '—'}</p>
        </div>
        {req.purpose && (
          <div className="col-span-2">
            <p className="text-xs text-slate-500">Purpose</p>
            <p className="font-medium text-slate-800">{req.purpose}</p>
          </div>
        )}
        {req.rejection_reason && (
          <div className="col-span-2 bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-xs font-semibold text-red-800 uppercase">
              Rejection Reason
            </p>
            <p className="text-sm text-red-700 mt-1">{req.rejection_reason}</p>
          </div>
        )}
      </div>

      {/* Items */}
      <div className="border border-slate-200 rounded-lg overflow-hidden mb-5">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left px-3 py-2 text-xs font-semibold text-slate-600 uppercase">
                Item
              </th>
              <th className="text-right px-3 py-2 text-xs font-semibold text-slate-600 uppercase">
                Requested
              </th>
              <th className="text-right px-3 py-2 text-xs font-semibold text-slate-600 uppercase">
                Approved
              </th>
              <th className="text-right px-3 py-2 text-xs font-semibold text-slate-600 uppercase">
                Dispatched
              </th>
              <th className="text-right px-3 py-2 text-xs font-semibold text-slate-600 uppercase">
                Received
              </th>
            </tr>
          </thead>
          <tbody>
            {req.items?.map((it) => (
              <tr key={it.id} className="border-t border-slate-100">
                <td className="px-3 py-2">
                  <p className="font-medium text-slate-800">
                    {it.item_detail?.part_number || '—'}
                  </p>
                  <p className="text-xs text-slate-500">{it.description}</p>
                </td>
                <td className="px-3 py-2 text-right">
                  {it.quantity_requested} {it.uom}
                </td>
                <td className="px-3 py-2 text-right">{it.quantity_approved}</td>
                <td className="px-3 py-2 text-right">{it.quantity_dispatched}</td>
                <td className="px-3 py-2 text-right font-medium">
                  {it.quantity_received}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 mb-4">
        {canApprove && (
          <button
            onClick={() => actionMutation.mutate({ id: req.id, action: 'approve' })}
            className="btn-primary"
          >
            <Check className="w-4 h-4" /> Approve
          </button>
        )}
        {canReject && (
          <button onClick={() => setRejectModal(true)} className="btn-danger">
            <X className="w-4 h-4" /> Reject
          </button>
        )}
        {canDispatch && (
          <button
            onClick={() =>
              actionMutation.mutate({ id: req.id, action: 'mark_dispatched' })
            }
            className="btn-primary"
          >
            <Truck className="w-4 h-4" /> Dispatch
          </button>
        )}
        {canReceive && (
          <button
            onClick={() =>
              actionMutation.mutate({ id: req.id, action: 'mark_received' })
            }
            className="btn-primary"
          >
            <PackageCheck className="w-4 h-4" /> Mark Received
          </button>
        )}
        <button
          onClick={() =>
            procurementApi.transfers.pdf(req.id, `${req.transfer_no}.pdf`)
          }
          className="btn-secondary ml-auto"
        >
          <Download className="w-4 h-4" /> Download PDF
        </button>
      </div>

      <div className="flex justify-end">
        <button onClick={onClose} className="btn-secondary">
          Close
        </button>
      </div>

      <RejectTransferModal
        open={rejectModal}
        onClose={() => setRejectModal(false)}
        onSubmit={(reason) => {
          actionMutation.mutate({
            id: req.id,
            action: 'reject',
            payload: { reason },
          });
          setRejectModal(false);
        }}
      />
    </Modal>
  );
}


function RejectTransferModal({ open, onClose, onSubmit }) {
  const [reason, setReason] = useState('');
  return (
    <Modal open={open} onClose={onClose} title="Reject Transfer" size="sm">
      <FormField label="Reason for Rejection" required>
        <textarea
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="input"
          placeholder="Why this transfer is rejected"
        />
      </FormField>
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="btn-secondary">
          Cancel
        </button>
        <button
          onClick={() => {
            onSubmit(reason);
            setReason('');
          }}
          disabled={!reason.trim()}
          className="btn-danger"
        >
          Confirm Reject
        </button>
      </div>
    </Modal>
  );
}