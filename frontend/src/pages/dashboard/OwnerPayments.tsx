import { useEffect, useState } from 'react'
import { CreditCard, ExternalLink, ReceiptText } from 'lucide-react'
import toast from 'react-hot-toast'
import { paymentService } from '../../services'
import type { Payment } from '../../types'
import StatusBadge from '../../components/StatusBadge'

export default function OwnerPayments() {
	const [payments, setPayments] = useState<Payment[]>([])
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		paymentService.getMyPayments().then(setPayments).catch(() => toast.error('Could not load payment history')).finally(() => setLoading(false))
	}, [])

	return (
		<div className="mx-auto max-w-6xl space-y-6">
			<header><p className="text-xs font-bold uppercase tracking-wider text-emerald-800">Owner workspace</p><h1 className="mt-1 text-3xl font-bold text-slate-900">Payments</h1><p className="mt-2 text-sm text-slate-600">Advertising package payments. House rent is paid directly between tenant and owner.</p></header>
			<div className="overflow-hidden border border-slate-200 bg-white shadow-sm">
				{loading ? <p className="p-6 text-sm text-slate-500">Loading payment history...</p> : payments.length === 0 ? <div className="flex flex-col items-center px-5 py-14 text-center"><span className="grid h-14 w-14 place-items-center rounded-full bg-emerald-50 text-emerald-800"><CreditCard /></span><h2 className="mt-4 font-semibold text-slate-900">No advertising payments</h2><p className="mt-1 text-sm text-slate-500">Payments and verification decisions will appear here.</p></div> : <>
					<div className="hidden grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 md:grid"><span>Property and package</span><span>Method</span><span>Amount</span><span>Status</span><span>Date</span></div>
					<ul className="divide-y divide-slate-100">{payments.map(payment => <li key={payment.id} className="grid gap-3 p-4 md:grid-cols-[2fr_1fr_1fr_1fr_1fr] md:items-center md:gap-4 md:px-5"><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900">{payment.property?.title || 'Property listing'}</p><p className="mt-1 text-xs text-slate-500">{payment.package?.name || 'Advertising package'}{payment.transactionReference ? ` · Ref ${payment.transactionReference}` : ''}</p>{payment.rejectionReason && <p className="mt-1 text-xs text-red-700">Reason: {payment.rejectionReason}</p>}</div><div><span className="mb-1 block text-xs text-slate-500 md:hidden">Method</span><span className="text-sm text-slate-700">{payment.paymentMethod || 'Not submitted'}</span></div><div><span className="mb-1 block text-xs text-slate-500 md:hidden">Amount</span><span className="text-sm font-semibold text-slate-900">ETB {Number(payment.amountInETB).toLocaleString()}</span></div><div><span className="mb-1 block text-xs text-slate-500 md:hidden">Status</span><StatusBadge status={payment.paymentStatus} /></div><div><span className="mb-1 block text-xs text-slate-500 md:hidden">Date</span><span className="text-sm text-slate-700">{new Date(payment.createdAt).toLocaleDateString()}</span></div>{payment.verifiedById && <p className="flex items-center gap-1 text-xs text-slate-500 md:col-span-5"><ReceiptText size={14} />Decision recorded {payment.verifiedAt ? `on ${new Date(payment.verifiedAt).toLocaleDateString()}` : ''}</p>}</li>)}</ul>
				</>}
			</div>
			<p className="flex items-start gap-2 text-xs leading-5 text-slate-500"><ExternalLink size={14} className="mt-0.5 shrink-0" />EthioRent currently uses manual payment verification. A submitted receipt is evidence for review, not confirmation of payment.</p>
		</div>
	)
}