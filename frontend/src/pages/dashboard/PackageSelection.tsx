import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Check, Crown, LoaderCircle, Star } from 'lucide-react'
import toast from 'react-hot-toast'
import { paymentService } from '../../services'
import type { ListingPackage } from '../../types'

export default function PackageSelection() {
	const { id = '' } = useParams()
	const navigate = useNavigate()
	const [packages, setPackages] = useState<ListingPackage[]>([])
	const [loading, setLoading] = useState(true)
	const [selected, setSelected] = useState('')

	useEffect(() => {
		let active = true
		paymentService.getPackages()
			.then(data => { if (active) setPackages(data) })
			.catch(() => { if (active) toast.error('Could not load advertising packages') })
			.finally(() => { if (active) setLoading(false) })
		return () => { active = false }
	}, [])

	async function choosePackage(packageId: string) {
		setSelected(packageId)
		try {
			const payment = await paymentService.createPayment(id, packageId)
			navigate(`/dashboard/listings/${id}/payment?payment=${encodeURIComponent(payment.id)}`)
		} catch (error: any) {
			toast.error(error.response?.data?.message || 'Could not start payment')
			setSelected('')
		}
	}

	return (
		<main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6">
			<div className="mx-auto max-w-5xl">
				<button type="button" onClick={() => navigate('/dashboard/listings')} className="mb-5 text-sm font-medium text-slate-600 hover:text-emerald-800">Back to my listings</button>
				<p className="text-xs font-bold uppercase tracking-wider text-emerald-800">Advertising</p>
				<h1 className="mt-1 text-3xl font-bold text-slate-900">Choose a listing package</h1>
				<p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Your monthly rental price is separate from the one-time advertising fee. Rent is paid directly to you by your tenant.</p>

				{loading ? <div className="flex justify-center py-16"><LoaderCircle className="animate-spin text-emerald-800" /></div> : packages.length === 0 ? <p className="mt-8 border border-slate-200 bg-white p-6 text-sm text-slate-600">No advertising packages are currently available.</p> : <div className="mt-8 grid gap-4 md:grid-cols-3">
					{packages.map((item, index) => {
						const Icon = index === 2 || item.featuredPlacement ? Crown : index === 1 ? Star : Check
						return <article key={item.id} className={`flex flex-col border bg-white p-5 shadow-sm ${item.featuredPlacement ? 'border-amber-300' : 'border-slate-200'}`}>
							<div className="flex items-center justify-between"><span className="text-sm font-bold uppercase tracking-wide text-slate-800">{item.name}</span><Icon size={18} className={item.featuredPlacement ? 'text-amber-600' : 'text-emerald-700'} /></div>
							<p className="mt-5 text-3xl font-bold text-emerald-800">ETB {Number(item.priceInETB).toLocaleString()}</p>
							<p className="mt-1 text-sm text-slate-500">{item.durationDays} days</p>
							<div className="my-5 h-px bg-slate-200" />
							<ul className="flex-1 space-y-3 text-sm text-slate-700">
								<li className="flex gap-2"><Check size={16} className="shrink-0 text-emerald-700" />{item.maximumPhotos} {item.maximumPhotos === 1 ? 'photo' : 'photos'}</li>
								<li className="flex gap-2"><Check size={16} className="shrink-0 text-emerald-700" />{item.visibilityLevel === 'FEATURED' ? 'Featured placement while promotion is active' : item.visibilityLevel === 'ENHANCED' ? 'Enhanced search visibility' : 'Standard search visibility'}</li>
								{item.description && <li className="leading-5 text-slate-500">{item.description}</li>}
							</ul>
							<button type="button" disabled={Boolean(selected)} onClick={() => choosePackage(item.id)} className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-emerald-800 px-4 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
								{selected === item.id ? <><LoaderCircle size={16} className="animate-spin" />Starting payment</> : 'Choose package'}
							</button>
						</article>
					})}
				</div>}
			</div>
		</main>
	)
}