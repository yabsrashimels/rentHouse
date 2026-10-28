import { useEffect, useState } from 'react'
import { Check, ExternalLink, Search, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { adminService } from '../../services'
import StatusBadge from '../../components/StatusBadge'

interface ModerationProperty {
	id: string
	title: string
	slug: string
	city: string
	neighborhood?: string
	monthlyRent: number
	bedrooms: number
	bathrooms: number
	listingStatus: string
	coverImage?: string | null
	createdAt: string
	owner: { fullName: string; email: string; phone: string }
	payments: Array<{ paymentStatus: string; amountInETB: number; package: { name: string } }>
}

export default function AdminProperties() {
	const [properties, setProperties] = useState<ModerationProperty[]>([])
	const [status, setStatus] = useState('')
	const [search, setSearch] = useState('')
	const [searchDraft, setSearchDraft] = useState('')
	const [page, setPage] = useState(1)
	const [totalPages, setTotalPages] = useState(1)
	const [loading, setLoading] = useState(true)
	const [workingId, setWorkingId] = useState('')

	async function loadProperties() {
		setLoading(true)
		try {
			const result = await adminService.getProperties({ page, limit: 20, status: status || undefined, search: search || undefined })
			setProperties(result.data || [])
			setTotalPages(result.meta?.totalPages || 1)
		} catch { toast.error('Could not load property records') }
		finally { setLoading(false) }
	}

	useEffect(() => { loadProperties() }, [status, search, page])

	async function approve(property: ModerationProperty) {
		if (!window.confirm(`Approve and publish “${property.title}”? This is only allowed after verified payment.`)) return
		setWorkingId(property.id)
		try { await adminService.approveProperty(property.id); toast.success('Listing approved and published'); await loadProperties() }
		catch (error: any) { toast.error(error.response?.data?.message || 'Could not approve this listing') }
		finally { setWorkingId('') }
	}

	async function reject(property: ModerationProperty) {
		const reason = window.prompt('Enter the correction or rejection reason for the owner:')?.trim()
		if (!reason) return
		setWorkingId(property.id)
		try { await adminService.rejectProperty(property.id, reason); toast.success('Listing rejected with owner notification'); await loadProperties() }
		catch (error: any) { toast.error(error.response?.data?.message || 'Could not reject this listing') }
		finally { setWorkingId('') }
	}

	return <div className="space-y-6"><header><p className="text-xs font-bold uppercase tracking-wider text-emerald-800">Administration</p><h1 className="mt-1 text-3xl font-bold text-slate-900">Property moderation</h1><p className="mt-2 text-sm text-slate-600">Only listings with verified advertising payments can be approved for publication.</p></header>
		<form onSubmit={event => { event.preventDefault(); setPage(1); setSearch(searchDraft.trim()) }} className="grid gap-3 border-y border-slate-200 py-3 sm:grid-cols-[1fr_auto_auto]"><label className="flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3"><Search size={16} className="text-slate-400" /><input aria-label="Search property or owner" value={searchDraft} onChange={event => setSearchDraft(event.target.value)} placeholder="Search property or owner" className="min-w-0 flex-1 py-2 text-sm outline-none" /></label><select aria-label="Filter by status" value={status} onChange={event => { setPage(1); setStatus(event.target.value) }} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"><option value="">All statuses</option><option value="AWAITING_MODERATION">Awaiting moderation</option><option value="PAYMENT_UNDER_REVIEW">Payment under review</option><option value="PUBLISHED">Published</option><option value="REJECTED">Rejected</option><option value="SUSPENDED">Suspended</option></select><button className="rounded-md bg-emerald-800 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">Search</button></form>
		{loading ? <p className="border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading property records...</p> : properties.length ? <div className="space-y-3">{properties.map(property => { const payment = property.payments[0]; const canModerate = ['AWAITING_MODERATION', 'PAYMENT_UNDER_REVIEW'].includes(property.listingStatus); return <article key={property.id} className="grid gap-4 border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[150px_minmax(0,1fr)] sm:p-5"><img src={property.coverImage || '/placeholder-property.svg'} alt="" className="aspect-[4/3] w-full bg-slate-100 object-cover sm:aspect-auto sm:h-32" /><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold text-slate-900">{property.title}</h2><StatusBadge status={property.listingStatus} /></div><p className="mt-1 text-sm text-slate-600">{property.neighborhood ? `${property.neighborhood}, ` : ''}{property.city} · {property.bedrooms} bd · {property.bathrooms} ba · ETB {Number(property.monthlyRent).toLocaleString()} / mo</p><p className="mt-2 text-xs text-slate-500">Owner: {property.owner.fullName} · {property.owner.email} · {property.owner.phone}</p><p className="mt-1 text-xs text-slate-500">{payment ? `Latest payment: ${payment.package.name}, ETB ${Number(payment.amountInETB).toLocaleString()} (${payment.paymentStatus})` : 'No payment record'} · Created {new Date(property.createdAt).toLocaleDateString()}</p><div className="mt-4 flex flex-wrap justify-end gap-2"><a href={`/houses/${property.slug}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700"><ExternalLink size={14} />Preview</a>{canModerate && <><button type="button" disabled={workingId === property.id} onClick={() => reject(property)} className="inline-flex items-center gap-1.5 rounded-md border border-red-300 px-3 py-2 text-xs font-semibold text-red-700 disabled:opacity-50"><X size={14} />Reject</button><button type="button" disabled={workingId === property.id || payment?.paymentStatus !== 'VERIFIED'} onClick={() => approve(property)} title={payment?.paymentStatus !== 'VERIFIED' ? 'Payment must be verified before publication' : undefined} className="inline-flex items-center gap-1.5 rounded-md bg-emerald-800 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"><Check size={14} />Approve and publish</button></>}</div></div></article>})}</div> : <div className="border border-slate-200 bg-white p-10 text-center"><p className="font-semibold text-slate-800">No properties match this view</p><p className="mt-1 text-sm text-slate-500">Try another status or search term.</p></div>}
		{totalPages > 1 && <nav aria-label="Property moderation pages" className="flex items-center justify-center gap-3"><button disabled={page <= 1} onClick={() => setPage(current => current - 1)} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm disabled:opacity-40">Previous</button><span className="text-sm text-slate-600">Page {page} of {totalPages}</span><button disabled={page >= totalPages} onClick={() => setPage(current => current + 1)} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm disabled:opacity-40">Next</button></nav>}
	</div>
}