import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Plus, Play, Calendar, Target, Users, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { hrApi } from '../../api/hr';
import { coreApi } from '../../api/core';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import FormField from '../../components/FormField';
import StatusBadge from '../../components/StatusBadge';
import ConfirmDialog from '../../components/ConfirmDialog';
import { formatDate } from '../../utils/formatters';

export default function PerformanceCycles() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [kpiModal, setKpiModal] = useState(null);
  const [appraisalModal, setAppraisalModal] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['performance-cycles'],
    queryFn: () => hrApi.performanceCycles.list({ page_size: 100 }),
  });

  const activate = useMutation({
    mutationFn: (id) => hrApi.performanceCycles.custom(id, 'activate'),
    onSuccess: (data) => {
      toast.success(`Cycle activated — ${data.appraisals_created} appraisals created`);
      qc.invalidateQueries({ queryKey: ['performance-cycles'] });
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed'),
  });

  const columns = [
    { key: 'name', label: 'Cycle', render: (r) => <span className="font-medium text-slate-800">{r.name}</span> },
    { key: 'start_date', label: 'Start', render: (r) => formatDate(r.start_date) },
    { key: 'mid_year_date', label: 'Mid-Year', render: (r) => formatDate(r.mid_year_date) },
    { key: 'end_date', label: 'End', render: (r) => formatDate(r.end_date) },
    {
      key: 'kpi_count', label: 'KPIs', className: 'text-center',
      render: (r) => <span className="text-xs bg-slate-100 text-slate-600 rounded-full px-2 py-0.5">{r.kpi_count}</span>,
    },
    {
      key: 'appraisal_count', label: 'Appraisals', className: 'text-center',
      render: (r) => <span className="text-xs bg-blue-100 text-blue-700 rounded-full px-2 py-0.5">{r.appraisal_count}</span>,
    },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-6 text-white">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Performance Cycles</h2>
            <p className="text-purple-100 text-sm mt-1">Set up appraisal cycles and add KPIs</p>
          </div>
          <button
            onClick={() => setModal(true)}
            className="bg-white text-purple-700 hover:bg-purple-50 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition"
          >
            <Plus className="w-4 h-4" /> New Cycle
          </button>
        </div>
      </div>

      <div className="card">
        <DataTable
          columns={columns}
          data={data?.results}
          loading={isLoading}
          emptyTitle="No cycles yet"
          emptyMessage="Create your first performance cycle."
          emptyIcon={Calendar}
          actions={(r) => (
            <div className="flex justify-end gap-1">
              {r.status === 'DRAFT' && (
                <button
                  onClick={() => activate.mutate(r.id)}
                  className="btn-ghost !p-2 text-green-600"
                  title="Activate (creates appraisals for all staff)"
                >
                  <Play className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setKpiModal(r)}
                className="btn-ghost !p-2 text-blue-600"
                title="Manage KPIs"
              >
                <Target className="w-4 h-4" />
              </button>
              <button
                onClick={() => setAppraisalModal(r)}
                className="btn-ghost !p-2 text-purple-600"
                title="View Appraisals"
              >
                <Users className="w-4 h-4" />
              </button>
            </div>
          )}
        />
      </div>

      <CreateCycleModal
        open={modal}
        onClose={() => setModal(false)}
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: ['performance-cycles'] });
          setModal(false);
        }}
      />

      <KPIManagerModal cycle={kpiModal} onClose={() => setKpiModal(null)} />
      <AppraisalsViewModal cycle={appraisalModal} onClose={() => setAppraisalModal(null)} />
    </div>
  );
}


function CreateCycleModal({ open, onClose, onSuccess }) {
  const { register, handleSubmit, reset } = useForm();
  const year = new Date().getFullYear();

  const createMutation = useMutation({
    mutationFn: (payload) => hrApi.performanceCycles.create(payload),
    onSuccess: () => { toast.success('Cycle created'); reset(); onSuccess(); },
    onError: () => toast.error('Failed to create'),
  });

  return (
    <Modal open={open} onClose={onClose} title="New Performance Cycle" size="md">
      <form onSubmit={handleSubmit((v) => createMutation.mutate(v))}>
        <FormField label="Cycle Name" required>
          <input {...register('name', { required: true })} className="input" defaultValue={`${year} Annual Review`} />
        </FormField>
        <FormField label="Description">
          <textarea rows={2} {...register('description')} className="input" />
        </FormField>
        <div className="grid grid-cols-3 gap-4">
          <FormField label="Start Date" required>
            <input type="date" {...register('start_date', { required: true })} className="input" defaultValue={`${year}-01-01`} />
          </FormField>
          <FormField label="Mid-Year Date">
            <input type="date" {...register('mid_year_date')} className="input" defaultValue={`${year}-06-30`} />
          </FormField>
          <FormField label="End Date" required>
            <input type="date" {...register('end_date', { required: true })} className="input" defaultValue={`${year}-12-31`} />
          </FormField>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={createMutation.isPending} className="btn-primary">
            {createMutation.isPending ? 'Creating...' : 'Create Cycle'}
          </button>
        </div>
      </form>
    </Modal>
  );
}


function KPIManagerModal({ cycle, onClose }) {
  const qc = useQueryClient();
  const [addModal, setAddModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['kpis', cycle?.id],
    queryFn: () => hrApi.kpis.list({ cycle: cycle.id, page_size: 500 }),
    enabled: !!cycle?.id,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => hrApi.kpis.remove(id),
    onSuccess: () => {
      toast.success('KPI deleted');
      qc.invalidateQueries({ queryKey: ['kpis', cycle.id] });
      setConfirmDelete(null);
    },
  });

  if (!cycle) return null;

  const columns = [
    {
      key: 'employee_name', label: 'Employee',
      render: (r) => (
        <div>
          <p className="font-medium text-slate-800">{r.employee_name}</p>
          <p className="text-xs text-slate-500">{r.employee_department || '—'}</p>
        </div>
      ),
    },
    { key: 'title', label: 'KPI Title' },
    {
      key: 'target', label: 'Target',
      render: (r) => <span className="text-xs">{r.target || '—'}</span>,
    },
    { key: 'weight', label: 'Weight %', className: 'text-right' },
  ];

  return (
    <Modal open={!!cycle} onClose={onClose} title={`KPIs — ${cycle.name}`} size="xl">
      <div className="flex justify-between items-center mb-4">
        <p className="text-xs text-slate-500">
          {data?.count || 0} KPIs defined for this cycle
        </p>
        <button onClick={() => setAddModal(true)} className="btn-primary text-xs">
          <Plus className="w-3 h-3" /> Add KPI
        </button>
      </div>

      <DataTable
        columns={columns}
        data={data?.results}
        loading={isLoading}
        emptyTitle="No KPIs yet"
        emptyMessage="Click 'Add KPI' to create one."
        emptyIcon={Target}
        actions={(r) => (
          <div className="flex justify-end">
            <button
              onClick={() => setConfirmDelete(r)}
              className="btn-ghost !p-2 text-red-600"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      />

      <AddKPIModal
        cycle={cycle}
        open={addModal}
        onClose={() => setAddModal(false)}
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: ['kpis', cycle.id] });
          qc.invalidateQueries({ queryKey: ['performance-cycles'] });
          setAddModal(false);
        }}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => deleteMutation.mutate(confirmDelete.id)}
        title="Delete KPI?"
        message={`Delete "${confirmDelete?.title}" for ${confirmDelete?.employee_name}?`}
        loading={deleteMutation.isPending}
      />

      <div className="flex justify-end mt-4">
        <button onClick={onClose} className="btn-secondary">Close</button>
      </div>
    </Modal>
  );
}


function AddKPIModal({ cycle, open, onClose, onSuccess }) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const { data: users } = useQuery({
    queryKey: ['users-for-kpi'],
    queryFn: () => coreApi.users.list({ page_size: 500 }),
    enabled: open,
  });

  const createMutation = useMutation({
    mutationFn: (payload) => hrApi.kpis.create(payload),
    onSuccess: () => { toast.success('KPI added'); reset(); onSuccess(); },
    onError: (err) => {
      const data = err.response?.data;
      let msg = 'Failed to add KPI';
      if (typeof data === 'string') msg = data;
      else if (data?.detail) msg = data.detail;
      else if (data && typeof data === 'object') {
        const parts = [];
        Object.entries(data).forEach(([k, v]) => {
          parts.push(`${k}: ${Array.isArray(v) ? v.join(', ') : v}`);
        });
        msg = parts.join(' • ');
      }
      toast.error(msg, { duration: 6000 });
    },
  });

  const onSubmit = (values) => {
    createMutation.mutate({
      cycle: cycle.id,
      employee: values.employee,
      title: values.title,
      description: values.description || '',
      weight: values.weight,
      target: values.target || '',
    });
  };

  return (
    <Modal open={open} onClose={onClose} title="Add KPI" size="md">
      <form onSubmit={handleSubmit(onSubmit)}>
        <FormField label="Employee" required error={errors.employee}>
          <select {...register('employee', { required: 'Required' })} className="input">
            <option value="">— Select Employee —</option>
            {users?.results?.map((u) => (
              <option key={u.id} value={u.id}>
                {u.first_name} {u.last_name} ({u.username}) — {u.role_display}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="KPI Title" required error={errors.title}>
          <input
            {...register('title', { required: 'Required' })}
            className="input"
            placeholder="e.g. Sales Revenue Target"
          />
        </FormField>

        <FormField label="Description">
          <textarea
            rows={2}
            {...register('description')}
            className="input"
            placeholder="What this KPI measures"
          />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Weight %" required error={errors.weight}>
            <input
              type="number"
              step="1"
              min="1"
              max="100"
              {...register('weight', { required: 'Required' })}
              className="input"
              defaultValue={10}
            />
          </FormField>
          <FormField label="Target">
            <input
              {...register('target')}
              className="input"
              placeholder="e.g. GHS 500,000"
            />
          </FormField>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-2 text-xs text-blue-800">
          <strong>Tip:</strong> Weights for all KPIs of an employee should total 100%.
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={createMutation.isPending} className="btn-primary">
            {createMutation.isPending ? 'Adding...' : 'Add KPI'}
          </button>
        </div>
      </form>
    </Modal>
  );
}


function AppraisalsViewModal({ cycle, onClose }) {
  const { data, isLoading } = useQuery({
    queryKey: ['appraisals', cycle?.id],
    queryFn: () => hrApi.appraisals.list({ cycle: cycle.id, page_size: 500 }),
    enabled: !!cycle?.id,
  });

  if (!cycle) return null;

  const columns = [
    { key: 'employee_name', label: 'Employee' },
    { key: 'employee_department', label: 'Dept' },
    { key: 'supervisor_name', label: 'Supervisor' },
    { key: 'status_display', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'overall_rating', label: 'Score', className: 'text-right',
      render: (r) => r.overall_rating ? <span className="font-bold text-blue-700">{r.overall_rating}</span> : <span className="text-slate-400">—</span>,
    },
  ];

  return (
    <Modal open={!!cycle} onClose={onClose} title={`Appraisals — ${cycle.name}`} size="lg">
      <DataTable
        columns={columns}
        data={data?.results}
        loading={isLoading}
        emptyTitle="No appraisals"
        emptyMessage="Activate the cycle (click the green play button) to create appraisals for all staff."
        emptyIcon={Users}
      />
      <div className="flex justify-end mt-4">
        <button onClick={onClose} className="btn-secondary">Close</button>
      </div>
    </Modal>
  );
}