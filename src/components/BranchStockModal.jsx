import { useQuery } from '@tanstack/react-query';
import { Building2, Package, AlertTriangle } from 'lucide-react';
import Modal from './Modal';
import Loader from './Loader';
import { procurementApi } from '../api/procurement';

export default function BranchStockModal({ item, onClose }) {
  const { data, isLoading } = useQuery({
    queryKey: ['branch-stocks', item?.id],
    queryFn: () =>
      procurementApi.branchStocks.list({ item: item.id, page_size: 100 }),
    enabled: !!item?.id,
  });

  if (!item) return null;

  const stocks = data?.results || [];
  const totalQty = stocks.reduce((s, b) => s + Number(b.quantity_on_hand || 0), 0);

  return (
    <Modal
      open={!!item}
      onClose={onClose}
      title={`Branch Stock — ${item.part_number}`}
      size="md"
    >
      {/* Item summary */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-5">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">
              {item.category_display || item.category}
            </p>
            <p className="text-base font-semibold text-slate-800">
              {item.part_number}
            </p>
            <p className="text-sm text-slate-600 line-clamp-1">
              {item.description}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">Total Across Branches</p>
            <p className="text-2xl font-bold text-slate-800">
              {totalQty}
              <span className="text-sm text-slate-500 font-normal ml-1">
                {item.uom}
              </span>
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <Loader />
      ) : stocks.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <Building2 className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">This item is not stocked in any branch yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {stocks.map((bs) => {
            const qty = Number(bs.quantity_on_hand);
            const rop = Number(bs.reorder_level);
            let statusBadge = null;
            if (qty <= 0) {
              statusBadge = (
                <span className="text-xs font-semibold bg-red-100 text-red-700 ring-1 ring-inset ring-red-600/20 rounded-md px-2 py-0.5">
                  Out of Stock
                </span>
              );
            } else if (qty <= rop) {
              statusBadge = (
                <span className="text-xs font-semibold bg-amber-100 text-amber-700 ring-1 ring-inset ring-amber-600/20 rounded-md px-2 py-0.5">
                  Low Stock
                </span>
              );
            } else {
              statusBadge = (
                <span className="text-xs font-semibold bg-green-100 text-green-700 ring-1 ring-inset ring-green-600/20 rounded-md px-2 py-0.5">
                  In Stock
                </span>
              );
            }

            return (
              <div
                key={bs.id}
                className="flex items-center gap-3 border border-slate-200 rounded-lg p-3 hover:bg-slate-50 transition"
              >
                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-800 truncate">
                      {bs.branch_name}
                    </p>
                    {statusBadge}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {bs.location && (
                      <>
                        <span className="font-mono">{bs.location}</span>
                        {bs.bin_number && (
                          <span className="text-slate-400"> / {bs.bin_number}</span>
                        )}
                        <span className="mx-1.5">·</span>
                      </>
                    )}
                    Reorder at {bs.reorder_level}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p
                    className={`text-lg font-bold ${
                      qty <= 0
                        ? 'text-red-600'
                        : qty <= rop
                        ? 'text-amber-600'
                        : 'text-slate-800'
                    }`}
                  >
                    {qty}
                  </p>
                  <p className="text-xs text-slate-400">{item.uom}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex justify-end mt-5">
        <button onClick={onClose} className="btn-secondary">
          Close
        </button>
      </div>
    </Modal>
  );
}