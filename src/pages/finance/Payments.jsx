import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { financeApi } from '../../api/finance';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import FormField from '../../components/FormField';
import { formatCurrency, formatDate } from '../../utils/formatters';

export default function Payments() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['payments'],
    queryFn: () => financeApi.payments.list({ page_size: 100 }),
  });

  const { data: invoices } = useQuery({
    queryKey: ['invoices-pay'],
    queryFn: () => financeApi.invoices.list({ page_size: 200 }),
  });

  const { register, handleSubmit, reset } = useForm();

  const create = useMutation({
    mutationFn: (payload) => financeApi.payments.create(payload),
    onSuccess: () => {
      toast.success('Payment recorded');
      qc.invalidateQueries({ queryKey: ['payments'] });
      qc.invalidateQueries({ queryKey: ['invoices'] });
      setModal(false);
      reset();
    },
  });

  const columns = [
    {
      key: 'receipt_no',
      label: 'Receipt',
      render: (r) => <span className="font-medium text-blue-700">{r.receipt_no}</span>,
    },
    { key: 'amount', label: 'Amount', render: (r) => formatCurrency(r.amount) },
    { key: 'payment_date', label: 'Date', render: (r) => formatDate(r.payment_date) },
    { key: 'payment_method', label: 'Method' },
    { key: 'bank_reference', label: 'Reference' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setModal(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> Record Payment
        </button>
      </div>

      <div className="card">
        <DataTable
          columns={columns}
          data={data?.results}
          loading={isLoading}
          emptyMessage="No payments recorded"
        />
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Record Client Payment">
        <form onSubmit={handleSubmit((v) => create.mutate(v))}>
          <FormField label="Invoice" required>
            <select {...register('invoice', { required: true })} className="input">
              <option value="">— Select —</option>
              {invoices?.results?.map((inv) => (
                <option key={inv.id} value={inv.id}>
                  {inv.invoice_no} — {formatCurrency(inv.total_amount)}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Amount (GHS)" required>
            <input
              type="number"
              step="0.01"
              {...register('amount', { required: true })}
              className="input"
            />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Payment Date" required>
              <input
                type="date"
                {...register('payment_date', { required: true })}
                className="input"
              />
            </FormField>
            <FormField label="Method" required>
              <select {...register('payment_method', { required: true })} className="input">
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="CHEQUE">Cheque</option>
                <option value="CASH">Cash</option>
                <option value="MOBILE_MONEY">Mobile Money</option>
              </select>
            </FormField>
          </div>
          <FormField label="Bank Reference">
            <input {...register('bank_reference')} className="input" />
          </FormField>
          <FormField label="Notes">
            <textarea rows={2} {...register('notes')} className="input" />
          </FormField>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Save
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}