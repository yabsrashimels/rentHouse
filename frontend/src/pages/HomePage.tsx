import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, BadgeCheck, Building2, MapPin, Search, ShieldCheck, SlidersHorizontal } from 'lucide-react'
import toast from 'react-hot-toast'
import PropertyCard from '../components/PropertyCard'
import { propertyService } from '../services'
import type { Property } from '../types'
import { ETHIOPIAN_CITIES } from '../utils/format'

export default function HomePage() {
	const navigate = useNavigate()
	const [featured, setFeatured] = useState<Property[]>([])
	const [recent, setRecent] = useState<Property[]>([])
	const [city, setCity] = useState('')
	const [minRent, setMinRent] = useState('')
	const [maxRent, setMaxRent] = useState('')
	const [bedrooms, setBedrooms] = useState('')
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		Promise.all([propertyService.getFeatured(), propertyService.getRecent()])
			.then(([featuredListings, recentListings]) => { setFeatured(featuredListings); setRecent(recentListings) })
			.catch(() => toast.error('Listings are temporarily unavailable'))
			.finally(() => setLoading(false))
	}, [])

	function search(event: React.FormEvent) {
		event.preventDefault()
		const params = new URLSearchParams()
		if (city.trim()) params.set('search', city.trim())
		if (minRent) params.set('minRent', minRent)
		if (maxRent) params.set('maxRent', maxRent)
		if (bedrooms) params.set('bedrooms', bedrooms)
		navigate(`/houses?${params.toString()}`)
	}

	return (
		<div>
			<section className="relative isolate min-h-[530px] overflow-hidden bg-slate-900">
				<img src="https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?auto=format&fit=crop&w=2200&q=85" alt="Addis Ababa skyline at dusk" className="absolute inset-0 -z-20 h-full w-full object-cover" />
				<div className="absolute inset-0 -z-10 bg-gradient-to-r from-slate-950/85 via-slate-950/55 to-slate-950/15" />
				<div className="container-main flex min-h-[530px] flex-col justify-center py-14 text-white">
					<div className="max-w-3xl">
						<p className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-emerald-200"><MapPin size={16} />Across Ethiopia</p>
						<h1 className="max-w-2xl text-4xl font-bold leading-tight sm:text-5xl">Find your next home in Ethiopia</h1>
						<p className="mt-4 max-w-xl text-base leading-7 text-white/85">Rent houses easily, safely, and directly from owners.</p>
					</div>
					<form onSubmit={search} className="mt-9 grid gap-2 bg-white p-3 shadow-xl sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_0.8fr_auto]">
						<label className="flex items-center gap-2 rounded-md border border-slate-200 px-3"><MapPin size={17} className="shrink-0 text-emerald-800" /><input aria-label="City or neighborhood" value={city} onChange={event => setCity(event.target.value)} placeholder="City or neighborhood" className="min-w-0 flex-1 py-3 text-sm text-slate-900 outline-none" /></label>
						<input aria-label="Minimum monthly rent" type="number" min="0" value={minRent} onChange={event => setMinRent(event.target.value)} placeholder="Min rent (ETB)" className="rounded-md border border-slate-200 px-3 py-3 text-sm text-slate-900 outline-none focus:border-emerald-700" />
						<input aria-label="Maximum monthly rent" type="number" min="0" value={maxRent} onChange={event => setMaxRent(event.target.value)} placeholder="Max rent (ETB)" className="rounded-md border border-slate-200 px-3 py-3 text-sm text-slate-900 outline-none focus:border-emerald-700" />
						<select aria-label="Bedrooms" value={bedrooms} onChange={event => setBedrooms(event.target.value)} className="rounded-md border border-slate-200 px-3 py-3 text-sm text-slate-700 outline-none focus:border-emerald-700"><option value="">Bedrooms</option><option value="1">1 bedroom</option><option value="2">2 bedrooms</option><option value="3">3 bedrooms</option><option value="4">4+ bedrooms</option></select>
						<button type="submit" className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-800 px-6 py-3 text-sm font-bold text-white hover:bg-emerald-700"><Search size={16} />Search</button>
					</form>
					<div className="mt-5 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
						{[['Direct contact', 'Speak with property owners'], ['Payment review', 'Manual verification status'], ['Useful filters', 'Compare homes by your needs'], ['Clear process', 'Rent paid directly to owners']].map(([title, detail], index) => {
							const Icon = [Building2, ShieldCheck, SlidersHorizontal, BadgeCheck][index]
							return <div key={title} className="flex items-center gap-3 border-l border-white/35 pl-3"><Icon className="shrink-0 text-emerald-200" size={19} /><span><strong className="block font-semibold">{title}</strong><span className="text-xs text-white/75">{detail}</span></span></div>
						})}
					</div>
				</div>
			</section>

			<section className="container-main py-12">
				<div className="flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-wider text-emerald-800">Promoted homes</p><h2 className="mt-1 text-2xl font-bold text-slate-900">Featured houses</h2><p className="mt-1 text-sm text-slate-500">Sponsored placement is clearly marked and time-limited.</p></div><Link to="/houses?featured=true" className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-emerald-800">View all<ArrowRight size={16} /></Link></div>
				{loading ? <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div key={index} className="aspect-[4/5] animate-pulse bg-slate-200" />)}</div> : featured.length ? <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{featured.slice(0, 4).map(property => <PropertyCard key={property.id} property={property} />)}</div> : <div className="mt-6 border border-slate-200 bg-white p-6 text-sm text-slate-600">There are no promoted homes right now. Browse all currently available houses instead.</div>}
			</section>

			<section className="border-y border-slate-200 bg-white">
				<div className="container-main py-12"><div className="flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-wider text-emerald-800">Recently published</p><h2 className="mt-1 text-2xl font-bold text-slate-900">New homes to explore</h2></div><Link to="/houses?sort=newest" className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-emerald-800">All houses<ArrowRight size={16} /></Link></div>
					{loading ? <p className="mt-6 text-sm text-slate-500">Loading available homes...</p> : recent.length ? <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{recent.slice(0, 4).map(property => <PropertyCard key={property.id} property={property} />)}</div> : <div className="mt-6 border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">No published properties are available yet. Check back soon.</div>}
				</div>
			</section>

			<section className="container-main py-12"><div className="flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-wider text-emerald-800">Local search</p><h2 className="mt-1 text-2xl font-bold text-slate-900">Browse by city</h2></div><Building2 className="text-emerald-800" /></div><div className="mt-5 flex flex-wrap gap-2">{ETHIOPIAN_CITIES.slice(0, 10).map(place => <Link key={place} to={`/houses?city=${encodeURIComponent(place)}`} className="border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:border-emerald-700 hover:text-emerald-800">{place}</Link>)}</div></section>

			<section className="bg-emerald-950 text-white"><div className="container-main grid gap-8 py-12 md:grid-cols-2 md:items-center"><div><p className="text-xs font-bold uppercase tracking-wider text-emerald-200">For property owners</p><h2 className="mt-2 text-2xl font-bold">Have a house to rent?</h2><p className="mt-2 max-w-lg text-sm leading-6 text-white/75">Create a listing, choose an advertising package, then submit payment evidence for manual review.</p></div><Link to="/dashboard/listings/new" className="inline-flex w-fit items-center gap-2 rounded-md bg-white px-4 py-3 text-sm font-bold text-emerald-950 hover:bg-emerald-50">Post a house<ArrowRight size={16} /></Link></div></section>
		</div>
	)
}