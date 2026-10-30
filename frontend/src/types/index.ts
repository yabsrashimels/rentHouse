export interface Property {
  id: string
  ownerId: string
  title: string
  slug: string
  description: string
  propertyType: string
  monthlyRent: number
  contactPhone: string
  bedrooms: number
  bathrooms: number
  sizeSquareMeters?: number
  furnished: boolean
  parkingAvailable: boolean
  waterAvailable: boolean
  electricityAvailable: boolean
  amenities: string[]
  region: string
  city: string
  neighborhood?: string
  address?: string
  approximateLatitude?: number
  approximateLongitude?: number
  publicAddressEnabled: boolean
  listingStatus: string
  featuredUntil?: string
  publishedAt?: string
  expiresAt?: string
  viewCount: number
  contactRevealCount: number
  createdAt: string
  updatedAt: string
  images: PropertyImage[]
  owner: Partial<User>
  isFeatured?: boolean
  isFavorited?: boolean
  coverImage?: string
}

export interface PropertyImage {
  id: string
  propertyId: string
  imageUrl: string
  storageKey: string
  displayOrder: number
  isCover: boolean
  altText?: string
  createdAt: string
}

export interface User {
  id: string
  fullName: string
  email: string
  phone: string
  role: 'TENANT' | 'OWNER' | 'ADMIN'
  accountStatus: string
  telegram?: string
  instagram?: string
  profileImageUrl?: string
  emailVerifiedAt?: string
  createdAt: string
}

export interface Payment {
  id: string
  userId: string
  propertyId: string
  packageId: string
  amountInETB: number
  paymentMethod?: string
  transactionReference?: string
  receiptUrl?: string
  paymentStatus: string
  verifiedById?: string
  verifiedAt?: string
  rejectionReason?: string
  createdAt: string
  property?: Partial<Property>
  package?: ListingPackage
  user?: Partial<User>
}

export interface ListingPackage {
  id: string
  name: string
  slug: string
  description?: string
  priceInETB: number
  durationDays: number
  maximumPhotos: number
  featuredPlacement: boolean
  visibilityLevel: string
  active: boolean
}

export interface Notification {
  id: string
  userId: string
  type: string
  title: string
  message: string
  data?: any
  isRead: boolean
  createdAt: string
}

export interface SearchParams {
  city?: string
  neighborhood?: string
  minRent?: string
  maxRent?: string
  bedrooms?: string
  bathrooms?: string
  propertyType?: string
  furnished?: string
  parking?: string
  water?: string
  electricity?: string
  search?: string
  sort?: string
  page?: string
  limit?: string
  featured?: string
}

export interface PaginatedResponse<T> {
  success: boolean
  message: string
  data: T[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
}
