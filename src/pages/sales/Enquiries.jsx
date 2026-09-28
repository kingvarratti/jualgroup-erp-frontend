import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Plus, Eye, FileText, Zap, Gauge, Waves, Wind, Cog } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { salesApi } from '../../api/sales';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import FormField from '../../components/FormField';
import StatusBadge from '../../components/StatusBadge';
import ExportMenu from '../../components/ExportMenu';
import { formatCurrency, formatDate } from '../../utils/formatters';

const REQUIREMENT_TYPES = [
  { value: 'PUMP', label: 'Pump', icon: Waves, desc: 'Pumps and pumping systems' },
  { value: 'AUTOMATION', label: 'Automation', icon: Cog, desc: 'Control panels, PLCs, SCADA' },
  { value: 'LV', label: 'Low Voltage (LV)', icon: Zap, desc: 'LV switchgear and distribution' },
  { value: 'MV', label: 'Medium Voltage (MV)', icon: Zap, desc: 'MV switchgear and distribution' },
  { value: 'PROJECT', label: 'Project', icon: Gauge, desc: 'Full project / EPC work' },
  { value: 'OTHER', label: 'Other', icon: Wind, desc: 'Other requirements' },
];

const PUMP_FLUID_TYPES = [
  'Water', 'Wastewater', 'Sludge', 'Chemical', 'Oil', 'Fuel', 'Slurry', 'Other',
];

export default function Enquiries() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [modal, setModal] = useState(false);
  const [filters, setFilters] = useState({ search: '', status: '', requirement_type: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['enquiries', filters],
    queryFn: () =>
      salesApi.enquiries.list({
        search: filters.search,
        status: filters.status,
        requirement_type: filters.requirement_type,
        page_size: 100,
      }),
    keepPreviousData: true,
  });

  const columns = [
    {
      key: 'reference_no',
      label: 'Ref No.',
      render: (r) => (
        <span className="font-medium text-blue-700">{r.reference_no}</span>
      ),
    },
    {
      key: 'requirement_type',
      label: 'Type',
      render: (r) => {
        const cfg = REQUIREMENT_TYPES.find((x) => x.value === r.requirement_type);
        const Icon = cfg?.icon || Wind;
        return (
          <span className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded bg-slate-100 text-slate-700 font-medium">
            <Icon className="w-3 h-3" />
            {r.requirement_type_display}
          </span>
        );
      },
    },
    { key: 'client_name', label: 'Client' },
    {
      key: 'description',
      label: 'Description',
      render: (r) => <span className="line-clamp-1 max-w-xs">{r.description}</span>,
    },
    {
      key: 'estimated_value',
      label: 'Est. Value',
      className: 'text-right',
      render: (r) => formatCurrency(r.estimated_value),
    },
    { key: 'date_received', label: 'Received', render: (r) => formatDate(r.date_received) },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <input
            placeholder="Search enquiries..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="input w-64"
          />
          <select
            value={filters.requirement_type}
            onChange={(e) => setFilters({ ...filters, requirement_type: e.target.value })}
            className="input w-48"
          >
            <option value="">All Types</option>
            {REQUIREMENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="input w-44"
          >
            <option value="">All Status</option>
            <option value="RECEIVED">Received</option>
            <option value="TECH_REVIEW">Technical Review</option>
            <option value="QUOTING">Quoting</option>
            <option value="QUOTED">Quoted</option>
            <option value="WON">Won</option>
            <option value="LOST">Lost</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <ExportMenu
            columns={columns}
            data={data?.results || []}
            filename={`enquiries-${new Date().toISOString().slice(0, 10)}`}
            title="Enquiries"
          />
          <button className="btn-primary" onClick={() => setModal(true)}>
            <Plus className="w-4 h-4" /> New Enquiry
          </button>
        </div>
      </div>

      <div className="card">
        <DataTable
          columns={columns}
          data={data?.results}
          loading={isLoading}
          onRowClick={(r) => navigate(`/sales/enquiries/${r.id}`)}
          emptyTitle="No enquiries yet"
          emptyMessage="Log your first client enquiry to start the sales pipeline."
          emptyIcon={FileText}
        />
      </div>

      <CreateEnquiryModal
        open={modal}
        onClose={() => setModal(false)}
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: ['enquiries'] });
          setModal(false);
        }}
      />
    </div>
  );
}


function CreateEnquiryModal({ open, onClose, onSuccess }) {
  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm();
  const [reqType, setReqType] = useState('AUTOMATION');
  const [pumpSpecs, setPumpSpecs] = useState({
    fluid_type: '',
    flow_rate: '',
    head: '',
    temperature: '',
    pressure: '',
    motor_voltage: '',
    motor_power: '',
    pump_type: '',
    application_notes: '',
  });

  const createMutation = useMutation({
    mutationFn: (payload) => salesApi.enquiries.create(payload),
    onSuccess: () => {
      toast.success('Enquiry created');
      reset();
      setReqType('AUTOMATION');
      setPumpSpecs({
        fluid_type: '', flow_rate: '', head: '', temperature: '',
        pressure: '', motor_voltage: '', motor_power: '', pump_type: '', application_notes: '',
      });
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
    const payload = {
      client_name: values.client_name,
      client_contact: values.client_contact || '',
      client_email: values.client_email || '',
      client_phone: values.client_phone || '',
      client_address: values.client_address || '',
      requirement_type: reqType,
      description: values.description,
      application: values.application || '',
      estimated_value: values.estimated_value || 0,
      pump_specs: reqType === 'PUMP' ? pumpSpecs : {},
    };
    createMutation.mutate(payload);
  };

  return (
    <Modal open={open} onClose={onClose} title="New Enquiry" size="xl">
      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Client info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Client Name" required error={errors.client_name}>
            <input
              {...register('client_name', { required: 'Required' })}
              className="input"
            />
          </FormField>
          <FormField label="Contact Person">
            <input {...register('client_contact')} className="input" />
          </FormField>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Email">
            <input type="email" {...register('client_email')} className="input" />
          </FormField>
          <FormField label="Phone">
            <input {...register('client_phone')} className="input" />
          </FormField>
        </div>

        <FormField label="Client Address">
          <input
            {...register('client_address')}
            className="input"
            placeholder="Full address"
          />
        </FormField>

        {/* Requirement Type */}
        <FormField label="Requirement Type" required>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
            {REQUIREMENT_TYPES.map((t) => {
              const Icon = t.icon;
              const active = reqType === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setReqType(t.value)}
                  className={`p-3 rounded-lg border-2 text-left transition ${
                    active
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <Icon className={`w-4 h-4 mb-1 ${active ? 'text-blue-600' : 'text-slate-500'}`} />
                  <p className="text-xs font-medium text-slate-800 leading-tight">
                    {t.label}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                    {t.desc}
                  </p>
                </button>
              );
            })}
          </div>
        </FormField>

        {/* Description */}
        <FormField label="Description" required error={errors.description}>
          <textarea
            rows={3}
            {...register('description', { required: 'Required' })}
            className="input"
            placeholder="What the client needs — be specific"
          />
        </FormField>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Application / Use Case">
            <input
              {...register('application')}
              className="input"
              placeholder="e.g. Water treatment plant, factory upgrade"
            />
          </FormField>
          <FormField label="Estimated Value (GHS)">
            <input
              type="number"
              step="0.01"
              {...register('estimated_value')}
              className="input"
            />
          </FormField>
        </div>

        {/* Pump-specific specs */}
        {reqType === 'PUMP' && (
          <div className="border border-blue-200 bg-blue-50/30 rounded-lg p-4 mt-4 mb-4">
            <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
              <Waves className="w-4 h-4" /> Pump Technical Specifications
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField label="Fluid Type">
                <select
                  value={pumpSpecs.fluid_type}
                  onChange={(e) => setPumpSpecs({ ...pumpSpecs, fluid_type: e.target.value })}
                  className="input"
                >
                  <option value="">— Select —</option>
                  {PUMP_FLUID_TYPES.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Flow Rate">
                <input
                  value={pumpSpecs.flow_rate}
                  onChange={(e) => setPumpSpecs({ ...pumpSpecs, flow_rate: e.target.value })}
                  className="input"
                  placeholder="e.g. 50 m³/h"
                />
              </FormField>
              <FormField label="Head">
                <input
                  value={pumpSpecs.head}
                  onChange={(e) => setPumpSpecs({ ...pumpSpecs, head: e.target.value })}
                  className="input"
                  placeholder="e.g. 30 m"
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField label="Temperature">
                <input
                  value={pumpSpecs.temperature}
                  onChange={(e) => setPumpSpecs({ ...pumpSpecs, temperature: e.target.value })}
                  className="input"
                  placeholder="e.g. 60°C"
                />
              </FormField>
              <FormField label="Pressure">
                <input
                  value={pumpSpecs.pressure}
                  onChange={(e) => setPumpSpecs({ ...pumpSpecs, pressure: e.target.value })}
                  className="input"
                  placeholder="e.g. 10 bar"
                />
              </FormField>
              <FormField label="Motor Voltage">
                <input
                  value={pumpSpecs.motor_voltage}
                  onChange={(e) => setPumpSpecs({ ...pumpSpecs, motor_voltage: e.target.value })}
                  className="input"
                  placeholder="e.g. 415V / 3-phase"
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Motor Power">
                <input
                  value={pumpSpecs.motor_power}
                  onChange={(e) => setPumpSpecs({ ...pumpSpecs, motor_power: e.target.value })}
                  className="input"
                  placeholder="e.g. 15 kW"
                />
              </FormField>
              <FormField label="Pump Type (if known)">
                <input
                  value={pumpSpecs.pump_type}
                  onChange={(e) => setPumpSpecs({ ...pumpSpecs, pump_type: e.target.value })}
                  className="input"
                  placeholder="e.g. Centrifugal, Submersible"
                />
              </FormField>
            </div>

            <FormField label="Application Notes">
              <textarea
                rows={2}
                value={pumpSpecs.application_notes}
                onChange={(e) => setPumpSpecs({ ...pumpSpecs, application_notes: e.target.value })}
                className="input"
                placeholder="Any additional technical context"
              />
            </FormField>
          </div>
        )}

        <div className="flex justify-end gap-2 mt-4">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="btn-primary"
          >
            {createMutation.isPending ? 'Creating...' : 'Create Enquiry'}
          </button>
        </div>
      </form>
    </Modal>
  );
}