import { Inbox } from 'lucide-react';

export default function EmptyState({
  title = 'Nothing here yet',
  message = 'No records found. Get started by creating one.',
  icon: Icon = Inbox,
  action,
  compact = false,
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${
        compact ? 'py-8' : 'py-16'
      }`}
    >
      <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-slate-400" />
      </div>
      <h3 className="text-base font-semibold text-slate-800 mb-1">{title}</h3>
      <p className="text-sm text-slate-500 max-w-sm mb-4">{message}</p>
      {action && <div>{action}</div>}
    </div>
  );
}