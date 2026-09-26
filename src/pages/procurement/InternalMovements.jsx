import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import {
  Plus, ArrowRight, Check, X, MapPin, Package, Clock, Inbox,
  ClipboardList, Wrench, DoorOpen, Layers, HelpCircle, CheckCircle2,
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
  {
    value: 'SPACE',
    label: 'Space Optimization',
    desc: 'Free up shelf space',
    icon: Layers,
    color: 'blue',
  },
  {
    value: 'REPAIRS',
    label: 'Send to Repairs',
    desc: 'Move damaged item to repair area',
    icon: Wrench,
    color: 'amber',
  },
  {
    value: 'ACCESS',
    label: 'Accessibility',
    desc: 'Move frequently used item to easier access',
    icon: DoorOpen,
    color: 'purple',
  },
  {
    value: 'CONSOLIDATION',
    label: 'Consolidation',
    desc: 'Group related items together',
    icon: Package,
    color: 'green',
  },
  {
    value: 'OTHER',
    label: 'Other',
    desc: 'Other reason (specify in notes)',
    icon: HelpCircle,
    color: 'gray',
  },
];

const STATUS_TABS = [
  { key: '', label: 'All', icon: Inbox },
  { key: 'REQUESTED', label: 'Requested', icon: Clock },
  { key: 'PLANNED', label: 'Planned', icon: MapPin },
  { key: 'MOVED', label: 'Moved', icon: ArrowRight },
  { key: 'VERIFIED', label: 'Verified', icon: CheckCircle2 },
];

export default function InternalMovements() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState('');
  const [modal, setModal] = useState(false);
  const [detailItem, setDetailItem] = useState(null);

  const isStores = [ROLES.STORES, ROLES.SUPPLY_CHAIN, ROLES.ADMIN].includes(user?.role);

  const { data: stats } = useQuery({
    queryKey: ['im-stats'],
    queryFn: () => procurementApi.internalMovements.stats(),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['internal-movements', tab],
    queryFn: () =>
      procurementApi.internalMovements.list({ status: tab, page_size: 500 }),
    keepPreviousData: true,
  });

  const columns = [
    {
      key: 'movement_no',
      label: 'Ref No.',
      render: (r) => <span className="font-medium text-blue-700">{r.movement_no}</span>,
    },
    {
      key: 'item',
      label: 'Item',
      render: (r) => (
        <div>
          <p className="font-medium text-slate-800 text-sm">
            {r.item_detail?.part_number || '—'}
          </p>
          <p className="text-xs text-slate-500 line-clamp-1 max-w-xs">
            {r.item_detail?.description}
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
      key: 'route',
      label: 'Location Change',
      render: (r) => (
        <div className="flex items-center gap-1.5 text-xs font-mono text-slate-600">
          <span>{r.from_location || '—'}</span>
          <ArrowRight className="w-3 h-3 text-slate-400" />
          <span>{r.to_location || '—'}</span>
        </div>
      ),
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
      key: 'status',
      label: 'Status',
      render: (r) => <StatusBadge status={r.status} />,
    },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Requested"
          value={stats?.requested ?? '—'}
          icon={Clock}
          color="amber"
        />
        <StatCard
          label="Planned"
          value={stats?.planned ?? '—'}
          icon={MapPin}
          color="brand"
        />
        <StatCard
          label="Moved"
          value={stats?.moved ?? '—'}
          icon={ArrowRight}
          color="purple"
        />
        <StatCard
          label="Verified"
          value={stats?.verified ?? '—'}
          icon={CheckCircle2}
          color="green"
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
                  t.key === 'PLANNED' ? stats?.planned :
                  t.key === 'MOVED' ? stats?.moved :
                  t.key === 'VERIFIED' ? stats?.verified : null;
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
                filename={`internal-movements-${new Date().toISOString().slice(0, 10)}`}
                title="Internal Movements"
              />
              <button className="btn-primary" onClick={() => setModal(true)}>
                <Plus className="w-4 h-4" /> New Movement
              </button>
            </div>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={data?.results}
          loading={isLoading}
          emptyTitle="No internal movements"
          emptyMessage="Create a movement to relocate stock within a branch."
          emptyIcon={MapPin}
          onRowClick={(r) => setDetailItem(r)}
        />
      </div>

      <CreateMovementModal
        open={modal}
        onClose={() => setModal(false)}
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: ['internal-movements'] });
          qc.invalidateQueries({ queryKey: ['im-stats'] });
          setModal(false);
        }}
      />

      <MovementDetailModal
        movement={detailItem}
        onClose={() => setDetailItem(null)}
        isStores={isStores}
        onUpdate={() => {
          qc.invalidateQueries({ queryKey: ['internal-movements'] });
          qc.invalidateQueries({ queryKey: ['im-stats'] });
        }}
      />
    </div>
  );
}


// ============================================================
// CREATE MODAL
// ============================================================
function CreateMovementModal({ open, onClose, onSuccess }) {
  const { register, handleSubmit, reset, watch } = useForm();
  const [reason, setReason] = useState('SPACE');
  const [branchId, setBranchId] = useState('');

  const { data: branches } = useQuery({
    queryKey: ['branches-list-im'],
    queryFn: () => coreApi.branches.list(),
  });
  const { data: inventory } = useQuery({
    queryKey: ['inventory-for-im'],
    queryFn: () => procurementApi.inventory.list({ page_size: 500 }),
  });
  const { data: branchStocks } = useQuery({
    queryKey: ['bs-for-im', branchId],
    queryFn: () => procurementApi.branchStocks.list({ branch: branchId, page_size: 500 }),
    enabled: !!branchId,
  });

  const selectedItemId = watch('item');
  const selectedItemBS = branchStocks?.results?.find(
    (b) => b.item === selectedItemId
  );

  const createMutation = useMutation({
    mutationFn: (payload) => procurementApi.internalMovements.create(payload),
    onSuccess: () => {
      toast.success('Movement request created');
      reset();
      setReason('SPACE');
      setBranchId('');
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

  const onSubmit = (values) => {
    if (!values.item) {
      toast.error('Please select an item');
      return;
    }
    if (!values.from_location || !values.to_location) {
      toast.error('From and To locations are required');
      return;
    }
    const payload = {
      branch: values.branch,
      item: values.item,
      quantity: values.quantity.toString(),
      reason: reason,
      from_location: values.from_location,
      to_location: values.to_location,
      from_bin: values.from_bin || '',
      to_bin: values.to_bin || '',
      notes: values.notes || '',
    };
    createMutation.mutate(payload);
  };

  return (
    <Modal open={open} onClose={onClose} title="New Internal Movement" size="lg">
      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Branch */}
        <FormField label="Branch" required>
          <select
            {...register('branch', { required: true })}
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            className="input"
          >
            <option value="">— Select Branch —</option>
            {branches?.results?.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </FormField>

        {/* Item */}
        <FormField label="Item" required helper={branchId ? 'Only items in selected branch shown' : 'Select branch first'}>
          <select
            {...register('item', { required: true })}
            className="input"
            disabled={!branchId}
          >
            <option value="">— Select Item —</option>
            {branchId && branchStocks?.results?.map((bs) => (
              <option key={bs.item} value={bs.item}>
                {bs.item_part_number} — {bs.item_description} (Qty: {bs.quantity_on_hand})
              </option>
            ))}
          </select>
        </FormField>

        {/* Auto-fill from current location */}
        {selectedItemBS && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-xs text-blue-800">
            <span className="font-semibold">Current location:</span>{' '}
            <span className="font-mono">
              {selectedItemBS.location || '—'}
              {selectedItemBS.bin_number && ` / ${selectedItemBS.bin_number}`}
            </span>
            {' · '}
            <span className="font-semibold">Quantity on hand:</span>{' '}
            {selectedItemBS.quantity_on_hand} {selectedItemBS.item_uom}
          </div>
        )}

        {/* Reason */}
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
                  className={`p-2.5 rounded-lg border-2 text-left transition ${
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

        {/* Quantity */}
        <FormField label="Quantity to Move" required>
          <input
            type="number"
            step="0.01"
            defaultValue={selectedItemBS?.quantity_on_hand || 0}
            {...register('quantity', { required: true })}
            className="input"
          />
        </FormField>

        {/* Locations */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50">
            <p className="text-xs font-semibold text-slate-500 uppercase mb-2">From</p>
            <FormField label="Location" required>
              <input
                {...register('from_location', { required: true })}
                className="input"
                defaultValue={selectedItemBS?.location || ''}
                placeholder="e.g. A-01"
              />
            </FormField>
            <FormField label="Bin">
              <input
                {...register('from_bin')}
                className="input"
                defaultValue={selectedItemBS?.bin_number || ''}
                placeholder="e.g. B-101"
              />
            </FormField>
          </div>
          <div className="border border-blue-200 rounded-lg p-3 bg-blue-50/30">
            <p className="text-xs font-semibold text-blue-700 uppercase mb-2">To</p>
            <FormField label="Location" required>
              <input
                {...register('to_location', { required: true })}
                className="input"
                placeholder="e.g. B-05"
              />
            </FormField>
            <FormField label="Bin">
              <input
                {...register('to_bin')}
                className="input"
                placeholder="e.g. B-205"
              />
            </FormField>
          </div>
        </div>

        <FormField label="Notes">
          <textarea
            rows={2}
            {...register('notes')}
            className="input"
            placeholder="Additional details about this move"
          />
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
            {createMutation.isPending ? 'Creating...' : 'Create Movement'}
          </button>
        </div>
      </form>
    </Modal>
  );
}


// ============================================================
// DETAIL MODAL
// ============================================================
function MovementDetailModal({ movement, onClose, isStores, onUpdate }) {
  const qc = useQueryClient();
  const [verifyNotes, setVerifyNotes] = useState('');

  const actionMutation = useMutation({
    mutationFn: ({ id, action, payload }) =>
      procurementApi.internalMovements.custom(id, action, payload || {}),
    onSuccess: (_, vars) => {
      toast.success(vars.action.replace(/_/g, ' '));
      qc.invalidateQueries({ queryKey: ['internal-movement', movement?.id] });
      onUpdate();
    },
    onError: (err) => {
      const msg = err.response?.data?.error || 'Action failed';
      toast.error(msg, { duration: 5000 });
    },
  });

  const { data: fresh } = useQuery({
    queryKey: ['internal-movement', movement?.id],
    queryFn: () => procurementApi.internalMovements.get(movement.id),
    enabled: !!movement?.id,
  });

  if (!movement) return null;
  const mv = fresh || movement;

  const canPlan = isStores && mv.status === 'REQUESTED';
  const canMove = isStores && ['PLANNED', 'REQUESTED'].includes(mv.status);
  const canVerify = isStores && mv.status === 'MOVED';

  const reasonCfg = REASONS.find((r) => r.value === mv.reason);
  const ReasonIcon = reasonCfg?.icon || HelpCircle;

  return (
    <Modal
      open={!!movement}
      onClose={onClose}
      title={`${mv.movement_no}`}
      size="md"
    >
      {/* Route banner */}
      <div className="bg-gradient-to-r from-slate-50 to-blue-50 border border-slate-200 rounded-lg p-4 mb-5">
        <div className="flex items-center justify-center gap-4">
          <div className="text-center">
            <p className="text-xs text-slate-500 uppercase tracking-wide">From</p>
            <p className="font-mono font-semibold text-slate-800">
              {mv.from_location || '—'}
              {mv.from_bin && <span className="text-slate-400"> / {mv.from_bin}</span>}
            </p>
          </div>
          <ArrowRight className="w-6 h-6 text-blue-500" />
          <div className="text-center">
            <p className="text-xs text-slate-500 uppercase tracking-wide">To</p>
            <p className="font-mono font-semibold text-blue-700">
              {mv.to_location || '—'}
              {mv.to_bin && <span className="text-slate-400"> / {mv.to_bin}</span>}
            </p>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-5 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs text-slate-500">Status</p>
          <div className="mt-1">
            <StatusBadge status={mv.status} />
          </div>
        </div>
        <div>
          <p className="text-xs text-slate-500">Reason</p>
          <p className="font-medium text-slate-800 inline-flex items-center gap-1">
            <ReasonIcon className="w-3.5 h-3.5 text-slate-500" />
            {mv.reason_display}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Branch</p>
          <p className="font-medium text-slate-800">{mv.branch_name}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Item</p>
          <p className="font-medium text-slate-800">
            {mv.item_detail?.part_number}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Quantity</p>
          <p className="font-medium text-slate-800">
            {mv.quantity} {mv.item_detail?.uom}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Requested By</p>
          <p className="font-medium text-slate-800">{mv.requested_by_name || '—'}</p>
        </div>
        {mv.notes && (
          <div className="col-span-2">
            <p className="text-xs text-slate-500">Notes</p>
            <p className="font-medium text-slate-800">{mv.notes}</p>
          </div>
        )}
        {mv.moved_by_name && (
          <div className="col-span-2 pt-3 border-t border-slate-200">
            <p className="text-xs text-slate-500">Moved By</p>
            <p className="text-sm text-slate-700">
              {mv.moved_by_name}
              {mv.moved_at && <span className="text-slate-400"> · {new Date(mv.moved_at).toLocaleDateString()}</span>}
            </p>
          </div>
        )}
        {mv.verified_by_name && (
          <div className="col-span-2 pt-3 border-t border-slate-200">
            <p className="text-xs text-slate-500">Verified By</p>
            <p className="text-sm text-slate-700">
              {mv.verified_by_name}
              {mv.verified_at && <span className="text-slate-400"> · {new Date(mv.verified_at).toLocaleDateString()}</span>}
            </p>
            {mv.verification_notes && (
              <p className="text-xs text-slate-500 mt-1">{mv.verification_notes}</p>
            )}
          </div>
        )}
      </div>

      {/* Workflow actions */}
      <div className="flex flex-wrap gap-2 mb-4">
        {canPlan && (
          <button
            onClick={() => actionMutation.mutate({ id: mv.id, action: 'plan' })}
            className="btn-primary"
          >
            <MapPin className="w-4 h-4" /> Plan Layout
          </button>
        )}
        {canMove && (
          <button
            onClick={() => actionMutation.mutate({ id: mv.id, action: 'mark_moved' })}
            className="btn-primary"
          >
            <ArrowRight className="w-4 h-4" /> Mark as Moved
          </button>
        )}
        {canVerify && (
          <button
            onClick={() => actionMutation.mutate({ id: mv.id, action: 'verify', payload: { notes: verifyNotes } })}
            className="btn-primary"
          >
            <CheckCircle2 className="w-4 h-4" /> Verify
          </button>
        )}
      </div>

      {canVerify && (
        <FormField label="Verification Notes">
          <textarea
            rows={2}
            value={verifyNotes}
            onChange={(e) => setVerifyNotes(e.target.value)}
            className="input"
            placeholder="Confirm the item is correctly placed"
          />
        </FormField>
      )}

      <div className="flex justify-end">
        <button onClick={onClose} className="btn-secondary">
          Close
        </button>
      </div>
    </Modal>
  );
}