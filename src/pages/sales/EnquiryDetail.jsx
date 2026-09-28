import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Waves, FileCheck, Package} from 'lucide-react';
import toast from 'react-hot-toast';
import { salesApi } from '../../api/sales';
import Loader from '../../components/Loader';
import StatusBadge from '../../components/StatusBadge';
import Modal from '../../components/Modal';
import FormField from '../../components/FormField';
import { formatCurrency, formatDate } from '../../utils/formatters';
import StockCheckModal from '../../components/StockCheckModal';

export default function EnquiryDetail() {
  const { id } = useParams();
  const qc = useQueryClient();
  const [reviewModal, setReviewModal] = useState(false);
  const [stockCheckModal, setStockCheckModal] = useState(false);

  const { data: enquiry, isLoading } = useQuery({
    queryKey: ['enquiry', id],
    queryFn: () => salesApi.enquiries.get(id),
  });

  const updateStatus = useMutation({
    mutationFn: ({ action, notes }) =>
      salesApi.enquiries.custom(
        id,
        action,
        notes ? { technical_review_notes: notes } : {}
      ),
    onSuccess: () => {
      toast.success('Status updated');
      qc.invalidateQueries({ queryKey: ['enquiry', id] });
    },
    onError: (err) => {
      const msg = err.response?.data?.error || 'Action failed';
      toast.error(msg);
    },
  });

  useEffect(() => {
    if (updateStatus.isSuccess) setReviewModal(false);
  }, [updateStatus.isSuccess]);

  if (isLoading) return <Loader />;
  if (!enquiry) return <div>Enquiry not found</div>;

  const hasPumpSpecs =
    enquiry.requirement_type === 'PUMP' &&
    enquiry.pump_specs &&
    Object.values(enquiry.pump_specs).some((v) => v && String(v).trim());

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/sales/enquiries" className="p-2 rounded-lg hover:bg-slate-100">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h2 className="text-xl font-semibold">{enquiry.reference_no}</h2>
          <p className="text-sm text-slate-500">{enquiry.client_name}</p>
        </div>
        {enquiry.requirement_type_display && (
          <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 font-medium">
            {enquiry.requirement_type_display}
          </span>
        )}
        <StatusBadge status={enquiry.status} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Details Card */}
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
                <p className="text-slate-500">Phone</p>
                <p className="font-medium">{enquiry.client_phone || '—'}</p>
              </div>
              <div>
                <p className="text-slate-500">Estimated Value</p>
                <p className="font-medium">
                  {formatCurrency(enquiry.estimated_value)}
                </p>
              </div>
              {enquiry.client_address && (
                <div className="col-span-2">
                  <p className="text-slate-500">Address</p>
                  <p className="font-medium">{enquiry.client_address}</p>
                </div>
              )}
              {enquiry.application && (
                <div className="col-span-2">
                  <p className="text-slate-500">Application / Use Case</p>
                  <p className="font-medium">{enquiry.application}</p>
                </div>
              )}
              <div className="col-span-2">
                <p className="text-slate-500">Description</p>
                <p className="font-medium">{enquiry.description}</p>
              </div>
              <div>
                <p className="text-slate-500">Received</p>
                <p className="font-medium">{formatDate(enquiry.date_received)}</p>
              </div>
            </div>
          </div>

          {/* Pump Technical Specs Card (only if pump) */}
          {hasPumpSpecs && (
            <div className="card">
              <div className="card-header">
                <h3 className="font-semibold flex items-center gap-2">
                  <Waves className="w-4 h-4 text-blue-600" />
                  Pump Technical Specifications
                </h3>
              </div>
              <div className="card-body grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                {enquiry.pump_specs.fluid_type && (
                  <div>
                    <p className="text-slate-500">Fluid Type</p>
                    <p className="font-medium">{enquiry.pump_specs.fluid_type}</p>
                  </div>
                )}
                {enquiry.pump_specs.flow_rate && (
                  <div>
                    <p className="text-slate-500">Flow Rate</p>
                    <p className="font-medium">{enquiry.pump_specs.flow_rate}</p>
                  </div>
                )}
                {enquiry.pump_specs.head && (
                  <div>
                    <p className="text-slate-500">Head</p>
                    <p className="font-medium">{enquiry.pump_specs.head}</p>
                  </div>
                )}
                {enquiry.pump_specs.temperature && (
                  <div>
                    <p className="text-slate-500">Temperature</p>
                    <p className="font-medium">{enquiry.pump_specs.temperature}</p>
                  </div>
                )}
                {enquiry.pump_specs.pressure && (
                  <div>
                    <p className="text-slate-500">Pressure</p>
                    <p className="font-medium">{enquiry.pump_specs.pressure}</p>
                  </div>
                )}
                {enquiry.pump_specs.motor_voltage && (
                  <div>
                    <p className="text-slate-500">Motor Voltage</p>
                    <p className="font-medium">{enquiry.pump_specs.motor_voltage}</p>
                  </div>
                )}
                {enquiry.pump_specs.motor_power && (
                  <div>
                    <p className="text-slate-500">Motor Power</p>
                    <p className="font-medium">{enquiry.pump_specs.motor_power}</p>
                  </div>
                )}
                {enquiry.pump_specs.pump_type && (
                  <div>
                    <p className="text-slate-500">Pump Type</p>
                    <p className="font-medium">{enquiry.pump_specs.pump_type}</p>
                  </div>
                )}
                {enquiry.pump_specs.application_notes && (
                  <div className="col-span-2 md:col-span-3">
                    <p className="text-slate-500">Application Notes</p>
                    <p className="font-medium">{enquiry.pump_specs.application_notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Technical Review Notes (if reviewed) */}
          {enquiry.technical_review_notes && (
            <div className="card">
              <div className="card-header">
                <h3 className="font-semibold flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-green-600" />
                  Technical Review
                </h3>
                <span className="text-xs text-slate-500">
                  {enquiry.reviewed_by_name || '—'}
                  {enquiry.reviewed_at && ` · ${formatDate(enquiry.reviewed_at)}`}
                </span>
              </div>
              <div className="card-body">
                <p className="text-sm text-slate-700 whitespace-pre-wrap">
                  {enquiry.technical_review_notes}
                </p>
              </div>
            </div>
          )}

          {/* Quotations Card */}
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

        {/* Actions sidebar */}
        <div className="space-y-4">
          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold">Actions</h3>
            </div>
            <div className="card-body space-y-2">
              {enquiry.status === 'RECEIVED' && (
                <button
                  onClick={() => updateStatus.mutate({ action: 'send_to_review' })}
                  className="btn-primary w-full"
                  disabled={updateStatus.isPending}
                >
                  Send to Technical Review
                </button>
              )}
              {enquiry.status === 'TECH_REVIEW' && (
                <button
                  onClick={() => setReviewModal(true)}
                  className="btn-primary w-full"
                  disabled={updateStatus.isPending}
                >
                  Complete Technical Review
                </button>
              )}
              {['TECH_REVIEW', 'QUOTING'].includes(enquiry.status) && (
                <button
                  onClick={() => setStockCheckModal(true)}
                  className="btn-primary w-full"
                >
                  <Package className="w-4 h-4" />
                  Check Stock Availability
                </button>
              )}
              <button
                onClick={() => updateStatus.mutate({ action: 'mark_won' })}
                className="btn-secondary w-full"
                disabled={updateStatus.isPending}
              >
                Mark as Won
              </button>
              <button
                onClick={() => updateStatus.mutate({ action: 'mark_lost' })}
                className="btn-secondary w-full"
                disabled={updateStatus.isPending}
              >
                Mark as Lost
              </button>
            </div>
          </div>
        </div>
      </div>

      <TechnicalReviewModal
        open={reviewModal}
        onClose={() => setReviewModal(false)}
        onSubmit={(notes) =>
          updateStatus.mutate({ action: 'complete_review', notes })
        }
        loading={updateStatus.isPending}
      />

      <StockCheckModal
        enquiry={stockCheckModal ? enquiry : null}
        onClose={() => setStockCheckModal(false)}
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: ['enquiry', id] });
          setStockCheckModal(false);
        }}
      />
    </div>
  );
}


function TechnicalReviewModal({ open, onClose, onSubmit, loading }) {
  const [notes, setNotes] = useState('');

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Complete Technical Review"
      size="md"
    >
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-5 text-sm">
        <p className="font-semibold text-blue-900">Technical Review Notes</p>
        <p className="text-blue-700 mt-1">
          Document your findings: clarifications made, technical feasibility,
          any adjustments to requirements. This unlocks quotation creation.
        </p>
      </div>

      <FormField label="Review Notes" required>
        <textarea
          rows={5}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="input"
          placeholder="e.g. Confirmed pump sizing at 50 m³/h and 30 m head. Motor 415V/3-phase verified."
        />
      </FormField>

      <div className="flex justify-end gap-2 mt-4">
        <button onClick={onClose} className="btn-secondary" disabled={loading}>
          Cancel
        </button>
        <button
          onClick={() => onSubmit(notes)}
          disabled={loading || !notes.trim()}
          className="btn-primary"
        >
          {loading ? 'Saving...' : 'Complete Review'}
        </button>
      </div>
    </Modal>
  );
}