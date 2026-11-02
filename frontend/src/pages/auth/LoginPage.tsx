import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { KeyRound } from 'lucide-react'
import toast from 'react-hot-toast'
import { z } from 'zod'
import { useAuth } from '../../context/AuthContext'

const schema = z.object({ email: z.string().email('Enter a valid email address'), password: z.string().min(1, 'Enter your password') })
type LoginValues = z.infer<typeof schema>

export default function LoginPage() {
	const { login } = useAuth()
	const navigate = useNavigate()
	const [params] = useSearchParams()
	const [submitting, setSubmitting] = useState(false)
	const { register, handleSubmit, formState: { errors } } = useForm<LoginValues>({ resolver: zodResolver(schema) })

	async function submit(values: LoginValues) {
		setSubmitting(true)
		try {
			const user = await login(values.email, values.password)
			const redirect = params.get('redirect')
			const roleHome = user.role === 'ADMIN' ? '/admin' : '/dashboard'
			navigate(redirect?.startsWith('/') && !redirect.startsWith('//') ? redirect : roleHome, { replace: true })
		} catch (error: any) { toast.error(error.response?.data?.message || 'Unable to sign in') }
		finally { setSubmitting(false) }
	}

	const inputClass = 'w-full rounded-lg border border-slate-300 px-3 py-3 text-sm focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-100'
	return <main className="flex min-h-[75vh] items-center justify-center bg-slate-50 px-4 py-10"><div className="w-full max-w-md border border-slate-200 bg-white p-6 shadow-sm sm:p-8"><div className="mb-6 grid h-11 w-11 place-items-center rounded-lg bg-emerald-50 text-emerald-800"><KeyRound size={21} /></div><p className="text-xs font-bold uppercase tracking-wider text-emerald-800">Welcome back</p><h1 className="mt-1 text-2xl font-bold text-slate-900">Sign in to EthioRent</h1><p className="mt-2 text-sm text-slate-600">Access your dashboard or reveal owner contact details.</p>
		<form onSubmit={handleSubmit(submit)} className="mt-6 space-y-4"><div><label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-800">Email address</label><input id="email" type="email" autoComplete="email" className={inputClass} {...register('email')} />{errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}</div><div><label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-800">Password</label><input id="password" type="password" autoComplete="current-password" className={inputClass} {...register('password')} />{errors.password && <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>}</div><div className="text-right"><Link to="/forgot-password" className="text-sm font-medium text-emerald-800 hover:underline">Forgot password?</Link></div><button type="submit" disabled={submitting} className="w-full rounded-lg bg-emerald-800 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">{submitting ? 'Signing in...' : 'Sign in'}</button></form>
		<p className="mt-6 border-t border-slate-100 pt-5 text-center text-sm text-slate-600">New to EthioRent? <Link to={`/register${params.get('redirect') ? `?redirect=${encodeURIComponent(params.get('redirect')!)}` : ''}`} className="font-semibold text-emerald-800 hover:underline">Create an account</Link></p>
	</div></main>
}