import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { salesApi } from '../../api/sales';
import Loader from '../../components/Loader';
import StatusBadge from '../../components/StatusBadge';
import { formatCurrency, formatDate } from '../../utils/formatters';

export default function EnquiryDetail() {
  const { id } = useParams();
  const qc = useQueryClient();

  const { data: enquiry, isLoading } = useQuery({
    queryKey: ['enquiry', id],
    queryFn: () => salesApi.enquiries.get(id),
  });

  const updateStatus = useMutation({
    mutationFn: ({ action }) => salesApi.enquiries.custom(id, action),
    onSuccess: () => {
      toast.success('Status updated');
      qc.invalidateQueries({ queryKey: ['enquiry', id] });
    },
  });

  if (isLoading) return <Loader />;
  if (!enquiry) return <div>Enquiry not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/sales/enquiries" className="p-2 rounded-lg hover:bg-slate-100">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h2 className="text-xl font-semibold">{enquiry.reference_no}</h2>
          <p className="text-sm text-slate-500">{enquiry.client_name}</p>
        </div>
        <StatusBadge status={enquiry.status} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold">Details</h3>
            </div>
            <div className="card-body grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-500">Contact</p>
                <p className="font-medium">{enquiry.client_contact || '—'}</p>
              </div>
              <div>
                <p className="text-slate-500">Email</p>
                <p className="font-medium">{enquiry.client_email || '—'}</p>
              </div>
              <div>
                <p className="text-slate-500">Estimated Value</p>
                <p className="font-medium">{formatCurrency(enquiry.estimated_value)}</p>
              </div>
              <div>
                <p className="text-slate-500">Received</p>
                <p className="font-medium">{formatDate(enquiry.date_received)}</p>
              </div>
              <div className="col-span-2">
                <p className="text-slate-500">Description</p>
                <p className="font-medium">{enquiry.description}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold">Quotations</h3>
            </div>
            <div className="card-body">
              {enquiry.quotations?.length ? (
                <ul className="divide-y divide-slate-100">
                  {enquiry.quotations.map((q) => (
                    <li key={q.id} className="py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{q.quote_no}</p>
                        <p className="text-xs text-slate-500">
                          {formatCurrency(q.total_amount, q.currency)}
                        </p>
                      </div>
                      <StatusBadge status={q.status} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500">No quotations yet.</p>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold">Actions</h3>
            </div>
            <div className="card-body space-y-2">
              <button
                onClick={() => updateStatus.mutate({ action: 'mark_won' })}
                className="btn-primary w-full"
              >
                Mark as Won
              </button>
              <button
                onClick={() => updateStatus.mutate({ action: 'mark_lost' })}
                className="btn-secondary w-full"
              >
                Mark as Lost
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}