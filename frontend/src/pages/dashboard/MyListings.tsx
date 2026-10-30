import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, Home, Plus, Pencil, RotateCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { ownerService, propertyService } from '../../services'
import type { Property } from '../../types'
import StatusBadge from '../../components/StatusBadge'
import { getRealtimeSocket } from '../../services/realtime'
import { mediaCrossOrigin, resolveMediaUrl } from '../../services/api'

type OwnerProperty = Property & {
  latestPayment?: { id: string; paymentStatus: string; amountInETB: number; packageId?: string } | null
  isExpired?: boolean
}

export default function MyListings() {
  const [properties, setProperties] = useState<OwnerProperty[]>([])
  const [loading, setLoading] = useState(true)
  const [workingId, setWorkingId] = useState('')

  async function loadListings() {
    setLoading(true)
    try { setProperties(await ownerService.getProperties()) }
    catch { toast.error('Could not load your listings') }
    finally { setLoading(false) }
  }

  useEffect(() => {
    const socket = getRealtimeSocket()
    const refresh = () => { void loadListings() }
    socket.on('connect', refresh)
    socket.on('payment:updated', refresh)
    socket.on('listing:updated', refresh)
    socket.connect()
    void loadListings()
    const recoveryTimer = window.setInterval(refresh, 30000)
    return () => {
      socket.off('connect', refresh)
      socket.off('payment:updated', refresh)
      socket.off('listing:updated', refresh)
      window.clearInterval(recoveryTimer)
    }
  }, [])

  async function markRented(property: OwnerProperty) {
    if (!window.confirm(`Mark "${property.title}" as rented? It will no longer appear in public search.`)) return
    setWorkingId(property.id)
    try {
      await propertyService.markRented(property.id)
      toast.success('Property marked as rented')
      await loadListings()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Could not update this listing')
    } finally { setWorkingId('') }
  }

  const effectiveStatus = (property: OwnerProperty) =>
    property.isExpired && property.listingStatus === 'PUBLISHED' ? 'EXPIRED' : property.listingStatus

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">Owner workspace</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">My listings</h1>
          <p className="mt-2 text-sm text-slate-600">Track availability, payment, and review status for each property.</p>
        </div>
        <Link to="/dashboard/listings/new" className="inline-flex items-center gap-2 rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">
          <Plus size={17} />Add a listing
        </Link>
      </header>

      <div className="overflow-hidden border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-8 text-sm text-slate-500">Loading your properties...</div>
        ) : properties.length === 0 ? (
          <div className="flex flex-col items-center px-5 py-14 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-emerald-50 text-emerald-800"><Home /></span>
            <h2 className="mt-4 font-semibold text-slate-900">No listings yet</h2>
            <p className="mt-1 max-w-sm text-sm text-slate-500">Start with a draft. You can add photos and choose a package before submitting it for review.</p>
            <Link to="/dashboard/listings/new" className="mt-5 inline-flex items-center gap-2 rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">
              <Plus size={16} />Create a listing
            </Link>
          </div>
        ) : (
          <>
            {/* Table header */}
            <div className="hidden grid-cols-[minmax(220px,2fr)_1fr_1fr_1fr_auto] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 md:grid">
              <span>Property</span>
              <span>Monthly rent</span>
              <span>Listing status</span>
              <span>Payment status</span>
              <span>Actions</span>
            </div>

            <ul className="divide-y divide-slate-100">
              {properties.map(property => (
                <li key={property.id} className="grid gap-3 p-4 md:grid-cols-[minmax(220px,2fr)_1fr_1fr_1fr_auto] md:items-center md:gap-4 md:px-5">
                  {/* Property info */}
                  <div className="flex min-w-0 items-center gap-3">
                    <img src={resolveMediaUrl(property.coverImage || '/placeholder-property.svg')} crossOrigin={mediaCrossOrigin(property.coverImage)} alt="" className="h-16 w-20 shrink-0 rounded-md bg-slate-100 object-cover" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{property.title}</p>
                      <p className="mt-1 truncate text-xs text-slate-500">{[property.neighborhood, property.city].filter(Boolean).join(', ')}</p>
                      <p className="mt-1 text-xs text-slate-400">Created {new Date(property.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>

                  {/* Rent */}
                  <div>
                    <p className="text-xs text-slate-500 md:hidden">Monthly rent</p>
                    <p className="text-sm font-semibold text-slate-900">ETB {Number(property.monthlyRent).toLocaleString()}<span className="font-normal text-slate-500"> / mo</span></p>
                  </div>

                  {/* Listing status */}
                  <div>
                    <p className="mb-1 text-xs text-slate-500 md:hidden">Listing</p>
                    <StatusBadge status={effectiveStatus(property)} />
                  </div>

                  {/* Payment status */}
                  <div>
                    <p className="mb-1 text-xs text-slate-500 md:hidden">Payment</p>
                    {property.latestPayment
                      ? <StatusBadge status={property.latestPayment.paymentStatus} />
                      : <span className="text-xs text-slate-500">Not started</span>
                    }
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2 md:justify-end">
                    {/* Edit — for DRAFT / AWAITING_PAYMENT / REJECTED statuses */}
                    {['DRAFT', 'AWAITING_PAYMENT', 'REJECTED', 'PAYMENT_UNDER_REVIEW', 'PUBLISHED', 'EXPIRED'].includes(property.listingStatus) && (
                      <Link
                        to={`/dashboard/listings/${property.id}/edit`}
                        className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <Pencil size={14} />Edit
                      </Link>
                    )}

                    {/* View — published listings */}
                    {property.listingStatus === 'PUBLISHED' && !property.isExpired && (
                      <Link
                        to={`/houses/${property.slug}`}
                        className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <Eye size={14} />View
                      </Link>
                    )}

                    {/* Mark rented */}
                    {property.listingStatus === 'PUBLISHED' && !property.isExpired && (
                      <button
                        type="button"
                        disabled={workingId === property.id}
                        onClick={() => markRented(property)}
                        className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                      >
                        <RotateCw size={14} />{workingId === property.id ? 'Updating' : 'Mark rented'}
                      </button>
                    )}

                    {/* DRAFT → choose package to advertise */}
                    {property.listingStatus === 'DRAFT' && (
                      <Link
                        to={`/dashboard/listings/${property.id}/package`}
                        className="rounded-md bg-emerald-800 px-2.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                      >
                        Choose package
                      </Link>
                    )}

                    {/* AWAITING_PAYMENT → continue to payment evidence */}
                    {property.listingStatus === 'AWAITING_PAYMENT' && (
                      <Link
                        to={`/dashboard/listings/${property.id}/package`}
                        className="rounded-md bg-amber-600 px-2.5 py-2 text-xs font-semibold text-white hover:bg-amber-500"
                      >
                        Submit payment
                      </Link>
                    )}

                    {/* REJECTED payment → allow resubmission */}
                    {property.latestPayment?.paymentStatus === 'REJECTED' && (
                      <Link
                        to={`/dashboard/listings/${property.id}/package`}
                        className="rounded-md border border-red-400 px-2.5 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
                      >
                        Resubmit
                      </Link>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}
