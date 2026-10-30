import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  CreditCard,
  Eye,
  Filter,
  Home,
  MessageSquare,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Smartphone,
  TrendingUp,
  UserCheck,
  UserMinus,
  Users,
  Wallet,
  WalletCards,
  XCircle,
  X,
  Check,
  AlertTriangle,
  ReceiptText,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { ownerService, adminService, paymentService } from '../../services'
import StatusBadge from '../../components/StatusBadge'
import { useAuth } from '../../context/AuthContext'
import { getRealtimeSocket } from '../../services/realtime'
import { formatETB, formatETBWithBirr } from '../../utils/format'
import type { DashboardUser } from '../../types'

interface RevenueStats {
  totalPlatformRevenue?: number
  totalMoneyEarnedByAllUsers?: number
  totalPendingPayments?: number
  pendingPaymentsCount?: number
  totalApprovedPayments?: number
  approvedPaymentsCount?: number
  verifiedPaymentsCount?: number
  totalRejectedPayments?: number
  rejectedPaymentsCount?: number
  totalUsers?: number
  totalOwners?: number
  totalTenants?: number
  totalListings?: number
  platformListings?: number
  publishedListings?: number
  rentedProperties?: number
  rentalRequests?: number
  pendingRentalRequests?: number
  // Personal
  activeListings?: number
  pendingApproval?: number
  expiredListings?: number
  totalPaid?: number
}

interface AnalyticsData {
  monthlyRevenue: Array<{ month: string; revenue: number; count: number }>
  revenueByPackage: Array<{ packageName: string; revenue: number; count: number }>
  revenueByMethod: Array<{ method: string; revenue: number; count: number }>
  financialMetrics: {
    averageTransactionValue: number
    approvalRatePercentage: number
    pendingRatePercentage: number
    activeRentalsMonthlyVolume: number
  }
}

interface PaymentItem {
  id: string
  amountInETB: number
  paymentStatus: string
  paymentMethod?: string
  transactionReference?: string
  receiptUrl?: string
  receiptStorageKey?: string
  rejectionReason?: string
  notes?: string
  createdAt: string
  verifiedAt?: string
  user?: { id?: string; fullName: string; email: string; phone?: string }
  property?: { id?: string; title: string; city?: string; slug?: string }
  package?: { name: string; priceInETB?: number }
}

interface DashboardApiResponse {
  overview?: RevenueStats
  stats?: RevenueStats
  personal?: {
    totalListings: number
    activeListings: number
    pendingApproval: number
    expiredListings: number
    totalPaid: number
    recentPayments: Array<{
      id: string
      amountInETB: number
      paymentStatus: string
      createdAt: string
      package: { name: string }
      property: { title: string }
    }>
  }
  analytics?: AnalyticsData
  pendingRequests?: PaymentItem[]
  recentTransactions?: PaymentItem[]
  recentPayments?: Array<{
    id: string
    amountInETB: number
    paymentStatus: string
    createdAt: string
    package: { name: string }
    property: { title: string }
  }>
}

export default function OwnerDashboard() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<'revenue' | 'requests' | 'users' | 'transactions' | 'personal'>('revenue')
  const [data, setData] = useState<DashboardApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Users state
  const [usersList, setUsersList] = useState<DashboardUser[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [userSearch, setUserSearch] = useState('')
  const [userRoleFilter, setUserRoleFilter] = useState('')
  const [userStatusFilter, setUserStatusFilter] = useState('')
  const [selectedUserForHistory, setSelectedUserForHistory] = useState<DashboardUser | null>(null)

  // Payments / Requests state
  const [requestFilter, setRequestFilter] = useState<'ALL' | 'PENDING' | 'VERIFIED' | 'REJECTED'>('PENDING')
  const [acceptPaymentTarget, setAcceptPaymentTarget] = useState<PaymentItem | null>(null)
  const [rejectPaymentTarget, setRejectPaymentTarget] = useState<PaymentItem | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [verificationNotes, setVerificationNotes] = useState('')
  const [actionBusy, setActionBusy] = useState(false)

  // User Balance adjustment modal
  const [balanceUserTarget, setBalanceUserTarget] = useState<DashboardUser | null>(null)
  const [balanceAmount, setBalanceAmount] = useState<string>('')
  const [balanceReason, setBalanceReason] = useState<string>('')
  const [balanceBusy, setBalanceBusy] = useState(false)

  // Load Dashboard Data
  const loadDashboard = async (isManual = false) => {
    if (isManual) setRefreshing(true)
    try {
      const res = await ownerService.getDashboard()
      setData(res)
    } catch {
      toast.error('Could not refresh dashboard statistics')
    } finally {
      setLoading(false)
      if (isManual) setRefreshing(false)
    }
  }

  // Load Users Data
  const loadUsers = async () => {
    setUsersLoading(true)
    try {
      const res = await adminService.getUsers({ limit: 100 })
      setUsersList(res.data || [])
    } catch {
      toast.error('Could not load registered users')
    } finally {
      setUsersLoading(false)
    }
  }

  useEffect(() => {
    void loadDashboard()
    void loadUsers()

    const socket = getRealtimeSocket()
    const refresh = () => {
      void loadDashboard()
      void loadUsers()
    }
    socket.on('connect', refresh)
    socket.on('payment:updated', refresh)
    socket.on('listing:updated', refresh)
    socket.connect()

    const timer = window.setInterval(refresh, 25000)
    return () => {
      socket.off('connect', refresh)
      socket.off('payment:updated', refresh)
      socket.off('listing:updated', refresh)
      window.clearInterval(timer)
    }
  }, [])

  // Combined stats
  const stats = data?.overview || data?.stats
  const analytics = data?.analytics
  const personal = data?.personal || data?.stats

  // Revenue values
  const totalPlatformRevenue = Number(stats?.totalPlatformRevenue ?? stats?.totalApprovedPayments ?? 0)
  const totalMoneyEarnedByAllUsers = Number(stats?.totalMoneyEarnedByAllUsers ?? 0)
  const totalPendingPayments = Number(stats?.totalPendingPayments ?? 0)
  const pendingPaymentsCount = Number(stats?.pendingPaymentsCount ?? 0)
  const totalApprovedPayments = Number(stats?.totalApprovedPayments ?? totalPlatformRevenue)
  const approvedPaymentsCount = Number(stats?.approvedPaymentsCount ?? stats?.verifiedPaymentsCount ?? 0)
  const totalRejectedPayments = Number(stats?.totalRejectedPayments ?? 0)
  const rejectedPaymentsCount = Number(stats?.rejectedPaymentsCount ?? 0)

  // Filtered users
  const filteredUsers = useMemo(() => {
    return usersList.filter((u) => {
      const query = userSearch.toLowerCase().trim()
      const matchesSearch =
        !query ||
        u.fullName.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query) ||
        u.username.toLowerCase().includes(query) ||
        (u.phone && u.phone.includes(query))
      const matchesRole = !userRoleFilter || u.role === userRoleFilter
      const matchesStatus = !userStatusFilter || u.accountStatus === userStatusFilter
      return matchesSearch && matchesRole && matchesStatus
    })
  }, [usersList, userSearch, userRoleFilter, userStatusFilter])

  // Payment Requests
  const allRequests = useMemo(() => {
    return data?.recentTransactions || data?.pendingRequests || []
  }, [data])

  const filteredRequests = useMemo(() => {
    if (requestFilter === 'ALL') return allRequests
    if (requestFilter === 'PENDING') {
      return allRequests.filter((p) => ['SUBMITTED', 'UNDER_REVIEW', 'PENDING'].includes(p.paymentStatus))
    }
    return allRequests.filter((p) => p.paymentStatus === requestFilter)
  }, [allRequests, requestFilter])

  const pendingRequestsCountBadge = useMemo(() => {
    return allRequests.filter((p) => ['SUBMITTED', 'UNDER_REVIEW', 'PENDING'].includes(p.paymentStatus)).length
  }, [allRequests])

  // Handler: Accept payment
  const handleConfirmAccept = async () => {
    if (!acceptPaymentTarget) return
    setActionBusy(true)
    try {
      await paymentService.acceptPayment(acceptPaymentTarget.id, verificationNotes)
      toast.success(`Payment verified and listing "${acceptPaymentTarget.property?.title}" is now published!`)
      setAcceptPaymentTarget(null)
      setVerificationNotes('')
      await loadDashboard()
      await loadUsers()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not verify payment')
    } finally {
      setActionBusy(false)
    }
  }

  // Handler: Reject payment
  const handleConfirmReject = async () => {
    if (!rejectPaymentTarget) return
    if (!rejectionReason.trim()) {
      toast.error('Please enter a reason for rejection')
      return
    }
    setActionBusy(true)
    try {
      await paymentService.rejectPayment(rejectPaymentTarget.id, rejectionReason.trim())
      toast.success('Payment rejected. The owner has been notified.')
      setRejectPaymentTarget(null)
      setRejectionReason('')
      await loadDashboard()
      await loadUsers()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not reject payment')
    } finally {
      setActionBusy(false)
    }
  }

  // Handler: Toggle user status
  const handleToggleUserStatus = async (targetUser: DashboardUser) => {
    const newStatus = targetUser.accountStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE'
    const confirmMsg =
      newStatus === 'SUSPENDED'
        ? `Are you sure you want to suspend ${targetUser.fullName}? They will not be able to log in or create listings.`
        : `Reactivate account for ${targetUser.fullName}?`

    if (!window.confirm(confirmMsg)) return

    try {
      await adminService.updateUserStatus(targetUser.id, newStatus, 'Owner dashboard action')
      toast.success(`User ${targetUser.fullName} is now ${newStatus.toLowerCase()}`)
      await loadUsers()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not update user status')
    }
  }

  // Handler: Adjust balance
  const handleAdjustBalance = async () => {
    if (!balanceUserTarget) return
    const amountNum = parseFloat(balanceAmount)
    if (isNaN(amountNum)) {
      toast.error('Please enter a valid amount')
      return
    }
    if (!balanceReason.trim()) {
      toast.error('Please enter a reason for this balance adjustment')
      return
    }

    setBalanceBusy(true)
    try {
      await adminService.updateUserBalance(balanceUserTarget.id, amountNum, balanceReason.trim())
      toast.success(`Balance for ${balanceUserTarget.fullName} adjusted successfully`)
      setBalanceUserTarget(null)
      setBalanceAmount('')
      setBalanceReason('')
      await loadUsers()
      await loadDashboard()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not adjust user balance')
    } finally {
      setBalanceBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-7">
      {/* ── Top Header ────────────────────────────────────────── */}
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-0.5 text-xs font-bold uppercase tracking-wider text-emerald-800">
              <ShieldCheck size={14} /> Owner Workspace · Full Admin Access
            </span>
          </div>
          <h1 className="mt-2 text-3xl font-extrabold text-slate-900">
            Welcome, {user?.fullName || 'Owner'}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Manage total platform revenue, review user payment requests, and supervise registered users in real-time.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => void loadDashboard(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors disabled:opacity-50"
            title="Refresh statistics"
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin text-emerald-700' : 'text-slate-500'} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <Link
            to="/dashboard/listings/new"
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors"
          >
            <Plus size={16} /> Add a listing
          </Link>
        </div>
      </header>

      {/* ── Dashboard Navigation Tabs ─────────────────────────── */}
      <nav aria-label="Owner dashboard tabs" className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('revenue')}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
            activeTab === 'revenue'
              ? 'bg-emerald-800 text-white shadow-sm'
              : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          <TrendingUp size={16} /> Revenue &amp; Analytics
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('requests')}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
            activeTab === 'requests'
              ? 'bg-emerald-800 text-white shadow-sm'
              : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Clock3 size={16} />
          Payment &amp; User Requests
          {pendingRequestsCountBadge > 0 && (
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                activeTab === 'requests' ? 'bg-amber-400 text-slate-900' : 'bg-amber-100 text-amber-900'
              }`}
            >
              {pendingRequestsCountBadge}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('users')}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
            activeTab === 'users'
              ? 'bg-emerald-800 text-white shadow-sm'
              : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Users size={16} /> User Management ({usersList.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('transactions')}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
            activeTab === 'transactions'
              ? 'bg-emerald-800 text-white shadow-sm'
              : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          <WalletCards size={16} /> Transaction History
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('personal')}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
            activeTab === 'personal'
              ? 'bg-emerald-800 text-white shadow-sm'
              : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Home size={16} /> My Properties ({personal?.totalListings ?? 0})
        </button>
      </nav>

      {/* ───────────────────────────────────────────────────────── */}
      {/* TAB 1: REVENUE OVERVIEW & ANALYTICS                       */}
      {/* ───────────────────────────────────────────────────────── */}
      {activeTab === 'revenue' && (
        <div className="space-y-7">
          {/* Revenue Headline Cards */}
          <section aria-label="Total Revenue Overview">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Total Revenue Overview</h2>
                <p className="text-xs text-slate-500">
                  Calculated automatically in real-time from all database records in Ethiopian Birr (ETB / ብር).
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {/* Card 1: Total Platform Revenue */}
              <article className="relative overflow-hidden rounded-xl border border-emerald-300 bg-gradient-to-br from-emerald-50 via-white to-emerald-100/40 p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                    Platform Revenue
                  </span>
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-800 text-white">
                    <CircleDollarSign size={18} />
                  </span>
                </div>
                <p className="mt-3 text-2xl font-black text-emerald-950">
                  {loading ? '...' : formatETB(totalPlatformRevenue)}
                </p>
                <p className="mt-0.5 text-xs font-bold text-emerald-700">
                  {loading ? '...' : `${totalPlatformRevenue.toLocaleString()} ብር`}
                </p>
                <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-600 border-t border-emerald-200/60 pt-2">
                  <BadgeCheck size={14} className="text-emerald-700" />
                  <span>{approvedPaymentsCount} verified payments</span>
                </div>
              </article>

              {/* Card 2: Total Money Earned by All Users */}
              <article className="relative overflow-hidden rounded-xl border border-sky-200 bg-gradient-to-br from-sky-50 via-white to-sky-100/40 p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-sky-800">
                    User Earnings
                  </span>
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-sky-700 text-white">
                    <Wallet size={18} />
                  </span>
                </div>
                <p className="mt-3 text-2xl font-black text-sky-950">
                  {loading ? '...' : formatETB(totalMoneyEarnedByAllUsers)}
                </p>
                <p className="mt-0.5 text-xs font-bold text-sky-700">
                  {loading ? '...' : `${totalMoneyEarnedByAllUsers.toLocaleString()} ብር`}
                </p>
                <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-600 border-t border-sky-200/60 pt-2">
                  <Building2 size={14} className="text-sky-700" />
                  <span>Rented properties &amp; balances</span>
                </div>
              </article>

              {/* Card 3: Total Pending Payments */}
              <article className="relative overflow-hidden rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-amber-100/40 p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
                    Pending Payments
                  </span>
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-amber-500 text-white">
                    <Clock3 size={18} />
                  </span>
                </div>
                <p className="mt-3 text-2xl font-black text-amber-950">
                  {loading ? '...' : formatETB(totalPendingPayments)}
                </p>
                <p className="mt-0.5 text-xs font-bold text-amber-700">
                  {loading ? '...' : `${totalPendingPayments.toLocaleString()} ብር`}
                </p>
                <div className="mt-3 flex items-center gap-1.5 text-xs text-amber-800 border-t border-amber-200/60 pt-2 font-medium">
                  <AlertTriangle size={14} />
                  <span>{pendingPaymentsCount} awaiting review</span>
                </div>
              </article>

              {/* Card 4: Total Approved Payments */}
              <article className="relative overflow-hidden rounded-xl border border-teal-200 bg-gradient-to-br from-teal-50 via-white to-teal-100/40 p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-teal-800">
                    Approved Payments
                  </span>
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-teal-700 text-white">
                    <CheckCircle2 size={18} />
                  </span>
                </div>
                <p className="mt-3 text-2xl font-black text-teal-950">
                  {loading ? '...' : formatETB(totalApprovedPayments)}
                </p>
                <p className="mt-0.5 text-xs font-bold text-teal-700">
                  {loading ? '...' : `${totalApprovedPayments.toLocaleString()} ብር`}
                </p>
                <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-600 border-t border-teal-200/60 pt-2">
                  <Check size={14} className="text-teal-700" />
                  <span>{approvedPaymentsCount} approved to date</span>
                </div>
              </article>

              {/* Card 5: Total Rejected Payments */}
              <article className="relative overflow-hidden rounded-xl border border-rose-200 bg-gradient-to-br from-rose-50 via-white to-rose-100/40 p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-rose-800">
                    Rejected Payments
                  </span>
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-rose-600 text-white">
                    <XCircle size={18} />
                  </span>
                </div>
                <p className="mt-3 text-2xl font-black text-rose-950">
                  {loading ? '...' : formatETB(totalRejectedPayments)}
                </p>
                <p className="mt-0.5 text-xs font-bold text-rose-700">
                  {loading ? '...' : `${totalRejectedPayments.toLocaleString()} ብር`}
                </p>
                <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-600 border-t border-rose-200/60 pt-2">
                  <X size={14} className="text-rose-600" />
                  <span>{rejectedPaymentsCount} rejected</span>
                </div>
              </article>
            </div>
          </section>

          {/* Financial Statistics Row */}
          <section aria-label="Financial metrics" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-slate-500">Average Transaction Value</p>
              <p className="mt-1 text-xl font-bold text-slate-900">
                {formatETB(analytics?.financialMetrics?.averageTransactionValue ?? 0)}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {analytics?.financialMetrics?.averageTransactionValue?.toLocaleString() ?? 0} ብር per payment
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-slate-500">Payment Approval Rate</p>
              <p className="mt-1 text-xl font-bold text-emerald-800">
                {analytics?.financialMetrics?.approvalRatePercentage ?? 100}%
              </p>
              <p className="text-xs text-slate-400 mt-0.5">Verified vs Rejected transactions</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-slate-500">Active Rentals Volume</p>
              <p className="mt-1 text-xl font-bold text-sky-900">
                {formatETB(analytics?.financialMetrics?.activeRentalsMonthlyVolume ?? 0)}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">Monthly rent flow among rented homes</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-slate-500">Platform Scale</p>
              <p className="mt-1 text-xl font-bold text-slate-900">
                {stats?.totalUsers ?? 0} Users · {stats?.platformListings ?? stats?.totalListings ?? 0} Houses
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {stats?.totalOwners ?? 0} owners, {stats?.totalTenants ?? 0} tenants
              </p>
            </div>
          </section>

          {/* Revenue Analytics & Charts Section */}
          <section aria-label="Revenue Charts and Analytics" className="grid gap-6 lg:grid-cols-2">
            {/* Monthly Trend */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-bold text-slate-900">Monthly Revenue Trend</h3>
                  <p className="text-xs text-slate-500">Verified platform payments grouped by month (ETB / ብር)</p>
                </div>
                <TrendingUp size={18} className="text-emerald-700" />
              </div>

              <div className="mt-5 space-y-4">
                {analytics?.monthlyRevenue && analytics.monthlyRevenue.length > 0 ? (
                  analytics.monthlyRevenue.map((item) => {
                    const maxVal = Math.max(...analytics.monthlyRevenue.map((m) => m.revenue), 1)
                    const percent = Math.min(100, Math.round((item.revenue / maxVal) * 100))
                    return (
                      <div key={item.month} className="space-y-1.5">
                        <div className="flex justify-between text-xs font-semibold text-slate-700">
                          <span>{item.month}</span>
                          <span className="font-mono text-emerald-800 font-bold">
                            {formatETB(item.revenue)} ({item.revenue.toLocaleString()} ብር) · {item.count} payment(s)
                          </span>
                        </div>
                        <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-emerald-700 transition-all duration-500"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="py-8 text-center text-sm text-slate-500">
                    No historical monthly transactions yet. Verified payments will populate this chart.
                  </div>
                )}
              </div>
            </div>

            {/* Breakdown by Package & Method */}
            <div className="space-y-6">
              {/* By Package */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-bold text-slate-900">Revenue by Advertising Package</h3>
                    <p className="text-xs text-slate-500">Distribution of Basic (30), Standard (99), Premium (200)</p>
                  </div>
                  <CreditCard size={18} className="text-emerald-700" />
                </div>

                <div className="mt-4 space-y-3">
                  {analytics?.revenueByPackage && analytics.revenueByPackage.length > 0 ? (
                    analytics.revenueByPackage.map((pkg) => (
                      <div key={pkg.packageName} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm">
                        <div>
                          <p className="font-semibold text-slate-800">{pkg.packageName}</p>
                          <p className="text-xs text-slate-500">{pkg.count} purchase(s)</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-emerald-800">{formatETB(pkg.revenue)}</p>
                          <p className="text-xs text-slate-500">{pkg.revenue.toLocaleString()} ብር</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-500 py-3">No verified package purchases recorded yet.</p>
                  )}
                </div>
              </div>

              {/* By Method */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-bold text-slate-900">Revenue by Payment Method</h3>
                    <p className="text-xs text-slate-500">Telebirr vs Commercial Bank of Ethiopia (CBE)</p>
                  </div>
                  <Smartphone size={18} className="text-emerald-700" />
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="flex items-start gap-3 rounded-lg border border-blue-100 bg-blue-50/50 p-3.5">
                    <Smartphone size={20} className="text-blue-700 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold uppercase text-blue-900">Telebirr (0900468152)</p>
                      <p className="text-base font-bold text-slate-900 mt-1">
                        {formatETB(
                          analytics?.revenueByMethod?.find((m) => m.method === 'TELEBIRR')?.revenue ?? 0
                        )}
                      </p>
                      <p className="text-xs text-slate-500">
                        {analytics?.revenueByMethod?.find((m) => m.method === 'TELEBIRR')?.count ?? 0} transaction(s)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-lg border border-emerald-100 bg-emerald-50/50 p-3.5">
                    <Building2 size={20} className="text-emerald-700 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold uppercase text-emerald-900">CBE Bank (1000706746734)</p>
                      <p className="text-base font-bold text-slate-900 mt-1">
                        {formatETB(
                          analytics?.revenueByMethod?.find((m) => m.method === 'CBE')?.revenue ?? 0
                        )}
                      </p>
                      <p className="text-xs text-slate-500">
                        {analytics?.revenueByMethod?.find((m) => m.method === 'CBE')?.count ?? 0} transaction(s)
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────── */}
      {/* TAB 2: PENDING APPROVALS & USER REQUESTS                  */}
      {/* ───────────────────────────────────────────────────────── */}
      {activeTab === 'requests' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">User Requests &amp; Payment Verification</h2>
              <p className="text-xs text-slate-500">
                Accept or reject user payment evidence. Accepting a payment automatically publishes the house listing.
              </p>
            </div>

            {/* Filter buttons */}
            <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white p-1">
              {(['PENDING', 'VERIFIED', 'REJECTED', 'ALL'] as const).map((filterOpt) => (
                <button
                  key={filterOpt}
                  type="button"
                  onClick={() => setRequestFilter(filterOpt)}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                    requestFilter === filterOpt
                      ? 'bg-emerald-800 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {filterOpt === 'PENDING' ? 'Pending Review' : filterOpt === 'VERIFIED' ? 'Approved' : filterOpt === 'REJECTED' ? 'Rejected' : 'All'}
                </button>
              ))}
            </div>
          </div>

          {filteredRequests.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
              <CheckCircle2 size={36} className="mx-auto text-emerald-600 mb-3" />
              <p className="font-semibold text-slate-800">No requests in this view</p>
              <p className="text-xs text-slate-500 mt-1">
                {requestFilter === 'PENDING'
                  ? 'All user requests have been reviewed and verified!'
                  : 'No matching payment records found.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRequests.map((reqItem) => {
                const isPending = ['SUBMITTED', 'UNDER_REVIEW', 'PENDING'].includes(reqItem.paymentStatus)
                return (
                  <article
                    key={reqItem.id}
                    className={`rounded-xl border bg-white p-5 shadow-sm transition-all ${
                      isPending ? 'border-amber-300 ring-1 ring-amber-200' : 'border-slate-200'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-bold text-slate-900 text-base">
                            {reqItem.property?.title || 'House Listing'}
                          </h3>
                          <StatusBadge status={reqItem.paymentStatus} />
                          {isPending && (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
                              Requires Action
                            </span>
                          )}
                        </div>

                        <p className="mt-1 text-sm text-slate-700">
                          <strong>User:</strong> {reqItem.user?.fullName} · {reqItem.user?.email} ·{' '}
                          {reqItem.user?.phone || 'No phone'}
                        </p>

                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                          <span>
                            <strong>Method:</strong> {reqItem.paymentMethod || 'Not specified'}
                          </span>
                          <span>
                            <strong>Ref:</strong>{' '}
                            <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-slate-800 font-bold">
                              {reqItem.transactionReference || 'No reference'}
                            </code>
                          </span>
                          <span>
                            <strong>Package:</strong> {reqItem.package?.name || 'Advertising'}
                          </span>
                          <span>
                            <strong>Submitted:</strong> {new Date(reqItem.createdAt).toLocaleString()}
                          </span>
                        </div>

                        {reqItem.rejectionReason && (
                          <div className="mt-2.5 rounded-md border border-rose-200 bg-rose-50 p-2 text-xs text-rose-800">
                            <strong>Rejection Reason:</strong> {reqItem.rejectionReason}
                          </div>
                        )}

                        {reqItem.notes && (
                          <div className="mt-1 text-xs text-slate-500">
                            <strong>Admin Note:</strong> {reqItem.notes}
                          </div>
                        )}
                      </div>

                      <div className="text-right">
                        <p className="text-xl font-black text-emerald-950">
                          {formatETB(reqItem.amountInETB)}
                        </p>
                        <p className="text-xs font-bold text-emerald-700">
                          {Number(reqItem.amountInETB).toLocaleString()} ብር
                        </p>
                      </div>
                    </div>

                    {/* Actions for pending requests */}
                    {isPending && (
                      <div className="mt-4 flex flex-wrap items-center justify-end gap-2.5 border-t border-slate-100 pt-3">
                        <button
                          type="button"
                          onClick={() => {
                            setRejectPaymentTarget(reqItem)
                            setRejectionReason('')
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300 bg-white px-3.5 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 transition-colors"
                        >
                          <X size={14} /> Reject Request
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setAcceptPaymentTarget(reqItem)
                            setVerificationNotes('')
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-800 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 shadow-sm transition-colors"
                        >
                          <Check size={14} /> Accept &amp; Publish Listing
                        </button>
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────── */}
      {/* TAB 3: USER MANAGEMENT                                    */}
      {/* ───────────────────────────────────────────────────────── */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">User Management</h2>
              <p className="text-xs text-slate-500">
                View all registered users, usernames, balances, total earnings, transaction histories, and manage account statuses.
              </p>
            </div>

            <div className="text-sm font-semibold text-slate-600">
              Total Users: <span className="font-bold text-emerald-800">{filteredUsers.length}</span>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
            <div className="relative min-w-[240px] flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, email, username or phone..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-sm focus:border-emerald-700 focus:bg-white focus:outline-none"
              />
            </div>

            <select
              value={userRoleFilter}
              onChange={(e) => setUserRoleFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 focus:border-emerald-700 focus:outline-none"
            >
              <option value="">All Roles</option>
              <option value="OWNER">Owner</option>
              <option value="TENANT">Tenant</option>
              <option value="ADMIN">Admin</option>
            </select>

            <select
              value={userStatusFilter}
              onChange={(e) => setUserStatusFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 focus:border-emerald-700 focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="PENDING_VERIFICATION">Pending</option>
            </select>
          </div>

          {/* User Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            {usersLoading ? (
              <div className="py-12 text-center text-sm text-slate-500">Loading user database...</div>
            ) : filteredUsers.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500">No users found matching your search.</div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3.5">User &amp; Username</th>
                    <th className="px-4 py-3.5">Contact</th>
                    <th className="px-4 py-3.5">Role / Status</th>
                    <th className="px-4 py-3.5 text-right">User Balance</th>
                    <th className="px-4 py-3.5 text-right">Total Earnings</th>
                    <th className="px-5 py-3.5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-slate-900">{u.fullName}</div>
                        <div className="font-mono text-xs text-emerald-800 font-medium">
                          @{u.username}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="text-slate-800">{u.email}</div>
                        <div className="text-xs text-slate-400">{u.phone || 'No phone'}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`rounded px-1.5 py-0.5 text-xs font-bold ${
                              u.role === 'OWNER'
                                ? 'bg-emerald-100 text-emerald-800'
                                : u.role === 'ADMIN'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {u.role}
                          </span>
                          <StatusBadge status={u.accountStatus} />
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-900">
                        {formatETB(u.balance)}
                        <span className="block text-xs font-normal text-slate-400">
                          {u.balance.toLocaleString()} ብር
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-bold text-emerald-800">
                        {formatETB(u.totalEarnings)}
                        <span className="block text-xs font-normal text-slate-400">
                          {u.totalEarnings.toLocaleString()} ብር
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedUserForHistory(u)}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                            title="View Transaction History"
                          >
                            <ReceiptText size={13} /> History
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setBalanceUserTarget(u)
                              setBalanceAmount('')
                              setBalanceReason('')
                            }}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-50"
                            title="Adjust Balance"
                          >
                            <Wallet size={13} /> Balance
                          </button>

                          <button
                            type="button"
                            onClick={() => void handleToggleUserStatus(u)}
                            className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                              u.accountStatus === 'ACTIVE'
                                ? 'border border-rose-200 text-rose-700 hover:bg-rose-50'
                                : 'border border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                            }`}
                            title={u.accountStatus === 'ACTIVE' ? 'Suspend Account' : 'Reactivate Account'}
                          >
                            {u.accountStatus === 'ACTIVE' ? <UserMinus size={13} /> : <UserCheck size={13} />}
                            {u.accountStatus === 'ACTIVE' ? 'Suspend' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────── */}
      {/* TAB 4: PLATFORM TRANSACTION HISTORY                       */}
      {/* ───────────────────────────────────────────────────────── */}
      {activeTab === 'transactions' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Platform Transaction History</h2>
              <p className="text-xs text-slate-500">
                All advertising payments, dates, amounts in ETB and ብር, and verification statuses.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            {allRequests.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500">No transactions recorded yet.</div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3.5">Date</th>
                    <th className="px-4 py-3.5">User</th>
                    <th className="px-4 py-3.5">Property Listing</th>
                    <th className="px-4 py-3.5">Package &amp; Method</th>
                    <th className="px-4 py-3.5">Transaction Ref</th>
                    <th className="px-4 py-3.5 text-right">Amount (ETB / ብር)</th>
                    <th className="px-5 py-3.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allRequests.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3.5 text-xs text-slate-500">
                        {new Date(tx.createdAt).toLocaleDateString()}{' '}
                        <span className="text-[10px] text-slate-400 block">
                          {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="font-semibold text-slate-900">{tx.user?.fullName}</span>
                        <span className="block text-xs text-slate-400">{tx.user?.email}</span>
                      </td>
                      <td className="px-4 py-3.5 max-w-[200px] truncate font-medium text-slate-800">
                        {tx.property?.title || 'Listing'}
                      </td>
                      <td className="px-4 py-3.5 text-xs">
                        <span className="font-semibold text-slate-700">{tx.package?.name}</span>
                        <span className="block text-slate-400">{tx.paymentMethod || 'Manual'}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <code className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-1 py-0.5 rounded">
                          {tx.transactionReference || 'N/A'}
                        </code>
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-900">
                        {formatETB(tx.amountInETB)}
                        <span className="block text-xs font-normal text-slate-400">
                          {Number(tx.amountInETB).toLocaleString()} ብር
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <StatusBadge status={tx.paymentStatus} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────── */}
      {/* TAB 5: MY PROPERTIES & PERSONAL LISTINGS                  */}
      {/* ───────────────────────────────────────────────────────── */}
      {activeTab === 'personal' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">My Properties &amp; Activity</h2>
              <p className="text-xs text-slate-500">
                Your personal listings, drafts, published houses, and advertising fees.
              </p>
            </div>
            <Link
              to="/dashboard/listings/new"
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              <Plus size={16} /> Post New House
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-slate-500">Total Listings</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{personal?.totalListings ?? 0}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-slate-500">Active Published</p>
              <p className="mt-1 text-2xl font-bold text-emerald-800">{personal?.activeListings ?? 0}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-slate-500">Awaiting Review</p>
              <p className="mt-1 text-2xl font-bold text-amber-700">{personal?.pendingApproval ?? 0}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-slate-500">Total Paid for Ads</p>
              <p className="mt-1 text-2xl font-bold text-teal-800">{formatETB(personal?.totalPaid ?? 0)}</p>
              <p className="text-xs text-slate-400 mt-0.5">{personal?.totalPaid?.toLocaleString() ?? 0} ብር</p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-3">Quick Navigation</h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Link
                  to="/dashboard/listings"
                  className="flex items-center justify-between rounded-lg border border-slate-200 p-3.5 hover:border-emerald-600 hover:bg-emerald-50/50 transition-colors"
                >
                  <span className="font-semibold text-slate-800 text-sm">Manage My Listings</span>
                  <ArrowRight size={16} className="text-emerald-700" />
                </Link>
                <Link
                  to="/dashboard/payments"
                  className="flex items-center justify-between rounded-lg border border-slate-200 p-3.5 hover:border-emerald-600 hover:bg-emerald-50/50 transition-colors"
                >
                  <span className="font-semibold text-slate-800 text-sm">My Ad Payments</span>
                  <ArrowRight size={16} className="text-emerald-700" />
                </Link>
                <Link
                  to="/dashboard/rental-requests"
                  className="flex items-center justify-between rounded-lg border border-slate-200 p-3.5 hover:border-emerald-600 hover:bg-emerald-50/50 transition-colors"
                >
                  <span className="font-semibold text-slate-800 text-sm">Rental Inquiries</span>
                  <ArrowRight size={16} className="text-emerald-700" />
                </Link>
                <Link
                  to="/dashboard/profile"
                  className="flex items-center justify-between rounded-lg border border-slate-200 p-3.5 hover:border-emerald-600 hover:bg-emerald-50/50 transition-colors"
                >
                  <span className="font-semibold text-slate-800 text-sm">Owner Profile</span>
                  <ArrowRight size={16} className="text-emerald-700" />
                </Link>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-3">My Recent Payments</h3>
              {data?.personal?.recentPayments && data.personal.recentPayments.length > 0 ? (
                <ul className="mt-3 divide-y divide-slate-100">
                  {data.personal.recentPayments.map((p) => (
                    <li key={p.id} className="py-2.5 flex items-center justify-between text-sm">
                      <div>
                        <p className="font-medium text-slate-900">{p.property?.title}</p>
                        <p className="text-xs text-slate-400">{p.package?.name}</p>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-slate-900">{formatETB(p.amountInETB)}</span>
                        <div className="mt-0.5">
                          <StatusBadge status={p.paymentStatus} />
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500 py-6 text-center">No personal advertising payments yet.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────── */}
      {/* MODAL 1: ACCEPT PAYMENT                                   */}
      {/* ───────────────────────────────────────────────────────── */}
      {acceptPaymentTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-100 text-emerald-800">
                  <Check size={18} />
                </span>
                <h3 className="text-lg font-bold text-slate-900">Accept Payment &amp; Publish Listing</h3>
              </div>
              <button
                type="button"
                onClick={() => setAcceptPaymentTarget(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-sm">
              <div className="rounded-lg bg-slate-50 p-3.5 border border-slate-200 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Listing:</span>
                  <span className="font-semibold text-slate-900">{acceptPaymentTarget.property?.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Owner:</span>
                  <span className="font-medium text-slate-900">{acceptPaymentTarget.user?.fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Amount:</span>
                  <span className="font-bold text-emerald-800 font-mono">
                    {formatETBWithBirr(acceptPaymentTarget.amountInETB)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Method:</span>
                  <span className="font-semibold text-slate-800">{acceptPaymentTarget.paymentMethod}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Transaction Reference:</span>
                  <code className="font-mono font-bold text-slate-800 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                    {acceptPaymentTarget.transactionReference}
                  </code>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Verification Note (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Verified in CBE account statement..."
                  value={verificationNotes}
                  onChange={(e) => setVerificationNotes(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-700 focus:outline-none"
                />
              </div>

              <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 text-xs text-emerald-950">
                <strong>Action:</strong> Accepting this transaction marks the payment as{' '}
                <span className="font-bold">VERIFIED</span>, logs the audit record, and{' '}
                <span className="font-bold">immediately activates and publishes the listing</span> to the public marketplace.
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setAcceptPaymentTarget(null)}
                disabled={actionBusy}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmAccept()}
                disabled={actionBusy}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {actionBusy ? 'Publishing...' : 'Confirm & Publish'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────── */}
      {/* MODAL 2: REJECT PAYMENT                                   */}
      {/* ───────────────────────────────────────────────────────── */}
      {rejectPaymentTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-rose-100 text-rose-700">
                  <X size={18} />
                </span>
                <h3 className="text-lg font-bold text-slate-900">Reject Payment Request</h3>
              </div>
              <button
                type="button"
                onClick={() => setRejectPaymentTarget(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-sm">
              <p className="text-slate-600">
                Rejecting payment for <strong>{rejectPaymentTarget.property?.title}</strong> by{' '}
                <strong>{rejectPaymentTarget.user?.fullName}</strong> ({formatETBWithBirr(rejectPaymentTarget.amountInETB)}).
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Reason for Rejection <span className="text-rose-600">*</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Transaction reference not found in bank statement. Please check the reference number and resubmit."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-rose-600 focus:outline-none"
                  required
                />
                <p className="mt-1 text-xs text-slate-500">
                  This explanation will be sent to the owner so they can correct their payment evidence.
                </p>
              </div>

              <div className="rounded-lg border border-rose-200 bg-rose-50/60 p-3 text-xs text-rose-950">
                <strong>Notice:</strong> The listing will remain unpublished. The owner can resubmit payment evidence with the correct transaction reference.
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setRejectPaymentTarget(null)}
                disabled={actionBusy}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmReject()}
                disabled={actionBusy || !rejectionReason.trim()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {actionBusy ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────── */}
      {/* MODAL 3: USER TRANSACTION HISTORY                         */}
      {/* ───────────────────────────────────────────────────────── */}
      {selectedUserForHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl animate-in fade-in duration-200 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Transaction History: {selectedUserForHistory.fullName}
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  @{selectedUserForHistory.username} · {selectedUserForHistory.email}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUserForHistory(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="my-3 grid grid-cols-3 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-center">
              <div>
                <p className="text-xs text-slate-500">Current Balance</p>
                <p className="font-mono text-base font-bold text-slate-900">
                  {formatETB(selectedUserForHistory.balance)}
                </p>
                <p className="text-[10px] text-slate-400">{selectedUserForHistory.balance.toLocaleString()} ብር</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Total Earnings</p>
                <p className="font-mono text-base font-bold text-emerald-800">
                  {formatETB(selectedUserForHistory.totalEarnings)}
                </p>
                <p className="text-[10px] text-slate-400">{selectedUserForHistory.totalEarnings.toLocaleString()} ብር</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Total Paid for Ads</p>
                <p className="font-mono text-base font-bold text-slate-900">
                  {formatETB(selectedUserForHistory.totalPaid)}
                </p>
                <p className="text-[10px] text-slate-400">{selectedUserForHistory.totalPaid.toLocaleString()} ብር</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 mt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                All Transactions ({selectedUserForHistory.transactionHistory?.length || 0})
              </h4>
              {selectedUserForHistory.transactionHistory && selectedUserForHistory.transactionHistory.length > 0 ? (
                selectedUserForHistory.transactionHistory.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between rounded-lg border border-slate-100 bg-white p-3 text-sm hover:border-slate-300">
                    <div>
                      <p className="font-semibold text-slate-800">{tx.propertyTitle}</p>
                      <p className="text-xs text-slate-400">
                        {tx.packageName} · Ref: <span className="font-mono">{tx.transactionReference || 'N/A'}</span> ·{' '}
                        {new Date(tx.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-slate-900">{formatETB(tx.amountInETB)}</span>
                      <div className="mt-0.5">
                        <StatusBadge status={tx.paymentStatus} />
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500 py-6 text-center">No payment transactions recorded for this user.</p>
              )}
            </div>

            <div className="mt-4 flex justify-end border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setSelectedUserForHistory(null)}
                className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────── */}
      {/* MODAL 4: ADJUST USER BALANCE                              */}
      {/* ───────────────────────────────────────────────────────── */}
      {balanceUserTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-100 text-emerald-800">
                  <Wallet size={18} />
                </span>
                <h3 className="text-lg font-bold text-slate-900">Adjust User Balance</h3>
              </div>
              <button
                type="button"
                onClick={() => setBalanceUserTarget(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-sm">
              <p className="text-slate-600">
                Adjust balance for <strong>{balanceUserTarget.fullName}</strong> (@{balanceUserTarget.username}).
              </p>
              <div className="rounded-lg bg-slate-50 p-3 border border-slate-200 flex justify-between items-center">
                <span className="text-slate-500 text-xs">Current Balance:</span>
                <span className="font-mono font-bold text-slate-900">
                  {formatETBWithBirr(balanceUserTarget.balance)}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Adjustment Amount (ETB) <span className="text-rose-600">*</span>
                </label>
                <input
                  type="number"
                  placeholder="e.g. 500 (use negative to deduct e.g. -200)"
                  value={balanceAmount}
                  onChange={(e) => setBalanceAmount(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-700 focus:outline-none"
                  required
                />
                <p className="mt-1 text-xs text-slate-400">
                  Positive number adds credit. Negative number deducts credit.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Reason <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Deposit confirmation, rental agreement credit..."
                  value={balanceReason}
                  onChange={(e) => setBalanceReason(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-700 focus:outline-none"
                  required
                />
              </div>

              <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900">
                <strong>Audit Record:</strong> This balance change is recorded in the platform audit log with your account credentials.
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setBalanceUserTarget(null)}
                disabled={balanceBusy}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleAdjustBalance()}
                disabled={balanceBusy || !balanceAmount || !balanceReason.trim()}
                className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {balanceBusy ? 'Updating...' : 'Save Balance'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
