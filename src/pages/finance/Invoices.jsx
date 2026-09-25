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
import { formatCurrency, formatDate } from '../../utils/formatters';

export default function Invoices() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => financeApi.invoices.list({ page_size: 100 }),
  });

  const { data: clientPOs } = useQuery({
    queryKey: ['clientpos-for-inv'],
    queryFn: () => salesApi.clientPOs.list({ page_size: 200 }),
  });

  const { register, handleSubmit, reset } = useForm();

  const create = useMutation({
    mutationFn: (payload) => financeApi.invoices.create(payload),
    onSuccess: () => {
      toast.success('Invoice created');
      qc.invalidateQueries({ queryKey: ['invoices'] });
      setModal(false);
      reset();
    },
  });

  const columns = [
    {
      key: 'invoice_no',
      label: 'Invoice No.',
      render: (r) => <span className="font-medium text-blue-700">{r.invoice_no}</span>,
    },
    {
      key: 'total_amount',
      label: 'Total',
      render: (r) => formatCurrency(r.total_amount, r.currency),
    },
    { key: 'issue_date', label: 'Issued', render: (r) => formatDate(r.issue_date) },
    { key: 'due_date', label: 'Due', render: (r) => formatDate(r.due_date) },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setModal(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> New Invoice
        </button>
      </div>

      <div className="card">
        <DataTable
          columns={columns}
          data={data?.results}
          loading={isLoading}
          emptyMessage="No invoices"
        />
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="New Invoice">
        <form onSubmit={handleSubmit((v) => create.mutate(v))}>
          <FormField label="Client PO" required>
            <select {...register('client_po', { required: true })} className="input">
              <option value="">— Select —</option>
              {clientPOs?.results?.map((po) => (
                <option key={po.id} value={po.id}>
                  {po.internal_order_no} — {formatCurrency(po.total_value)}
                </option>
              ))}
            </select>
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Amount (GHS)" required>
              <input
                type="number"
                step="0.01"
                {...register('amount', { required: true })}
                className="input"
              />
            </FormField>
            <FormField label="Tax (GHS)">
              <input type="number" step="0.01" {...register('tax_amount')} className="input" />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Issue Date" required>
              <input
                type="date"
                {...register('issue_date', { required: true })}
                className="input"
              />
            </FormField>
            <FormField label="Due Date">
              <input type="date" {...register('due_date')} className="input" />
            </FormField>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Create Invoice
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}