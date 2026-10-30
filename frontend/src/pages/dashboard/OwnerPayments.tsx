import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CreditCard, ExternalLink, AlertTriangle, CheckCircle,
  XCircle, Clock, ReceiptText, ArrowRight
} from 'lucide-react'
import toast from 'react-hot-toast'
import { paymentService } from '../../services'
import type { Payment } from '../../types'
import StatusBadge from '../../components/StatusBadge'
import { getRealtimeSocket } from '../../services/realtime'

// Human-readable guidance for each payment status
function PaymentGuidance({ status, reason }: { status: string; reason?: string }) {
  if (status === 'VERIFIED') {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-xs text-green-800 mt-2">
        <CheckCircle size={14} className="mt-0.5 shrink-0 text-green-600" />
        <span>
          <strong>Payment accepted.</strong> Your listing has been published and is visible to renters.
        </span>
      </div>
    )
  }
  if (status === 'REJECTED') {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800 mt-2">
        <XCircle size={14} className="mt-0.5 shrink-0 text-red-600" />
        <div>
          <strong>Payment rejected.</strong> Your listing has not been published.
          {reason && <p className="mt-1">Reason: {reason}</p>}
          <p className="mt-1">Please return to your listing and resubmit corrected payment evidence.</p>
        </div>
      </div>
    )
  }
  if (status === 'SUBMITTED' || status === 'UNDER_REVIEW') {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 mt-2">
        <Clock size={14} className="mt-0.5 shrink-0 text-amber-600" />
        <span>
          <strong>Awaiting admin review.</strong> An EthioRent administrator will verify
          your payment evidence. Your listing will go live once accepted (target: within 3 hours).
        </span>
      </div>
    )
  }
  if (status === 'PENDING') {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 mt-2">
        <AlertTriangle size={14} className="mt-0.5 shrink-0 text-slate-500" />
        <span>
          <strong>No evidence submitted yet.</strong> Go to your listing and submit payment evidence
          to start the verification process.
        </span>
      </div>
    )
  }
  return null
}

export default function OwnerPayments() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [receiptLoading, setReceiptLoading] = useState('')

  useEffect(() => {
    const loadPayments = () => paymentService.getMyPayments().then(setPayments).catch(() => toast.error('Could not load payment history')).finally(() => setLoading(false))
    const socket = getRealtimeSocket()
    const refresh = () => { void loadPayments() }
    socket.on('connect', refresh)
    socket.on('payment:updated', refresh)
    socket.on('listing:updated', refresh)
    socket.connect()
    void loadPayments()
    const recoveryTimer = window.setInterval(refresh, 30000)
    return () => {
      socket.off('connect', refresh)
      socket.off('payment:updated', refresh)
      socket.off('listing:updated', refresh)
      window.clearInterval(recoveryTimer)
    }
  }, [])

  async function openReceipt(paymentId: string) {
    setReceiptLoading(paymentId)
    try { window.open(await paymentService.getReceiptUrl(paymentId), '_blank', 'noopener,noreferrer') }
    catch (error: any) { toast.error(error.response?.data?.message || 'Could not open this receipt') }
    finally { setReceiptLoading('') }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">Owner workspace</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-900">My Payments</h1>
        <p className="mt-2 text-sm text-slate-600">
          These are advertising fees paid to list your property on EthioRent.{' '}
          <strong>House rent is paid directly by tenants to you</strong> — EthioRent does not
          collect rent.
        </p>
      </header>

      {/* Status legend */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wide">Payment statuses</p>
        <div className="grid gap-2 sm:grid-cols-3 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-yellow-400" />
            <strong>Pending</strong> — evidence not yet submitted
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-purple-400" />
            <strong>Under Review</strong> — admin is verifying
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
            <strong>Accepted</strong> — listing is published
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
            <strong>Rejected</strong> — resubmit evidence
          </div>
        </div>
      </div>

      {/* Payments list */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <p className="p-8 text-center text-sm text-slate-500">Loading payment history…</p>
        ) : payments.length === 0 ? (
          <div className="flex flex-col items-center px-5 py-14 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-emerald-50 text-emerald-800">
              <CreditCard />
            </span>
            <h2 className="mt-4 font-semibold text-slate-900">No advertising payments yet</h2>
            <p className="mt-1 text-sm text-slate-500">
              Once you submit payment evidence for a listing, it will appear here.
            </p>
            <Link
              to="/dashboard/listings"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              View my listings <ArrowRight size={14} />
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {payments.map(payment => (
              <li key={payment.id} className="p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-900 truncate">
                        {(payment as any).property?.title || 'Property listing'}
                      </p>
                      <StatusBadge status={payment.paymentStatus} />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {(payment as any).package?.name || 'Advertising package'}
                      {payment.transactionReference
                        ? ` · Ref: ${payment.transactionReference}`
                        : ''}
                      {' · '}
                      {new Date(payment.createdAt).toLocaleDateString()}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Method:{' '}
                      {payment.paymentMethod === 'TELEBIRR'
                        ? '📱 Telebirr'
                        : payment.paymentMethod === 'CBE'
                        ? '🏦 CBE Bank'
                        : 'Not submitted'}
                    </p>
                    {payment.transactionReference && (
                      <p className="mt-1 text-xs text-slate-600">
                        Reference: <span className="font-mono font-semibold">{payment.transactionReference}</span>
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-slate-900">
                      ETB {Number(payment.amountInETB).toLocaleString()}
                    </p>
                    {payment.verifiedAt && (
                      <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1 justify-end">
                        <ReceiptText size={11} />
                        {new Date(payment.verifiedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>

                {/* Status-specific guidance — NO accept/reject buttons for users */}
                <PaymentGuidance
                  status={payment.paymentStatus}
                  reason={payment.rejectionReason}
                />

                {payment.receiptUrl && (
                  <div className="mt-3">
                    <button type="button" onClick={() => openReceipt(payment.id)} disabled={receiptLoading === payment.id} className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-800 underline underline-offset-2 disabled:opacity-50">
                      <ReceiptText size={15} /> {receiptLoading === payment.id ? 'Opening receipt...' : 'View payment screenshot / receipt'}
                    </button>
                  </div>
                )}

                {payment.paymentStatus === 'VERIFIED' && (payment as any).property?.slug && (
                  <div className="mt-3">
                    <Link
                      to={`/houses/${(payment as any).property.slug}`}
                      className="inline-flex items-center gap-2 rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                    >
                      View published listing <ExternalLink size={14} />
                    </Link>
                  </div>
                )}
                {payment.paymentStatus === 'REJECTED' && (payment as any).property?.id && (
                  <div className="mt-3">
                    <Link
                      to={`/dashboard/listings/${(payment as any).property.id}/payment?${new URLSearchParams({ payment: payment.id, amount: String(payment.amountInETB), pkg: (payment as any).package?.name || '' }).toString()}`}
                      className="inline-flex items-center gap-2 rounded-lg border border-emerald-800 px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50"
                    >
                      Correct and resubmit evidence <ArrowRight size={14} />
                    </Link>
                  </div>
                )}
                {payment.paymentStatus === 'PENDING' && (payment as any).property?.id && (
                  <div className="mt-3">
                    <Link
                      to={`/dashboard/listings/${(payment as any).property.id}/package`}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Submit payment evidence <ArrowRight size={14} />
                    </Link>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="flex items-start gap-2 text-xs leading-5 text-slate-500">
        <ExternalLink size={14} className="mt-0.5 shrink-0" />
        EthioRent uses manual payment verification. Submitting evidence is not confirmation of
        payment — an administrator verifies every transaction independently.
      </p>
    </div>
  )
}
