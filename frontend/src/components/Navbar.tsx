import { Link, NavLink, useNavigate } from 'react-router-dom'
import { HousePlus, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate('/', { replace: true })
  }

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="container-main flex min-h-16 flex-wrap items-center justify-between gap-3 py-3">
        <Link to="/" className="text-xl font-bold text-primary-800">EthioRent</Link>
        <button type="button" aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={menuOpen} onClick={() => setMenuOpen(open => !open)} className="rounded-md border border-gray-200 p-2 text-primary-800 md:hidden">{menuOpen ? <X size={20} /> : <Menu size={20} />}</button>
        <nav aria-label="Main navigation" className={`${menuOpen ? 'flex' : 'hidden'} w-full flex-col items-stretch gap-3 border-t border-gray-100 pt-3 text-sm font-medium md:flex md:w-auto md:flex-row md:items-center md:gap-x-5 md:border-0 md:pt-0`}>
          <NavLink onClick={() => setMenuOpen(false)} to="/" className="text-secondary-text hover:text-primary-800">Home</NavLink>
          <NavLink onClick={() => setMenuOpen(false)} to="/houses" className="text-secondary-text hover:text-primary-800">Houses</NavLink>
          <NavLink onClick={() => setMenuOpen(false)} to="/about" className="text-secondary-text hover:text-primary-800">About</NavLink>
          <NavLink onClick={() => setMenuOpen(false)} to="/contact" className="text-secondary-text hover:text-primary-800">Contact</NavLink>
          {user ? (
            <>
              <Link onClick={() => setMenuOpen(false)} to={user.role === 'ADMIN' ? '/admin' : '/dashboard'} className="text-primary-800">Dashboard</Link>
              <button type="button" onClick={handleLogout} className="text-secondary-text hover:text-primary-800">Sign out</button>
            </>
          ) : (
            <Link onClick={() => setMenuOpen(false)} to="/login" className="text-primary-800">Login / Sign up</Link>
          )}
          <Link onClick={() => setMenuOpen(false)} to={user ? '/host' : `/login?redirect=${encodeURIComponent('/host')}`} className="inline-flex items-center justify-center gap-2 rounded-md bg-primary-800 px-4 py-2.5 font-semibold text-white hover:bg-primary-700"><HousePlus size={16} />Post a house</Link>
        </nav>
      </div>
    </header>
  )
}