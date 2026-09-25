import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Plus, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { hrApi } from '../../api/hr';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import FormField from '../../components/FormField';
import StatusBadge from '../../components/StatusBadge';
import { formatDate } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../utils/constants';

export default function Leaves() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['leaves'],
    queryFn: () => hrApi.leaveApplications.list({ page_size: 100 }),
  });

  const { data: leaveTypes } = useQuery({
    queryKey: ['leavetypes'],
    queryFn: () => hrApi.leaveTypes.list(),
  });

  const { register, handleSubmit, reset } = useForm();

  const create = useMutation({
    mutationFn: (payload) => hrApi.leaveApplications.create(payload),
    onSuccess: () => {
      toast.success('Leave application submitted');
      qc.invalidateQueries({ queryKey: ['leaves'] });
      setModal(false);
      reset();
    },
  });

  const supApprove = useMutation({
    mutationFn: (id) => hrApi.leaveApplications.custom(id, 'supervisor_approve'),
    onSuccess: () => {
      toast.success('Supervisor approved');
      qc.invalidateQueries({ queryKey: ['leaves'] });
    },
  });

  const hrApprove = useMutation({
    mutationFn: (id) => hrApi.leaveApplications.custom(id, 'hr_approve'),
    onSuccess: () => {
      toast.success('HR approved');
      qc.invalidateQueries({ queryKey: ['leaves'] });
    },
  });

  const isHR = [ROLES.HR, ROLES.ADMIN].includes(user?.role);

  const columns = [
    {
      key: 'application_no',
      label: 'Application No.',
      render: (r) => <span className="font-medium text-blue-700">{r.application_no}</span>,
    },
    { key: 'employee_name', label: 'Employee' },
    { key: 'leave_type_name', label: 'Type' },
    { key: 'start_date', label: 'From', render: (r) => formatDate(r.start_date) },
    { key: 'end_date', label: 'To', render: (r) => formatDate(r.end_date) },
    { key: 'days_requested', label: 'Days' },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setModal(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> Apply for Leave
        </button>
      </div>

      <div className="card">
        <DataTable
          columns={columns}
          data={data?.results}
          loading={isLoading}
          emptyMessage="No leave applications"
          actions={(r) => (
            <div className="flex justify-end gap-1">
              {r.status === 'PENDING' && (
                <button
                  onClick={() => supApprove.mutate(r.id)}
                  className="btn-ghost !p-2 text-green-600"
                  title="Supervisor Approve"
                >
                  <Check className="w-4 h-4" />
                </button>
              )}
              {isHR && ['SUPERVISOR_APPROVED', 'HOD_APPROVED'].includes(r.status) && (
                <button
                  onClick={() => hrApprove.mutate(r.id)}
                  className="btn-ghost !p-2 text-blue-600"
                  title="HR Approve"
                >
                  <Check className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        />
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Apply for Leave">
        <form onSubmit={handleSubmit((v) => create.mutate(v))}>
          <FormField label="Leave Type" required>
            <select {...register('leave_type', { required: true })} className="input">
              <option value="">— Select —</option>
              {leaveTypes?.results?.map((lt) => (
                <option key={lt.id} value={lt.id}>
                  {lt.name}
                </option>
              ))}
            </select>
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Start Date" required>
              <input type="date" {...register('start_date', { required: true })} className="input" />
            </FormField>
            <FormField label="End Date" required>
              <input type="date" {...register('end_date', { required: true })} className="input" />
            </FormField>
          </div>
          <FormField label="Days Requested" required>
            <input
              type="number"
              step="0.5"
              {...register('days_requested', { required: true })}
              className="input"
            />
          </FormField>
          <FormField label="Reason" required>
            <textarea rows={3} {...register('reason', { required: true })} className="input" />
          </FormField>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Submit
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}