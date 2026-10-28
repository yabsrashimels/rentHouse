import { getStatusLabel } from '../utils/format'

interface StatusBadgeProps {
  status: string
  className?: string
}

const statusStyles: Record<string, string> = {
  PUBLISHED: 'bg-green-100 text-green-800',
  VERIFIED: 'bg-green-100 text-green-800',
  DRAFT: 'bg-gray-100 text-gray-700',
  AWAITING_PAYMENT: 'bg-yellow-100 text-yellow-800',
  PENDING: 'bg-yellow-100 text-yellow-800',
  SUBMITTED: 'bg-yellow-100 text-yellow-800',
  REJECTED: 'bg-red-100 text-red-700',
  SUSPENDED: 'bg-red-100 text-red-700',
  EXPIRED: 'bg-orange-100 text-orange-700',
  RENTED: 'bg-blue-100 text-blue-700',
  AWAITING_MODERATION: 'bg-purple-100 text-purple-700',
  PAYMENT_UNDER_REVIEW: 'bg-purple-100 text-purple-700',
  UNDER_REVIEW: 'bg-purple-100 text-purple-700',
  CANCELLED: 'bg-gray-100 text-gray-600',
}

export default function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const style = statusStyles[status] ?? 'bg-gray-100 text-gray-700'
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${style} ${className}`}
    >
      {getStatusLabel(status)}
    </span>
  )
}
