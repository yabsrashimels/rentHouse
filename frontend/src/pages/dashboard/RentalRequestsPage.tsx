import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, MessageSquare, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { ownerService, rentalRequestService } from '../../services'
import StatusBadge from '../../components/StatusBadge'

type RentalRequest = {
  id: string
  message: string
  status: string
  responseMessage?: string | null
  createdAt: string
  property: { id: string; title: string; slug?: string; city: string }
  renter?: { fullName: string; phone: string; email: string }
}

export default function RentalRequestsPage() {
  const [incoming, setIncoming] = useState<RentalRequest[]>([])
  const [outgoing, setOutgoing] = useState<RentalRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState('')

  async function load() {
    setLoading(true)
    const [received, sent] = await Promise.allSettled([ownerService.getRentalRequests(), rentalRequestService.getMine()])
    if (received.status === 'fulfilled') setIncoming(received.value)
    if (sent.status === 'fulfilled') setOutgoing(sent.value)
    if (received.status === 'rejected' && sent.status === 'rejected') toast.error('Could not load rental requests')
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function respond(request: RentalRequest, decision: 'ACCEPTED' | 'REJECTED') {
    setBusyId(request.id)
    try {
      await ownerService.respondToRentalRequest(request.id, decision)
      toast.success(`Rental request ${decision.toLowerCase()}`)
      await load()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Could not update rental request')
    } finally { setBusyId('') }
  }

  return <main className="mx-auto max-w-5xl space-y-8">
    <header><p className="text-xs font-bold uppercase tracking-wider text-emerald-800">Marketplace</p><h1 className="mt-1 text-3xl font-bold text-slate-900">Rental requests</h1><p className="mt-2 text-sm text-slate-600">Rental decisions are separate from advertising payment approval.</p></header>
    {loading ? <p className="border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading requests...</p> : <>
      <section><h2 className="mb-3 text-lg font-semibold text-slate-900">Requests for your houses</h2>{incoming.length === 0 ? <p className="border border-slate-200 bg-white p-5 text-sm text-slate-500">No renters have contacted you through requests yet.</p> : <ul className="divide-y divide-slate-200 border border-slate-200 bg-white">{incoming.map(request => <li key={request.id} className="space-y-3 p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><Link to={`/houses/${request.property.slug || ''}`} className="font-semibold text-emerald-800 hover:underline">{request.property.title}</Link><p className="mt-1 text-sm text-slate-600">{request.renter?.fullName} · {request.renter?.phone} · {request.renter?.email}</p><p className="mt-1 text-xs text-slate-500">Received {new Date(request.createdAt).toLocaleString()}</p></div><StatusBadge status={request.status} /></div><p className="whitespace-pre-line text-sm leading-6 text-slate-700">{request.message}</p>{request.responseMessage && <p className="text-sm text-slate-600">Your response: {request.responseMessage}</p>}{request.status === 'PENDING' && <div className="flex gap-2"><button disabled={busyId === request.id} onClick={() => respond(request, 'ACCEPTED')} className="inline-flex items-center gap-1.5 bg-emerald-800 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"><Check size={15} />Accept request</button><button disabled={busyId === request.id} onClick={() => respond(request, 'REJECTED')} className="inline-flex items-center gap-1.5 border border-red-300 px-3 py-2 text-sm font-semibold text-red-700 disabled:opacity-50"><X size={15} />Reject</button></div>}</li>)}</ul>}</section>
      <section><h2 className="mb-3 text-lg font-semibold text-slate-900">Requests you sent</h2>{outgoing.length === 0 ? <p className="border border-slate-200 bg-white p-5 text-sm text-slate-500">You have not requested a house yet.</p> : <ul className="divide-y divide-slate-200 border border-slate-200 bg-white">{outgoing.map(request => <li key={request.id} className="flex flex-wrap items-start justify-between gap-3 p-4 sm:p-5"><div><Link to={`/houses/${request.property.slug || ''}`} className="font-semibold text-slate-900 hover:text-emerald-800">{request.property.title}</Link><p className="mt-1 text-sm text-slate-500">{request.property.city} · Sent {new Date(request.createdAt).toLocaleDateString()}</p><p className="mt-2 max-w-2xl whitespace-pre-line text-sm text-slate-700">{request.message}</p>{request.responseMessage && <p className="mt-2 text-sm text-slate-600">Poster response: {request.responseMessage}</p>}</div><StatusBadge status={request.status} /></li>)}</ul>}</section>
    </>}
    <div className="flex items-center gap-2 text-xs text-slate-500"><MessageSquare size={14} />Contact details are shared for published listings only.</div>
  </main>
}
