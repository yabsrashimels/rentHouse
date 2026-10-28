import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="container-main flex flex-col gap-3 py-6 text-sm text-secondary-text sm:flex-row sm:items-center sm:justify-between">
        <p>EthioRent</p>
        <div className="flex gap-5">
          <Link to="/about" className="hover:text-primary-800">About</Link>
          <Link to="/contact" className="hover:text-primary-800">Contact</Link>
        </div>
      </div>
    </footer>
  )
}