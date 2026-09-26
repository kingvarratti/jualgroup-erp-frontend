import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Plus, Send, FileText, Package, Trophy} from 'lucide-react';
import toast from 'react-hot-toast';
import { procurementApi } from '../../api/procurement';
import { salesApi } from '../../api/sales';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import FormField from '../../components/FormField';
import StatusBadge from '../../components/StatusBadge';
import ExportMenu from '../../components/ExportMenu';
import QuoteComparisonModal from '../../components/QuoteComparisonModal';

const SOURCING_TYPES = [
  { value: 'LOCAL', label: 'Local Supplier', desc: 'Ghanaian supplier' },
  { value: 'INTERNATIONAL', label: 'International', desc: 'Overseas supplier' },
  { value: 'KSB', label: 'KSB Direct', desc: 'Direct from manufacturer' },
];

export default function RFQs() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [status, setStatus] = useState('');
  const [compareRFQ, setCompareRFQ] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['rfqs', status],
    queryFn: () => procurementApi.rfqs.list({ status, page_size: 100 }),
    keepPreviousData: true,
  });

  const { data: clientPOs } = useQuery({
    queryKey: ['clientpos-rfq'],
    queryFn: () => salesApi.clientPOs.list({ page_size: 500 }),
  });

  const { data: enquiries } = useQuery({
    queryKey: ['enquiries-rfq'],
    queryFn: () => salesApi.enquiries.list({ page_size: 500 }),
  });

  const columns = [
    {
      key: 'rfq_no',
      label: 'RFQ No.',
      render: (r) => <span className="font-medium text-blue-700">{r.rfq_no}</span>,
    },
    {
      key: 'enquiry_ref',
      label: 'Reference',
      render: (r) =>
        r.client_po_no ? (
          <span className="text-sm">
            <span className="text-slate-400">PO:</span> {r.client_po_no}
          </span>
        ) : r.enquiry_ref ? (
          <span className="text-sm">
            <span className="text-slate-400">Enq:</span> {r.enquiry_ref}
          </span>
        ) : (
          <span className="text-xs text-slate-400">—</span>
        ),
    },
    {
      key: 'item_description',
      label: 'Item',
      render: (r) => (
        <span className="line-clamp-1 max-w-xs text-sm">{r.item_description}</span>
      ),
    },
    { key: 'quantity', label: 'Qty', className: 'text-right' },
    {
      key: 'sourcing_type_display',
      label: 'Sourcing',
      render: (r) =>
        r.sourcing_type_display ? (
          <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700">
            {r.sourcing_type_display}
          </span>
        ) : (
          <span className="text-xs text-slate-400">—</span>
        ),
    },
    {
      key: 'quote_count',
      label: 'Quotes',
      className: 'text-center',
      render: (r) => (
        <span
          className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold ${
            r.quote_count > 0
              ? 'bg-green-100 text-green-700'
              : 'bg-slate-100 text-slate-500'
          }`}
        >
          {r.quote_count}
        </span>
      ),
    },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="input w-56"
        >
          <option value="">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="SENT">Sent</option>
          <option value="RECEIVED">Quotes Received</option>
          <option value="CLOSED">Closed</option>
        </select>

        <div className="flex items-center gap-2">
          <ExportMenu
            columns={columns}
            data={data?.results || []}
            filename={`rfqs-${new Date().toISOString().slice(0, 10)}`}
            title="Supplier RFQs"
          />
          <button onClick={() => setModal(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> New RFQ
          </button>
        </div>
      </div>

      <div className="card">
                <DataTable
          columns={columns}
          data={data?.results}
          loading={isLoading}
          emptyTitle="No RFQs yet"
          emptyMessage="Create an RFQ to request quotes from suppliers."
          emptyIcon={Send}
          actions={(r) => (
            <div className="flex justify-end">
              <button
                onClick={() => setCompareRFQ(r)}
                className="btn-ghost !p-2 text-blue-600"
                title="Compare Quotes"
              >
                <Trophy className="w-4 h-4" />
              </button>
            </div>
          )}
        />
      </div>

      <RFQModal
        open={modal}
        onClose={() => setModal(false)}
        clientPOs={clientPOs?.results || []}
        enquiries={enquiries?.results || []}
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: ['rfqs'] });
          setModal(false);
        }}
      />
    </div>
  );

        <QuoteComparisonModal
        rfq={compareRFQ}
        onClose={() => setCompareRFQ(null)}
      />
}


function RFQModal({ open, onClose, clientPOs, enquiries, onSuccess }) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm();
  const [referenceType, setReferenceType] = useState('ENQUIRY');
  const [sourcingType, setSourcingType] = useState('LOCAL');

  const createMutation = useMutation({
    mutationFn: (payload) => procurementApi.rfqs.create(payload),
    onSuccess: () => {
      toast.success('RFQ created');
      reset();
      setSourcingType('LOCAL');
      onSuccess();
    },
    onError: (err) => {
      console.error('RFQ error:', err.response?.data || err);
      const msg = err.response?.data
        ? Object.values(err.response.data).flat().join(', ')
        : 'Failed to create RFQ';
      toast.error(msg);
    },
  });

  const onSubmit = (values) => {
    const payload = {
      enquiry: referenceType === 'ENQUIRY' ? values.reference : null,
      client_po: referenceType === 'CLIENT_PO' ? values.reference : null,
      sourcing_type: sourcingType,
      item_description: values.item_description,
      quantity: values.quantity.toString(),
      due_date: values.due_date || null,
      notes: values.notes || '',
      status: 'DRAFT',
    };
    createMutation.mutate(payload);
  };

  return (
    <Modal open={open} onClose={onClose} title="New Supplier RFQ" size="lg">
      <form onSubmit={handleSubmit(onSubmit)}>
        <FormField label="Link this RFQ to" required>
          <div className="flex gap-2 mb-3">
            <button
              type="button"
              onClick={() => setReferenceType('ENQUIRY')}
              className={`flex-1 p-3 rounded-lg border-2 text-sm font-medium transition ${
                referenceType === 'ENQUIRY'
                  ? 'border-blue-500 bg-blue-50 text-blue-800'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              <Package className="w-4 h-4 mx-auto mb-1" />
              Enquiry (pre-sale sourcing)
            </button>
            <button
              type="button"
              onClick={() => setReferenceType('CLIENT_PO')}
              className={`flex-1 p-3 rounded-lg border-2 text-sm font-medium transition ${
                referenceType === 'CLIENT_PO'
                  ? 'border-blue-500 bg-blue-50 text-blue-800'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              <FileText className="w-4 h-4 mx-auto mb-1" />
              Client PO (won project)
            </button>
          </div>

          <select
            {...register('reference', { required: 'Required' })}
            className="input"
          >
            <option value="">
              — Select {referenceType === 'ENQUIRY' ? 'Enquiry' : 'Client PO'} —
            </option>
            {referenceType === 'ENQUIRY'
              ? enquiries.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.reference_no} — {e.client_name}
                  </option>
                ))
              : clientPOs.map((po) => (
                  <option key={po.id} value={po.id}>
                    {po.internal_order_no} — {po.client_po_number}
                  </option>
                ))}
          </select>
          {errors.reference && (
            <p className="mt-1 text-xs text-red-600">{errors.reference.message}</p>
          )}
        </FormField>

        <FormField label="Sourcing Type" required>
          <div className="grid grid-cols-3 gap-2">
            {SOURCING_TYPES.map((st) => (
              <button
                key={st.value}
                type="button"
                onClick={() => setSourcingType(st.value)}
                className={`p-3 rounded-lg border-2 text-left transition ${
                  sourcingType === st.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <p className="text-sm font-medium text-slate-800">{st.label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{st.desc}</p>
              </button>
            ))}
          </div>
        </FormField>

        <FormField label="Item Description" required error={errors.item_description}>
          <textarea
            rows={3}
            {...register('item_description', { required: 'Required' })}
            className="input"
            placeholder="e.g. ABB S201-C32 Miniature Circuit Breaker 32A 1P"
          />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Quantity" required error={errors.quantity}>
            <input
              type="number"
              step="0.01"
              {...register('quantity', { required: 'Required' })}
              className="input"
            />
          </FormField>
          <FormField label="Response Due By">
            <input type="date" {...register('due_date')} className="input" />
          </FormField>
        </div>

        <FormField label="Notes">
          <textarea rows={2} {...register('notes')} className="input" />
        </FormField>

        <div className="flex justify-end gap-2 mt-4">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="btn-primary"
          >
            {createMutation.isPending ? 'Creating...' : 'Create RFQ'}
          </button>
        </div>
      </form>
    </Modal>
  );
}