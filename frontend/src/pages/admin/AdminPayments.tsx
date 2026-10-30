import { useEffect, useState } from 'react'
import {
  Check, X, RefreshCw, CreditCard, Clock, AlertTriangle,
  Building2, Smartphone, Eye, ChevronDown, ChevronUp
} from 'lucide-react'
import toast from 'react-hot-toast'
import { adminService } from '../../services'
import StatusBadge from '../../components/StatusBadge'
import { getRealtimeSocket } from '../../services/realtime'
import { mediaCrossOrigin, resolveMediaUrl } from '../../services/api'

interface AdminPayment {
  id: string
  amountInETB: number | string
  paymentStatus: string
  paymentMethod?: string
  transactionReference?: string
  receiptUrl?: string
  rejectionReason?: string
  notes?: string
  createdAt: string
  verifiedAt?: string
  user: { fullName: string; email: string; phone: string }
  property: { id: string; title: string; city: string; slug?: string; images?: Array<{ id: string; imageUrl: string; isCover: boolean }> }
  package: { name: string; priceInETB: number }
  verifiedBy?: { fullName: string }
}

// How long since submission (flag if > 3 hours)
function hoursAgo(dateStr: string) {
  return (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60)
}

// Simple modal for reject reason
function RejectModal({
  payment,
  onClose,
  onConfirm,
}: {
  payment: AdminPayment
  onClose: () => void
  onConfirm: (reason: string) => void
}) {
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleReject() {
    if (!reason.trim()) return
    setBusy(true)
    await onConfirm(reason.trim())
    setBusy(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-bold text-slate-900">Reject payment evidence</h2>
        <p className="mt-1 text-sm text-slate-600">
          Property: <strong>{payment.property.title}</strong>
        </p>
        <p className="mt-0.5 text-sm text-slate-600">
          Owner: {payment.user.fullName} · ETB {Number(payment.amountInETB).toLocaleString()}
        </p>

        <div className="mt-5">
          <label className="block text-sm font-medium text-slate-800 mb-1.5">
            Reason for rejection <span className="text-red-500">*</span>
          </label>
          <textarea
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-100 resize-none"
            rows={3}
            placeholder="e.g. Transaction reference not found, incorrect amount, screenshot unreadable…"
            value={reason}
            onChange={e => setReason(e.target.value)}
            autoFocus
          />
          <p className="mt-1 text-xs text-slate-500">
            This reason will be shown to the owner so they can correct and resubmit.
          </p>
        </div>

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!reason.trim() || busy}
            onClick={handleReject}
            className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy ? 'Rejecting…' : 'Reject payment'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Simple modal for accept confirmation
function AcceptModal({
  payment,
  onClose,
  onConfirm,
}: {
  payment: AdminPayment
  onClose: () => void
  onConfirm: (notes: string) => void
}) {
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleAccept() {
    setBusy(true)
    await onConfirm(notes.trim())
    setBusy(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
            <Check className="text-emerald-700" size={22} />
          </span>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Accept payment</h2>
            <p className="text-xs text-slate-500">This will immediately publish the listing</p>
          </div>
        </div>

        <div className="rounded-lg border border-slate-100 bg-slate-50 p-4 text-sm space-y-1.5">
          <div className="flex justify-between">
            <span className="text-slate-500">Property</span>
            <span className="font-medium text-slate-800 text-right max-w-[60%] truncate">{payment.property.title}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Owner</span>
            <span className="font-medium text-slate-800">{payment.user.fullName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Amount</span>
            <span className="font-bold text-emerald-800">ETB {Number(payment.amountInETB).toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Method</span>
            <span className="text-slate-800">{payment.paymentMethod || 'Not specified'}</span>
          </div>
          {payment.transactionReference && (
            <div className="flex justify-between">
              <span className="text-slate-500">Ref</span>
              <span className="font-mono text-xs text-slate-800">{payment.transactionReference}</span>
            </div>
          )}
        </div>

        <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>
            <strong>Confirm independently:</strong> Verify this transaction in your official
            Telebirr or CBE account before accepting. Accepting will immediately make the
            listing visible on EthioRent.
          </span>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Admin notes <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <input
            type="text"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            placeholder="Internal note about this verification…"
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={handleAccept}
            className="flex-1 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
          >
            {busy ? 'Accepting…' : '✓ Accept & Publish'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminPayments() {
  const [payments, setPayments] = useState<AdminPayment[]>([])
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Modals
  const [acceptTarget, setAcceptTarget] = useState<AdminPayment | null>(null)
  const [rejectTarget, setRejectTarget] = useState<AdminPayment | null>(null)
  const [receiptLoading, setReceiptLoading] = useState('')

  async function loadPayments(nextStatus = statusFilter) {
    setLoading(true)
    try {
      const result = await adminService.getPayments({ limit: 100, status: nextStatus || undefined })
      setPayments(result.data || [])
    } catch {
      toast.error('Could not load payment records')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadPayments(statusFilter) }, [statusFilter])

  useEffect(() => {
    const socket = getRealtimeSocket()
    const refresh = () => { void loadPayments() }
    const paymentCreated = () => {
      toast('A new payment request has arrived', { icon: '!' })
      refresh()
    }
    const connected = () => {
      socket.emit('admin:subscribe:payments')
      refresh()
    }

    socket.on('connect', connected)
    socket.on('payment:created', paymentCreated)
    socket.on('payment:updated', refresh)
    socket.connect()

    const recoveryTimer = window.setInterval(refresh, 30000)
    return () => {
      socket.off('connect', connected)
      socket.off('payment:created', paymentCreated)
      socket.off('payment:updated', refresh)
      window.clearInterval(recoveryTimer)
    }
  }, [statusFilter])

  async function handleAccept(payment: AdminPayment, notes: string) {
    try {
      await adminService.verifyPayment(payment.id, notes)
      toast.success(`✅ Payment accepted — "${payment.property.title}" is now live!`)
      setAcceptTarget(null)
      loadPayments()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Could not accept payment')
    }
  }

  async function handleReject(payment: AdminPayment, reason: string) {
    try {
      await adminService.rejectPayment(payment.id, reason)
      toast.success('Payment rejected. Owner will be notified.')
      setRejectTarget(null)
      loadPayments()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Could not reject payment')
    }
  }

  async function openReceipt(paymentId: string) {
    setReceiptLoading(paymentId)
    try { window.open(await adminService.getPaymentReceiptUrl(paymentId), '_blank', 'noopener,noreferrer') }
    catch (error: any) { toast.error(error.response?.data?.message || 'Could not open this receipt') }
    finally { setReceiptLoading('') }
  }

  const pendingCount = payments.filter(p => ['SUBMITTED', 'UNDER_REVIEW', 'PENDING'].includes(p.paymentStatus)).length

  return (
    <>
      {/* Accept confirmation modal */}
      {acceptTarget && (
        <AcceptModal
          payment={acceptTarget}
          onClose={() => setAcceptTarget(null)}
          onConfirm={(notes) => handleAccept(acceptTarget, notes)}
        />
      )}

      {/* Reject reason modal */}
      {rejectTarget && (
        <RejectModal
          payment={rejectTarget}
          onClose={() => setRejectTarget(null)}
          onConfirm={(reason) => handleReject(rejectTarget, reason)}
        />
      )}

      <div className="space-y-6">
        {/* Header */}
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">Administration</p>
            <h1 className="mt-1 text-3xl font-bold text-slate-900">Payment verification</h1>
            <p className="mt-2 text-sm text-slate-600">
              Verify each payment independently in your official Telebirr or CBE account before accepting.
              Accepting a payment will <strong>immediately publish</strong> the associated listing.
            </p>
          </div>
          <button
            type="button"
            onClick={() => loadPayments()}
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50"
          >
            <RefreshCw size={15} />
            Refresh
          </button>
        </header>

        {/* Official account details reminder */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
            <Smartphone size={18} className="mt-0.5 shrink-0 text-blue-700" />
            <div className="text-sm">
              <p className="font-semibold text-blue-900">Telebirr account</p>
              <p className="mt-0.5 font-mono text-base font-bold text-blue-800">0900468152</p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <Building2 size={18} className="mt-0.5 shrink-0 text-emerald-700" />
            <div className="text-sm">
              <p className="font-semibold text-emerald-900">CBE Bank account</p>
              <p className="mt-0.5 font-mono text-base font-bold text-emerald-800">1000706746734</p>
              <p className="text-xs text-emerald-700">Ref / phone: 0900468152</p>
            </div>
          </div>
        </div>

        {/* Filters & count */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3">
          <p className="text-sm text-slate-600">
            <CreditCard size={16} className="mr-2 inline text-emerald-800" />
            <strong>{payments.length}</strong> payment{payments.length !== 1 ? 's' : ''}
            {pendingCount > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                <Clock size={12} />{pendingCount} pending review
              </span>
            )}
          </p>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            Filter:
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm"
            >
              <option value="">All statuses</option>
              <option value="PENDING">Pending</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="UNDER_REVIEW">Under review</option>
              <option value="VERIFIED">Accepted</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </label>
        </div>

        {/* Payment list */}
        {loading ? (
          <p className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500">
            Loading payment records…
          </p>
        ) : payments.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white p-10 text-center">
            <p className="font-semibold text-slate-800">No payments in this view</p>
            <p className="mt-1 text-sm text-slate-500">Submitted evidence will appear here for review.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {payments.map(payment => {
              const isOverdue = ['SUBMITTED', 'UNDER_REVIEW'].includes(payment.paymentStatus) && hoursAgo(payment.createdAt) > 3
              const isPending = ['SUBMITTED', 'UNDER_REVIEW'].includes(payment.paymentStatus)
              const isExpanded = expandedId === payment.id

              return (
                <article
                  key={payment.id}
                  className={`rounded-xl border bg-white shadow-sm overflow-hidden ${
                    isOverdue ? 'border-amber-300' : isPending ? 'border-emerald-200' : 'border-slate-200'
                  }`}
                >
                  {/* Overdue warning strip */}
                  {isOverdue && (
                    <div className="flex items-center gap-2 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-800 border-b border-amber-200">
                      <Clock size={13} />
                      Payment submitted over 3 hours ago — please review promptly
                    </div>
                  )}

                  {/* Main row */}
                  <div className="flex flex-wrap items-start justify-between gap-4 p-4 sm:p-5">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-semibold text-slate-900 truncate">{payment.property.title}</h2>
                        <StatusBadge status={payment.paymentStatus} />
                      </div>
                      <p className="mt-1 text-sm text-slate-600">
                        {payment.user.fullName} · {payment.user.email}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {payment.property.city} · {payment.package.name} ·{' '}
                        Submitted {new Date(payment.createdAt).toLocaleString()}
                      </p>
                      {payment.property.images?.length ? <div className="mt-3 flex gap-2 overflow-x-auto">{payment.property.images.slice(0, 5).map(image => <img key={image.id} src={resolveMediaUrl(image.imageUrl)} crossOrigin={mediaCrossOrigin(image.imageUrl)} alt={payment.property.title} className="h-14 w-20 shrink-0 border border-slate-200 object-cover" />)}</div> : <p className="mt-2 text-xs text-slate-400">No house photos attached</p>}
                    </div>

                    <div className="flex items-center gap-3">
                      <p className="text-xl font-bold text-slate-900">
                        ETB {Number(payment.amountInETB).toLocaleString()}
                      </p>
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : payment.id)}
                        className="text-slate-400 hover:text-slate-700"
                        title={isExpanded ? 'Collapse' : 'Show details'}
                      >
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 px-4 py-4 sm:px-5 space-y-3">
                      <div className="grid gap-2 text-sm sm:grid-cols-3">
                        <div>
                          <span className="text-xs text-slate-500 block">Method</span>
                          <span className="font-medium text-slate-800">
                            {payment.paymentMethod === 'TELEBIRR' ? '📱 Telebirr' : payment.paymentMethod === 'CBE' ? '🏦 CBE' : 'Not selected'}
                          </span>
                        </div>
                        <div>
                          <span className="text-xs text-slate-500 block">Transaction reference</span>
                          <span className="font-mono text-slate-800 break-all">
                            {payment.transactionReference || <em className="text-slate-400 not-italic">Not provided</em>}
                          </span>
                        </div>
                        <div>
                          <span className="text-xs text-slate-500 block">Owner phone</span>
                          <span className="text-slate-800">{payment.user.phone}</span>
                        </div>
                      </div>

                      {payment.receiptUrl && (
                        <div>
                          <span className="text-xs text-slate-500 block mb-1">Receipt</span>
                          <button type="button" onClick={() => openReceipt(payment.id)} disabled={receiptLoading === payment.id} className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                            <Eye size={13} />
                            {receiptLoading === payment.id ? 'Opening...' : 'View receipt'}
                          </button>
                        </div>
                      )}

                      {payment.rejectionReason && (
                        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                          <strong>Previous rejection reason:</strong> {payment.rejectionReason}
                        </div>
                      )}
                      {payment.notes && (
                        <div className="text-xs text-slate-500">
                          Admin notes: {payment.notes}
                        </div>
                      )}
                      {payment.verifiedBy && (
                        <div className="text-xs text-slate-500">
                          Reviewed by {payment.verifiedBy.fullName}
                          {payment.verifiedAt ? ` on ${new Date(payment.verifiedAt).toLocaleString()}` : ''}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action buttons — only for pending payments */}
                  {isPending && (
                    <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 bg-slate-50 px-4 py-3 sm:px-5">
                      <button
                        type="button"
                        onClick={() => setRejectTarget(payment)}
                        className="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 transition-colors"
                      >
                        <X size={15} />
                        Reject
                      </button>
                      <button
                        type="button"
                        onClick={() => setAcceptTarget(payment)}
                        className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600 transition-colors"
                      >
                        <Check size={15} />
                        Accept payment
                      </button>
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
