import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { salesApi } from '../../api/sales';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import FormField from '../../components/FormField';
import StatusBadge from '../../components/StatusBadge';
import { formatCurrency, formatDate } from '../../utils/formatters';

export default function ClientPOs() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);

  const { data: quotations } = useQuery({
    queryKey: ['quotations-for-po'],
    queryFn: () => salesApi.quotations.list({ page_size: 200 }),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['clientpos'],
    queryFn: () => salesApi.clientPOs.list({ page_size: 100 }),
  });

  const { register, handleSubmit, reset } = useForm();

  const create = useMutation({
    mutationFn: (fd) => salesApi.clientPOs.create(fd),
    onSuccess: () => {
      toast.success('Client PO recorded');
      qc.invalidateQueries({ queryKey: ['clientpos'] });
      setModal(false);
      reset();
    },
    onError: () => toast.error('Failed to save'),
  });

  const onSubmit = (values) => {
    const fd = new FormData();
    Object.entries(values).forEach(([k, v]) => {
      if (k === 'client_po_file' || k === 'urs_document') {
        if (v?.[0]) fd.append(k, v[0]);
      } else if (v !== undefined && v !== '') {
        fd.append(k, v);
      }
    });
    create.mutate(fd);
  };

  const columns = [
    {
      key: 'internal_order_no',
      label: 'Order No.',
      render: (r) => (
        <span className="font-medium text-blue-700">{r.internal_order_no}</span>
      ),
    },
    { key: 'client_po_number', label: 'Client PO' },
    { key: 'total_value', label: 'Value', render: (r) => formatCurrency(r.total_value) },
    { key: 'po_date', label: 'PO Date', render: (r) => formatDate(r.po_date) },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button className="btn-primary" onClick={() => setModal(true)}>
          <Plus className="w-4 h-4" /> Record Client PO
        </button>
      </div>

      <div className="card">
        <DataTable
          columns={columns}
          data={data?.results}
          loading={isLoading}
          emptyMessage="No client POs yet"
        />
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Record Client PO">
        <form onSubmit={handleSubmit(onSubmit)}>
          <FormField label="Linked Quotation">
            <select {...register('quotation')} className="input">
              <option value="">— Select —</option>
              {quotations?.results?.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.quote_no} — {formatCurrency(q.total_amount)}
                </option>
              ))}
            </select>
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Client PO Number" required>
              <input
                {...register('client_po_number', { required: true })}
                className="input"
              />
            </FormField>
            <FormField label="PO Date" required>
              <input type="date" {...register('po_date', { required: true })} className="input" />
            </FormField>
          </div>
          <FormField label="Total Value (GHS)" required>
            <input
              type="number"
              step="0.01"
              {...register('total_value', { required: true })}
              className="input"
            />
          </FormField>
          <FormField label="Client PO File">
            <input type="file" {...register('client_po_file')} className="input" />
          </FormField>
          <FormField label="URS Document">
            <input type="file" {...register('urs_document')} className="input" />
          </FormField>
          <FormField label="User Requirements">
            <textarea rows={3} {...register('user_requirements')} className="input" />
          </FormField>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={create.isPending} className="btn-primary">
              {create.isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}