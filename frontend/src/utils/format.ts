export const formatETB = (amount: number | string): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return `ETB ${num.toLocaleString('en-ET', { minimumFractionDigits: 0 })}`
}

export const formatBirr = (amount: number | string): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return `${num.toLocaleString('en-ET', { minimumFractionDigits: 0 })} ብር`
}

export const formatETBWithBirr = (amount: number | string): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  const formatted = num.toLocaleString('en-ET', { minimumFractionDigits: 0 })
  return `ETB ${formatted} (${formatted} ብር)`
}

export const formatDate = (date: string | Date): string => {
  return new Date(date).toLocaleDateString('en-ET', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export const formatRelativeTime = (date: string | Date): string => {
  const now = Date.now()
  const then = new Date(date).getTime()
  const diff = now - then
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 30) return `${days} days ago`
  return formatDate(date)
}

export const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    // Payment
    PENDING: 'Pending',
    SUBMITTED: 'Pending Review',
    UNDER_REVIEW: 'Under Review',
    VERIFIED: 'Accepted',
    REJECTED: 'Rejected',
    CANCELLED: 'Cancelled',
    REFUNDED: 'Refunded',
    // Listing
    DRAFT: 'Draft',
    AWAITING_PAYMENT: 'Awaiting Payment',
    PAYMENT_UNDER_REVIEW: 'Payment Pending',
    AWAITING_MODERATION: 'Under Review',
    PUBLISHED: 'Published',
    EXPIRED: 'Expired',
    RENTED: 'Rented',
    SUSPENDED: 'Suspended',
  }
  return labels[status] || status.replace(/_/g, ' ')
}

export const getPropertyTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    APARTMENT: 'Apartment',
    HOUSE: 'House',
    VILLA: 'Villa',
    STUDIO: 'Studio',
    CONDO: 'Condo',
    ROOM: 'Room',
    COMMERCIAL: 'Commercial',
    LAND: 'Land',
  }
  return labels[type] || type
}

export const ETHIOPIAN_CITIES = [
  'Addis Ababa',
  'Dire Dawa',
  'Mekelle',
  'Adama',
  'Gondar',
  'Hawassa',
  'Bahir Dar',
  'Dessie',
  'Jimma',
  'Jijiga',
  'Shashamane',
  'Bishoftu',
  'Sodo',
  'Arba Minch',
  'Harar',
  'Dilla',
  'Nekemte',
  'Debre Birhan',
  'Asela',
  'Ambo',
]

export const ADDIS_NEIGHBORHOODS = [
  'Bole',
  'Kazanchis',
  'Kirkos',
  'Yeka',
  'Arada',
  'Lideta',
  'Nifas Silk-Lafto',
  'Kolfe Keranio',
  'Gulele',
  'Akaki Kaliti',
  'Mekanisa',
  'CMC',
  'Summit',
  'Ayat',
  'Gerji',
  'Sarbet',
  'Piassa',
  'Arat Kilo',
  'Sidist Kilo',
  'Mexico',
  'Stadium',
]
