import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Bath, BedDouble, ChevronLeft, ChevronRight, Heart, MapPin, Ruler, ShieldCheck, Star } from 'lucide-react'
import toast from 'react-hot-toast'
import { favoriteService, propertyService } from '../services'
import type { Property, PropertyImage } from '../types'
import { useAuth } from '../context/AuthContext'
import PropertyCard from '../components/PropertyCard'
import { mediaCrossOrigin, resolveMediaUrl } from '../services/api'

type PropertyDetail = Property & { similar?: Property[]; owner: { id: string; fullName: string; profileImageUrl?: string; createdAt: string } }
type ContactDetails = { phone: string; telegram?: string | null; instagram?: string | null }

export default function PropertyDetailPage() {
	const { slug = '' } = useParams()
	const navigate = useNavigate()
	const { user } = useAuth()
	const [property, setProperty] = useState<PropertyDetail | null>(null)
	const [loading, setLoading] = useState(true)
	const [contact, setContact] = useState<ContactDetails | null>(null)
	const [activeImage, setActiveImage] = useState(0)
	const [showViewer, setShowViewer] = useState(false)
	const [requestMessage, setRequestMessage] = useState('')
	const [sendingRequest, setSendingRequest] = useState(false)

	useEffect(() => {
		setLoading(true)
		propertyService.getBySlug(slug).then(setProperty).catch(() => toast.error('This property could not be found')).finally(() => setLoading(false))
	}, [slug])

	const images: PropertyImage[] = property?.images || []

	async function revealContact() {
		if (!user) {
			navigate(`/login?redirect=${encodeURIComponent(window.location.pathname)}`)
			return
		}
		try { setContact(await propertyService.getContact(property!.id)) }
		catch (error: any) { toast.error(error.response?.data?.message || 'Could not retrieve owner contact') }
	}

	async function toggleFavorite() {
		if (!user) {
			navigate(`/login?redirect=${encodeURIComponent(window.location.pathname)}`)
			return
		}
		try {
			if (property?.isFavorited) await favoriteService.remove(property.id)
			else await favoriteService.add(property!.id)
			setProperty(current => current ? { ...current, isFavorited: !current.isFavorited } : current)
			toast.success(property?.isFavorited ? 'Removed from saved homes' : 'Saved to your favorites')
		} catch (error: any) { toast.error(error.response?.data?.message || 'Could not update favorites') }
	}

	async function sendRentalRequest() {
		if (!user) {
			navigate(`/login?redirect=${encodeURIComponent(window.location.pathname)}`)
			return
		}
		if (requestMessage.trim().length < 10) {
			toast.error('Please add a short message for the property owner')
			return
		}
		setSendingRequest(true)
		try {
			await propertyService.requestRental(property!.id, requestMessage)
			setRequestMessage('')
			toast.success('Rental request sent to the property poster')
		} catch (error: any) {
			toast.error(error.response?.data?.message || 'Could not send rental request')
		} finally { setSendingRequest(false) }
	}

	function moveImage(direction: number) {
		setActiveImage(index => (index + direction + images.length) % images.length)
	}

	if (loading) return <main className="container-main py-12"><div className="h-96 animate-pulse bg-slate-200" /></main>
	if (!property) return <main className="container-main py-20 text-center"><h1 className="text-2xl font-bold text-slate-900">Property not found</h1><p className="mt-2 text-sm text-slate-600">It may have expired or been removed.</p><Link to="/houses" className="mt-5 inline-block font-semibold text-emerald-800">Browse houses</Link></main>

	const cover = images[activeImage]?.imageUrl || property.coverImage
	const location = [property.neighborhood, property.city, property.region].filter(Boolean).join(', ')
	const gallery = images.length ? images : []

	return (
		<main className="min-h-screen bg-slate-50">
			<div className="container-main py-6">
				<Link to="/houses" className="text-sm font-medium text-slate-600 hover:text-emerald-800">← Back to houses</Link>
				<section className="mt-4 grid gap-2 lg:grid-cols-[minmax(0,2fr)_minmax(170px,0.8fr)]">
					<button type="button" onClick={() => cover && setShowViewer(true)} className="group relative aspect-[16/10] overflow-hidden bg-slate-200 text-left">
						{cover ? <img src={resolveMediaUrl(cover)} crossOrigin={mediaCrossOrigin(cover)} alt={`${property.title} property photo ${activeImage + 1}`} className="h-full w-full object-cover" /> : <span className="grid h-full place-items-center text-sm text-slate-500">Photos not available</span>}
						{property.isFeatured && <span className="absolute left-3 top-3 inline-flex items-center gap-1 bg-amber-400 px-2 py-1 text-xs font-bold text-slate-950"><Star size={12} fill="currentColor" />Featured</span>}
						{gallery.length > 1 && <span className="absolute bottom-3 right-3 bg-slate-950/75 px-2.5 py-1.5 text-xs font-semibold text-white">{activeImage + 1} / {gallery.length}</span>}
					</button>
					<div className="hidden grid-cols-2 gap-2 lg:grid">{images.slice(1, 5).map((image, index) => <button key={image.id} type="button" onClick={() => { setActiveImage(index + 1); setShowViewer(true) }} className="overflow-hidden bg-slate-200"><img src={resolveMediaUrl(image.imageUrl)} crossOrigin={mediaCrossOrigin(image.imageUrl)} alt={`${property.title} photo ${index + 2}`} loading="lazy" className="h-full min-h-24 w-full object-cover transition-transform hover:scale-105" /></button>)}</div>
				</section>

				<div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
					<div className="min-w-0 space-y-6">
						<section className="border-b border-slate-200 pb-5"><div className="flex items-start justify-between gap-3"><div><h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">{property.title}</h1><p className="mt-2 flex items-center gap-1.5 text-sm text-slate-600"><MapPin size={16} />{location}</p></div><button type="button" aria-label={property.isFavorited ? 'Remove from saved homes' : 'Save home'} onClick={toggleFavorite} className="rounded-full border border-slate-300 bg-white p-2.5 text-slate-600 hover:text-rose-600"><Heart size={19} fill={property.isFavorited ? 'currentColor' : 'none'} /></button></div><p className="mt-5 text-2xl font-bold text-emerald-800">ETB {Number(property.monthlyRent).toLocaleString()} <span className="text-sm font-normal text-slate-500">/ month</span></p><div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-600"><span className="inline-flex items-center gap-1.5"><BedDouble size={17} />{property.bedrooms} bedrooms</span><span className="inline-flex items-center gap-1.5"><Bath size={17} />{property.bathrooms} bathrooms</span>{property.sizeSquareMeters && <span className="inline-flex items-center gap-1.5"><Ruler size={17} />{Number(property.sizeSquareMeters)} m²</span>}<span>{property.furnished ? 'Furnished' : 'Unfurnished'}</span></div></section>
						<section><h2 className="text-lg font-semibold text-slate-900">Description</h2><p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-700">{property.description}</p></section>
						<section><h2 className="text-lg font-semibold text-slate-900">Property features</h2><div className="mt-3 grid gap-2 sm:grid-cols-2">{[['Parking', property.parkingAvailable], ['Water', property.waterAvailable], ['Electricity', property.electricityAvailable], ['Furnished', property.furnished]].map(([label, enabled]) => <p key={String(label)} className="border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700">{enabled ? '✓' : '—'} {label}</p>)}</div>{property.amenities?.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{property.amenities.map(item => <span key={item} className="border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600">{item}</span>)}</div>}</section>
						<section><h2 className="text-lg font-semibold text-slate-900">Location</h2><p className="mt-2 flex items-center gap-2 text-sm text-slate-600"><MapPin size={16} />{property.publicAddressEnabled && property.address ? `${property.address}, ${location}` : location}</p><p className="mt-2 text-xs text-slate-500">{property.publicAddressEnabled ? 'Address provided by owner.' : 'Exact address is kept private. Contact the owner for location details.'}</p></section>
						{property.similar?.length ? <section><div className="mb-4 flex items-end justify-between"><h2 className="text-lg font-semibold text-slate-900">Similar homes</h2><Link to={`/houses?city=${encodeURIComponent(property.city)}`} className="text-sm font-semibold text-emerald-800">More in {property.city}</Link></div><div className="grid gap-4 sm:grid-cols-2">{property.similar.map(item => <PropertyCard key={item.id} property={item} />)}</div></section> : null}
					</div>

					<aside className="h-fit border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-semibold text-slate-900">Contact owner</h2><p className="mt-1 text-sm text-slate-500">Ask about availability and viewing times.</p><button type="button" onClick={revealContact} className="mt-5 w-full rounded-md bg-emerald-800 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700">{contact ? 'Phone number revealed' : 'Show phone number'}</button>{contact && <><a href={`tel:${contact.phone}`} className="mt-3 block text-center text-lg font-bold text-emerald-800">{contact.phone}</a><a href={`tel:${contact.phone}`} className="mt-3 block rounded-md border border-emerald-800 px-4 py-2.5 text-center text-sm font-semibold text-emerald-800">Call owner</a>{contact.telegram && <a href={`https://t.me/${contact.telegram.replace(/^@/, '')}`} target="_blank" rel="noreferrer" className="mt-2 block rounded-md border border-slate-300 px-4 py-2.5 text-center text-sm font-semibold text-slate-700">Telegram</a>}{contact.instagram && <a href={contact.instagram.startsWith('http') ? contact.instagram : `https://instagram.com/${contact.instagram.replace(/^@/, '')}`} target="_blank" rel="noreferrer" className="mt-2 block rounded-md border border-slate-300 px-4 py-2.5 text-center text-sm font-semibold text-slate-700">Instagram</a>}</>}
					{user?.id !== property.ownerId && <form onSubmit={event => { event.preventDefault(); sendRentalRequest() }} className="mt-5 border-t border-slate-100 pt-4"><label htmlFor="rentalRequest" className="text-sm font-semibold text-slate-800">Send a rental request</label><textarea id="rentalRequest" required minLength={10} maxLength={2000} rows={4} value={requestMessage} onChange={event => setRequestMessage(event.target.value)} placeholder="Introduce yourself and ask about viewing or availability" className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-100"/><button disabled={sendingRequest} className="mt-2 w-full rounded-md border border-emerald-800 px-4 py-2.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 disabled:opacity-50">{sendingRequest ? 'Sending...' : 'Request this house'}</button></form>}
						<div className="mt-5 border-t border-slate-100 pt-4"><p className="flex items-center gap-2 text-sm font-semibold text-slate-800"><ShieldCheck size={17} className="text-emerald-700" />Owner contact protected</p><p className="mt-1 text-xs leading-5 text-slate-500">Contact details are provided only after sign-in and are retrieved securely from the API.</p></div><p className="mt-4 text-xs text-slate-400">Published {property.publishedAt ? new Date(property.publishedAt).toLocaleDateString() : 'date unavailable'}</p></aside>
				</div>
			</div>

			{showViewer && cover && <div role="dialog" aria-modal="true" aria-label="Property photo viewer" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 p-4" onClick={() => setShowViewer(false)}><button type="button" aria-label="Close photo viewer" className="absolute right-4 top-4 text-3xl text-white">×</button><button type="button" aria-label="Previous photo" onClick={event => { event.stopPropagation(); moveImage(-1) }} className="absolute left-3 rounded-full bg-white/10 p-3 text-white"><ChevronLeft /></button><img src={resolveMediaUrl(cover)} crossOrigin={mediaCrossOrigin(cover)} alt={`${property.title} photo ${activeImage + 1}`} className="max-h-[85vh] max-w-[85vw] object-contain" onClick={event => event.stopPropagation()} /><button type="button" aria-label="Next photo" onClick={event => { event.stopPropagation(); moveImage(1) }} className="absolute right-3 rounded-full bg-white/10 p-3 text-white"><ChevronRight /></button></div>}
		</main>
	)
}