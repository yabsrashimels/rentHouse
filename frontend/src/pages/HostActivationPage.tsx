import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'

export default function HostActivationPage() {
  const { user, becomeHost } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true

    async function activate() {
      try {
        if (user?.role === 'TENANT') await becomeHost()
        if (active) navigate('/dashboard/listings/new', { replace: true })
      } catch (activationError: any) {
        const message = activationError.response?.data?.message || 'Could not activate hosting for this account.'
        if (active) {
          setError(message)
          toast.error(message)
        }
      }
    }

    void activate()
    return () => { active = false }
  }, [attempt, becomeHost, navigate, user?.role])

  return <main className="container-main py-16" aria-live="polite">
    {error ? <section className="mx-auto max-w-lg border border-red-200 bg-white p-6">
      <h1 className="text-xl font-semibold text-slate-900">Host activation failed</h1>
      <p className="mt-2 text-sm text-red-700">{error}</p>
      <button type="button" onClick={() => { setError(''); setAttempt(value => value + 1) }} className="mt-5 bg-primary-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700">Try again</button>
    </section> : <p className="text-center text-sm text-secondary-text">Preparing your hosting account...</p>}
  </main>
}