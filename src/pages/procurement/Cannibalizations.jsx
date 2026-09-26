import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import {
  Plus, Check, X, Wrench, Package, Clock, Inbox, Recycle,
  HelpCircle, Hammer, Target, Trash2, ArchiveRestore,
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

const REASONS = [
  { value: 'REPAIR', label: 'Emergency Repair', desc: 'Fix a critical failure', icon: Wrench, color: 'red' },
  { value: 'PROJECT', label: 'Project Requirement', desc: 'Needed for a project', icon: Target, color: 'blue' },
  { value: 'SALVAGE', label: 'Salvage Usable Parts', desc: 'Extract reusable parts', icon: Recycle, color: 'green' },
  { value: 'DISPOSAL', label: 'Pre-Disposal Harvesting', desc: 'Before scrapping unit', icon: Trash2, color: 'amber' },
  { value: 'OTHER', label: 'Other', desc: 'Other reason', icon: HelpCircle, color: 'gray' },
];

const DESTINATIONS = [
  { value: 'STOCK', label: 'Return to Stock', desc: 'Salvage back to inventory', icon: ArchiveRestore, color: 'green' },
  { value: 'REORDER', label: 'Send to Supply Chain', desc: 'Auto-create RFQ for reorder', icon: Package, color: 'blue' },
  { value: 'SCRAP', label: 'Scrap / Dispose', desc: 'Not usable', icon: Trash2, color: 'gray' },
];

const STATUS_TABS = [
  { key: '', label: 'All', icon: Inbox },
  { key: 'REQUESTED', label: 'Requested', icon: Clock },
  { key: 'APPROVED', label: 'Approved', icon: Check },
  { key: 'COMPLETED', label: 'Completed', icon: Recycle },
];

export default function Cannibalizations() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState('');
  const [modal, setModal] = useState(false);
  const [detailReq, setDetailReq] = useState(null);

  const isStores = [ROLES.STORES, ROLES.SUPPLY_CHAIN, ROLES.ADMIN].includes(user?.role);

  const { data: stats } = useQuery({
    queryKey: ['can-stats'],
    queryFn: () => procurementApi.cannibalizations.stats(),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['cannibalizations', tab],
    queryFn: () =>
      procurementApi.cannibalizations.list({ status: tab, page_size: 500 }),
    keepPreviousData: true,
  });

  const columns = [
    {
      key: 'request_no',
      label: 'Ref No.',
      render: (r) => <span className="font-medium text-blue-700">{r.request_no}</span>,
    },
    {
      key: 'parent_item',
      label: 'Parent Item',
      render: (r) => (
        <div>
          <p className="font-medium text-slate-800 text-sm">
            {r.parent_item_detail?.part_number || '—'}
          </p>
          <p className="text-xs text-slate-500 line-clamp-1 max-w-xs">
            {r.parent_item_detail?.description}
          </p>
        </div>
      ),
    },
    {
      key: 'branch_name',
      label: 'Branch',
      render: (r) => <span className="text-sm">{r.branch_name}</span>,
    },
    {
      key: 'reason_display',
      label: 'Reason',
      render: (r) => {
        const cfg = REASONS.find((x) => x.value === r.reason);
        const Icon = cfg?.icon || HelpCircle;
        return (
          <span className="inline-flex items-center gap-1 text-xs text-slate-700">
            <Icon className="w-3 h-3" />
            {r.reason_display}
          </span>
        );
      },
    },
    {
      key: 'item_count',
      label: 'Parts',
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
          label="Completed"
          value={stats?.completed ?? '—'}
          icon={Recycle}
          color="purple"
        />
        <StatCard
          label="Rejected"
          value={stats?.rejected ?? '—'}
          icon={X}
          color="red"
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
                  t.key === 'COMPLETED' ? stats?.completed : null;
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
                filename={`cannibalizations-${new Date().toISOString().slice(0, 10)}`}
                title="Cannibalizations"
              />
              <button className="btn-primary" onClick={() => setModal(true)}>
                <Plus className="w-4 h-4" /> New Request
              </button>
            </div>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={data?.results}
          loading={isLoading}
          emptyTitle="No cannibalization requests"
          emptyMessage="Create a request to harvest parts from a parent unit."
          emptyIcon={Wrench}
          onRowClick={(r) => setDetailReq(r)}
        />
      </div>

      <CreateCannibalizationModal
        open={modal}
        onClose={() => setModal(false)}
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: ['cannibalizations'] });
          qc.invalidateQueries({ queryKey: ['can-stats'] });
          setModal(false);
        }}
      />

      <CannibalizationDetailModal
        request={detailReq}
        onClose={() => setDetailReq(null)}
        isStores={isStores}
        onUpdate={() => {
          qc.invalidateQueries({ queryKey: ['cannibalizations'] });
          qc.invalidateQueries({ queryKey: ['can-stats'] });
        }}
      />
    </div>
  );
}


// ============================================================
// CREATE MODAL
// ============================================================
function CreateCannibalizationModal({ open, onClose, onSuccess }) {
  const { register, handleSubmit, reset } = useForm();
  const [reason, setReason] = useState('REPAIR');
  const [lineItems, setLineItems] = useState([
    { part_item: '', part_number: '', description: '', quantity: 1, uom: 'pcs', destination: 'STOCK', remarks: '' },
  ]);

  const { data: branches } = useQuery({
    queryKey: ['branches-can'],
    queryFn: () => coreApi.branches.list(),
  });
  const { data: inventory } = useQuery({
    queryKey: ['inventory-can'],
    queryFn: () => procurementApi.inventory.list({ page_size: 500 }),
  });

  const createMutation = useMutation({
    mutationFn: (payload) => procurementApi.cannibalizations.create(payload),
    onSuccess: () => {
      toast.success('Cannibalization request created');
      reset();
      setReason('REPAIR');
      setLineItems([{ part_item: '', part_number: '', description: '', quantity: 1, uom: 'pcs', destination: 'STOCK', remarks: '' }]);
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
    setLineItems([...lineItems, { part_item: '', part_number: '', description: '', quantity: 1, uom: 'pcs', destination: 'STOCK', remarks: '' }]);

  const removeRow = (i) => {
    if (lineItems.length === 1) return;
    setLineItems(lineItems.filter((_, idx) => idx !== i));
  };

  const updateRow = (i, field, value) => {
    const u = [...lineItems];
    u[i] = { ...u[i], [field]: value };
    if (field === 'part_item' && value) {
      const inv = inventory?.results?.find((x) => x.id === value);
      if (inv) {
        u[i].part_number = inv.part_number;
        u[i].description = inv.description;
        u[i].uom = inv.uom;
      }
    }
    setLineItems(u);
  };

  const onSubmit = (values) => {
    if (!values.parent_item) {
      toast.error('Select the parent item being dismantled');
      return;
    }
    const valid = lineItems.filter((li) => li.description?.trim());
    if (valid.length === 0) {
      toast.error('Add at least one part to remove');
      return;
    }
    const payload = {
      parent_item: values.parent_item,
      parent_serial: values.parent_serial || '',
      parent_location: values.parent_location || '',
      branch: values.branch,
      reason: reason,
      reason_notes: values.reason_notes || '',
      notes: values.notes || '',
      items: valid.map((li) => ({
        part_item: li.part_item || null,
        part_number: li.part_number || '',
        description: li.description,
        quantity: li.quantity.toString(),
        uom: li.uom || 'pcs',
        destination: li.destination || 'STOCK',
        remarks: li.remarks || '',
      })),
    };
    createMutation.mutate(payload);
  };

  return (
    <Modal open={open} onClose={onClose} title="New Cannibalization Request" size="xl">
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-5 flex items-start gap-2 text-sm">
          <Wrench className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-amber-800">
            <strong>Note:</strong> Cannibalization removes parts from an existing unit
            for reuse elsewhere. This requires Store approval before execution.
          </div>
        </div>

        {/* Parent info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Parent Item (Equipment Being Dismantled)" required>
            <select {...register('parent_item', { required: true })} className="input">
              <option value="">— Select Parent —</option>
              {inventory?.results?.map((inv) => (
                <option key={inv.id} value={inv.id}>
                  {inv.part_number} — {inv.description}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Branch" required>
            <select {...register('branch', { required: true })} className="input">
              <option value="">— Select Branch —</option>
              {branches?.results?.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Serial Number (if tracked)">
            <input
              {...register('parent_serial')}
              className="input"
              placeholder="e.g. SN-12345"
            />
          </FormField>
          <FormField label="Current Location">
            <input
              {...register('parent_location')}
              className="input"
              placeholder="e.g. Repairs Bay / Shelf A-01"
            />
          </FormField>
        </div>

        {/* Reason tiles */}
        <FormField label="Reason" required>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
            {REASONS.map((r) => {
              const Icon = r.icon;
              const active = reason === r.value;
              return (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setReason(r.value)}
                  className={`p-3 rounded-lg border-2 text-left transition ${
                    active
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <Icon className={`w-4 h-4 mb-1 ${active ? 'text-blue-600' : 'text-slate-500'}`} />
                  <p className="text-xs font-medium text-slate-800 leading-tight">
                    {r.label}
                  </p>
                </button>
              );
            })}
          </div>
        </FormField>

        <FormField label="Reason Details">
          <textarea
            rows={2}
            {...register('reason_notes')}
            className="input"
            placeholder="Explain why this cannibalization is needed"
          />
        </FormField>

        {/* Line items */}
        <div className="mt-6 mb-2">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-slate-800">Parts to Remove</h4>
            <button type="button" onClick={addRow} className="btn-secondary text-xs">
              <Plus className="w-3 h-3" /> Add Row
            </button>
          </div>

          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-2 py-2 text-xs font-semibold text-slate-600 uppercase w-40">Link Item</th>
                  <th className="text-left px-2 py-2 text-xs font-semibold text-slate-600 uppercase">Description</th>
                  <th className="text-right px-2 py-2 text-xs font-semibold text-slate-600 uppercase w-20">Qty</th>
                  <th className="text-left px-2 py-2 text-xs font-semibold text-slate-600 uppercase w-20">UoM</th>
                  <th className="text-left px-2 py-2 text-xs font-semibold text-slate-600 uppercase w-40">Destination</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((row, idx) => (
                  <tr key={idx} className="border-t border-slate-100">
                    <td className="px-2 py-2">
                      <select
                        value={row.part_item}
                        onChange={(e) => updateRow(idx, 'part_item', e.target.value)}
                        className="input !py-1.5 !text-xs w-full"
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
                        placeholder="Part description"
                        className="input !py-1.5 !text-xs w-full min-w-[180px]"
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
                        value={row.uom}
                        onChange={(e) => updateRow(idx, 'uom', e.target.value)}
                        className="input !py-1.5 !text-xs w-full"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <select
                        value={row.destination}
                        onChange={(e) => updateRow(idx, 'destination', e.target.value)}
                        className="input !py-1.5 !text-xs w-full"
                      >
                        {DESTINATIONS.map((d) => (
                          <option key={d.value} value={d.value}>
                            {d.label}
                          </option>
                        ))}
                      </select>
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

        <FormField label="Additional Notes">
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
            {createMutation.isPending ? 'Creating...' : 'Submit Request'}
          </button>
        </div>
      </form>
    </Modal>
  );
}


// ============================================================
// DETAIL MODAL
// ============================================================
function CannibalizationDetailModal({ request, onClose, isStores, onUpdate }) {
  const qc = useQueryClient();
  const [rejectModal, setRejectModal] = useState(false);
  const [completeResult, setCompleteResult] = useState(null);

  const actionMutation = useMutation({
    mutationFn: ({ id, action, payload }) =>
      procurementApi.cannibalizations.custom(id, action, payload || {}),
    onSuccess: (data, vars) => {
      if (vars.action === 'complete') {
        setCompleteResult(data);
        toast.success('Cannibalization completed');
      } else {
        toast.success(vars.action.replace(/_/g, ' '));
      }
      qc.invalidateQueries({ queryKey: ['cannibalization', request?.id] });
      qc.invalidateQueries({ queryKey: ['inventory'] });
      onUpdate();
    },
    onError: (err) => {
      const msg = err.response?.data?.error || 'Action failed';
      toast.error(msg, { duration: 6000 });
    },
  });

  const { data: fresh } = useQuery({
    queryKey: ['cannibalization', request?.id],
    queryFn: () => procurementApi.cannibalizations.get(request.id),
    enabled: !!request?.id,
  });

  if (!request) return null;
  const req = fresh || request;

  const canApprove = isStores && req.status === 'REQUESTED';
  const canReject = isStores && req.status === 'REQUESTED';
  const canComplete = isStores && req.status === 'APPROVED';

  const reasonCfg = REASONS.find((r) => r.value === req.reason);
  const ReasonIcon = reasonCfg?.icon || HelpCircle;

  return (
    <Modal
      open={!!request}
      onClose={onClose}
      title={`${req.request_no}`}
      size="lg"
    >
      {/* Parent banner */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4 mb-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
            <Wrench className="w-5 h-5 text-amber-700" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-amber-700 uppercase tracking-wide font-semibold">
              Parent Item Being Dismantled
            </p>
            <p className="font-semibold text-slate-800 mt-0.5">
              {req.parent_item_detail?.part_number} — {req.parent_item_detail?.description}
            </p>
            <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-600">
              {req.parent_serial && (
                <span>
                  <span className="text-slate-400">Serial:</span>{' '}
                  <span className="font-mono">{req.parent_serial}</span>
                </span>
              )}
              {req.parent_location && (
                <span>
                  <span className="text-slate-400">Location:</span>{' '}
                  <span className="font-mono">{req.parent_location}</span>
                </span>
              )}
              <span>
                <span className="text-slate-400">Branch:</span> {req.branch_name}
              </span>
            </div>
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
          <p className="text-xs text-slate-500">Reason</p>
          <p className="font-medium text-slate-800 inline-flex items-center gap-1">
            <ReasonIcon className="w-3.5 h-3.5 text-slate-500" />
            {req.reason_display}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Requested By</p>
          <p className="font-medium text-slate-800">{req.requested_by_name || '—'}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Parts Count</p>
          <p className="font-medium text-slate-800">{req.item_count}</p>
        </div>
        {req.reason_notes && (
          <div className="col-span-2">
            <p className="text-xs text-slate-500">Reason Details</p>
            <p className="text-slate-700">{req.reason_notes}</p>
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

      {/* Items table */}
      <div className="border border-slate-200 rounded-lg overflow-hidden mb-5">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left px-3 py-2 text-xs font-semibold text-slate-600 uppercase">
                Part
              </th>
              <th className="text-right px-3 py-2 text-xs font-semibold text-slate-600 uppercase w-20">
                Qty
              </th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-slate-600 uppercase">
                Destination
              </th>
              <th className="text-center px-3 py-2 text-xs font-semibold text-slate-600 uppercase w-20">
                Removed
              </th>
            </tr>
          </thead>
          <tbody>
            {req.items?.map((it) => {
              const destCfg = DESTINATIONS.find((d) => d.value === it.destination);
              const DestIcon = destCfg?.icon || Package;
              return (
                <tr key={it.id} className="border-t border-slate-100">
                  <td className="px-3 py-2">
                    <p className="font-medium text-slate-800">
                      {it.part_item_detail?.part_number || it.part_number || '—'}
                    </p>
                    <p className="text-xs text-slate-500">{it.description}</p>
                  </td>
                  <td className="px-3 py-2 text-right">
                    {it.quantity} {it.uom}
                  </td>
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center gap-1 text-xs text-slate-700">
                      <DestIcon className="w-3 h-3" />
                      {destCfg?.label || it.destination}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    {it.is_removed ? (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                        Yes
                      </span>
                    ) : (
                      <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded">
                        No
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Completion result banner */}
      {completeResult && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-5">
          <p className="font-semibold text-green-800 mb-2">✓ Completed</p>
          <ul className="text-sm text-green-700 space-y-1">
            <li>• {completeResult.parts_salvaged} part(s) returned to stock</li>
            <li>• {completeResult.parts_for_reorder} part(s) sent for reorder</li>
            {completeResult.rfq_created && (
              <li>
                • RFQ <span className="font-mono">{completeResult.rfq_created}</span> auto-created
              </li>
            )}
          </ul>
        </div>
      )}

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
        {canComplete && (
          <button
            onClick={() => actionMutation.mutate({ id: req.id, action: 'complete' })}
            className="btn-primary"
          >
            <Recycle className="w-4 h-4" /> Mark as Completed
          </button>
        )}
      </div>

      <div className="flex justify-end">
        <button onClick={onClose} className="btn-secondary">
          Close
        </button>
      </div>

      <RejectModal
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


function RejectModal({ open, onClose, onSubmit }) {
  const [reason, setReason] = useState('');
  return (
    <Modal open={open} onClose={onClose} title="Reject Cannibalization" size="sm">
      <FormField label="Reason for Rejection" required>
        <textarea
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="input"
          placeholder="Why this request is rejected"
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