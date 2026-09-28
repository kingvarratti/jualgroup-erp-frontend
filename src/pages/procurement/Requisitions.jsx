import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import {
  Plus, Inbox, FileText, Package, ClipboardList, Check, X,
  Truck, PackageCheck, ArrowRight, Download, Clock,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { procurementApi } from '../../api/procurement';
import { salesApi } from '../../api/sales';
import { coreApi } from '../../api/core';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import FormField from '../../components/FormField';
import StatusBadge from '../../components/StatusBadge';
import StatCard from '../../components/StatCard';
import ExportMenu from '../../components/ExportMenu';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../utils/constants';

const TABS = [
  { key: '', label: 'All', icon: Inbox },
  { key: 'INTERNAL', label: 'Internal', icon: FileText },
  { key: 'EXTERNAL', label: 'External', icon: Package },
];

const INTERNAL_DEPTS = [
  { value: 'AUTOMATION', label: 'Automation' },
  { value: 'SERVICE', label: 'Service' },
  { value: 'PRODUCTION', label: 'Production' },
  { value: 'PROJECT', label: 'Project' },
  { value: 'PROCUREMENT', label: 'Procurement' },
  { value: 'OTHER', label: 'Other' },
];

export default function Requisitions() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState('');
  const [modal, setModal] = useState(false);
  const [detailReq, setDetailReq] = useState(null);

  const isStores = [ROLES.STORES, ROLES.SUPPLY_CHAIN, ROLES.ADMIN].includes(user?.role);

  const { data: stats } = useQuery({
    queryKey: ['req-stats'],
    queryFn: () => procurementApi.requisitions.stats(),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['requisitions', tab],
    queryFn: () =>
      procurementApi.requisitions.list({
        requisition_type: tab,
        page_size: 500,
      }),
    keepPreviousData: true,
  });

  const columns = [
    {
      key: 'req_no',
      label: 'Req No.',
      render: (r) => <span className="font-medium text-blue-700">{r.req_no}</span>,
    },
    {
      key: 'type_display',
      label: 'Type',
      render: (r) => (
        <span
          className={`text-xs px-2 py-0.5 rounded font-medium ${
            r.requisition_type === 'INTERNAL'
              ? 'bg-purple-100 text-purple-700'
              : 'bg-blue-100 text-blue-700'
          }`}
        >
          {r.type_display}
        </span>
      ),
    },
    {
      key: 'source',
      label: 'Source',
      render: (r) =>
        r.requisition_type === 'INTERNAL'
          ? r.department_display || '—'
          : r.client_po_no || '—',
    },
    {
      key: 'branch',
      label: 'Branch',
      render: (r) => r.requesting_branch_name || '—',
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
          label="In Progress"
          value={(stats?.picking || 0) + (stats?.packed || 0)}
          icon={Package}
          color="purple"
        />
        <StatCard
          label="Dispatched"
          value={stats?.dispatched ?? '—'}
          icon={Truck}
          color="brand"
        />
      </div>

      <div className="card">
        <div className="p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1">
              {TABS.map((t) => {
                const active = tab === t.key;
                const Icon = t.icon;
                const count =
                  t.key === ''
                    ? (stats?.internal || 0) + (stats?.external || 0)
                    : t.key === 'INTERNAL'
                    ? stats?.internal
                    : t.key === 'EXTERNAL'
                    ? stats?.external
                    : null;
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
                filename={`requisitions-${new Date().toISOString().slice(0, 10)}`}
                title="Requisitions"
              />
              <button className="btn-primary" onClick={() => setModal(true)}>
                <Plus className="w-4 h-4" /> New Requisition
              </button>
            </div>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={data?.results}
          loading={isLoading}
          emptyTitle="No requisitions"
          emptyMessage="Create a requisition to request items from the store."
          emptyIcon={ClipboardList}
          onRowClick={(r) => setDetailReq(r)}
        />
      </div>

      <CreateRequisitionModal
        open={modal}
        onClose={() => setModal(false)}
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: ['requisitions'] });
          qc.invalidateQueries({ queryKey: ['req-stats'] });
          setModal(false);
        }}
      />

      <RequisitionDetailModal
        requisition={detailReq}
        onClose={() => setDetailReq(null)}
        isStores={isStores}
        onUpdate={() => {
          qc.invalidateQueries({ queryKey: ['requisitions'] });
          qc.invalidateQueries({ queryKey: ['req-stats'] });
        }}
      />
    </div>
  );
}


function CreateRequisitionModal({ open, onClose, onSuccess }) {
  const { register, handleSubmit, reset } = useForm();
  const [reqType, setReqType] = useState('INTERNAL');
  const [lineItems, setLineItems] = useState([
    { item: '', description: '', uom: 'pcs', quantity_requested: 1 },
  ]);

  const { data: clientPOs } = useQuery({
    queryKey: ['clientpos-for-req'],
    queryFn: () => salesApi.clientPOs.list({ page_size: 500 }),
  });
  const { data: inventory } = useQuery({
    queryKey: ['inventory-for-req'],
    queryFn: () => procurementApi.inventory.list({ page_size: 500 }),
  });
  const { data: branches } = useQuery({
    queryKey: ['branches-for-req'],
    queryFn: () => coreApi.branches.list(),
  });

  const createMutation = useMutation({
    mutationFn: (payload) => procurementApi.requisitions.create(payload),
    onSuccess: () => {
      toast.success('Requisition created');
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
    const valid = lineItems.filter((li) => li.description?.trim());
    if (valid.length === 0) {
      toast.error('Add at least one line item');
      return;
    }
    const payload = {
      requisition_type: reqType,
      source_department: reqType === 'INTERNAL' ? values.source_department : '',
      client_po: reqType === 'EXTERNAL' ? values.client_po : null,
      requesting_branch: values.requesting_branch || null,
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
    <Modal open={open} onClose={onClose} title="New Requisition" size="xl">
      <form onSubmit={handleSubmit(onSubmit)}>
        <FormField label="Requisition Type" required>
          <div className="flex gap-2 mb-3">
            <button
              type="button"
              onClick={() => setReqType('INTERNAL')}
              className={`flex-1 p-3 rounded-lg border-2 text-sm font-medium transition ${
                reqType === 'INTERNAL'
                  ? 'border-purple-500 bg-purple-50 text-purple-800'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              <FileText className="w-4 h-4 mx-auto mb-1" />
              Internal (Department)
            </button>
            <button
              type="button"
              onClick={() => setReqType('EXTERNAL')}
              className={`flex-1 p-3 rounded-lg border-2 text-sm font-medium transition ${
                reqType === 'EXTERNAL'
                  ? 'border-blue-500 bg-blue-50 text-blue-800'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              <Package className="w-4 h-4 mx-auto mb-1" />
              External (Client Order)
            </button>
          </div>
        </FormField>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reqType === 'INTERNAL' ? (
            <FormField label="Source Department" required>
              <select {...register('source_department')} className="input">
                <option value="">— Select —</option>
                {INTERNAL_DEPTS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </FormField>
          ) : (
            <FormField label="Client PO" required>
              <select {...register('client_po')} className="input">
                <option value="">— Select Client PO —</option>
                {clientPOs?.results?.map((po) => (
                  <option key={po.id} value={po.id}>
                    {po.internal_order_no} — {po.client_po_number}
                  </option>
                ))}
              </select>
            </FormField>
          )}
          <FormField label="Requesting Branch" helper="Branch issuing the items">
            <select {...register('requesting_branch')} className="input">
              <option value="">— None —</option>
              {branches?.results?.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <FormField label="Purpose">
          <input
            {...register('purpose')}
            className="input"
            placeholder="Why these items are needed"
          />
        </FormField>

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
            {createMutation.isPending ? 'Creating...' : 'Create Requisition'}
          </button>
        </div>
      </form>
    </Modal>
  );
}


function RequisitionDetailModal({ requisition, onClose, isStores, onUpdate }) {
  const [rejectModal, setRejectModal] = useState(false);
  const qc = useQueryClient();

  const actionMutation = useMutation({
    mutationFn: ({ id, action, payload }) =>
      procurementApi.requisitions.custom(id, action, payload || {}),
    onSuccess: (_, vars) => {
      toast.success(vars.action.replace(/_/g, ' '));
      qc.invalidateQueries({ queryKey: ['requisition', requisition?.id] });
      onUpdate();
    },
    onError: (err) => {
      const msg = err.response?.data?.error || 'Action failed';
      toast.error(msg);
    },
  });

  const { data: fresh } = useQuery({
    queryKey: ['requisition', requisition?.id],
    queryFn: () => procurementApi.requisitions.get(requisition.id),
    enabled: !!requisition?.id,
  });

  if (!requisition) return null;
  const req = fresh || requisition;

  const canApprove = isStores && req.status === 'REQUESTED';
  const canReject = isStores && req.status === 'REQUESTED';
  const canStartPicking = isStores && req.status === 'APPROVED';
  const canPack = isStores && ['PICKING', 'APPROVED'].includes(req.status);
  const canDispatch = isStores && req.status === 'PACKED';
  const canReceive = req.status === 'DISPATCHED';

  return (
    <Modal
      open={!!requisition}
      onClose={onClose}
      title={`${req.req_no} — ${req.type_display}`}
      size="lg"
    >
      {/* Info block */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-5 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs text-slate-500">Status</p>
          <div className="mt-1">
            <StatusBadge status={req.status} />
          </div>
        </div>
        <div>
          <p className="text-xs text-slate-500">
            {req.requisition_type === 'INTERNAL' ? 'Department' : 'Client PO'}
          </p>
          <p className="font-medium text-slate-800">
            {req.requisition_type === 'INTERNAL'
              ? req.department_display || '—'
              : req.client_po_no || '—'}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Requested By</p>
          <p className="font-medium text-slate-800">
            {req.requested_by_name || '—'}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Requesting Branch</p>
          <p className="font-medium text-slate-800">
            {req.requesting_branch_name || '—'}
          </p>
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

      {/* Items table */}
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
                Issued
              </th>
              <th className="text-center px-3 py-2 text-xs font-semibold text-slate-600 uppercase">
                State
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
                <td className="px-3 py-2 text-right font-medium">
                  {it.quantity_issued}
                </td>
                <td className="px-3 py-2 text-center">
                  {it.packed ? (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                      Packed
                    </span>
                  ) : it.picked ? (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                      Picked
                    </span>
                  ) : (
                    <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded">
                      Pending
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Workflow action buttons */}
      <div className="flex flex-wrap gap-2 mb-4">
        {canApprove && (
          <button
            onClick={() => actionMutation.mutate({ id: req.id, action: 'approve' })}
            className="btn-primary"
            disabled={actionMutation.isPending}
          >
            <Check className="w-4 h-4" /> Approve
          </button>
        )}
        {canReject && (
          <button
            onClick={() => setRejectModal(true)}
            className="btn-danger"
            disabled={actionMutation.isPending}
          >
            <X className="w-4 h-4" /> Reject
          </button>
        )}
        {canStartPicking && (
          <button
            onClick={() =>
              actionMutation.mutate({ id: req.id, action: 'start_picking' })
            }
            className="btn-primary"
            disabled={actionMutation.isPending}
          >
            <ArrowRight className="w-4 h-4" /> Start Picking
          </button>
        )}
        {canPack && (
          <button
            onClick={() =>
              actionMutation.mutate({ id: req.id, action: 'mark_packed' })
            }
            className="btn-primary"
            disabled={actionMutation.isPending}
          >
            <Package className="w-4 h-4" /> Mark Packed
          </button>
        )}
        {canDispatch && (
          <button
            onClick={() =>
              actionMutation.mutate({ id: req.id, action: 'dispatch' })
            }
            className="btn-primary"
            disabled={actionMutation.isPending}
          >
            <Truck className="w-4 h-4" /> Dispatch
          </button>
        )}
        {canReceive && (
          <button
            onClick={() =>
              actionMutation.mutate({ id: req.id, action: 'receive' })
            }
            className="btn-primary"
            disabled={actionMutation.isPending}
          >
            <PackageCheck className="w-4 h-4" /> Mark Received
          </button>
        )}
        <button
          onClick={() =>
            procurementApi.requisitions.pdf(req.id, `${req.req_no}.pdf`)
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
    <Modal open={open} onClose={onClose} title="Reject Requisition" size="sm">
      <FormField label="Reason for Rejection" required>
        <textarea
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="input"
          placeholder="Why this requisition is rejected"
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