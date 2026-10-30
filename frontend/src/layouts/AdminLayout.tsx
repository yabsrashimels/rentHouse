import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  Boxes,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Package,
  MessageSquare,
  Users
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const navigation = [
  { label: 'Overview', path: '/admin', icon: LayoutDashboard, end: true },
  { label: 'Properties', path: '/admin/properties', icon: Boxes },
  { label: 'Payments', path: '/admin/payments', icon: CreditCard },
  { label: 'Rental requests', path: '/admin/rental-requests', icon: MessageSquare },
  { label: 'Users', path: '/admin/users', icon: Users },
  { label: 'Packages', path: '/admin/packages', icon: Package },
  { label: 'Audit logs', path: '/admin/audit-logs', icon: ClipboardList },
]

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-background text-main-text md:flex">
      <aside className="flex w-full flex-col border-b border-gray-200 bg-white md:min-h-screen md:w-64 md:border-b-0 md:border-r">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 md:block md:px-6 md:py-6">
          <div>
            <a href='/'><p className="text-lg font-bold text-primary-800">EthioRent</p></a>
            <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-secondary-text">Administration</p>
          </div>
          <p className="text-sm font-medium text-secondary-text md:hidden">{user?.fullName}</p>
        </div>

        <nav aria-label="Admin navigation" className="flex gap-1 overflow-x-auto px-3 py-3 md:flex-1 md:flex-col md:overflow-visible md:px-3 md:py-5">
          {navigation.map(({ label, path, icon: Icon, end }) => (
            <NavLink
              key={path}
              to={path}
              end={end}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary-50 text-primary-800'
                    : 'text-secondary-text hover:bg-gray-50 hover:text-main-text'
                }`
              }
            >
              <Icon size={18} aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden border-t border-gray-100 p-4 md:block">
          <p className="truncate text-sm font-semibold">{user?.fullName ?? 'Administrator'}</p>
          <p className="mt-0.5 truncate text-xs text-secondary-text">{user?.email}</p>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-4 inline-flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm font-medium text-secondary-text transition-colors hover:bg-gray-50 hover:text-main-text"
          >
            <LogOut size={17} aria-hidden="true" />
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="hidden h-16 items-center justify-between border-b border-gray-200 bg-white px-8 md:flex">
          <p className="text-sm font-medium text-secondary-text">Admin dashboard</p>
          <p className="text-sm text-secondary-text">{user?.email}</p>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
        <div className="border-t border-gray-200 bg-white p-3 md:hidden">
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-secondary-text hover:bg-gray-50 hover:text-main-text"
          >
            <LogOut size={17} aria-hidden="true" />
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}