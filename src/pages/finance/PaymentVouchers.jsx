import PVFilingModal from '../../components/PVFilingModal';
import { FolderArchive } from 'lucide-react';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Plus, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { financeApi } from '../../api/finance';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import FormField from '../../components/FormField';
import StatusBadge from '../../components/StatusBadge';
import { formatCurrency, formatDate } from '../../utils/formatters';

export default function PaymentVouchers() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [filingPV, setFilingPV] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['pvs'],
    queryFn: () => financeApi.paymentVouchers.list({ page_size: 100 }),
  });

  const { register, handleSubmit, reset } = useForm();

  const create = useMutation({
    mutationFn: (payload) => financeApi.paymentVouchers.create(payload),
    onSuccess: () => {
      toast.success('Voucher created');
      qc.invalidateQueries({ queryKey: ['pvs'] });
      setModal(false);
      reset();
    },
  });

  const authorize = useMutation({
    mutationFn: (id) => financeApi.paymentVouchers.custom(id, 'authorize'),
    onSuccess: () => {
      toast.success('Voucher authorized');
      qc.invalidateQueries({ queryKey: ['pvs'] });
    },
  });

  const columns = [
    {
      key: 'pv_no',
      label: 'Voucher No.',
      render: (r) => <span className="font-medium text-blue-700">{r.pv_no}</span>,
    },
    { key: 'payable_to', label: 'Payable To' },
    { key: 'amount', label: 'Amount', render: (r) => formatCurrency(r.amount) },
    { key: 'purpose', label: 'Purpose' },
    { key: 'created_at', label: 'Created', render: (r) => formatDate(r.created_at) },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setModal(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> New Voucher
        </button>
      </div>

      <div className="card">
        <DataTable
          columns={columns}
          data={data?.results}
          loading={isLoading}
          emptyMessage="No payment vouchers"
                    actions={(r) => (
            <div className="flex justify-end gap-1">
              {r.status === 'DRAFT' && (
                <button
                  onClick={() => authorize.mutate(r.id)}
                  className="btn-ghost !p-2 text-green-600"
                  title="Authorize"
                >
                  <Check className="w-4 h-4" />
                </button>
              )}
              {['AUTHORIZED', 'PAID'].includes(r.status) && (
                <button
                  onClick={() => setFilingPV(r)}
                  className="btn-ghost !p-2 text-slate-600"
                  title="File Voucher"
                >
                  <FolderArchive className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        />
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="New Payment Voucher">
        <form onSubmit={handleSubmit((v) => create.mutate(v))}>
          <FormField label="Payable To" required>
            <input {...register('payable_to', { required: true })} className="input" />
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
            <FormField label="Purpose" required>
              <input {...register('purpose', { required: true })} className="input" />
            </FormField>
          </div>
          <FormField label="Bank Details">
            <textarea rows={2} {...register('bank_details')} className="input" />
          </FormField>
          <FormField label="Narration">
            <textarea rows={3} {...register('narration')} className="input" />
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
            <PVFilingModal pv={filingPV} onClose={() => setFilingPV(null)} />
    </div>
  );
}