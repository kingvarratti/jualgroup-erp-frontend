import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Plus, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { productionApi } from '../../api/production';
import { salesApi } from '../../api/sales';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import FormField from '../../components/FormField';
import StatusBadge from '../../components/StatusBadge';
import { formatDate } from '../../utils/formatters';

const STAGES = [
  'DESIGN_APPROVAL',
  'MFG_BOQ',
  'STOCK_CHECK',
  'MANUFACTURING',
  'TESTING',
  'FINISHING',
  'QC',
  'AS_BUILT',
  'PACKAGING',
  'DISPATCHED',
  'CLOSED',
];

export default function ManufacturingOrders() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['mfgorders'],
    queryFn: () => productionApi.manufacturingOrders.list({ page_size: 100 }),
  });

  const { data: clientPOs } = useQuery({
    queryKey: ['clientpos-for-mo'],
    queryFn: () => salesApi.clientPOs.list({ page_size: 200 }),
  });

  const { register, handleSubmit, reset } = useForm();

  const create = useMutation({
    mutationFn: (payload) => productionApi.manufacturingOrders.create(payload),
    onSuccess: () => {
      toast.success('Manufacturing order created');
      qc.invalidateQueries({ queryKey: ['mfgorders'] });
      setModal(false);
      reset();
    },
  });

  const advance = useMutation({
    mutationFn: ({ id, status }) =>
      productionApi.manufacturingOrders.custom(id, 'advance_stage', { status }),
    onSuccess: () => {
      toast.success('Stage advanced');
      qc.invalidateQueries({ queryKey: ['mfgorders'] });
    },
  });

  const columns = [
    {
      key: 'order_no',
      label: 'Order No.',
      render: (r) => <span className="font-medium text-blue-700">{r.order_no}</span>,
    },
    {
      key: 'target_completion',
      label: 'Target',
      render: (r) => formatDate(r.target_completion),
    },
    {
      key: 'progress_percent',
      label: 'Progress',
      render: (r) => (
        <div className="flex items-center gap-2">
          <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600"
              style={{ width: `${r.progress_percent}%` }}
            />
          </div>
          <span className="text-xs text-slate-500">{r.progress_percent}%</span>
        </div>
      ),
    },
    { key: 'status', label: 'Stage', render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setModal(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> New Manufacturing Order
        </button>
      </div>

      <div className="card">
        <DataTable
          columns={columns}
          data={data?.results}
          loading={isLoading}
          emptyMessage="No manufacturing orders"
          actions={(r) => {
            const idx = STAGES.indexOf(r.status);
            const next = STAGES[idx + 1];
            if (!next) return null;
            return (
              <button
                onClick={() => advance.mutate({ id: r.id, status: next })}
                className="btn-ghost !p-2 text-blue-600"
                title={`Advance to ${next.replaceAll('_', ' ')}`}
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            );
          }}
        />
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="New Manufacturing Order">
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
          <FormField label="Target Completion" required>
            <input type="date" {...register('target_completion', { required: true })} className="input" />
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