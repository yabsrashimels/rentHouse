import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft, FileImage, Info, UploadCloud, CheckCircle,
  Building2, Smartphone, Clock, AlertTriangle
} from 'lucide-react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { z } from 'zod'
import { paymentService } from '../../services'

const evidenceSchema = z.object({
  paymentMethod: z.enum(['TELEBIRR', 'CBE'], {
    errorMap: () => ({ message: 'Select a payment method' }),
  }),
  transactionReference: z
    .string()
    .trim()
    .min(3, 'Enter the transaction reference / confirmation code')
    .max(120, 'Reference is too long'),
})
type EvidenceValues = z.infer<typeof evidenceSchema>

// ─── Ethiopian payment account details ──────────────────────────────────────
const PAYMENT_DETAILS = {
  TELEBIRR: {
    label: 'Telebirr',
    icon: Smartphone,
    color: 'blue',
    phone: '0900468152',
    steps: [
      'Open the Telebirr app on your phone.',
      'Tap "Send Money" and search for number 0900468152.',
      'Enter the exact amount shown below and complete the transfer.',
      'Copy the confirmation / transaction reference from the SMS or app.',
      'Paste it in the "Transaction reference" field below and submit.',
    ],
  },
  CBE: {
    label: 'Commercial Bank of Ethiopia (CBE)',
    icon: Building2,
    color: 'green',
    accountNumber: '1000706746734',
    accountPhone: '0900468152',
    steps: [
      'Open CBE Birr app or visit your nearest CBE branch / ATM.',
      'Transfer to account number 1000706746734.',
      'Account reference / phone: 0900468152.',
      'Enter the exact amount shown below and confirm the transfer.',
      'Copy the transaction reference or receipt number.',
      'Paste it in the "Transaction reference" field below and submit.',
    ],
  },
} as const

export default function PaymentPage() {
  const { id = '' } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const paymentId = params.get('payment') || ''
  const packageName = params.get('pkg') || ''
  const amountRaw = params.get('amount') || ''
  const amount = amountRaw ? Number(amountRaw) : null

  const [receipt, setReceipt] = useState<File | undefined>()
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submittedStatus, setSubmittedStatus] = useState('')

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<EvidenceValues>({
    resolver: zodResolver(evidenceSchema),
    defaultValues: {
      paymentMethod: sessionStorage.getItem(`payment-method-${paymentId}`) === 'CBE' ? 'CBE' : 'TELEBIRR',
      transactionReference: sessionStorage.getItem(`payment-reference-${paymentId}`) || '',
    },
  })

  const selectedMethod = watch('paymentMethod')
  const detail = PAYMENT_DETAILS[selectedMethod]

  useEffect(() => {
    const subscription = watch(values => {
      sessionStorage.setItem(`payment-method-${paymentId}`, values.paymentMethod || 'TELEBIRR')
      sessionStorage.setItem(`payment-reference-${paymentId}`, values.transactionReference || '')
    })
    return () => subscription.unsubscribe()
  }, [watch, paymentId])

  async function submit(values: EvidenceValues) {
    if (!paymentId) {
      toast.error('Payment reference is missing. Please choose a package first.')
      navigate(`/dashboard/listings/${id}/package`)
      return
    }
    setSubmitting(true)
    try {
      const result = await paymentService.submitEvidence(paymentId, { ...values, receipt })
      setSubmittedStatus(result.paymentStatus || 'SUBMITTED')
      sessionStorage.removeItem(`payment-method-${paymentId}`)
      sessionStorage.removeItem(`payment-reference-${paymentId}`)
      setSubmitted(true)
      toast.success('Payment evidence submitted — an admin will review it shortly.')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Could not submit payment evidence. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  function chooseReceipt(file?: File) {
    if (!file) return
    const accepted = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    if (!accepted.includes(file.type)) {
      toast.error('Use a JPG, PNG, WebP, or PDF file for your receipt.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Receipt file must be 5 MB or smaller.')
      return
    }
    setReceipt(file)
  }

  const inputCls =
    'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-100'

  // ── Success screen ─────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-lg text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-100">
            <CheckCircle className="text-emerald-700" size={36} />
          </span>
          <h1 className="mt-5 text-2xl font-bold text-slate-900">Evidence submitted!</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Your payment evidence is {submittedStatus === 'SUBMITTED' ? 'pending admin review' : 'submitted for manual verification'}. An EthioRent
            administrator will review it and accept or reject it. You will see the status
            update in your <strong>Payments</strong> page.
          </p>
          <div className="mt-6 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-left text-sm text-amber-900">
            <Clock size={18} className="mt-0.5 shrink-0" />
            <p>
              Your listing stays hidden until an administrator accepts the advertising payment.
              This payment is for advertising only; it is not house rent.
            </p>
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => navigate('/dashboard/payments')}
              className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              View my payments
            </button>
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="rounded-lg bg-emerald-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Go to dashboard
            </button>
          </div>
        </div>
      </main>
    )
  }

  // ── Main payment form ──────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-2xl">
        {/* Back button */}
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-6 inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-emerald-800 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to package selection
        </button>

          <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">Advertising payment</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-900">Submit payment evidence</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Send the exact amount to one of the accounts below, then enter the transaction reference
          to notify EthioRent. An administrator will verify the payment before your listing goes live.
        </p>

        {/* Amount banner */}
        {amount && (
          <div className="mt-5 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                Amount to transfer
              </p>
              <p className="mt-0.5 text-2xl font-bold text-emerald-900">
                ETB {amount.toLocaleString()}
              </p>
              {packageName && (
                <p className="mt-0.5 text-xs text-emerald-700">{packageName} advertising package</p>
              )}
            </div>
            <CheckCircle className="text-emerald-600" size={32} />
          </div>
        )}

        {/* Honest warning */}
        <div className="mt-5 flex gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
          <AlertTriangle size={19} className="mt-0.5 shrink-0 text-amber-600" />
          <p>
            <strong>Important:</strong> Submitting this form does not automatically publish your listing.
            An EthioRent administrator will independently verify the transaction against the official
            account. Your listing will only go live after a successful verification.
          </p>
        </div>

        <form onSubmit={handleSubmit(submit)} className="mt-6 space-y-6">
          {/* Payment method selector */}
          <div>
            <p className="mb-3 text-sm font-semibold text-slate-800">
              1. Choose your payment method
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {(['TELEBIRR', 'CBE'] as const).map((method) => {
                const d = PAYMENT_DETAILS[method]
                const Icon = d.icon
                const isSelected = selectedMethod === method
                return (
                  <label
                    key={method}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 p-4 transition-all ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-emerald-300'
                    }`}
                  >
                    <input
                      type="radio"
                      value={method}
                      {...register('paymentMethod')}
                      className="sr-only"
                    />
                    <Icon size={22} className={isSelected ? 'text-emerald-700' : 'text-slate-500'} />
                    <span className={`text-sm font-semibold ${isSelected ? 'text-emerald-800' : 'text-slate-700'}`}>
                      {d.label}
                    </span>
                    {isSelected && (
                      <CheckCircle size={16} className="ml-auto text-emerald-600" />
                    )}
                  </label>
                )
              })}
            </div>
          </div>

          {/* Payment instructions for selected method */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              {(() => { const Icon = detail.icon; return <Icon size={20} className="text-emerald-700" /> })()}
              <h2 className="font-semibold text-slate-900">
                Payment instructions — {detail.label}
              </h2>
            </div>

            {/* Account details box */}
            <div className="mb-4 rounded-lg border border-emerald-100 bg-emerald-50 p-4 space-y-2">
              {'phone' in detail && (
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500 uppercase">Telebirr Number</span>
                  <span className="font-mono text-base font-bold text-emerald-800 tracking-wider">
                    {detail.phone}
                  </span>
                </div>
              )}
              {'accountNumber' in detail && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-500 uppercase">CBE Account No.</span>
                    <span className="font-mono text-base font-bold text-emerald-800 tracking-wider">
                      {detail.accountNumber}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-500 uppercase">Account / Phone</span>
                    <span className="font-mono text-sm font-semibold text-emerald-700">
                      {detail.accountPhone}
                    </span>
                  </div>
                </>
              )}
              {amount && (
                <div className="flex items-center justify-between border-t border-emerald-200 pt-2 mt-2">
                  <span className="text-xs font-medium text-slate-500 uppercase">Transfer Amount</span>
                  <span className="font-mono text-base font-bold text-slate-900">
                    ETB {amount.toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            {/* Step-by-step */}
            <ol className="space-y-2">
              {detail.steps.map((step, i) => (
                <li key={i} className="flex gap-3 text-sm text-slate-700">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>

          {/* Transaction reference */}
          <div>
            <p className="mb-3 text-sm font-semibold text-slate-800">
              2. Enter your transaction reference
            </p>
            <label htmlFor="transactionReference" className="mb-1.5 block text-sm text-slate-700">
              Transaction reference / confirmation code
            </label>
            <input
              id="transactionReference"
              className={inputCls}
              autoComplete="off"
              placeholder="e.g. TXN1234567890 or CBE-REF-XXXXXXXX"
              {...register('transactionReference')}
            />
            {errors.transactionReference && (
              <p className="mt-1.5 text-sm text-red-600">{errors.transactionReference.message}</p>
            )}
          </div>

          {/* Receipt upload */}
          <div>
            <p className="mb-3 text-sm font-semibold text-slate-800">
              3. Attach receipt / screenshot{' '}
              <span className="font-normal text-slate-500">(required, max 5 MB)</span>
            </p>
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-slate-300 p-4 hover:border-emerald-500 transition-colors">
              <UploadCloud className="shrink-0 text-emerald-700" size={22} />
              <span className="min-w-0 text-sm text-slate-700">
                {receipt ? (
                  <span className="flex items-center gap-2 text-emerald-800 font-medium">
                    <FileImage size={16} />
                    {receipt.name}
                  </span>
                ) : (
                  'Click to select an image or PDF receipt (max 5 MB)'
                )}
              </span>
              <input
                type="file"
                required
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className="sr-only"
                onChange={(e) => chooseReceipt(e.target.files?.[0])}
              />
            </label>
          </div>

          {/* Disclaimer */}
          <div className="rounded-lg border-l-4 border-emerald-700 bg-emerald-50 p-4 text-sm leading-6 text-emerald-950">
            <Info size={16} className="mr-1.5 inline" />
            Evidence submission does not publish the listing. It remains hidden until an administrator manually accepts the advertising payment.
          </div>

          {/* Submit */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => navigate(`/dashboard/listings/${id}/package`)}
              className="flex-1 rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              ← Back
            </button>
            <button
              type="submit"
              disabled={submitting || !paymentId}
              className="flex-1 rounded-lg bg-emerald-800 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
            >
              {submitting ? 'Submitting for review…' : 'Submit for verification'}
            </button>
          </div>

          {!paymentId && (
            <p className="text-center text-sm text-red-600">
              No payment record found.{' '}
              <button
                type="button"
                className="underline"
                onClick={() => navigate(`/dashboard/listings/${id}/package`)}
              >
                Please choose a package first.
              </button>
            </p>
          )}
        </form>
      </div>
    </main>
  )
}
