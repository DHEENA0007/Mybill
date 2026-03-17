import { AlertTriangle } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';

export default function ConfirmDialog({ open, onClose, onConfirm, title = 'Are you sure?', message, loading }) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="bg-red-50 rounded-full p-3">
          <AlertTriangle className="w-6 h-6 text-red-500" />
        </div>
        <p className="text-gray-600 text-sm">{message}</p>
        <div className="flex gap-3 w-full">
          <Button variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button variant="danger" onClick={onConfirm} loading={loading} className="flex-1">Confirm</Button>
        </div>
      </div>
    </Modal>
  );
}
