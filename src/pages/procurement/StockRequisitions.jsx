import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Plus, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { procurementApi } from '../../api/procurement';
import { salesApi } from '../../api/sales';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import FormField from '../../components/FormField';
import StatusBadge from '../../components/StatusBadge';
import { formatDate } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../utils/constants';

export default function StockRequisitions() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [issueModal, setIssueModal] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['stockreqs'],
    queryFn: () => procurementApi.stockRequisitions.list({ page_size: 100 }),
  });

  const { data: clientPOs } = useQuery({
    queryKey: ['clientpos-for-sr'],
    queryFn: () => salesApi.clientPOs.list({ page_size: 200 }),
  });

  const { register, handleSubmit, reset } = useForm();

  const create = useMutation({
    mutationFn: (payload) => procurementApi.stockRequisitions.create(payload),
    onSuccess: () => {
      toast.success('Requisition created');
      qc.invalidateQueries({ queryKey: ['stockreqs'] });
      setModal(false);
      reset();
    },
  });

  const issue = useMutation({
    mutationFn: ({ id, items }) =>
      procurementApi.stockRequisitions.custom(id, 'issue_items', { items }),
    onSuccess: () => {
      toast.success('Items issued');
      qc.invalidateQueries({ queryKey: ['stockreqs'] });
      qc.invalidateQueries({ queryKey: ['inventory'] });
      setIssueModal(null);
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Issue failed'),
  });

  const isStores = [ROLES.STORES, ROLES.ADMIN].includes(user?.role);

  const columns = [
    {
      key: 'req_no',
      label: 'Req No.',
      render: (r) => <span className="font-medium text-blue-700">{r.req_no}</span>,
    },
    { key: 'client_po_no', label: 'Client PO' },
    { key: 'requested_by_name', label: 'Requested By' },
    { key: 'purpose', label: 'Purpose' },
    { key: 'created_at', label: 'Date', render: (r) => formatDate(r.created_at) },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setModal(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> New Stock Requisition
        </button>
      </div>

      <div className="card">
        <DataTable
          columns={columns}
          data={data?.results}
          loading={isLoading}
          emptyMessage="No stock requisitions"
          actions={(r) => (
            <div className="flex justify-end gap-1">
              {isStores && r.status === 'PENDING' && (
                <button
                  onClick={() => setIssueModal(r)}
                  className="btn-ghost !p-2 text-green-600"
                  title="Issue items"
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
        title="New Stock Requisition"
      >
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
          <FormField label="Purpose">
            <input {...register('purpose')} className="input" />
          </FormField>
          <FormField label="Notes">
            <textarea rows={3} {...register('notes')} className="input" />
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

      <IssueModal
        requisition={issueModal}
        onClose={() => setIssueModal(null)}
        onSubmit={(items) => issue.mutate({ id: issueModal.id, items })}
        loading={issue.isPending}
      />
    </div>
  );
}

function IssueModal({ requisition, onClose, onSubmit, loading }) {
  const [items, setItems] = useState({});

  if (!requisition) return null;

  const handleSubmit = () => {
    const payload = Object.entries(items)
      .map(([item_id, quantity]) => ({ item_id, quantity: Number(quantity) }))
      .filter((x) => x.quantity > 0);
    if (!payload.length) return;
    onSubmit(payload);
  };

  return (
    <Modal
      open={!!requisition}
      onClose={onClose}
      title={`Issue Items — ${requisition.req_no}`}
    >
      <div className="space-y-3">
        {requisition.items?.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-3 border border-slate-200 rounded-lg p-3"
          >
            <div className="flex-1">
              <p className="text-sm font-medium">{item.item_detail?.part_number}</p>
              <p className="text-xs text-slate-500">{item.item_detail?.description}</p>
              <p className="text-xs text-slate-500 mt-1">
                Requested: {item.quantity_requested} {item.item_detail?.uom} •
                Available: {item.item_detail?.quantity_on_hand}
              </p>
            </div>
            <input
              type="number"
              placeholder="Qty"
              onChange={(e) =>
                setItems({ ...items, [item.item.id]: e.target.value })
              }
              className="input w-32"
            />
          </div>
        ))}
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={loading} className="btn-primary">
            {loading ? 'Issuing...' : 'Issue Items'}
          </button>
        </div>
      </div>
    </Modal>
  );
}