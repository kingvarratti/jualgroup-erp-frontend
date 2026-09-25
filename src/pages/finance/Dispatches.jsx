import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { financeApi } from '../../api/finance';
import { salesApi } from '../../api/sales';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import FormField from '../../components/FormField';
import StatusBadge from '../../components/StatusBadge';
import { formatDate } from '../../utils/formatters';

export default function Dispatches() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['dispatches'],
    queryFn: () => financeApi.dispatches.list({ page_size: 100 }),
  });

  const { data: clientPOs } = useQuery({
    queryKey: ['clientpos-for-disp'],
    queryFn: () => salesApi.clientPOs.list({ page_size: 200 }),
  });

  const { register, handleSubmit, reset } = useForm();

  const create = useMutation({
    mutationFn: (payload) => financeApi.dispatches.create(payload),
    onSuccess: () => {
      toast.success('Dispatch created');
      qc.invalidateQueries({ queryKey: ['dispatches'] });
      setModal(false);
      reset();
    },
  });

  const columns = [
    {
      key: 'dispatch_no',
      label: 'Dispatch No.',
      render: (r) => <span className="font-medium text-blue-700">{r.dispatch_no}</span>,
    },
    { key: 'driver_name', label: 'Driver' },
    { key: 'vehicle_number', label: 'Vehicle' },
    { key: 'dispatch_date', label: 'Dispatched', render: (r) => formatDate(r.dispatch_date) },
    {
      key: 'delivery_status',
      label: 'Status',
      render: (r) => <StatusBadge status={r.delivery_status} />,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setModal(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> New Dispatch
        </button>
      </div>

      <div className="card">
        <DataTable
          columns={columns}
          data={data?.results}
          loading={isLoading}
          emptyMessage="No dispatches"
        />
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="New Dispatch">
        <form onSubmit={handleSubmit((v) => create.mutate(v))}>
          <FormField label="Client PO" required>
            <select {...register('client_po', { required: true })} className="input">
              <option value="">— Select —</option>
              {clientPOs?.results?.map((po) => (
                <option key={po.id} value={po.id}>
                  {po.internal_order_no}
                </option>
              ))}
            </select>
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Driver Name">
              <input {...register('driver_name')} className="input" />
            </FormField>
            <FormField label="Vehicle No.">
              <input {...register('vehicle_number')} className="input" />
            </FormField>
          </div>
          <FormField label="Delivery Address">
            <textarea rows={2} {...register('delivery_address')} className="input" />
          </FormField>
          <FormField label="Dispatch Date" required>
            <input
              type="datetime-local"
              {...register('dispatch_date', { required: true })}
              className="input"
            />
          </FormField>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Create
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}