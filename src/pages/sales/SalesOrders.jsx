import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import {
  Plus, Check, Package, Factory, Wrench, ClipboardCheck,
  Inbox, Clock, Award, Truck, Calendar,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { salesApi } from '../../api/sales';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import FormField from '../../components/FormField';
import StatusBadge from '../../components/StatusBadge';
import StatCard from '../../components/StatCard';
import ExportMenu from '../../components/ExportMenu';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../utils/constants';

const STATUS_TABS = [
  { key: '', label: 'All', icon: Inbox },
  { key: 'CREATED', label: 'Created', icon: Clock },
  { key: 'IN_FULFILMENT', label: 'In Fulfilment', icon: Package },
  { key: 'QC_PASSED', label: 'QC Passed', icon: Award },
  { key: 'COMPLETED', label: 'Completed', icon: Check },
];

const PATHS = [
  { value: 'WAREHOUSE', label: 'Warehouse / Dispatch Only' },
  { value: 'FABRICATION', label: 'Panel Fabrication / Production' },
  { value: 'INSTALLATION', label: 'Project / Installation' },
  { value: 'MIXED', label: 'Multiple Paths' },
];

export default function SalesOrders() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState('');
  const [modal, setModal] = useState(false);
  const [detailItem, setDetailItem] = useState(null);

  const isSales = [
    ROLES.SALES_ENG,
    ROLES.PROJ_ENG_SALES,
    ROLES.PROD_MANAGER,
    ROLES.ADMIN,
  ].includes(user?.role);

  const { data: stats } = useQuery({
    queryKey: ['so-stats'],
    queryFn: () => salesApi.salesOrders.stats(),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['sales-orders', tab],
    queryFn: () =>
      salesApi.salesOrders.list({ status: tab, page_size: 100 }),
    keepPreviousData: true,
  });

  const columns = [
    {
      key: 'order_no',
      label: 'Order No.',
      render: (r) => (
        <span className="font-medium text-blue-700">{r.order_no}</span>
      ),
    },
    {
      key: 'client_po_no',
      label: 'Client PO',
      render: (r) => (
        <div className="flex flex-col">
          <span className="text-sm font-medium text-slate-700">
            {r.client_po_no}
          </span>
          <span className="text-xs text-slate-500">{r.client_name}</span>
        </div>
      ),
    },
    {
      key: 'path_display',
      label: 'Path',
      render: (r) => (
        <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
          {r.path_display}
        </span>
      ),
    },
    {
      key: 'total_value',
      label: 'Value',
      className: 'text-right',
      render: (r) => formatCurrency(r.total_value),
    },
    {
      key: 'progress',
      label: 'Progress',
      render: (r) => {
        const pct = r.progress_percent || 0;
        return (
          <div className="flex items-center gap-2">
            <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className={`h-full ${
                  pct === 100
                    ? 'bg-green-600'
                    : pct >= 50
                    ? 'bg-blue-600'
                    : 'bg-amber-500'
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs text-slate-500 font-medium">{pct}%</span>
          </div>
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
          label="Created"
          value={stats?.created ?? '—'}
          icon={Clock}
          color="amber"
        />
        <StatCard
          label="In Fulfilment"
          value={stats?.in_fulfilment ?? '—'}
          icon={Package}
          color="brand"
        />
        <StatCard
          label="QC Passed"
          value={stats?.qc_passed ?? '—'}
          icon={Award}
          color="purple"
        />
        <StatCard
          label="Completed"
          value={stats?.completed ?? '—'}
          icon={Check}
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
                  t.key === '' ? stats?.total :
                  t.key === 'CREATED' ? stats?.created :
                  t.key === 'IN_FULFILMENT' ? stats?.in_fulfilment :
                  t.key === 'QC_PASSED' ? stats?.qc_passed :
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
                filename={`sales-orders-${new Date().toISOString().slice(0, 10)}`}
                title="Sales Orders"
              />
              {isSales && (
                <button className="btn-primary" onClick={() => setModal(true)}>
                  <Plus className="w-4 h-4" /> New Sales Order
                </button>
              )}
            </div>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={data?.results}
          loading={isLoading}
          emptyTitle="No sales orders"
          emptyMessage="Sales orders are created from won Client POs."
          emptyIcon={Package}
          onRowClick={(r) => setDetailItem(r)}
        />
      </div>

      <CreateSalesOrderModal
        open={modal}
        onClose={() => setModal(false)}
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: ['sales-orders'] });
          qc.invalidateQueries({ queryKey: ['so-stats'] });
          setModal(false);
        }}
      />

      <SalesOrderDetailModal
        order={detailItem}
        onClose={() => setDetailItem(null)}
        isSales={isSales}
        onUpdate={() => {
          qc.invalidateQueries({ queryKey: ['sales-orders'] });
          qc.invalidateQueries({ queryKey: ['so-stats'] });
        }}
      />
    </div>
  );
}


function CreateSalesOrderModal({ open, onClose, onSuccess }) {
  const { register, handleSubmit, reset } = useForm();
  const [path, setPath] = useState('WAREHOUSE');

  const { data: clientPOs } = useQuery({
    queryKey: ['clientpos-for-so'],
    queryFn: () => salesApi.clientPOs.list({ page_size: 500 }),
    enabled: open,
  });

  const createMutation = useMutation({
    mutationFn: (payload) => salesApi.salesOrders.create(payload),
    onSuccess: () => {
      toast.success('Sales order created');
      reset();
      setPath('WAREHOUSE');
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
    if (!values.client_po) {
      toast.error('Select a Client PO');
      return;
    }
    createMutation.mutate({
      client_po: values.client_po,
      fulfilment_path: path,
      notes: values.notes || '',
    });
  };

  return (
    <Modal open={open} onClose={onClose} title="New Sales Order" size="md">
      <form onSubmit={handleSubmit(onSubmit)}>
        <FormField label="Client PO" required>
          <select {...register('client_po', { required: true })} className="input">
            <option value="">— Select Client PO —</option>
            {clientPOs?.results?.map((po) => (
              <option key={po.id} value={po.id}>
                {po.internal_order_no} — {po.client_po_number} (
                {formatCurrency(po.total_value)})
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Fulfilment Path" required>
          <div className="space-y-2">
            {PATHS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setPath(p.value)}
                className={`w-full p-3 rounded-lg border-2 text-left text-sm transition ${
                  path === p.value
                    ? 'border-blue-500 bg-blue-50 font-medium'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </FormField>

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
            {createMutation.isPending ? 'Creating...' : 'Create Sales Order'}
          </button>
        </div>
      </form>
    </Modal>
  );
}


function SalesOrderDetailModal({ order, onClose, isSales, onUpdate }) {
  const qc = useQueryClient();
  const [installModal, setInstallModal] = useState(false);

  const actionMutation = useMutation({
    mutationFn: ({ id, action, payload }) =>
      salesApi.salesOrders.custom(id, action, payload || {}),
    onSuccess: (_, vars) => {
      toast.success(vars.action.replace(/_/g, ' '));
      qc.invalidateQueries({ queryKey: ['sales-order', order?.id] });
      onUpdate();
    },
    onError: (err) => {
      const msg = err.response?.data?.error || 'Action failed';
      toast.error(msg);
    },
  });

  const { data: fresh } = useQuery({
    queryKey: ['sales-order', order?.id],
    queryFn: () => salesApi.salesOrders.get(order.id),
    enabled: !!order?.id,
  });

  if (!order) return null;
  const so = fresh || order;
  const pct = so.progress_percent || 0;

  const showWarehouse = ['WAREHOUSE', 'MIXED'].includes(so.fulfilment_path);
  const showFabrication = ['FABRICATION', 'MIXED'].includes(so.fulfilment_path);
  const showInstallation = ['INSTALLATION', 'MIXED'].includes(so.fulfilment_path);

  return (
    <Modal
      open={!!order}
      onClose={onClose}
      title={`Sales Order ${so.order_no}`}
      size="lg"
    >
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mb-5">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">
              Client Order
            </p>
            <p className="font-semibold text-slate-800">
              {so.client_po_no} — {so.client_name}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">Total Value</p>
            <p className="text-lg font-bold text-blue-700">
              {formatCurrency(so.total_value)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-3 bg-white rounded-full overflow-hidden border border-blue-200">
            <div
              className={`h-full transition-all ${
                pct === 100
                  ? 'bg-green-500'
                  : pct >= 50
                  ? 'bg-blue-500'
                  : 'bg-amber-500'
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-sm font-bold text-slate-700">{pct}%</span>
        </div>

        <div className="mt-3 flex items-center gap-3 text-xs text-slate-600">
          <StatusBadge status={so.status} />
          <span>Path: <strong>{so.path_display}</strong></span>
        </div>
      </div>

      <div className="space-y-3 mb-5">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          Fulfilment Paths
        </p>

        {showWarehouse && (
          <PathCard
            icon={Truck}
            title="Warehouse / Dispatch"
            color="blue"
            completed={so.warehouse_dispatched}
            completedAt={so.warehouse_dispatched_at}
            isSales={isSales}
            onComplete={() =>
              actionMutation.mutate({ id: so.id, action: 'mark_dispatched' })
            }
          />
        )}

        {showFabrication && (
          <PathCard
            icon={Factory}
            title="Panel Fabrication / Production"
            color="purple"
            completed={so.panel_fabricated}
            completedAt={so.panel_fabricated_at}
            isSales={isSales}
            onComplete={() =>
              actionMutation.mutate({ id: so.id, action: 'mark_fabricated' })
            }
          />
        )}

        {showInstallation && (
          <PathCard
            icon={Wrench}
            title="Project / Installation"
            color="amber"
            completed={so.installation_completed}
            completedAt={so.installation_completed_at}
            isSales={isSales}
            onComplete={() =>
              actionMutation.mutate({ id: so.id, action: 'mark_installed' })
            }
          />
        )}
      </div>

      {showInstallation && (
        <div className="border border-slate-200 rounded-lg p-4 mb-5">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-600" />
              Installation Sites ({so.installations?.length || 0})
            </h4>
            {isSales && (
              <button
                onClick={() => setInstallModal(true)}
                className="btn-secondary text-xs"
              >
                <Plus className="w-3 h-3" /> Add Site
              </button>
            )}
          </div>

          {so.installations?.length ? (
            <div className="space-y-2">
              {so.installations.map((inst) => (
                <div
                  key={inst.id}
                  className="flex items-center justify-between border border-slate-100 rounded p-2 text-sm"
                >
                  <div>
                    <p className="font-medium text-slate-800">{inst.site_name}</p>
                    <p className="text-xs text-slate-500">{inst.site_address}</p>
                  </div>
                  <StatusBadge status={inst.status} />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 text-center py-3">
              No installation sites yet.
            </p>
          )}
        </div>
      )}

      <div className="border-t border-slate-200 pt-5 mb-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
          Quality Control
        </p>
        <PathCard
          icon={ClipboardCheck}
          title="QC / Inspection"
          color="green"
          completed={so.qc_passed}
          completedAt={so.qc_passed_at}
          isSales={isSales}
          onComplete={() =>
            actionMutation.mutate({ id: so.id, action: 'mark_qc_passed' })
          }
        />
      </div>

      {so.qc_passed && so.status !== 'COMPLETED' && isSales && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-green-800 font-medium">
            All milestones complete — ready to close
          </p>
          <button
            onClick={() =>
              actionMutation.mutate({ id: so.id, action: 'complete' })
            }
            className="btn-primary mt-2"
            disabled={actionMutation.isPending}
          >
            <Check className="w-4 h-4" /> Mark Order as Completed
          </button>
        </div>
      )}

      <div className="flex justify-end">
        <button onClick={onClose} className="btn-secondary">
          Close
        </button>
      </div>

      <CreateInstallationModal
        open={installModal}
        onClose={() => setInstallModal(false)}
        salesOrderId={so.id}
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: ['sales-order', so.id] });
          onUpdate();
          setInstallModal(false);
        }}
      />
    </Modal>
  );
}


function PathCard({ icon: Icon, title, color, completed, completedAt, onComplete, isSales }) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-700',
    purple: 'bg-purple-100 text-purple-700',
    amber: 'bg-amber-100 text-amber-700',
    green: 'bg-green-100 text-green-700',
  };

  return (
    <div
      className={`flex items-center gap-3 border rounded-lg p-3 transition ${
        completed
          ? 'border-green-200 bg-green-50/40'
          : 'border-slate-200 bg-white'
      }`}
    >
      <div
        className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
          colorClasses[color] || colorClasses.blue
        }`}
      >
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800">{title}</p>
        {completed && completedAt ? (
          <p className="text-xs text-green-700 flex items-center gap-1 mt-0.5">
            <Check className="w-3 h-3" /> Completed {formatDate(completedAt)}
          </p>
        ) : (
          <p className="text-xs text-slate-500 mt-0.5">Pending</p>
        )}
      </div>
      {!completed && isSales && (
        <button
          onClick={onComplete}
          className="btn-secondary text-xs !py-1.5"
        >
          Mark Complete
        </button>
      )}
    </div>
  );
}


function CreateInstallationModal({ open, onClose, salesOrderId, onSuccess }) {
  const { register, handleSubmit, reset } = useForm();

  const createMutation = useMutation({
    mutationFn: (payload) => salesApi.installations.create(payload),
    onSuccess: () => {
      toast.success('Installation scheduled');
      reset();
      onSuccess();
    },
    onError: () => toast.error('Failed to create installation'),
  });

  const onSubmit = (values) => {
    createMutation.mutate({
      sales_order: salesOrderId,
      site_name: values.site_name,
      site_address: values.site_address,
      site_contact: values.site_contact || '',
      site_phone: values.site_phone || '',
      scheduled_date: values.scheduled_date || null,
      notes: values.notes || '',
    });
  };

  return (
    <Modal open={open} onClose={onClose} title="Schedule Installation" size="md">
      <form onSubmit={handleSubmit(onSubmit)}>
        <FormField label="Site Name" required>
          <input
            {...register('site_name', { required: true })}
            className="input"
            placeholder="e.g. Chirano Gold Mine — Processing Plant"
          />
        </FormField>

        <FormField label="Site Address" required>
          <textarea
            rows={2}
            {...register('site_address', { required: true })}
            className="input"
            placeholder="Full address of installation site"
          />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Site Contact">
            <input {...register('site_contact')} className="input" />
          </FormField>
          <FormField label="Site Phone">
            <input {...register('site_phone')} className="input" />
          </FormField>
        </div>

        <FormField label="Scheduled Date">
          <input type="date" {...register('scheduled_date')} className="input" />
        </FormField>

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
            {createMutation.isPending ? 'Scheduling...' : 'Schedule Installation'}
          </button>
        </div>
      </form>
    </Modal>
  );
}