interface StatusBadgeProps {
  status: string
  className?: string
}

// Map internal DB statuses → human-readable labels
const LABELS: Record<string, string> = {
  // Payment statuses
  PENDING: 'Pending',
  SUBMITTED: 'Pending Review',
  UNDER_REVIEW: 'Under Review',
  VERIFIED: 'Accepted',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
  REFUNDED: 'Refunded',
  // Listing statuses
  DRAFT: 'Draft',
  AWAITING_PAYMENT: 'Awaiting Payment',
  PAYMENT_UNDER_REVIEW: 'Payment Pending',
  AWAITING_MODERATION: 'Under Review',
  PUBLISHED: 'Published',
  EXPIRED: 'Expired',
  RENTED: 'Rented',
  SUSPENDED: 'Suspended',
  // Generic
  ACTIVE: 'Active',
  DEACTIVATED: 'Inactive',
}

// Map to Tailwind colour classes
const STYLES: Record<string, string> = {
  PUBLISHED:              'bg-green-100 text-green-800',
  VERIFIED:               'bg-green-100 text-green-800',
  ACTIVE:                 'bg-green-100 text-green-800',
  DRAFT:                  'bg-gray-100 text-gray-700',
  DEACTIVATED:            'bg-gray-100 text-gray-600',
  CANCELLED:              'bg-gray-100 text-gray-600',
  AWAITING_PAYMENT:       'bg-yellow-100 text-yellow-800',
  PENDING:                'bg-yellow-100 text-yellow-800',
  SUBMITTED:              'bg-yellow-100 text-yellow-800',
  PAYMENT_UNDER_REVIEW:   'bg-purple-100 text-purple-700',
  AWAITING_MODERATION:    'bg-purple-100 text-purple-700',
  UNDER_REVIEW:           'bg-purple-100 text-purple-700',
  REJECTED:               'bg-red-100 text-red-700',
  SUSPENDED:              'bg-red-100 text-red-700',
  EXPIRED:                'bg-orange-100 text-orange-700',
  RENTED:                 'bg-blue-100 text-blue-700',
  REFUNDED:               'bg-sky-100 text-sky-700',
}

export function getStatusLabel(status: string): string {
  return LABELS[status] ?? status.replace(/_/g, ' ')
}

export default function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const style = STYLES[status] ?? 'bg-gray-100 text-gray-700'
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${style} ${className}`}
    >
      {getStatusLabel(status)}
    </span>
  )
}
