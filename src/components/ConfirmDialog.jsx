import Modal from './Modal';

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Confirm',
  message = 'Are you sure?',
  loading,
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <p className="text-slate-600 mb-6">{message}</p>
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="btn-secondary">
          Cancel
        </button>
        <button onClick={onConfirm} disabled={loading} className="btn-danger">
          {loading ? 'Processing...' : 'Confirm'}
        </button>
      </div>
    </Modal>
  );
}