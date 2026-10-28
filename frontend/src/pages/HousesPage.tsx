import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Filter, Search, X } from 'lucide-react'
import toast from 'react-hot-toast'
import PropertyCard from '../components/PropertyCard'
import { propertyService } from '../services'
import type { Property } from '../types'
import EmptyState from '../components/EmptyState'

interface SearchResult {
	data: Property[]
	meta: { total: number; page: number; limit: number; totalPages: number }
}

export default function HousesPage() {
	const [searchParams, setSearchParams] = useSearchParams()
	const [result, setResult] = useState<SearchResult>({ data: [], meta: { total: 0, page: 1, limit: 12, totalPages: 0 } })
	const [loading, setLoading] = useState(true)
	const [query, setQuery] = useState(searchParams.get('search') || searchParams.get('city') || '')
	const [filters, setFilters] = useState({ minRent: searchParams.get('minRent') || '', maxRent: searchParams.get('maxRent') || '', bedrooms: searchParams.get('bedrooms') || '', bathrooms: searchParams.get('bathrooms') || '', propertyType: searchParams.get('propertyType') || '', furnished: searchParams.get('furnished') || '', parking: searchParams.get('parking') || '', sort: searchParams.get('sort') || 'newest' })

	useEffect(() => {
		let active = true
		setLoading(true)
		propertyService.getProperties(Object.fromEntries(searchParams.entries()))
			.then(data => { if (active) setResult({ data: data.data, meta: data.meta }) })
			.catch(() => { if (active) toast.error('Could not load available homes') })
			.finally(() => { if (active) setLoading(false) })
		return () => { active = false }
	}, [searchParams])

	function applyFilters(event: React.FormEvent) {
		event.preventDefault()
		const params = new URLSearchParams()
		if (query.trim()) params.set('search', query.trim())
		Object.entries(filters).forEach(([key, value]) => { if (value && key !== 'sort') params.set(key, value) })
		params.set('sort', filters.sort)
		params.set('page', '1')
		setSearchParams(params)
	}

	function clearFilters() {
		setQuery('')
		setFilters({ minRent: '', maxRent: '', bedrooms: '', bathrooms: '', propertyType: '', furnished: '', parking: '', sort: 'newest' })
		setSearchParams({ page: '1' })
	}

	function setPage(page: number) {
		const params = new URLSearchParams(searchParams)
		params.set('page', String(page))
		setSearchParams(params)
		window.scrollTo({ top: 0, behavior: 'smooth' })
	}

	const selectClass = 'w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-emerald-700 focus:outline-none'
	const hasFilters = [...searchParams.keys()].some(key => key !== 'page')

	return (
		<main className="min-h-screen bg-slate-50">
			<div className="border-b border-slate-200 bg-white"><div className="container-main py-7"><p className="text-xs font-bold uppercase tracking-wider text-emerald-800">Marketplace</p><h1 className="mt-1 text-3xl font-bold text-slate-900">Houses for rent in Ethiopia</h1><p className="mt-2 text-sm text-slate-600">Browse current properties and compare monthly rent in ETB.</p>
				<form onSubmit={applyFilters} className="mt-5 grid gap-2 sm:grid-cols-[1fr_auto]"><label className="flex items-center gap-2 rounded-md border border-slate-300 px-3"><Search size={17} className="text-slate-400" /><input aria-label="Search title, description, or location" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search city, neighborhood, title..." className="min-w-0 flex-1 py-3 text-sm outline-none" /></label><button className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-800 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700"><Search size={16} />Search homes</button></form>
			</div></div>
			<div className="container-main grid gap-6 py-7 lg:grid-cols-[245px_minmax(0,1fr)]">
				<aside className="h-fit border border-slate-200 bg-white p-4"><div className="flex items-center justify-between"><h2 className="flex items-center gap-2 font-semibold text-slate-900"><Filter size={17} />Filters</h2>{hasFilters && <button type="button" onClick={clearFilters} className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800">Clear<X size={13} /></button>}</div>
					<form onSubmit={applyFilters} className="mt-4 space-y-4">
						<fieldset><legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Monthly rent (ETB)</legend><div className="grid grid-cols-2 gap-2"><input aria-label="Minimum rent" type="number" min="0" placeholder="Min" value={filters.minRent} onChange={e => setFilters({ ...filters, minRent: e.target.value })} className={selectClass} /><input aria-label="Maximum rent" type="number" min="0" placeholder="Max" value={filters.maxRent} onChange={e => setFilters({ ...filters, maxRent: e.target.value })} className={selectClass} /></div></fieldset>
						<label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Bedrooms<select value={filters.bedrooms} onChange={e => setFilters({ ...filters, bedrooms: e.target.value })} className={`${selectClass} mt-2 normal-case tracking-normal`}><option value="">Any</option>{[1, 2, 3, 4].map(count => <option key={count} value={count}>{count}{count === 4 ? '+' : ''}</option>)}</select></label>
						<label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Bathrooms<select value={filters.bathrooms} onChange={e => setFilters({ ...filters, bathrooms: e.target.value })} className={`${selectClass} mt-2 normal-case tracking-normal`}><option value="">Any</option>{[1, 2, 3, 4].map(count => <option key={count} value={count}>{count}{count === 4 ? '+' : ''}</option>)}</select></label>
						<label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Property type<select value={filters.propertyType} onChange={e => setFilters({ ...filters, propertyType: e.target.value })} className={`${selectClass} mt-2 normal-case tracking-normal`}><option value="">Any type</option>{[['APARTMENT', 'Apartment'], ['HOUSE', 'House'], ['VILLA', 'Villa'], ['STUDIO', 'Studio'], ['ROOM', 'Room']].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
						<label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Furnished<select value={filters.furnished} onChange={e => setFilters({ ...filters, furnished: e.target.value })} className={`${selectClass} mt-2 normal-case tracking-normal`}><option value="">Any</option><option value="true">Furnished</option><option value="false">Unfurnished</option></select></label>
						<label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Parking<select value={filters.parking} onChange={e => setFilters({ ...filters, parking: e.target.value })} className={`${selectClass} mt-2 normal-case tracking-normal`}><option value="">Any</option><option value="true">Available</option><option value="false">Not available</option></select></label>
						<button type="submit" className="w-full rounded-md bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">Apply filters</button>
					</form>
				</aside>

				<section aria-label="Search results"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-slate-600">{loading ? 'Searching...' : <><strong className="text-slate-900">{result.meta.total}</strong> homes found</>}</p><label className="flex items-center gap-2 text-sm text-slate-600">Sort by<select value={filters.sort} onChange={event => { const next = { ...filters, sort: event.target.value }; setFilters(next); const params = new URLSearchParams(searchParams); params.set('sort', event.target.value); setSearchParams(params) }} className="rounded-md border border-slate-300 bg-white px-3 py-2"><option value="newest">Newest</option><option value="oldest">Oldest</option><option value="price_asc">Lowest price</option><option value="price_desc">Highest price</option><option value="featured">Featured</option></select></label></div>
					{loading ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, index) => <div key={index} className="aspect-[4/5] animate-pulse bg-slate-200" />)}</div> : result.data.length ? <><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{result.data.map(property => <PropertyCard key={property.id} property={property} />)}</div>{result.meta.totalPages > 1 && <nav aria-label="Search result pages" className="mt-8 flex items-center justify-center gap-2"><button disabled={result.meta.page <= 1} onClick={() => setPage(result.meta.page - 1)} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm disabled:opacity-40">Previous</button><span className="px-2 text-sm text-slate-600">Page {result.meta.page} of {result.meta.totalPages}</span><button disabled={result.meta.page >= result.meta.totalPages} onClick={() => setPage(result.meta.page + 1)} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm disabled:opacity-40">Next</button></nav>}</> : <div className="border border-slate-200 bg-white"><EmptyState title="No homes match these filters" description="Try a different city, rent range, or property type." action={{ label: 'Clear filters', href: '/houses' }} /></div>}
				</section>
			</div>
		</main>
	)
}