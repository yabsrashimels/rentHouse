import { Link } from 'react-router-dom'

export default function RoutePlaceholder({ title }: { title: string }) {
  return (
    <section className="mx-auto max-w-3xl py-16 text-center">
      <p className="text-sm font-semibold uppercase tracking-wide text-primary-800">EthioRent</p>
      <h1 className="mt-3 text-3xl font-bold text-main-text">{title}</h1>
      <p className="mx-auto mt-4 max-w-xl text-secondary-text">
        This page has not been implemented yet.
      </p>
      <Link to="/" className="btn-primary mt-7">Return home</Link>
    </section>
  )
}