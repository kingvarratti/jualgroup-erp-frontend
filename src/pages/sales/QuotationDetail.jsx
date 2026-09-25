import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { salesApi } from '../../api/sales';
import Loader from '../../components/Loader';
import StatusBadge from '../../components/StatusBadge';
import { formatCurrency, formatDate } from '../../utils/formatters';

export default function QuotationDetail() {
  const { id } = useParams();

  const { data: q, isLoading } = useQuery({
    queryKey: ['quotation', id],
    queryFn: () => salesApi.quotations.get(id),
  });

  if (isLoading) return <Loader />;
  if (!q) return <div>Not found</div>;

  const needsApproval = Number(q.total_amount) > 100000;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/sales/quotations" className="p-2 rounded-lg hover:bg-slate-100">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h2 className="text-xl font-semibold flex-1">{q.quote_no}</h2>
        <StatusBadge status={q.status} />
      </div>

      {needsApproval && q.status === 'PENDING_FINANCE' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-800">Finance Approval Required</p>
            <p className="text-sm text-amber-700 mt-1">
              This quotation exceeds GHS 100,000 and cannot be submitted to the client
              until Finance approves it.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card">
          <div className="card-header">
            <h3 className="font-semibold">Quotation Details</h3>
          </div>
          <div className="card-body grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-500">Enquiry</p>
              <p className="font-medium">{q.enquiry_ref}</p>
            </div>
            <div>
              <p className="text-slate-500">Amount</p>
              <p className="font-medium">
                {formatCurrency(q.total_amount, q.currency)}
              </p>
            </div>
            <div>
              <p className="text-slate-500">Prepared By</p>
              <p className="font-medium">{q.prepared_by_name || '—'}</p>
            </div>
            <div>
              <p className="text-slate-500">Valid Until</p>
              <p className="font-medium">{formatDate(q.valid_until)}</p>
            </div>
            <div className="col-span-2">
              <p className="text-slate-500">Terms</p>
              <p className="font-medium">{q.terms || '—'}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold">Line Items</h3>
          </div>
          <div className="card-body p-0">
            {q.line_items?.length ? (
              <table className="table">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Qty</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {q.line_items.map((li) => (
                    <tr key={li.id}>
                      <td>{li.description}</td>
                      <td>{li.quantity}</td>
                      <td>{formatCurrency(li.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-slate-500 p-6">No line items</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}