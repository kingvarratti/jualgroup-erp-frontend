import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Trophy, DollarSign, Clock, Check, Building2, ExternalLink,
  TrendingDown, Zap, Award,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from './Modal';
import Loader from './Loader';
import { procurementApi } from '../api/procurement';
import { formatCurrency, formatDate } from '../utils/formatters';

export default function QuoteComparisonModal({ rfq, onClose, onSelect }) {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['rfq-quotes', rfq?.id],
    queryFn: () => procurementApi.rfqs.custom(rfq.id, 'quotes'),
    enabled: !!rfq?.id,
  });

  const selectMutation = useMutation({
    mutationFn: (quoteId) =>
      procurementApi.rfqs.custom(rfq.id, 'select_quote', { quote_id: quoteId }),
    onSuccess: (res) => {
      toast.success(`✓ Selected: ${res.supplier_name}`);
      qc.invalidateQueries({ queryKey: ['rfqs'] });
      qc.invalidateQueries({ queryKey: ['rfq-quotes', rfq.id] });
      if (onSelect) onSelect(res);
      onClose();
    },
    onError: () => toast.error('Failed to select quote'),
  });

  if (!rfq) return null;

  const quotes = data?.quotes || [];
  const cheapestId = data?.cheapest_id;
  const fastestId = data?.fastest_id;
  const bestOverallId = data?.best_overall_id;

  return (
    <Modal
      open={!!rfq}
      onClose={onClose}
      title={`Quote Comparison — ${rfq.rfq_no}`}
      size="xl"
    >
      {/* RFQ info */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">
              Item Requested
            </p>
            <p className="text-sm font-medium text-slate-800 mt-1">
              {rfq.item_description}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Quantity: <strong>{rfq.quantity}</strong>
              {rfq.enquiry_ref && ` • Enquiry: ${rfq.enquiry_ref}`}
              {rfq.client_po_no && ` • Client PO: ${rfq.client_po_no}`}
            </p>
          </div>
          <div className="text-right text-xs text-slate-500">
            {rfq.sourcing_type_display && (
              <span className="inline-block px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-medium mb-1">
                {rfq.sourcing_type_display}
              </span>
            )}
          </div>
        </div>
      </div>

      {isLoading ? (
        <Loader />
      ) : quotes.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <Building2 className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-sm font-medium">No quotes received yet</p>
          <p className="text-xs text-slate-400 mt-1">
            Add supplier quotes to this RFQ to compare them side by side.
          </p>
        </div>
      ) : (
        <>
          {/* Recommendation banner */}
          {bestOverallId && quotes.length > 1 && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mb-5 flex items-start gap-3">
              <Award className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-blue-900">
                  Best overall recommendation
                </p>
                <p className="text-blue-700 mt-1">
                  <strong>
                    {quotes.find((q) => q.id === bestOverallId)?.supplier_name}
                  </strong>{' '}
                  — best balance of price and delivery time (weighted 70% price / 30% lead time)
                </p>
              </div>
            </div>
          )}

          {/* Comparison table */}
          <div className="border border-slate-200 rounded-lg overflow-hidden mb-5">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">
                    Supplier
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase">
                    Unit Price
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase">
                    Total
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase">
                    Lead Time
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase">
                    Received
                  </th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {quotes.map((q) => {
                  const isBestOverall = q.id === bestOverallId;
                  return (
                    <tr
                      key={q.id}
                      className={`border-t border-slate-100 ${
                        q.is_selected
                          ? 'bg-green-50'
                          : isBestOverall
                          ? 'bg-blue-50/50'
                          : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-slate-800">
                            {q.supplier_name}
                          </span>
                          {q.supplier_is_ksb && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-semibold">
                              KSB
                            </span>
                          )}
                          {q.supplier_is_international && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 font-semibold">
                              INTL
                            </span>
                          )}
                          {q.is_selected && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-600 text-white font-semibold flex items-center gap-0.5">
                              <Check className="w-2.5 h-2.5" /> SELECTED
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-right font-mono text-slate-700">
                        {formatCurrency(q.unit_price)}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          <span className="font-semibold text-slate-800">
                            {formatCurrency(q.total_price)}
                          </span>
                          {q.is_cheapest && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700 font-semibold flex items-center gap-0.5">
                              <TrendingDown className="w-2.5 h-2.5" /> CHEAPEST
                            </span>
                          )}
                          {!q.is_cheapest && q.price_delta > 0 && (
                            <span className="text-xs text-red-500 font-mono">
                              +{formatCurrency(q.price_delta)}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          <span className="text-slate-700">
                            {q.lead_time_days} days
                          </span>
                          {q.is_fastest && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-100 text-cyan-700 font-semibold flex items-center gap-0.5">
                              <Zap className="w-2.5 h-2.5" /> FASTEST
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-right text-xs text-slate-500">
                        {formatDate(q.received_at)}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {q.quote_file && (
                            <a
                              href={q.quote_file}
                              target="_blank"
                              rel="noreferrer"
                              className="btn-ghost !p-2 text-slate-600"
                              title="View quote file"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                          {!q.is_selected && (
                            <button
                              onClick={() => selectMutation.mutate(q.id)}
                              disabled={selectMutation.isPending}
                              className="btn-primary text-xs !py-1.5"
                              title="Select this quote"
                            >
                              Select
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mb-4">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
              Cheapest price
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-cyan-500"></span>
              Fastest delivery
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-blue-500"></span>
              Best overall (70% price / 30% speed)
            </span>
          </div>
        </>
      )}

      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="btn-secondary">
          Close
        </button>
      </div>
    </Modal>
  );
}