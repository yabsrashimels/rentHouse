import api from './api'

async function getAuthorizedReceiptUrl(id: string) {
  const metadata = await api.get(`/payments/${id}/receipt`)
  if (metadata.data.data.local) {
    const file = await api.get(`/payments/${id}/receipt/file`, { responseType: 'blob' })
    return URL.createObjectURL(file.data)
  }
  return metadata.data.data.url as string
}

export interface LoginData {
  email: string
  password: string
}

export interface RegisterData {
  fullName: string
  email: string
  phone: string
  password: string
}

export const authService = {
  async login(data: LoginData) {
    const res = await api.post('/auth/login', data)
    return { user: res.data.data.user }
  },

  async register(data: RegisterData) {
    const res = await api.post('/auth/register', data)
    return { user: res.data.data.user }
  },

  async logout() {
    await api.post('/auth/logout')
  },

  async getMe() {
    const res = await api.get('/auth/me')
    return res.data.data.user
  },

  async becomeHost() {
    const res = await api.post('/auth/become-host')
    return res.data.data.user
  },

  async forgotPassword(email: string) {
    const res = await api.post('/auth/forgot-password', { email })
    return res.data
  },

  async resetPassword(token: string, password: string) {
    const res = await api.post('/auth/reset-password', { token, password })
    return res.data
  },
}

export const propertyService = {
  async getProperties(params: Record<string, any> = {}) {
    const res = await api.get('/properties', { params })
    return res.data
  },

  async getFeatured() {
    const res = await api.get('/properties/featured')
    return res.data.data
  },

  async getRecent() {
    const res = await api.get('/properties/recent')
    return res.data.data
  },

  async getBySlug(slug: string) {
    const res = await api.get(`/properties/${slug}`)
    return res.data.data
  },

  async create(data: any) {
    const res = await api.post('/properties', data)
    return res.data.data
  },

  async update(id: string, data: any) {
    const res = await api.patch(`/properties/${id}`, data)
    return res.data.data
  },

  async delete(id: string) {
    await api.delete(`/properties/${id}`)
  },

  async getContact(id: string) {
    const res = await api.get(`/properties/${id}/contact`)
    return res.data.data
  },

  async markRented(id: string) {
    const res = await api.post(`/properties/${id}/mark-rented`)
    return res.data
  },

  async uploadImages(propertyId: string, files: File[]) {
    const formData = new FormData()
    files.forEach(f => formData.append('images', f))
    const res = await api.post(`/properties/${propertyId}/images`, formData, {
      headers: { 'Content-Type': undefined },
    })
    return res.data.data
  },

  async deleteImage(propertyId: string, imageId: string) {
    await api.delete(`/properties/${propertyId}/images/${imageId}`)
  },

  async reorderImages(propertyId: string, imageOrders: any[]) {
    const res = await api.patch(`/properties/${propertyId}/images/reorder`, { imageOrders })
    return res.data
  },

  async report(propertyId: string, data: any) {
    const res = await api.post(`/properties/${propertyId}/report`, data)
    return res.data
  },

  async requestRental(propertyId: string, message: string) {
    const res = await api.post(`/properties/${propertyId}/rental-requests`, { message })
    return res.data.data
  },
}

export const paymentService = {
  async getPackages() {
    const res = await api.get('/packages')
    return res.data.data
  },

  async createPayment(propertyId: string, packageId: string) {
    const res = await api.post('/payments', { propertyId, packageId })
    return res.data.data
  },

  async submitEvidence(paymentId: string, data: { transactionReference: string; paymentMethod: string; receipt?: File }) {
    const formData = new FormData()
    formData.append('transactionReference', data.transactionReference)
    formData.append('paymentMethod', data.paymentMethod)
    if (data.receipt) {
      formData.append('receipt', data.receipt)
    }
    const res = await api.post(`/payments/${paymentId}/submit-evidence`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data.data
  },

  async getMyPayments() {
    const res = await api.get('/payments/my')
    return res.data.data
  },

  async acceptPayment(id: string, notes?: string) {
    const res = await api.post(`/payments/${id}/accept`, { notes })
    return res.data.data
  },

  async rejectPayment(id: string, reason: string) {
    const res = await api.post(`/payments/${id}/reject`, { reason })
    return res.data.data
  },

  async getReceiptUrl(id: string) {
    return getAuthorizedReceiptUrl(id)
  },
}

export const ownerService = {
  async getDashboard() {
    const res = await api.get('/owner/dashboard')
    return res.data.data
  },

  async getProperties() {
    const res = await api.get('/owner/properties')
    return res.data.data
  },

  async getRentalRequests() {
    const res = await api.get('/owner/rental-requests')
    return res.data.data
  },

  async respondToRentalRequest(id: string, decision: 'ACCEPTED' | 'REJECTED', message?: string) {
    const res = await api.patch(`/owner/rental-requests/${id}`, { decision, message })
    return res.data.data
  },

  async updateProfile(data: any) {
    const formData = new FormData()
    Object.keys(data).forEach(key => {
      if (data[key] !== undefined && data[key] !== null) {
        formData.append(key, data[key])
      }
    })
    const res = await api.patch('/owner/profile', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data.data
  },
}

export const rentalRequestService = {
  async getMine() {
    const res = await api.get('/rental-requests/my')
    return res.data.data
  },
}

export const favoriteService = {
  async getFavorites() {
    const res = await api.get('/favorites')
    return res.data.data
  },

  async add(propertyId: string) {
    const res = await api.post(`/favorites/${propertyId}`)
    return res.data
  },

  async remove(propertyId: string) {
    await api.delete(`/favorites/${propertyId}`)
  },
}

export const notificationService = {
  async getAll() {
    const res = await api.get('/notifications')
    return res.data.data
  },

  async markAllRead() {
    await api.patch('/notifications/read')
  },
}

export const adminService = {
  async getDashboard() {
    const res = await api.get('/admin/dashboard')
    return res.data.data
  },

  async getProperties(params?: Record<string, any>) {
    const res = await api.get('/admin/properties', { params })
    return res.data
  },

  async approveProperty(id: string) {
    const res = await api.post(`/admin/properties/${id}/approve`)
    return res.data
  },

  async rejectProperty(id: string, reason: string) {
    const res = await api.post(`/admin/properties/${id}/reject`, { reason })
    return res.data
  },

  async suspendProperty(id: string, reason: string) {
    const res = await api.post(`/admin/properties/${id}/suspend`, { reason })
    return res.data
  },

  async getPayments(params?: Record<string, any>) {
    const res = await api.get('/admin/payments', { params })
    return res.data
  },

  async getRentalRequests(params?: Record<string, any>) {
    const res = await api.get('/admin/rental-requests', { params })
    return res.data
  },

  async getPaymentReceiptUrl(id: string) {
    return getAuthorizedReceiptUrl(id)
  },

  async verifyPayment(id: string, notes?: string) {
    const res = await api.post(`/admin/payments/${id}/verify`, { notes })
    return res.data
  },

  async rejectPayment(id: string, reason: string) {
    const res = await api.post(`/admin/payments/${id}/reject`, { reason })
    return res.data
  },

  async getUsers(params?: Record<string, any>) {
    const res = await api.get('/admin/users', { params })
    return res.data
  },

  async getUserTransactions(id: string) {
    const res = await api.get(`/admin/users/${id}/transactions`)
    return res.data.data
  },

  async updateUserBalance(id: string, amount: number, reason: string) {
    const res = await api.patch(`/admin/users/${id}/balance`, { amount, reason })
    return res.data.data
  },

  async updateUserStatus(id: string, status: string, reason?: string) {
    const res = await api.patch(`/admin/users/${id}/status`, { status, reason })
    return res.data
  },

  async updatePackage(id: string, data: any) {
    const res = await api.patch(`/admin/packages/${id}`, data)
    return res.data.data
  },

  async getAuditLogs(params?: Record<string, any>) {
    const res = await api.get('/admin/audit-logs', { params })
    return res.data
  },
}
