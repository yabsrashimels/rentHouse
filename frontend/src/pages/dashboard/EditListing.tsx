import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ImagePlus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { ownerService, propertyService } from '../../services'
import type { Property } from '../../types'
import { mediaCrossOrigin, resolveMediaUrl } from '../../services/api'

export default function EditListing() {
	const { id = '' } = useParams()
	const navigate = useNavigate()
	const [property, setProperty] = useState<Property | null>(null)
	const [loading, setLoading] = useState(true)
	const [saving, setSaving] = useState(false)
	const [uploading, setUploading] = useState(false)
	const [form, setForm] = useState({ title: '', description: '', monthlyRent: '', city: '', region: '', neighborhood: '', contactPhone: '', amenities: '' })

	async function load() {
		setLoading(true)
		try {
			const listings = await ownerService.getProperties()
			const own = listings.find((item: Property) => item.id === id)
			if (!own) throw new Error('Listing not found')
			setProperty(own)
			setForm({
				title: own.title,
				description: own.description,
				monthlyRent: String(own.monthlyRent),
				city: own.city,
				region: own.region,
				neighborhood: own.neighborhood || '',
				contactPhone: own.contactPhone || '',
				amenities: (own.amenities || []).join(', '),
			})
		} catch (error: any) {
			toast.error(error.response?.data?.message || error.message || 'Could not load this listing')
			navigate('/dashboard/listings')
		} finally { setLoading(false) }
	}

	useEffect(() => { load() }, [id])

	async function save(event: React.FormEvent) {
		event.preventDefault()
		setSaving(true)
		try {
			const updated = await propertyService.update(id, {
				...form,
				monthlyRent: Number(form.monthlyRent),
				amenities: form.amenities.split(',').map(value => value.trim()).filter(Boolean),
			})
			setProperty(current => current ? { ...current, ...updated } : updated)
			toast.success('Listing updated')
		} catch (error: any) {
			toast.error(error.response?.data?.message || 'Could not update this listing')
		} finally { setSaving(false) }
	}

	async function addImages(files: FileList | null) {
		if (!files?.length) return
		setUploading(true)
		try {
			await propertyService.uploadImages(id, Array.from(files))
			await load()
			toast.success('Photos uploaded')
		} catch (error: any) {
			toast.error(error.response?.data?.message || 'Could not upload photos')
		} finally { setUploading(false) }
	}

	async function removeImage(imageId: string) {
		try {
			await propertyService.deleteImage(id, imageId)
			await load()
			toast.success('Photo removed')
		} catch (error: any) { toast.error(error.response?.data?.message || 'Could not remove photo') }
	}

	const inputClass = 'w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-100'
	if (loading) return <p className="p-8 text-sm text-slate-500">Loading listing...</p>
	if (!property) return null

	return <main className="mx-auto max-w-4xl space-y-6">
		<header>
			<Link to="/dashboard/listings" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-emerald-800"><ArrowLeft size={16} />My listings</Link>
			<p className="mt-5 text-xs font-bold uppercase tracking-wider text-emerald-800">Your property</p>
			<h1 className="mt-1 text-3xl font-bold text-slate-900">Edit listing</h1>
		</header>
		<form onSubmit={save} className="space-y-5 border border-slate-200 bg-white p-5 sm:p-7">
			<label className="block text-sm font-medium text-slate-800">Title<input required minLength={8} maxLength={100} className={`${inputClass} mt-1.5`} value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} /></label>
			<label className="block text-sm font-medium text-slate-800">Description<textarea required minLength={40} rows={6} className={`${inputClass} mt-1.5`} value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} /></label>
			<div className="grid gap-4 sm:grid-cols-2">
				<label className="block text-sm font-medium text-slate-800">Monthly rent (ETB)<input required type="number" min="1" className={`${inputClass} mt-1.5`} value={form.monthlyRent} onChange={event => setForm({ ...form, monthlyRent: event.target.value })} /></label>
				<label className="block text-sm font-medium text-slate-800">Contact phone<input required type="tel" minLength={9} maxLength={15} className={`${inputClass} mt-1.5`} value={form.contactPhone} onChange={event => setForm({ ...form, contactPhone: event.target.value })} /></label>
				<label className="block text-sm font-medium text-slate-800">City<input required className={`${inputClass} mt-1.5`} value={form.city} onChange={event => setForm({ ...form, city: event.target.value })} /></label>
				<label className="block text-sm font-medium text-slate-800">Region<input required className={`${inputClass} mt-1.5`} value={form.region} onChange={event => setForm({ ...form, region: event.target.value })} /></label>
				<label className="block text-sm font-medium text-slate-800">Neighborhood<input className={`${inputClass} mt-1.5`} value={form.neighborhood} onChange={event => setForm({ ...form, neighborhood: event.target.value })} /></label>
				<label className="block text-sm font-medium text-slate-800">Facilities, comma separated<input className={`${inputClass} mt-1.5`} value={form.amenities} onChange={event => setForm({ ...form, amenities: event.target.value })} /></label>
			</div>
			<button disabled={saving} className="rounded-md bg-emerald-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">{saving ? 'Saving...' : 'Save changes'}</button>
		</form>
		<section className="border border-slate-200 bg-white p-5 sm:p-7">
			<div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold text-slate-900">House photos</h2><p className="mt-1 text-sm text-slate-500">Photos remain private until the listing is published.</p></div><label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"><ImagePlus size={16} />{uploading ? 'Uploading...' : 'Add photos'}<input type="file" accept="image/*" multiple disabled={uploading} className="sr-only" onChange={event => addImages(event.target.files)} /></label></div>
			<div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">{property.images.map(image => <div key={image.id} className="relative"><img src={resolveMediaUrl(image.imageUrl)} crossOrigin={mediaCrossOrigin(image.imageUrl)} alt={image.altText || property.title} className="aspect-square w-full object-cover" /><button type="button" title="Remove photo" onClick={() => removeImage(image.id)} className="absolute right-2 top-2 bg-white p-2 text-red-700 shadow"><Trash2 size={15} /></button></div>)}</div>
		</section>
	</main>
}