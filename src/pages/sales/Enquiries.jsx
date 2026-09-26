import { FileText } from 'lucide-react';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Plus, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { salesApi } from '../../api/sales';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import FormField from '../../components/FormField';
import StatusBadge from '../../components/StatusBadge';
import { formatCurrency, formatDate } from '../../utils/formatters';


export default function Enquiries() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [modal, setModal] = useState(false);
  const [filters, setFilters] = useState({ search: '', status: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['enquiries', filters],
    queryFn: () =>
      salesApi.enquiries.list({
        search: filters.search,
        status: filters.status,
        page_size: 100,
      }),
    keepPreviousData: true,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();

  const createMutation = useMutation({
    mutationFn: (payload) => salesApi.enquiries.create(payload),
    onSuccess: () => {
      toast.success('Enquiry created');
      qc.invalidateQueries({ queryKey: ['enquiries'] });
      setModal(false);
      reset();
    },
    onError: (err) => toast.error(err.response?.data?.detail || 'Failed to create'),
  });

  const columns = [
    {
      key: 'reference_no',
      label: 'Ref No.',
      render: (r) => (
        <span className="font-medium text-blue-700">{r.reference_no}</span>
      ),
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
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="input w-44"
          >
            <option value="">All Status</option>
            <option value="RECEIVED">Received</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="QUOTING">Quoting</option>
            <option value="QUOTED">Quoted</option>
            <option value="WON">Won</option>
            <option value="LOST">Lost</option>
          </select>
        </div>
        <button className="btn-primary" onClick={() => setModal(true)}>
          <Plus className="w-4 h-4" /> New Enquiry
        </button>
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
          emptyAction={
            <button className="btn-primary" onClick={() => setModal(true)}>
              <Plus className="w-4 h-4" /> Create First Enquiry
            </button>
          }
        />
      </div>

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title="New Enquiry"
      >
        <form onSubmit={handleSubmit((v) => createMutation.mutate(v))}>
          <FormField label="Client Name" required error={errors.client_name}>
            <input
              {...register('client_name', { required: 'Required' })}
              className="input"
            />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Contact Person">
              <input {...register('client_contact')} className="input" />
            </FormField>
            <FormField label="Email">
              <input type="email" {...register('client_email')} className="input" />
            </FormField>
          </div>
          <FormField label="Description" required error={errors.description}>
            <textarea
              rows={3}
              {...register('description', { required: 'Required' })}
              className="input"
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
          <div className="flex justify-end gap-2 mt-2">
            <button
              type="button"
              onClick={() => setModal(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="btn-primary"
            >
              {createMutation.isPending ? 'Saving...' : 'Create Enquiry'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}