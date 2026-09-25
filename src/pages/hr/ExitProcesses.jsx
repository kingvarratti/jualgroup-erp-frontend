import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { hrApi } from '../../api/hr';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import FormField from '../../components/FormField';
import StatusBadge from '../../components/StatusBadge';
import { formatDate } from '../../utils/formatters';

export default function ExitProcesses() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['exits'],
    queryFn: () => hrApi.exitProcesses.list({ page_size: 100 }),
  });

  const { register, handleSubmit, reset } = useForm();

  const create = useMutation({
    mutationFn: (payload) => hrApi.exitProcesses.create(payload),
    onSuccess: () => {
      toast.success('Exit process initiated');
      qc.invalidateQueries({ queryKey: ['exits'] });
      setModal(false);
      reset();
    },
  });

  const columns = [
    {
      key: 'process_no',
      label: 'Ref No.',
      render: (r) => <span className="font-medium text-blue-700">{r.process_no}</span>,
    },
    { key: 'employee_name', label: 'Employee' },
    { key: 'exit_type', label: 'Type' },
    {
      key: 'resignation_date',
      label: 'Resignation',
      render: (r) => formatDate(r.resignation_date),
    },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setModal(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> Initiate Exit
        </button>
      </div>

      <div className="card">
        <DataTable
          columns={columns}
          data={data?.results}
          loading={isLoading}
          emptyMessage="No exit processes"
        />
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Initiate Exit Process">
        <form onSubmit={handleSubmit((v) => create.mutate(v))}>
          <FormField label="Exit Type" required>
            <select {...register('exit_type', { required: true })} className="input">
              <option value="RESIGNATION">Resignation</option>
              <option value="TERMINATION">Termination</option>
              <option value="RETIREMENT">Retirement</option>
            </select>
          </FormField>
          <FormField label="Resignation/Notice Date" required>
            <input
              type="date"
              {...register('resignation_date', { required: true })}
              className="input"
            />
          </FormField>
          <FormField label="Notice Period (days)">
            <input
              type="number"
              {...register('notice_period_days')}
              defaultValue={30}
              className="input"
            />
          </FormField>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Initiate
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}