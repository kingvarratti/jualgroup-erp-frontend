import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Eye, Check, X, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { salesApi } from '../../api/sales';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../utils/constants';

export default function Quotations() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [status, setStatus] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['quotations', status],
    queryFn: () => salesApi.quotations.list({ status, page_size: 100 }),
    keepPreviousData: true,
  });

  const approve = useMutation({
    mutationFn: (id) => salesApi.quotations.custom(id, 'finance_approve'),
    onSuccess: () => {
      toast.success('Approved');
      qc.invalidateQueries({ queryKey: ['quotations'] });
    },
  });

  const reject = useMutation({
    mutationFn: (id) => salesApi.quotations.custom(id, 'finance_reject'),
    onSuccess: () => {
      toast.success('Rejected');
      qc.invalidateQueries({ queryKey: ['quotations'] });
    },
  });

  const submit = useMutation({
    mutationFn: (id) => salesApi.quotations.custom(id, 'submit_to_client'),
    onSuccess: () => {
      toast.success('Submitted to client');
      qc.invalidateQueries({ queryKey: ['quotations'] });
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Submit failed'),
  });

  const isFinance = user?.role === ROLES.FINANCE || user?.role === ROLES.ADMIN;
  const isSales =
    [ROLES.SALES_ENG, ROLES.PROJ_ENG_SALES, ROLES.ADMIN].includes(user?.role);

  const columns = [
    {
      key: 'quote_no',
      label: 'Quote No.',
      render: (r) => (
        <span className="font-medium text-blue-700">{r.quote_no}</span>
      ),
    },
    { key: 'enquiry_ref', label: 'Enquiry Ref' },
    {
      key: 'total_amount',
      label: 'Amount',
      render: (r) => formatCurrency(r.total_amount, r.currency),
    },
    { key: 'valid_until', label: 'Valid Until', render: (r) => formatDate(r.valid_until) },
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
          <option value="PENDING_FINANCE">Pending Finance</option>
          <option value="APPROVED_FINANCE">Approved</option>
          <option value="SUBMITTED">Submitted</option>
        </select>
      </div>

      <div className="card">
        <DataTable
          columns={columns}
          data={data?.results}
          loading={isLoading}
          emptyMessage="No quotations found"
          actions={(r) => (
            <div className="flex justify-end gap-1">
              <Link
                to={`/sales/quotations/${r.id}`}
                className="btn-ghost !p-2"
                title="View"
              >
                <Eye className="w-4 h-4" />
              </Link>
              {isFinance && r.status === 'PENDING_FINANCE' && (
                <>
                  <button
                    onClick={() => approve.mutate(r.id)}
                    className="btn-ghost !p-2 text-green-600"
                    title="Approve"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => reject.mutate(r.id)}
                    className="btn-ghost !p-2 text-red-600"
                    title="Reject"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </>
              )}
              {isSales && r.status === 'APPROVED_FINANCE' && (
                <button
                  onClick={() => submit.mutate(r.id)}
                  className="btn-ghost !p-2 text-blue-600"
                  title="Submit to Client"
                >
                  <Send className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        />
      </div>
    </div>
  );
}