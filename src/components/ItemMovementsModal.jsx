import { useQuery } from '@tanstack/react-query';
import {
  ArrowDownCircle, ArrowUpCircle, Sliders, RefreshCw,
  FileText, User as UserIcon,
} from 'lucide-react';
import Modal from './Modal';
import Loader from './Loader';
import { procurementApi } from '../api/procurement';
import { formatDate, formatDateTime } from '../utils/formatters';

const MOVEMENT_TYPES = {
  IN: {
    label: 'Stock In',
    icon: ArrowDownCircle,
    color: 'text-green-600',
    bg: 'bg-green-50',
    border: 'border-green-200',
    badge: 'bg-green-100 text-green-700 ring-green-600/20',
    sign: '+',
  },
  OUT: {
    label: 'Stock Out',
    icon: ArrowUpCircle,
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200',
    badge: 'bg-red-100 text-red-700 ring-red-600/20',
    sign: '−',
  },
  ADJUST: {
    label: 'Adjustment',
    icon: Sliders,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    badge: 'bg-amber-100 text-amber-700 ring-amber-600/20',
    sign: '±',
  },
  TRANSFER: {
    label: 'Transfer',
    icon: RefreshCw,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    badge: 'bg-blue-100 text-blue-700 ring-blue-600/20',
    sign: '↔',
  },
  CANNIBAL: {
    label: 'Cannibalisation',
    icon: ArrowUpCircle,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    badge: 'bg-purple-100 text-purple-700 ring-purple-600/20',
    sign: '−',
  },
};

export default function ItemMovementsModal({ item, onClose }) {
  const { data, isLoading } = useQuery({
    queryKey: ['item-movements', item?.id],
    queryFn: () => procurementApi.inventory.custom(item.id, 'movements'),
    enabled: !!item?.id,
  });

  if (!item) return null;

  const movements = data || [];

  // Calculate totals
  const totalIn = movements
    .filter((m) => m.movement_type === 'IN')
    .reduce((sum, m) => sum + Number(m.quantity), 0);
  const totalOut = movements
    .filter((m) => ['OUT', 'CANNIBAL'].includes(m.movement_type))
    .reduce((sum, m) => sum + Number(m.quantity), 0);
  const totalAdjust = movements
    .filter((m) => m.movement_type === 'ADJUST')
    .reduce((sum, m) => {
      const from = Number(m.from_location) || 0;
      const to = Number(m.to_location) || 0;
      return sum + (to - from);
    }, 0);

  return (
    <Modal
      open={!!item}
      onClose={onClose}
      title={`Stock Movements — ${item.part_number}`}
      size="lg"
    >
      {/* Item summary */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-5">
        <div className="flex items-start justify-between gap-4">
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
          <div className="text-right flex-shrink-0">
            <p className="text-xs text-slate-500">Current Stock</p>
            <p className="text-2xl font-bold text-slate-800">
              {item.quantity_on_hand}
              <span className="text-sm text-slate-500 font-normal ml-1">
                {item.uom}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Totals row */}
      {movements.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <ArrowDownCircle className="w-3.5 h-3.5 text-green-600" />
              <span className="text-[10px] font-semibold text-green-700 uppercase tracking-wide">
                Total In
              </span>
            </div>
            <p className="text-lg font-bold text-green-700">
              +{totalIn}
              <span className="text-xs font-normal ml-1">{item.uom}</span>
            </p>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <ArrowUpCircle className="w-3.5 h-3.5 text-red-600" />
              <span className="text-[10px] font-semibold text-red-700 uppercase tracking-wide">
                Total Out
              </span>
            </div>
            <p className="text-lg font-bold text-red-700">
              −{totalOut}
              <span className="text-xs font-normal ml-1">{item.uom}</span>
            </p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Sliders className="w-3.5 h-3.5 text-amber-600" />
              <span className="text-[10px] font-semibold text-amber-700 uppercase tracking-wide">
                Net Adjust
              </span>
            </div>
            <p className={`text-lg font-bold ${totalAdjust >= 0 ? 'text-amber-700' : 'text-red-700'}`}>
              {totalAdjust >= 0 ? '+' : ''}{totalAdjust}
              <span className="text-xs font-normal ml-1">{item.uom}</span>
            </p>
          </div>
        </div>
      )}

      {/* Movement list */}
      {isLoading ? (
        <Loader />
      ) : movements.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <FileText className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm font-medium">No movements recorded yet</p>
          <p className="text-xs text-slate-400 mt-1">
            Stock movements will appear here once items are received, issued, or adjusted.
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
          {movements.map((m) => {
            const cfg = MOVEMENT_TYPES[m.movement_type] || MOVEMENT_TYPES.IN;
            const Icon = cfg.icon;
            return (
              <div
                key={m.id}
                className={`flex items-start gap-3 p-3 rounded-lg border ${cfg.bg} ${cfg.border}`}
              >
                <div className={`w-8 h-8 rounded-full bg-white flex items-center justify-center flex-shrink-0 ${cfg.color}`}>
                  <Icon className="w-4 h-4" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${cfg.badge}`}>
                        {cfg.label}
                      </span>
                      <span className={`font-bold ${cfg.color}`}>
                        {cfg.sign}{m.quantity} {item.uom}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500 whitespace-nowrap">
                      {formatDateTime(m.timestamp)}
                    </span>
                  </div>

                  {m.reference && (
                    <p className="text-xs text-slate-600 mt-1">
                      <span className="text-slate-400">Ref:</span>{' '}
                      <span className="font-mono">{m.reference}</span>
                    </p>
                  )}

                  {m.reason && (
                    <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">
                      {m.reason}
                    </p>
                  )}

                  {m.movement_type === 'ADJUST' && m.from_location && m.to_location && (
                    <p className="text-xs text-slate-500 mt-1">
                      <span className="font-mono">{m.from_location}</span>
                      {' → '}
                      <span className="font-mono">{m.to_location}</span>
                      <span className="ml-1">{item.uom}</span>
                    </p>
                  )}

                  {m.performed_by && (
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                      <UserIcon className="w-3 h-3" />
                      {m.performed_by_name || m.performed_by}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer */}
      <div className="flex justify-end mt-5">
        <button onClick={onClose} className="btn-secondary">
          Close
        </button>
      </div>
    </Modal>
  );
}