import { AlertTriangle } from 'lucide-react';
import Modal from './Modal';

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Confirm',
  message = 'Are you sure?',
  confirmLabel = 'Confirm',
  loading,
  variant = 'danger',
}) {
  const btnClass = variant === 'danger' ? 'btn-danger' : 'btn-primary';

  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <div className="flex items-start gap-4 mb-6">
        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
        </div>
        <p className="text-slate-600 pt-1.5">{message}</p>
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="btn-secondary">
          Cancel
        </button>
        <button onClick={onConfirm} disabled={loading} className={btnClass}>
          {loading ? 'Processing...' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}