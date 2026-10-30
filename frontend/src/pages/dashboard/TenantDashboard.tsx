import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Heart, HousePlus, MessageSquare } from 'lucide-react'
import toast from 'react-hot-toast'
import { favoriteService, rentalRequestService } from '../../services'
import StatusBadge from '../../components/StatusBadge'

type TenantRequest = {
  id: string
  message: string
  status: string
  createdAt: string
  responseMessage?: string | null
  property: { title: string; slug: string; city: string }
}

type FavoriteHome = {
  id: string
  title: string
  slug: string
  city: string
  price: number
  coverImage?: string | null
}

export default function TenantDashboard() {
  const [requests, setRequests] = useState<TenantRequest[]>([])
  const [favorites, setFavorites] = useState<FavoriteHome[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    Promise.allSettled([rentalRequestService.getMine(), favoriteService.getFavorites()])
      .then(([requestResult, favoriteResult]) => {
        if (!active) return
        if (requestResult.status === 'fulfilled') setRequests(requestResult.value)
        else toast.error('Could not load your rental requests')
        if (favoriteResult.status === 'fulfilled') setFavorites(favoriteResult.value)
        else toast.error('Could not load your saved homes')
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  return <main className="mx-auto max-w-5xl space-y-8">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-xs font-bold uppercase tracking-wider text-emerald-800">Your account</p><h1 className="mt-1 text-3xl font-bold text-slate-900">Dashboard</h1><p className="mt-2 text-sm text-slate-600">Track your rental requests and saved homes.</p></div>
      <Link to="/host" className="inline-flex items-center gap-2 bg-primary-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700"><HousePlus size={16} />Post a house</Link>
    </header>

    <section>
      <div className="mb-3 flex items-center justify-between"><h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900"><MessageSquare size={18} />Rental requests</h2><Link to="/houses" className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-800">Browse houses<ArrowRight size={15} /></Link></div>
      {loading ? <p className="border border-slate-200 bg-white p-5 text-sm text-slate-500">Loading your requests...</p> : requests.length ? <ul className="divide-y divide-slate-200 border border-slate-200 bg-white">{requests.map(request => <li key={request.id} className="flex flex-wrap items-start justify-between gap-3 p-4 sm:p-5"><div><Link to={`/houses/${request.property.slug}`} className="font-semibold text-slate-900 hover:text-emerald-800">{request.property.title}</Link><p className="mt-1 text-sm text-slate-500">{request.property.city} · Sent {new Date(request.createdAt).toLocaleDateString()}</p><p className="mt-2 whitespace-pre-line text-sm text-slate-700">{request.message}</p>{request.responseMessage && <p className="mt-2 text-sm text-slate-600">Response: {request.responseMessage}</p>}</div><StatusBadge status={request.status} /></li>)}</ul> : <p className="border border-slate-200 bg-white p-5 text-sm text-slate-500">You have not sent a rental request yet.</p>}
    </section>

    <section>
      <div className="mb-3 flex items-center justify-between"><h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900"><Heart size={18} />Saved homes</h2><Link to="/favorites" className="text-sm font-semibold text-emerald-800">View saved homes</Link></div>
      {loading ? <p className="border border-slate-200 bg-white p-5 text-sm text-slate-500">Loading saved homes...</p> : favorites.length ? <ul className="divide-y divide-slate-200 border border-slate-200 bg-white">{favorites.slice(0, 5).map(home => <li key={home.id} className="flex items-center justify-between gap-3 p-4"><div><Link to={`/houses/${home.slug}`} className="font-semibold text-slate-900 hover:text-emerald-800">{home.title}</Link><p className="mt-1 text-sm text-slate-500">{home.city} · {home.price.toLocaleString()} ETB</p></div><Link to={`/houses/${home.slug}`} aria-label={`View ${home.title}`} className="text-emerald-800"><ArrowRight size={18} /></Link></li>)}</ul> : <p className="border border-slate-200 bg-white p-5 text-sm text-slate-500">Save homes while browsing to keep them here.</p>}
    </section>
  </main>
}