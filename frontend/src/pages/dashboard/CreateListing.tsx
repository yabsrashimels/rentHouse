import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { ArrowLeft, ArrowRight, Check, ImagePlus, MapPin, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { z } from 'zod'
import { propertyService } from '../../services'
import { useAuth } from '../../context/AuthContext'

const listingSchema = z.object({
	title: z.string().trim().min(8, 'Use at least 8 characters').max(100),
	description: z.string().trim().min(40, 'Add at least 40 characters about the property').max(5000),
	propertyType: z.enum(['APARTMENT', 'HOUSE', 'VILLA', 'STUDIO', 'CONDO', 'ROOM']),
	monthlyRent: z.coerce.number().positive('Enter a monthly rent greater than zero'),
	bedrooms: z.coerce.number().int().min(0).max(30),
	bathrooms: z.coerce.number().int().min(0).max(30),
	sizeSquareMeters: z.string(),
	furnished: z.boolean(),
	parkingAvailable: z.boolean(),
	waterAvailable: z.boolean(),
	electricityAvailable: z.boolean(),
	facilities: z.string(),
	contactPhone: z.string().trim().min(9, 'Enter a contact phone number').max(15),
	region: z.string().trim().min(2, 'Enter a region'),
	city: z.string().trim().min(2, 'Enter a city'),
	neighborhood: z.string().trim(),
	address: z.string().trim(),
	publicAddressEnabled: z.boolean(),
})

type ListingForm = z.infer<typeof listingSchema>

const steps = ['Basics', 'Details', 'Location', 'Review']
const fieldsByStep: (keyof ListingForm)[][] = [
	['title', 'description', 'propertyType', 'monthlyRent'],
	['bedrooms', 'bathrooms', 'sizeSquareMeters', 'furnished', 'parkingAvailable', 'waterAvailable', 'electricityAvailable', 'facilities'],
	['region', 'city', 'neighborhood', 'address', 'contactPhone'],
	[],
]

const initialValues: ListingForm = {
	title: '', description: '', propertyType: 'APARTMENT', monthlyRent: 0,
	bedrooms: 1, bathrooms: 1, sizeSquareMeters: '', furnished: false,
	parkingAvailable: false, waterAvailable: true, electricityAvailable: true,
	contactPhone: '',
	facilities: '',
	region: 'Addis Ababa', city: 'Addis Ababa', neighborhood: '', address: '',
	publicAddressEnabled: false,
}

export default function CreateListing() {
	const navigate = useNavigate()
	const { user } = useAuth()
	const [step, setStep] = useState(0)
	const [photos, setPhotos] = useState<File[]>([])
	const [previewUrls, setPreviewUrls] = useState<string[]>([])
	const [isSaving, setIsSaving] = useState(false)
	const [savedPropertyId, setSavedPropertyId] = useState('')
	const [uploadWarning, setUploadWarning] = useState('')
	const { register, handleSubmit, trigger, watch, formState: { errors } } = useForm<ListingForm>({
		resolver: zodResolver(listingSchema),
		defaultValues: { ...initialValues, contactPhone: user?.phone || '' },
	})

	const formValues = watch()

	async function nextStep() {
		const valid = await trigger(fieldsByStep[step])
		if (valid) setStep(current => Math.min(current + 1, steps.length - 1))
	}

	function choosePhotos(files: FileList | null) {
		if (!files?.length) return
		const selected = Array.from(files)
		if (selected.length > 12) {
			toast.error('Choose up to 12 property photos')
			return
		}
		if (selected.some(file => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type))) {
			toast.error('Photos must be JPG, PNG, or WebP images')
			return
		}
		if (selected.some(file => file.size > 5 * 1024 * 1024)) {
			toast.error('Each photo must be 5 MB or smaller')
			return
		}
		previewUrls.forEach(URL.revokeObjectURL)
		setPhotos(selected)
		setPreviewUrls(selected.map(file => URL.createObjectURL(file)))
	}

	function removePhoto(index: number) {
		URL.revokeObjectURL(previewUrls[index])
		setPhotos(current => current.filter((_, photoIndex) => photoIndex !== index))
		setPreviewUrls(current => current.filter((_, photoIndex) => photoIndex !== index))
	}

	async function saveDraft(values: ListingForm) {
		setIsSaving(true)
		setUploadWarning('')
		try {
			const property = await propertyService.create({
				...values,
				monthlyRent: Number(values.monthlyRent),
				bedrooms: Number(values.bedrooms),
				bathrooms: Number(values.bathrooms),
				sizeSquareMeters: values.sizeSquareMeters ? Number(values.sizeSquareMeters) : undefined,
				amenities: values.facilities.split(',').map(value => value.trim()).filter(Boolean),
				contactPhone: values.contactPhone || user?.phone,
			})
			setSavedPropertyId(property.id)

			if (photos.length) {
				try {
					await propertyService.uploadImages(property.id, photos)
				} catch {
					setUploadWarning('Your draft was saved, but the photos could not be uploaded. Please retry before choosing a package.')
					return
				}
			}

			toast.success('Draft saved')
			navigate(`/dashboard/listings/${property.id}/package`)
		} catch (error: any) {
			toast.error(error.response?.data?.message || 'Could not save your listing')
		} finally {
			setIsSaving(false)
		}
	}

	const inputClass = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-100'
	const labelClass = 'mb-1.5 block text-sm font-medium text-slate-800'

	return (
		<main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
			<div className="mx-auto max-w-4xl">
				<div className="mb-7">
					<button type="button" onClick={() => navigate('/dashboard/listings')} className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-emerald-800">
						<ArrowLeft size={16} /> My listings
					</button>
					<p className="text-xs font-bold uppercase tracking-wider text-emerald-800">Owner workspace</p>
					<h1 className="mt-1 text-3xl font-bold text-slate-900">Create a house listing</h1>
					<p className="mt-2 text-sm text-slate-600">Your listing remains a draft until payment verification and moderation are complete.</p>
				</div>

				<ol className="mb-6 grid grid-cols-4 border-y border-slate-200 bg-white" aria-label="Listing steps">
					{steps.map((label, index) => (
						<li key={label} className={`border-b-2 px-2 py-3 text-center text-xs font-semibold sm:text-sm ${index === step ? 'border-emerald-700 text-emerald-800' : index < step ? 'border-emerald-200 text-emerald-700' : 'border-transparent text-slate-400'}`}>
							<span className="mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[11px]">{index < step ? <Check size={12} /> : index + 1}</span>
							{label}
						</li>
					))}
				</ol>

				<form onSubmit={handleSubmit(saveDraft)} className="border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
					{step === 0 && <section className="space-y-5">
						<div><h2 className="text-xl font-semibold text-slate-900">Basic information</h2><p className="mt-1 text-sm text-slate-500">Tell renters what makes this home a good fit.</p></div>
						<div><label className={labelClass} htmlFor="title">Listing title</label><input id="title" className={inputClass} placeholder="Modern two-bedroom apartment in Bole" {...register('title')} />{errors.title && <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>}</div>
						<div><label className={labelClass} htmlFor="description">Description</label><textarea id="description" rows={5} className={inputClass} placeholder="Describe the home, its condition, and what is nearby..." {...register('description')} />{errors.description && <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>}</div>
						<div className="grid gap-4 sm:grid-cols-2">
							<div><label className={labelClass} htmlFor="propertyType">Property type</label><select id="propertyType" className={inputClass} {...register('propertyType')}><option value="APARTMENT">Apartment</option><option value="HOUSE">House</option><option value="VILLA">Villa</option><option value="STUDIO">Studio</option><option value="CONDO">Condo</option><option value="ROOM">Room</option></select></div>
							<div><label className={labelClass} htmlFor="monthlyRent">Monthly rent (ETB)</label><input id="monthlyRent" type="number" min="1" className={inputClass} {...register('monthlyRent')} />{errors.monthlyRent && <p className="mt-1 text-sm text-red-600">{errors.monthlyRent.message}</p>}</div>
						</div>
					</section>}

					{step === 1 && <section className="space-y-5">
						<div><h2 className="text-xl font-semibold text-slate-900">Property details</h2><p className="mt-1 text-sm text-slate-500">Share practical details that help renters compare homes.</p></div>
						<div className="grid gap-4 sm:grid-cols-3">
							<div><label className={labelClass} htmlFor="bedrooms">Bedrooms</label><input id="bedrooms" type="number" min="0" className={inputClass} {...register('bedrooms')} /></div>
							<div><label className={labelClass} htmlFor="bathrooms">Bathrooms</label><input id="bathrooms" type="number" min="0" className={inputClass} {...register('bathrooms')} /></div>
							<div><label className={labelClass} htmlFor="sizeSquareMeters">Size (m²)</label><input id="sizeSquareMeters" type="number" min="1" className={inputClass} placeholder="Optional" {...register('sizeSquareMeters')} /></div>
						</div>
						<div className="grid gap-3 sm:grid-cols-2">
							{([
								['furnished', 'Furnished'], ['parkingAvailable', 'Parking available'],
								['waterAvailable', 'Water available'], ['electricityAvailable', 'Electricity available'],
							] as const).map(([field, label]) => <label key={field} className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 p-3 text-sm text-slate-700"><input type="checkbox" className="h-4 w-4 accent-emerald-700" {...register(field)} />{label}</label>)}
						</div>
						<div><label className={labelClass} htmlFor="facilities">Facilities and amenities</label><input id="facilities" className={inputClass} placeholder="Balcony, generator, security, elevator" {...register('facilities')} /><p className="mt-1 text-xs text-slate-500">Separate facilities with commas.</p></div>
					</section>}

					{step === 2 && <section className="space-y-5">
						<div><h2 className="text-xl font-semibold text-slate-900">Location and house photos</h2><p className="mt-1 text-sm text-slate-500">Use an approximate location if you prefer to keep the exact address private.</p></div>
						<div className="grid gap-4 sm:grid-cols-2">
							<div><label className={labelClass} htmlFor="region">Region</label><input id="region" className={inputClass} placeholder="Addis Ababa" {...register('region')} />{errors.region && <p className="mt-1 text-sm text-red-600">{errors.region.message}</p>}</div>
							<div><label className={labelClass} htmlFor="city">City</label><input id="city" className={inputClass} placeholder="Addis Ababa" {...register('city')} />{errors.city && <p className="mt-1 text-sm text-red-600">{errors.city.message}</p>}</div>
							<div><label className={labelClass} htmlFor="neighborhood">Neighborhood</label><input id="neighborhood" className={inputClass} placeholder="Bole" {...register('neighborhood')} /></div>
							<div><label className={labelClass} htmlFor="address">Street or address (optional)</label><input id="address" className={inputClass} placeholder="Kept private by default" {...register('address')} /></div>
							<div><label className={labelClass} htmlFor="contactPhone">Contact phone for renters</label><input id="contactPhone" type="tel" className={inputClass} placeholder={user?.phone || '+251...'} {...register('contactPhone')} />{errors.contactPhone && <p className="mt-1 text-sm text-red-600">{errors.contactPhone.message}</p>}</div>
						</div>
						<label className="flex items-start gap-3 rounded-lg border border-slate-200 p-3 text-sm text-slate-700"><input type="checkbox" className="mt-0.5 h-4 w-4 accent-emerald-700" {...register('publicAddressEnabled')} /><span>Show the address publicly on the listing</span></label>
						<div>
							<span className={labelClass}>House photos <span className="font-normal text-slate-500">(optional, up to 12, max 5 MB each)</span></span>
							<label className="mt-2 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 px-5 py-6 text-center hover:border-emerald-600"><ImagePlus className="mb-2 text-emerald-700" /><span className="text-sm font-medium text-slate-800">Choose house photos</span><span className="mt-1 text-xs text-slate-500">JPG, PNG, or WebP</span><input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={event => choosePhotos(event.target.files)} /></label>
							{previewUrls.length > 0 && <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">{previewUrls.map((url, index) => <div key={url} className="relative"><img src={url} alt={`Selected house photo ${index + 1}`} className="aspect-[4/3] w-full rounded-md object-cover" /><button type="button" aria-label={`Remove photo ${index + 1}`} onClick={() => removePhoto(index)} className="absolute right-2 top-2 rounded-full bg-white p-2 text-slate-700 shadow"><X size={15} /></button></div>)}</div>}
						</div>
					</section>}

					{step === 3 && <section className="space-y-5">
						<div><h2 className="text-xl font-semibold text-slate-900">Review your listing</h2><p className="mt-1 text-sm text-slate-500">Save as a draft, then choose an advertising package.</p></div>
						<div className="overflow-hidden rounded-lg border border-slate-200">
							{previewUrls[0] && <img src={previewUrls[0]} alt="Property cover preview" className="h-56 w-full object-cover" />}
							<div className="space-y-3 p-5">
								<div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-lg font-semibold text-slate-900">{formValues.title || 'Untitled property'}</h3><p className="mt-1 flex items-center gap-1 text-sm text-slate-500"><MapPin size={14} />{[formValues.neighborhood, formValues.city, formValues.region].filter(Boolean).join(', ')}</p></div><p className="font-bold text-emerald-800">ETB {Number(formValues.monthlyRent || 0).toLocaleString()} <span className="text-xs font-normal text-slate-500">/ month</span></p></div>
								<p className="text-sm leading-6 text-slate-600">{formValues.description || 'Add a description to preview it here.'}</p>
								<p className="text-sm text-slate-600">{formValues.bedrooms} bedrooms · {formValues.bathrooms} bathrooms · {formValues.sizeSquareMeters || 'Size not set'}{formValues.sizeSquareMeters ? ' m²' : ''}</p>
							</div>
						</div>
						<div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">Saving does not publish this listing. Select and pay for a package, submit payment evidence, and wait for administrator verification and listing moderation.</div>
					</section>}

					{uploadWarning && <div role="alert" className="mt-5 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">{uploadWarning}<button type="button" onClick={() => navigate(`/dashboard/listings/${savedPropertyId}/package`)} className="ml-2 font-semibold underline">Continue to packages</button></div>}

					<div className="mt-8 flex items-center justify-between border-t border-slate-200 pt-5">
						<button type="button" disabled={step === 0 || isSaving} onClick={() => setStep(current => Math.max(current - 1, 0))} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:invisible"><ArrowLeft size={16} />Back</button>
						{step < steps.length - 1 ? <button type="button" onClick={nextStep} className="inline-flex items-center gap-2 rounded-lg bg-emerald-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">Continue<ArrowRight size={16} /></button> : <button type="submit" disabled={isSaving || Boolean(uploadWarning)} className="inline-flex items-center gap-2 rounded-lg bg-emerald-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-60">{isSaving ? 'Saving draft...' : 'Save draft and choose package'}<ArrowRight size={16} /></button>}
					</div>
				</form>
			</div>
		</main>
	)
}