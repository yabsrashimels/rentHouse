import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BadgeCheck, CircleDollarSign, Clock3, Home, MessageSquare, Plus, WalletCards } from 'lucide-react'
import toast from 'react-hot-toast'
import { ownerService } from '../../services'
import StatusBadge from '../../components/StatusBadge'
import { useAuth } from '../../context/AuthContext'
import { getRealtimeSocket } from '../../services/realtime'

interface DashboardData {
	stats: { totalListings: number; activeListings: number; pendingApproval: number; expiredListings: number; totalPaid: number }
	recentPayments: Array<{ id: string; amountInETB: number; paymentStatus: string; createdAt: string; package: { name: string }; property: { title: string } }>
}

export default function OwnerDashboard() {
	const { user } = useAuth()
	const [data, setData] = useState<DashboardData | null>(null)
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		const loadDashboard = () => ownerService.getDashboard().then(setData).catch(() => toast.error('Could not load your dashboard')).finally(() => setLoading(false))
		const socket = getRealtimeSocket()
		const refresh = () => { void loadDashboard() }
		socket.on('connect', refresh)
		socket.on('payment:updated', refresh)
		socket.on('listing:updated', refresh)
		socket.connect()
		void loadDashboard()
		const recoveryTimer = window.setInterval(refresh, 30000)
		return () => {
			socket.off('connect', refresh)
			socket.off('payment:updated', refresh)
			socket.off('listing:updated', refresh)
			window.clearInterval(recoveryTimer)
		}
	}, [])

	const stats = data?.stats
	const cards = [
		{ label: 'Total listings', value: stats?.totalListings ?? 0, icon: Home, color: 'text-sky-700 bg-sky-50' },
		{ label: 'Active listings', value: stats?.activeListings ?? 0, icon: BadgeCheck, color: 'text-emerald-700 bg-emerald-50' },
		{ label: 'Awaiting review', value: stats?.pendingApproval ?? 0, icon: Clock3, color: 'text-amber-700 bg-amber-50' },
		{ label: 'Total paid', value: `ETB ${(stats?.totalPaid ?? 0).toLocaleString()}`, icon: CircleDollarSign, color: 'text-teal-700 bg-teal-50' },
	]

	return (
		<div className="mx-auto max-w-7xl space-y-7">
			<header className="flex flex-wrap items-end justify-between gap-4">
				<div>
					<a href='/'>
						<p className="text-base font-bold uppercase tracking-wider text-emerald-800 ">Owner workspace</p></a>
				    <h1 className="mt-1 text-3xl font-bold text-slate-900">Welcome, {user?.fullName?.split(' ')[0]}</h1>
				<p className="mt-2 text-sm text-slate-600">A clear view of your properties and advertising activity.</p></div>
				<Link to="/dashboard/listings/new" className="inline-flex items-center gap-2 rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">
				<Plus size={17} />Add a listing</Link>
			</header>

			<section aria-label="Listing statistics" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
				{cards.map(({ label, value, icon: Icon, color }) => <article key={label} className="flex items-center gap-4 border border-slate-200 bg-white p-4 shadow-sm"><span className={`grid h-11 w-11 shrink-0 place-items-center rounded-lg ${color}`}><Icon size={20} /></span><div><p className="text-xs font-medium text-slate-500">{label}</p><p className="mt-1 text-xl font-bold text-slate-900">{loading ? '...' : value}</p></div></article>)}
			</section>
			<nav aria-label="Your marketplace activity" className="flex flex-wrap gap-3"><Link to="/dashboard/listings" className="border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">My houses</Link><Link to="/dashboard/payments" className="border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Advertising payments</Link><Link to="/dashboard/rental-requests" className="inline-flex items-center gap-2 border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"><MessageSquare size={16} />Rental requests</Link></nav>

			<div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
				<section className="border border-slate-200 bg-white">
					<div className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><div><h2 className="font-semibold text-slate-900">Recent payments</h2><p className="mt-1 text-xs text-slate-500">Advertising fees only; tenants pay rent directly to owners.</p></div><WalletCards className="text-emerald-800" size={20} /></div>
					{loading ? <p className="p-5 text-sm text-slate-500">Loading payment activity...</p> : data?.recentPayments.length ? <ul className="divide-y divide-slate-100">{data.recentPayments.map(payment => <li key={payment.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"><div className="min-w-0"><p className="truncate text-sm font-medium text-slate-800">{payment.property.title}</p><p className="mt-1 text-xs text-slate-500">{payment.package.name} · {new Date(payment.createdAt).toLocaleDateString()}</p></div><div className="flex items-center gap-3"><span className="text-sm font-semibold text-slate-900">ETB {Number(payment.amountInETB).toLocaleString()}</span><StatusBadge status={payment.paymentStatus} /></div></li>)}</ul> : <div className="p-6 text-sm text-slate-500">No advertising payments yet. Your payment history will appear here.</div>}
					<Link to="/dashboard/payments" className="flex items-center justify-between border-t border-slate-200 px-5 py-3 text-sm font-semibold text-emerald-800 hover:bg-emerald-50">View payment history<ArrowRight size={16} /></Link>
				</section>

				<section className="border border-slate-200 bg-white p-5">
					<h2 className="font-semibold text-slate-900">Listing checklist</h2><p className="mt-1 text-sm text-slate-500">Payment and review are separate steps before publication.</p>
					<ol className="mt-5 space-y-4 text-sm text-slate-700"><li className="flex gap-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800">1</span>Create your property draft</li><li className="flex gap-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800">2</span>Select an advertising package</li><li className="flex gap-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800">3</span>Submit transaction evidence for manual verification</li><li className="flex gap-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800">4</span>Wait for payment verification and listing moderation</li></ol>
					<Link to="/dashboard/listings" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-emerald-800 hover:text-emerald-700">Manage your listings<ArrowRight size={16} /></Link>
				</section>
			</div>
		</div>
	)
}