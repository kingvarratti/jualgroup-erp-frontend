import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { coreApi } from '../../api/core';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import Modal from '../../components/Modal';
import FormField from '../../components/FormField';
import { formatDateTime } from '../../utils/formatters';

export default function Approvals() {
  const qc = useQueryClient();
  const [status, setStatus] = useState('PENDING');
  const [active, setActive] = useState(null);
  const [comments, setComments] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['approvals', status],
    queryFn: () => coreApi.approvals.list({ status, page_size: 100 }),
    keepPreviousData: true,
  });

  const approve = useMutation({
    mutationFn: ({ id, comments }) => coreApi.approvals.custom(id, 'approve', { comments }),
    onSuccess: () => {
      toast.success('Approved');
      qc.invalidateQueries({ queryKey: ['approvals'] });
      setActive(null);
      setComments('');
    },
  });

  const reject = useMutation({
    mutationFn: ({ id, comments }) => coreApi.approvals.custom(id, 'reject', { comments }),
    onSuccess: () => {
      toast.success('Rejected');
      qc.invalidateQueries({ queryKey: ['approvals'] });
      setActive(null);
      setComments('');
    },
  });

  const columns = [
    { key: 'module', label: 'Module' },
    {
      key: 'reference_id',
      label: 'Reference',
      render: (r) => <span className="font-mono text-xs">{r.reference_id.slice(0, 8)}…</span>,
    },
    { key: 'requester_name', label: 'Requester' },
    { key: 'rank', label: 'Rank' },
    {
      key: 'created_at',
      label: 'Requested',
      render: (r) => formatDateTime(r.created_at),
    },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="input w-48"
        >
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="">All</option>
        </select>
      </div>

      <div className="card">
        <DataTable
          columns={columns}
          data={data?.results}
          loading={isLoading}
          emptyMessage="No approvals matching filter"
          onRowClick={(r) => r.status === 'PENDING' && setActive(r)}
          actions={(r) =>
            r.status === 'PENDING' && (
              <div className="flex justify-end gap-1">
                <button
                  onClick={() => setActive(r)}
                  className="btn-ghost !p-2 text-green-600"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={() => reject.mutate({ id: r.id, comments: 'Rejected' })}
                  className="btn-ghost !p-2 text-red-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )
          }
        />
      </div>

      <Modal open={!!active} onClose={() => setActive(null)} title="Approval Decision" size="sm">
        {active && (
          <>
            <div className="bg-slate-50 rounded-lg p-4 mb-4 space-y-2 text-sm">
              <p>
                <span className="text-slate-500">Module:</span>{' '}
                <strong>{active.module}</strong>
              </p>
              <p>
                <span className="text-slate-500">Reference:</span>{' '}
                <strong>{active.reference_id}</strong>
              </p>
              <p>
                <span className="text-slate-500">Requester:</span>{' '}
                <strong>{active.requester_name}</strong>
              </p>
            </div>
            <FormField label="Comments">
              <textarea
                rows={3}
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                className="input"
              />
            </FormField>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => reject.mutate({ id: active.id, comments })}
                className="btn-danger"
              >
                Reject
              </button>
              <button
                onClick={() => approve.mutate({ id: active.id, comments })}
                className="btn-primary"
              >
                Approve
              </button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}