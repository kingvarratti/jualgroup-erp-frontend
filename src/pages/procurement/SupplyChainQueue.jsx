import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Inbox, Package, PackageX, AlertTriangle, Send, ShoppingCart,
  CheckCircle2, Clock, Search, User as UserIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { procurementApi } from '../../api/procurement';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import FormField from '../../components/FormField';
import StatusBadge from '../../components/StatusBadge';
import StatCard from '../../components/StatCard';

const STATUS_TABS = [
  { key: '', label: 'All', icon: Inbox },
  { key: 'PENDING_CHECK', label: 'Pending Check', icon: Clock },
  { key: 'NEEDS_SOURCING', label: 'Needs Sourcing', icon: AlertTriangle },
  { key: 'SOURCING', label: 'Sourcing', icon: ShoppingCart },
  { key: 'IN_STOCK', label: 'In Stock', icon: CheckCircle2 },
  { key: 'SENT_TO_SALES', label: 'Sent to Sales', icon: Send },
];

export default function SupplyChainQueue() {
  const qc = useQueryClient();
  const [filters, setFilters] = useState({ status: '', search: '' });
  const [storeCheckItem, setStoreCheckItem] = useState(null);
  const [decisionItem, setDecisionItem] = useState(null);
  const [sendToSalesItem, setSendToSalesItem] = useState(null);

  const { data: stats } = useQuery({
    queryKey: ['sc-stats'],
    queryFn: () => procurementApi.sourcing.stats(),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['sc-queue', filters],
    queryFn: () =>
      procurementApi.sourcing.list({
        status: filters.status,
        page_size: 500,
      }),
    keepPreviousData: true,
  });

  const assignToMe = useMutation({
    mutationFn: (id) => procurementApi.sourcing.custom(id, 'assign_to_me'),
    onSuccess: () => {
      toast.success('Assigned to you');
      qc.invalidateQueries({ queryKey: ['sc-queue'] });
    },
  });

  let items = data?.results || [];
  if (filters.search) {
    const s = filters.search.toLowerCase();
    items = items.filter(
      (i) =>
        (i.enquiry_ref || '').toLowerCase().includes(s) ||
        (i.client_name || '').toLowerCase().includes(s) ||
        (i.enquiry_description || '').toLowerCase().includes(s)
    );
  }

  const columns = [
    {
      key: 'enquiry_ref',
      label: 'Enquiry Ref',
      render: (r) => (
        <span className="font-medium text-blue-700">{r.enquiry_ref}</span>
      ),
    },
    { key: 'client_name', label: 'Client' },
    {
      key: 'enquiry_description',
      label: 'Description',
      render: (r) => (
        <span className="text-sm text-slate-700 line-clamp-1 max-w-sm">
          {r.enquiry_description}
        </span>
      ),
    },
    {
      key: 'enquiry_estimated_value',
      label: 'Est. Value',
      className: 'text-right',
      render: (r) => {
        const v = Number(r.enquiry_estimated_value || 0);
        return `GHS ${v.toLocaleString('en-GH', { minimumFractionDigits: 2 })}`;
      },
    },
    {
      key: 'status_display',
      label: 'Status',
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: 'sourcing_type_display',
      label: 'Sourcing',
      render: (r) =>
        r.sourcing_type_display ? (
          <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700">
            {r.sourcing_type_display}
          </span>
        ) : (
          <span className="text-xs text-slate-400">—</span>
        ),
    },
    {
      key: 'handled_by_name',
      label: 'Owner',
      render: (r) =>
        r.handled_by_name ? (
          <span className="text-sm text-slate-600">{r.handled_by_name}</span>
        ) : (
          <span className="text-xs text-slate-400">Unassigned</span>
        ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active Enquiries"
          value={stats?.total_active ?? '—'}
          icon={Inbox}
          color="brand"
        />
        <StatCard
          label="Pending Check"
          value={stats?.pending_check ?? '—'}
          icon={Clock}
          color="amber"
        />
        <StatCard
          label="Needs Sourcing"
          value={stats?.needs_sourcing ?? '—'}
          icon={AlertTriangle}
          color="red"
        />
        <StatCard
          label="In Sourcing"
          value={stats?.sourcing ?? '—'}
          icon={ShoppingCart}
          color="purple"
        />
      </div>

      <div className="card">
        <div className="p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                placeholder="Search by enquiry ref, client, or description..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="input pl-9"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1 border-b border-slate-200">
            {STATUS_TABS.map((tab) => {
              const active = filters.status === tab.key;
              const Icon = tab.icon;
              const count =
                tab.key === '' ? stats?.total_active :
                tab.key === 'PENDING_CHECK' ? stats?.pending_check :
                tab.key === 'NEEDS_SOURCING' ? stats?.needs_sourcing :
                tab.key === 'SOURCING' ? stats?.sourcing :
                tab.key === 'IN_STOCK' ? stats?.in_stock :
                tab.key === 'SENT_TO_SALES' ? stats?.sent_to_sales : null;
              return (
                <button
                  key={tab.key}
                  onClick={() => setFilters({ ...filters, status: tab.key })}
                  className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                    active
                      ? 'border-blue-600 text-blue-700'
                      : 'border-transparent text-slate-600 hover:text-slate-800 hover:border-slate-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  {count > 0 && (
                    <span className="ml-1 text-xs px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
            <div className="flex-1" />
            <span className="text-xs text-slate-500 pb-2">
              {items.length} item{items.length === 1 ? '' : 's'}
            </span>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={items}
          loading={isLoading}
          emptyTitle="No enquiries in queue"
          emptyMessage="All enquiries have been processed or none need Supply Chain action."
          emptyIcon={Inbox}
          actions={(r) => (
            <div className="flex justify-end gap-1">
              {!r.handled_by && (
                <button
                  onClick={() => assignToMe.mutate(r.id)}
                  className="btn-ghost !p-2 text-blue-600"
                  title="Assign to me"
                >
                  <UserIcon className="w-4 h-4" />
                </button>
              )}

              {!r.store_checked && (
                <button
                  onClick={() => setStoreCheckItem(r)}
                  className="btn-secondary text-xs !py-1 !px-2"
                  title="Record Store Check"
                >
                  Check Store
                </button>
              )}

              {r.store_checked && !r.sourcing_type && r.store_available === false && (
                <button
                  onClick={() => setDecisionItem(r)}
                  className="btn-secondary text-xs !py-1 !px-2"
                  title="Sourcing Decision"
                >
                  Decide Sourcing
                </button>
              )}

              {r.status === 'SOURCING' && !r.quotation_sent_to_sales && (
                <button
                  onClick={() => setSendToSalesItem(r)}
                  className="btn-primary text-xs !py-1 !px-2"
                  title="Send quote to Sales"
                >
                  Send to Sales
                </button>
              )}

              {r.status === 'IN_STOCK' && (
                <span className="text-xs text-green-600 font-medium px-2 py-1">
                  ✓ In Stock
                </span>
              )}

              {r.quotation_sent_to_sales && (
                <span className="text-xs text-slate-500 font-medium px-2 py-1">
                  ✓ Sent to Sales
                </span>
              )}
            </div>
          )}
        />
      </div>

      <StoreCheckModal
        sourcing={storeCheckItem}
        onClose={() => setStoreCheckItem(null)}
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: ['sc-queue'] });
          qc.invalidateQueries({ queryKey: ['sc-stats'] });
          setStoreCheckItem(null);
        }}
      />

      <SourcingDecisionModal
        sourcing={decisionItem}
        onClose={() => setDecisionItem(null)}
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: ['sc-queue'] });
          qc.invalidateQueries({ queryKey: ['sc-stats'] });
          setDecisionItem(null);
        }}
      />

      <SendToSalesModal
        sourcing={sendToSalesItem}
        onClose={() => setSendToSalesItem(null)}
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: ['sc-queue'] });
          qc.invalidateQueries({ queryKey: ['sc-stats'] });
          setSendToSalesItem(null);
        }}
      />
    </div>
  );
}


function StoreCheckModal({ sourcing, onClose, onSuccess }) {
  const [available, setAvailable] = useState(true);
  const [qty, setQty] = useState(0);
  const [notes, setNotes] = useState('');

  const mutation = useMutation({
    mutationFn: (payload) =>
      procurementApi.sourcing.custom(sourcing.id, 'store_check', payload),
    onSuccess: () => {
      toast.success('Store check recorded');
      onSuccess();
    },
    onError: () => toast.error('Failed to record store check'),
  });

  if (!sourcing) return null;

  return (
    <Modal
      open={!!sourcing}
      onClose={onClose}
      title={`Store Check — ${sourcing.enquiry_ref}`}
      size="md"
    >
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-5">
        <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">
          {sourcing.client_name}
        </p>
        <p className="text-sm text-slate-700 mt-1">{sourcing.enquiry_description}</p>
      </div>

      <FormField label="Item available in store?" required>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setAvailable(true)}
            className={`flex-1 py-3 rounded-lg border-2 transition ${
              available
                ? 'border-green-500 bg-green-50 text-green-800'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
            }`}
          >
            <Package className="w-5 h-5 mx-auto mb-1" />
            <span className="text-sm font-medium">Available</span>
          </button>
          <button
            type="button"
            onClick={() => setAvailable(false)}
            className={`flex-1 py-3 rounded-lg border-2 transition ${
              !available
                ? 'border-amber-500 bg-amber-50 text-amber-800'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
            }`}
          >
            <PackageX className="w-5 h-5 mx-auto mb-1" />
            <span className="text-sm font-medium">Not Available</span>
          </button>
        </div>
      </FormField>

      {available && (
        <FormField label="Available Quantity">
          <input
            type="number"
            step="0.01"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            className="input"
          />
        </FormField>
      )}

      <FormField label="Notes">
        <textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="input"
          placeholder="Details of the store check..."
        />
      </FormField>

      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="btn-secondary" disabled={mutation.isPending}>
          Cancel
        </button>
        <button
          onClick={() =>
            mutation.mutate({
              store_available: available,
              available_qty: qty,
              store_notes: notes,
            })
          }
          disabled={mutation.isPending}
          className="btn-primary"
        >
          {mutation.isPending ? 'Saving...' : 'Record Result'}
        </button>
      </div>
    </Modal>
  );
}


function SourcingDecisionModal({ sourcing, onClose, onSuccess }) {
  const [choice, setChoice] = useState('');
  const [notes, setNotes] = useState('');

  const mutation = useMutation({
    mutationFn: (payload) =>
      procurementApi.sourcing.custom(sourcing.id, 'sourcing_decision', payload),
    onSuccess: () => {
      toast.success('Sourcing decision recorded');
      onSuccess();
    },
    onError: () => toast.error('Failed to record decision'),
  });

  if (!sourcing) return null;

  const OPTIONS = [
    {
      value: 'LOCAL',
      label: 'Local Supplier',
      desc: 'Source from a local Ghanaian supplier',
    },
    {
      value: 'INTERNATIONAL',
      label: 'International',
      desc: 'Import from an overseas supplier',
    },
    {
      value: 'KSB',
      label: 'KSB Direct',
      desc: 'Order directly from KSB (manufacturer)',
    },
  ];

  return (
    <Modal
      open={!!sourcing}
      onClose={onClose}
      title={`Sourcing Decision — ${sourcing.enquiry_ref}`}
      size="md"
    >
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-5 text-sm">
        <p className="font-semibold text-amber-800">Item not in store</p>
        <p className="text-amber-700 mt-1">
          Choose how this item will be sourced.
        </p>
      </div>

      <div className="space-y-2 mb-5">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setChoice(opt.value)}
            className={`w-full text-left p-3 rounded-lg border-2 transition ${
              choice === opt.value
                ? 'border-blue-500 bg-blue-50'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <p className="font-medium text-slate-800">{opt.label}</p>
            <p className="text-xs text-slate-500 mt-0.5">{opt.desc}</p>
          </button>
        ))}
      </div>

      <FormField label="Notes">
        <textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="input"
          placeholder="Why this decision? Supplier name if known, etc."
        />
      </FormField>

      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="btn-secondary" disabled={mutation.isPending}>
          Cancel
        </button>
        <button
          onClick={() =>
            mutation.mutate({ sourcing_type: choice, sourcing_notes: notes })
          }
          disabled={!choice || mutation.isPending}
          className="btn-primary"
        >
          {mutation.isPending ? 'Saving...' : 'Confirm Decision'}
        </button>
      </div>
    </Modal>
  );
}


function SendToSalesModal({ sourcing, onClose, onSuccess }) {
  const [notes, setNotes] = useState('');

  const mutation = useMutation({
    mutationFn: (payload) =>
      procurementApi.sourcing.custom(sourcing.id, 'send_to_sales', payload),
    onSuccess: () => {
      toast.success('Quote sent to Sales');
      onSuccess();
    },
    onError: () => toast.error('Failed to send to Sales'),
  });

  if (!sourcing) return null;

  return (
    <Modal
      open={!!sourcing}
      onClose={onClose}
      title={`Send Quote to Sales — ${sourcing.enquiry_ref}`}
      size="sm"
    >
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-5 text-sm">
        <p className="font-semibold text-blue-800">Confirm handoff</p>
        <p className="text-blue-700 mt-1">
          This marks the enquiry as "Sent to Sales" so the sales team can
          prepare the final client quotation.
        </p>
      </div>

      <FormField label="Handoff Notes">
        <textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="input"
          placeholder="Cost details, lead time, anything Sales needs to know..."
        />
      </FormField>

      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="btn-secondary" disabled={mutation.isPending}>
          Cancel
        </button>
        <button
          onClick={() => mutation.mutate({ notes })}
          disabled={mutation.isPending}
          className="btn-primary"
        >
          {mutation.isPending ? 'Sending...' : 'Mark as Sent'}
        </button>
      </div>
    </Modal>
  );
}