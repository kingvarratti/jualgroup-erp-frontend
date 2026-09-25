import { Inbox } from 'lucide-react';

export default function EmptyState({ message = 'No data', icon: Icon = Inbox }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-500">
      <Icon className="w-12 h-12 mb-3 opacity-50" />
      <p className="text-sm">{message}</p>
    </div>
  );
}