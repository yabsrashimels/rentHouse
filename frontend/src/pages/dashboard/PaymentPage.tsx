import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, FileImage, Info, UploadCloud } from 'lucide-react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { z } from 'zod'
import { paymentService } from '../../services'

const evidenceSchema = z.object({
	paymentMethod: z.enum(['TELEBIRR', 'CBE']),
	transactionReference: z.string().trim().min(3, 'Enter the transaction reference').max(120),
})
type EvidenceValues = z.infer<typeof evidenceSchema>

export default function PaymentPage() {
	const { id = '' } = useParams()
	const [params] = useSearchParams()
	const navigate = useNavigate()
	const paymentId = params.get('payment') || ''
	const [receipt, setReceipt] = useState<File | undefined>()
	const [submitting, setSubmitting] = useState(false)
	const { register, handleSubmit, formState: { errors } } = useForm<EvidenceValues>({
		resolver: zodResolver(evidenceSchema),
		defaultValues: { paymentMethod: 'TELEBIRR', transactionReference: '' },
	})

	async function submit(values: EvidenceValues) {
		if (!paymentId) {
			toast.error('Payment reference is missing. Choose a package first.')
			return
		}
		setSubmitting(true)
		try {
			await paymentService.submitEvidence(paymentId, { ...values, receipt })
			toast.success('Payment evidence submitted for review')
			navigate('/dashboard/payments')
		} catch (error: any) {
			toast.error(error.response?.data?.message || 'Could not submit payment evidence')
		} finally {
			setSubmitting(false)
		}
	}

	function chooseReceipt(file?: File) {
		if (!file) return
		const accepted = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
		if (!accepted.includes(file.type)) {
			toast.error('Use a JPG, PNG, WebP, or PDF receipt')
			return
		}
		if (file.size > 5 * 1024 * 1024) {
			toast.error('Receipt must be 5 MB or smaller')
			return
		}
		setReceipt(file)
	}

	const inputClass = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-100'

	return (
		<main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">
			<div className="mx-auto max-w-2xl">
				<button type="button" onClick={() => navigate(`/dashboard/listings/${id}/package`)} className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-emerald-800"><ArrowLeft size={16} />Packages</button>
				<p className="text-xs font-bold uppercase tracking-wider text-emerald-800">Manual payment review</p>
				<h1 className="mt-1 text-3xl font-bold text-slate-900">Submit payment evidence</h1>
				<p className="mt-2 text-sm leading-6 text-slate-600">Complete a payment using the official instructions provided by EthioRent, then enter its reference below. Payment details are not yet configured in this application.</p>

				<div className="mt-6 flex gap-3 border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-950"><Info size={19} className="mt-0.5 shrink-0" /><p><strong>Do not send money to an unconfirmed recipient.</strong> Telebirr and Commercial Bank of Ethiopia are accepted methods, but the platform operator must configure official merchant instructions before collecting payments.</p></div>

				<form onSubmit={handleSubmit(submit)} className="mt-6 space-y-5 border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
					<div><label htmlFor="paymentMethod" className="mb-1.5 block text-sm font-medium text-slate-800">Payment method</label><select id="paymentMethod" className={inputClass} {...register('paymentMethod')}><option value="TELEBIRR">Telebirr</option><option value="CBE">Commercial Bank of Ethiopia (CBE)</option></select></div>
					<div><label htmlFor="transactionReference" className="mb-1.5 block text-sm font-medium text-slate-800">Transaction reference</label><input id="transactionReference" className={inputClass} autoComplete="off" placeholder="Reference from your payment confirmation" {...register('transactionReference')} />{errors.transactionReference && <p className="mt-1 text-sm text-red-600">{errors.transactionReference.message}</p>}</div>
					<div><span className="mb-1.5 block text-sm font-medium text-slate-800">Receipt or screenshot <span className="font-normal text-slate-500">(optional, max 5 MB)</span></span><label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-slate-300 p-4 hover:border-emerald-700"><UploadCloud className="shrink-0 text-emerald-800" size={20} /><span className="min-w-0 text-sm text-slate-700">{receipt ? <span className="flex items-center gap-2"><FileImage size={16} />{receipt.name}</span> : 'Select an image or PDF receipt'}</span><input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="sr-only" onChange={event => chooseReceipt(event.target.files?.[0])} /></label></div>
					<p className="text-xs leading-5 text-slate-500">Submitting a receipt does not prove that the payment succeeded. An administrator will verify the transaction; your listing is not published automatically.</p>
					<div className="border-l-4 border-emerald-700 bg-emerald-50 p-4 text-sm leading-6 text-emerald-950">After successful payment verification and completion of the required listing review, your house listing is targeted for publication within three hours.</div>
					<button type="submit" disabled={submitting || !paymentId} className="w-full rounded-lg bg-emerald-800 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60">{submitting ? 'Submitting for review...' : 'Submit for manual verification'}</button>
				</form>
			</div>
		</main>
	)
}