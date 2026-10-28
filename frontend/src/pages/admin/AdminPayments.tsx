import { useEffect, useState } from 'react'
import { Check, CreditCard, RefreshCw, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { adminService } from '../../services'
import StatusBadge from '../../components/StatusBadge'

interface AdminPayment {
	id: string
	amountInETB: number
	paymentStatus: string
	paymentMethod?: string
	transactionReference?: string
	receiptUrl?: string
	rejectionReason?: string
	createdAt: string
	user: { fullName: string; email: string; phone: string }
	property: { title: string; city: string }
	package: { name: string }
}

export default function AdminPayments() {
	const [payments, setPayments] = useState<AdminPayment[]>([])
	const [status, setStatus] = useState('')
	const [loading, setLoading] = useState(true)
	const [workingId, setWorkingId] = useState('')

	async function loadPayments(nextStatus = status) {
		setLoading(true)
		try {
			const result = await adminService.getPayments({ limit: 50, status: nextStatus || undefined })
			setPayments(result.data || [])
		} catch { toast.error('Could not load payment records') }
		finally { setLoading(false) }
	}

	useEffect(() => { loadPayments(status) }, [status])

	async function verify(payment: AdminPayment) {
		if (!window.confirm(`Confirm that ETB ${Number(payment.amountInETB).toLocaleString()} has been independently verified for “${payment.property.title}”?`)) return
		setWorkingId(payment.id)
		try { await adminService.verifyPayment(payment.id); toast.success('Payment verified; listing is now awaiting moderation'); await loadPayments() }
		catch (error: any) { toast.error(error.response?.data?.message || 'Could not verify payment') }
		finally { setWorkingId('') }
	}

	async function reject(payment: AdminPayment) {
		const reason = window.prompt('Enter a reason for rejecting this payment evidence:')?.trim()
		if (!reason) return
		setWorkingId(payment.id)
		try { await adminService.rejectPayment(payment.id, reason); toast.success('Payment rejected'); await loadPayments() }
		catch (error: any) { toast.error(error.response?.data?.message || 'Could not reject payment') }
		finally { setWorkingId('') }
	}

	return (
		<div className="space-y-6">
			<header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-wider text-emerald-800">Administration</p><h1 className="mt-1 text-3xl font-bold text-slate-900">Payment verification</h1><p className="mt-2 text-sm text-slate-600">Verify externally against the official account before approving evidence.</p></div><button type="button" onClick={() => loadPayments()} className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50"><RefreshCw size={15} />Refresh</button></header>
			<div className="flex flex-wrap items-center justify-between gap-3 border-y border-slate-200 py-3"><p className="text-sm text-slate-600"><CreditCard size={16} className="mr-2 inline text-emerald-800" />{payments.length} payment{payments.length === 1 ? '' : 's'}</p><label className="flex items-center gap-2 text-sm text-slate-600">Status<select value={status} onChange={event => setStatus(event.target.value)} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"><option value="">All statuses</option><option value="SUBMITTED">Submitted</option><option value="UNDER_REVIEW">Under review</option><option value="VERIFIED">Verified</option><option value="REJECTED">Rejected</option><option value="PENDING">Pending</option></select></label></div>
			{loading ? <p className="border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading payment records...</p> : payments.length === 0 ? <div className="border border-slate-200 bg-white p-10 text-center"><p className="font-semibold text-slate-800">No payments in this view</p><p className="mt-1 text-sm text-slate-500">Submitted evidence will appear here for review.</p></div> : <div className="space-y-3">{payments.map(payment => <article key={payment.id} className="border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold text-slate-900">{payment.property.title}</h2><StatusBadge status={payment.paymentStatus} /></div><p className="mt-1 text-sm text-slate-600">{payment.user.fullName} · {payment.user.email} · {payment.user.phone}</p><p className="mt-1 text-xs text-slate-500">{payment.property.city} · {payment.package.name} · Submitted {new Date(payment.createdAt).toLocaleString()}</p></div><p className="text-lg font-bold text-slate-900">ETB {Number(payment.amountInETB).toLocaleString()}</p></div><div className="mt-4 grid gap-2 border-t border-slate-100 pt-3 text-sm sm:grid-cols-3"><p><span className="text-slate-500">Method:</span> {payment.paymentMethod || 'Not selected'}</p><p className="break-all"><span className="text-slate-500">Transaction ref:</span> {payment.transactionReference || 'Not submitted'}</p><p><span className="text-slate-500">Receipt:</span> {payment.receiptUrl ? 'Evidence attached (private storage)' : 'None attached'}</p></div>{payment.rejectionReason && <p className="mt-2 text-sm text-red-700">Previous reason: {payment.rejectionReason}</p>}{['SUBMITTED', 'UNDER_REVIEW'].includes(payment.paymentStatus) && <div className="mt-4 flex flex-wrap justify-end gap-2"><button type="button" disabled={workingId === payment.id} onClick={() => reject(payment)} className="inline-flex items-center gap-2 rounded-md border border-red-300 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"><X size={15} />Reject</button><button type="button" disabled={workingId === payment.id} onClick={() => verify(payment)} className="inline-flex items-center gap-2 rounded-md bg-emerald-800 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"><Check size={15} />Verify payment</button></div>}</article>)}</div>}
		</div>
	)
}