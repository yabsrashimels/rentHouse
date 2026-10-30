import { useEffect, useState } from 'react'
import { adminService } from '../../services'
import StatusBadge from '../../components/StatusBadge'
import toast from 'react-hot-toast'

type AdminRentalRequest = {
  id: string
  message: string
  responseMessage?: string | null
  status: string
  createdAt: string
  renter: { fullName: string; email: string; phone: string }
  property: { title: string; slug: string; city: string; owner: { fullName: string; email: string; phone: string } }
}

export default function AdminRentalRequests() {
  const [requests, setRequests] = useState<AdminRentalRequest[]>([])
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    adminService.getRentalRequests({ limit: 100, status: status || undefined })
      .then(result => setRequests(result.data || []))
      .catch(() => toast.error('Could not load rental requests'))
      .finally(() => setLoading(false))
  }, [status])

  return <main className="space-y-5">
    <header><p className="text-xs font-bold uppercase tracking-wider text-emerald-800">Administration</p><h1 className="mt-1 text-3xl font-bold text-slate-900">Rental requests</h1><p className="mt-2 text-sm text-slate-600">Renter and poster decisions are independent from advertising payment review.</p></header>
    <div className="flex flex-wrap items-center justify-between gap-3 border-y border-slate-200 py-3"><p className="text-sm text-slate-600">{requests.length} request{requests.length === 1 ? '' : 's'}</p><label className="flex items-center gap-2 text-sm text-slate-600">Status<select value={status} onChange={event => setStatus(event.target.value)} className="rounded-md border border-slate-300 bg-white px-3 py-2"><option value="">All</option><option value="PENDING">Pending</option><option value="ACCEPTED">Accepted</option><option value="REJECTED">Rejected</option></select></label></div>
    {loading ? <p className="border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading requests...</p> : requests.length ? <ul className="divide-y divide-slate-200 border border-slate-200 bg-white">{requests.map(request => <li key={request.id} className="space-y-3 p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold text-slate-900">{request.property.title} · {request.property.city}</h2><p className="mt-1 text-sm text-slate-600">Poster: {request.property.owner.fullName} · {request.property.owner.phone} · {request.property.owner.email}</p><p className="text-sm text-slate-600">Renter: {request.renter.fullName} · {request.renter.phone} · {request.renter.email}</p><p className="mt-1 text-xs text-slate-500">Received {new Date(request.createdAt).toLocaleString()}</p></div><StatusBadge status={request.status} /></div><p className="whitespace-pre-line text-sm leading-6 text-slate-700">{request.message}</p>{request.responseMessage && <p className="text-sm text-slate-600">Poster response: {request.responseMessage}</p>}</li>)}</ul> : <p className="border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">No rental requests match this status.</p>}
  </main>
}
