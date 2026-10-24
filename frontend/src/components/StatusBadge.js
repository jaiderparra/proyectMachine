import { STATUS_LABELS } from '@/lib/labels';

export default function StatusBadge({ status }) {
  return <span className={`badge ${status.toLowerCase()}`}>{STATUS_LABELS[status] || status}</span>;
}
