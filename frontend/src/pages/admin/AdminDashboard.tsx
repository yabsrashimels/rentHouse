import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowRight, BadgeCheck, Building2, CircleDollarSign, Clock3, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import { adminService } from '../../services'
import StatusBadge from '../../components/StatusBadge'
import { getRealtimeSocket } from '../../services/realtime'

interface AdminDashboardData {
	stats: Record<string, number | string>
	recentPayments: Array<{ id: string; amountInETB: number; paymentMethod?: string; transactionReference?: string; createdAt: string; user: { fullName: string }; property: { title: string }; package: { name: string } }>
	overdueReviews: Array<{ id: string; amountInETB: number; createdAt: string; user: { fullName: string }; property: { title: string } }>
}

export default function AdminDashboard() {
	const [data, setData] = useState<AdminDashboardData | null>(null)
	const [loading, setLoading] = useState(true)
	useEffect(() => {
		const loadDashboard = () => adminService.getDashboard().then(setData).catch(() => toast.error('Could not load administration statistics')).finally(() => setLoading(false))
		const socket = getRealtimeSocket()
		const refresh = () => { void loadDashboard() }
		const connected = () => {
			socket.emit('admin:subscribe:payments')
			refresh()
		}
		socket.on('connect', connected)
		socket.on('payment:created', refresh)
		socket.on('payment:updated', refresh)
		socket.connect()
		void loadDashboard()
		const recoveryTimer = window.setInterval(refresh, 30000)
		return () => {
			socket.off('connect', connected)
			socket.off('payment:created', refresh)
			socket.off('payment:updated', refresh)
			window.clearInterval(recoveryTimer)
		}
	}, [])

	const stats = data?.stats
	const cards = [
		['Users', stats?.totalUsers, Users], ['Owners', stats?.totalOwners, Building2], ['Listings', stats?.totalListings, BadgeCheck], ['Published', stats?.publishedListings, Building2], ['Unpublished', stats?.unpublishedListings, Building2], ['Pending listings', stats?.pendingListings, Clock3], ['Pending payments', stats?.pendingPayments, AlertTriangle], ['Verified payments', stats?.verifiedPayments, BadgeCheck], ['Rental requests', stats?.rentalRequests, Users], ['Pending rental requests', stats?.pendingRentalRequests, Clock3], ['Advertising revenue', `ETB ${Number(stats?.totalRevenue || 0).toLocaleString()}`, CircleDollarSign],
	] as const

	return <div className="space-y-7"><header><p className="text-xs font-bold uppercase tracking-wider text-emerald-800">Administration</p><h1 className="mt-1 text-3xl font-bold text-slate-900">Marketplace overview</h1><p className="mt-2 text-sm text-slate-600">Current activity across users, properties, and verified advertising payments.</p></header>
		<section aria-label="Marketplace statistics" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label, value, Icon]) => <article key={label} className="flex items-center gap-3 border border-slate-200 bg-white p-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-800"><Icon size={19} /></span><div><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-xl font-bold text-slate-900">{loading ? '...' : value ?? 0}</p></div></article>)}</section>
		{(data?.overdueReviews?.length ?? 0) > 0 && <section className="border border-amber-300 bg-amber-50 p-4"><h2 className="flex items-center gap-2 font-semibold text-amber-950"><AlertTriangle size={18} />Payment reviews past the 3-hour target</h2><ul className="mt-3 divide-y divide-amber-200">{data!.overdueReviews.map(payment => <li key={payment.id} className="flex flex-wrap justify-between gap-2 py-2 text-sm text-amber-950"><span>{payment.property.title} · {payment.user.fullName}</span><span>ETB {Number(payment.amountInETB).toLocaleString()} · {new Date(payment.createdAt).toLocaleString()}</span></li>)}</ul><Link to="/admin/payments" className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-amber-950">Review payments<ArrowRight size={15} /></Link></section>}
		<section className="border-y border-slate-200 bg-white"><div className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><div><h2 className="font-semibold text-slate-900">Payments awaiting review</h2><p className="mt-1 text-xs text-slate-500">Receipts require independent verification with the payment provider.</p></div><Link to="/admin/payments" className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-800">View queue<ArrowRight size={15} /></Link></div>{loading ? <p className="p-5 text-sm text-slate-500">Loading review queue...</p> : data?.recentPayments.length ? <ul className="divide-y divide-slate-100">{data.recentPayments.slice(0, 6).map(payment => <li key={payment.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"><div><p className="text-sm font-semibold text-slate-800">{payment.property.title}</p><p className="mt-1 text-xs text-slate-500">{payment.user.fullName} · {payment.package.name} · {payment.paymentMethod || 'Method not selected'}</p></div><div className="flex items-center gap-3"><span className="text-sm font-semibold">ETB {Number(payment.amountInETB).toLocaleString()}</span><StatusBadge status="SUBMITTED" /></div></li>)}</ul> : <p className="p-6 text-sm text-slate-500">No submitted payments are awaiting review.</p>}</section>
	</div>
}