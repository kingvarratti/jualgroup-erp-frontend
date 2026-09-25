import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Plus, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { productionApi } from '../../api/production';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import FormField from '../../components/FormField';
import StatusBadge from '../../components/StatusBadge';
import { formatDate } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../utils/constants';

export default function MaterialRequisitions() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['matreqs'],
    queryFn: () => productionApi.materialRequisitions.list({ page_size: 100 }),
  });

  const { data: mfgOrders } = useQuery({
    queryKey: ['mfglist-matreq'],
    queryFn: () => productionApi.manufacturingOrders.list({ page_size: 100 }),
  });

  const { register, handleSubmit, reset } = useForm();

  const create = useMutation({
    mutationFn: (payload) => productionApi.materialRequisitions.create(payload),
    onSuccess: () => {
      toast.success('Requisition created');
      qc.invalidateQueries({ queryKey: ['matreqs'] });
      setModal(false);
      reset();
    },
  });

  const supply = useMutation({
    mutationFn: (id) => productionApi.materialRequisitions.custom(id, 'supply'),
    onSuccess: () => {
      toast.success('Marked as supplied');
      qc.invalidateQueries({ queryKey: ['matreqs'] });
    },
  });

  const isStores = [ROLES.STORES, ROLES.ADMIN].includes(user?.role);

  const columns = [
    {
      key: 'req_no',
      label: 'Req No.',
      render: (r) => <span className="font-medium text-blue-700">{r.req_no}</span>,
    },
    { key: 'created_at', label: 'Date', render: (r) => formatDate(r.created_at) },
    { key: 'notes', label: 'Notes' },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setModal(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> New Material Requisition
        </button>
      </div>

      <div className="card">
        <DataTable
          columns={columns}
          data={data?.results}
          loading={isLoading}
          emptyMessage="No material requisitions"
          actions={(r) => (
            <div className="flex justify-end">
              {isStores && r.status === 'PENDING' && (
                <button
                  onClick={() => supply.mutate(r.id)}
                  className="btn-ghost !p-2 text-green-600"
                  title="Mark Supplied"
                >
                  <Check className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        />
      </div>

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title="New Material Requisition"
      >
        <form onSubmit={handleSubmit((v) => create.mutate(v))}>
          <FormField label="Manufacturing Order" required>
            <select
              {...register('manufacturing_order', { required: true })}
              className="input"
            >
              <option value="">— Select —</option>
              {mfgOrders?.results?.map((mo) => (
                <option key={mo.id} value={mo.id}>
                  {mo.order_no}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Notes">
            <textarea rows={3} {...register('notes')} className="input" />
          </FormField>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setModal(false)}
              className="btn-secondary"
            >
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