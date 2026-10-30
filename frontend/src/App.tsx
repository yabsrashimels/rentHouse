import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { AuthProvider } from './context/AuthContext'

// Layouts
import PublicLayout from './layouts/PublicLayout'
import AdminLayout from './layouts/AdminLayout'

// Public pages
import HomePage from './pages/HomePage'
import HousesPage from './pages/HousesPage'
import PropertyDetailPage from './pages/PropertyDetailPage'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import AboutPage from './pages/AboutPage'
import ContactPage from './pages/ContactPage'
import NotFoundPage from './pages/NotFoundPage'
import CityPage from './pages/CityPage'

// Owner dashboard pages
import OwnerDashboard from './pages/dashboard/OwnerDashboard'
import MyListings from './pages/dashboard/MyListings'
import CreateListing from './pages/dashboard/CreateListing'
import EditListing from './pages/dashboard/EditListing'
import OwnerPayments from './pages/dashboard/OwnerPayments'
import OwnerProfile from './pages/dashboard/OwnerProfile'
import FavoritesPage from './pages/dashboard/FavoritesPage'
import PackageSelection from './pages/dashboard/PackageSelection'
import PaymentPage from './pages/dashboard/PaymentPage'
import RentalRequestsPage from './pages/dashboard/RentalRequestsPage'

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminProperties from './pages/admin/AdminProperties'
import AdminPayments from './pages/admin/AdminPayments'
import AdminUsers from './pages/admin/AdminUsers'
import AdminPackages from './pages/admin/AdminPackages'
import AdminAuditLogs from './pages/admin/AdminAuditLogs'
import AdminRentalRequests from './pages/admin/AdminRentalRequests'

function DashboardLayout() {
  return <Outlet />
}

function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-primary-800 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-secondary-text">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(window.location.pathname)}`} replace />
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary-800 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user || user.role !== 'ADMIN') {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/houses" element={<HousesPage />} />
          <Route path="/houses/:slug" element={<PropertyDetailPage />} />
          <Route path="/city/:city" element={<CityPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
        </Route>

        {/* Auth routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        {/* Owner dashboard */}
        <Route path="/dashboard" element={
              <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }>
          <Route index element={<OwnerDashboard />} />
          <Route path="listings" element={<MyListings />} />
          <Route path="listings/new" element={<CreateListing />} />
          <Route path="listings/:id/edit" element={<EditListing />} />
          <Route path="listings/:id/package" element={<PackageSelection />} />
          <Route path="listings/:id/payment" element={<PaymentPage />} />
            <Route path="rental-requests" element={<RentalRequestsPage />} />
            <Route path="payments" element={<OwnerPayments />} />
          <Route path="profile" element={<OwnerProfile />} />
          <Route path="favorites" element={<FavoritesPage />} />
        </Route>

        {/* Admin dashboard */}
        <Route path="/admin" element={
          <AdminRoute>
            <AdminLayout />
          </AdminRoute>
        }>
          <Route index element={<AdminDashboard />} />
          <Route path="properties" element={<AdminProperties />} />
          <Route path="payments" element={<AdminPayments />} />
          <Route path="rental-requests" element={<AdminRentalRequests />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="packages" element={<AdminPackages />} />
          <Route path="audit-logs" element={<AdminAuditLogs />} />
        </Route>

        {/* Favorites for tenants */}
        <Route path="/favorites" element={
          <ProtectedRoute>
            <PublicLayout />
          </ProtectedRoute>
        }>
          <Route index element={<FavoritesPage />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}
export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
