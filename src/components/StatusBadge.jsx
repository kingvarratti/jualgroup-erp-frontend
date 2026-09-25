import { STATUS_COLORS } from '../utils/constants';

const COLORS = {
  green: 'bg-green-100 text-green-700 ring-green-600/20',
  red: 'bg-red-100 text-red-700 ring-red-600/20',
  amber: 'bg-amber-100 text-amber-700 ring-amber-600/20',
  blue: 'bg-blue-100 text-blue-700 ring-blue-600/20',
  indigo: 'bg-indigo-100 text-indigo-700 ring-indigo-600/20',
  purple: 'bg-purple-100 text-purple-700 ring-purple-600/20',
  pink: 'bg-pink-100 text-pink-700 ring-pink-600/20',
  cyan: 'bg-cyan-100 text-cyan-700 ring-cyan-600/20',
  orange: 'bg-orange-100 text-orange-700 ring-orange-600/20',
  teal: 'bg-teal-100 text-teal-700 ring-teal-600/20',
  yellow: 'bg-yellow-100 text-yellow-700 ring-yellow-600/20',
  gray: 'bg-slate-100 text-slate-700 ring-slate-600/20',
};

export default function StatusBadge({ status }) {
  const color = STATUS_COLORS[status] || 'gray';
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${COLORS[color]}`}
    >
      {status?.replaceAll('_', ' ') || '—'}
    </span>
  );
}