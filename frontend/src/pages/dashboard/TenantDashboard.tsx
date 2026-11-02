import { Bell, BedDouble, CalendarDays, ChevronRight, CircleHelp, Heart, House, LayoutGrid, LogOut, MapPin, MessageSquareText, Search, Settings, SlidersHorizontal, Star, UserRound, Bath, Ruler, Home, ArrowRight } from 'lucide-react'

const sidebarItems = [
  { label: 'Dashboard', icon: LayoutGrid, active: true },
  { label: 'Browse Houses', icon: Search },
  { label: 'My Bookings', icon: CalendarDays },
  { label: 'Favorites', icon: Heart, badge: 2 },
  { label: 'Messages', icon: MessageSquareText },
  { label: 'My Profile', icon: UserRound },
  { label: 'Settings', icon: Settings },
]

const stats = [
  { label: 'Total Listings Viewed', value: '12', icon: House },
  { label: 'Saved Favorites', value: '5', icon: Heart },
  { label: 'Active Bookings', value: '2', icon: CalendarDays },
  { label: 'Unread Messages', value: '3', icon: MessageSquareText },
]

const recentBookings = [
  {
    id: 1,
    title: 'Modern House in Bole',
    location: 'Bole, Addis Ababa',
    status: 'Confirmed',
    statusTone: 'bg-emerald-100 text-emerald-700',
    dates: 'Oct 25, 2026 – Nov 25, 2026',
    beds: 3,
    baths: 2,
    area: '120 m²',
    image: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 2,
    title: 'Cozy Apartment in Kazanchis',
    location: 'Kazanchis, Addis Ababa',
    status: 'Pending',
    statusTone: 'bg-amber-100 text-amber-700',
    dates: 'Oct 20, 2026 – Nov 20, 2026',
    beds: 2,
    baths: 1,
    area: '80 m²',
    image: 'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 3,
    title: 'Family House in Gerji',
    location: 'Gerji, Addis Ababa',
    status: 'Completed',
    statusTone: 'bg-sky-100 text-sky-700',
    dates: 'Oct 15, 2026 – Nov 15, 2026',
    beds: 4,
    baths: 3,
    area: '200 m²',
    image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=900&q=80',
  },
]

const viewedHomes = [
  { id: 1, title: 'Modern House in Bole', price: 'ETB 25,000 / month', city: 'Bole, Addis Ababa', beds: 3, baths: 2, area: '120 m²', image: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=900&q=80', liked: true },
  { id: 2, title: 'Cozy Apartment in Kazanchis', price: 'ETB 18,000 / month', city: 'Kazanchis, Addis Ababa', beds: 2, baths: 1, area: '80 m²', image: 'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=900&q=80', liked: true },
  { id: 3, title: 'Family House in Gerji', price: 'ETB 40,000 / month', city: 'Gerji, Addis Ababa', beds: 4, baths: 3, area: '200 m²', image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=900&q=80', liked: true },
  { id: 4, title: 'Beautiful House in Lideta', price: 'ETB 30,000 / month', city: 'Lideta, Addis Ababa', beds: 3, baths: 2, area: '150 m²', image: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80', liked: true },
]

const quickActions = [
  'Search Houses',
  'View Favorites',
  'My Bookings',
  'Contact Support',
]

const recentActivity = [
  'You viewed Modern House in Bole 2 hours ago',
  'You saved Apartment in Mexico 5 hours ago',
  'You booked Cozy Apartment in Kazanchis 1 day ago',
]

export default function TenantDashboard() {
  return (
    <div className="min-h-screen bg-[#edf5ef] p-3 md:p-4">
      <div className="mx-auto flex max-w-[1600px] overflow-hidden rounded-[28px] border border-[#dfece3] bg-[#f7faf7] shadow-[0_18px_60px_rgba(18,47,34,0.08)]">
        <aside className="hidden w-[250px] flex-col justify-between border-r border-[#dfece2] bg-[#f1faf3] p-4 md:flex">
          <div>
            <div className="mb-8 flex items-center gap-3 px-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#18a261] text-white shadow-sm">
                <Home size={18} />
              </div>
              <span className="text-2xl font-bold tracking-tight text-[#1d3b2d]">HomeNest</span>
            </div>

            <nav className="space-y-2">
              {sidebarItems.map(({ label, icon: Icon, active, badge }) => (
                <button
                  key={label}
                  type="button"
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-[15px] font-medium transition ${
                    active ? 'bg-[#1fa668] text-white shadow-md' : 'text-[#2c473d] hover:bg-white/70'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Icon size={18} />
                    {label}
                  </span>
                  {badge ? (
                    <span className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#ff7d7d] px-1 text-[10px] font-semibold text-white`}>
                      {badge}
                    </span>
                  ) : null}
                </button>
              ))}
            </nav>
          </div>

          <button type="button" className="flex items-center gap-3 rounded-xl px-3 py-3 text-left text-[15px] font-medium text-[#2c473d] transition hover:bg-white/80">
            <LogOut size={18} />
            Logout
          </button>
        </aside>

        <main className="flex-1 bg-[#f8faf9]">
          <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e0ebe3] bg-[#f8faf9] px-4 py-4 md:px-6">
            <div className="flex flex-1 items-center gap-3 rounded-full border border-[#d7e5dc] bg-white px-4 py-3 shadow-sm xl:max-w-[720px]">
              <Search size={18} className="text-[#47705c]" />
              <input
                value="Search by location, city, or house name..."
                readOnly
                className="w-full border-0 bg-transparent text-sm text-[#6c7d76] focus:outline-none"
              />
              <button type="button" className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1fa668] text-white shadow-sm">
                <Search size={16} />
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button type="button" className="relative flex h-11 w-11 items-center justify-center rounded-full border border-[#d9e9df] bg-white text-[#2e4d41] hover:bg-[#eef7f0]">
                <Bell size={18} />
                <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-[#ff6464] border-2 border-white" />
              </button>
              <div className="flex items-center gap-3 rounded-full border border-[#d9e9df] bg-white px-2 py-1.5 shadow-sm">
                <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#ffd1a8] to-[#7bc39c] text-sm font-semibold text-[#1b4332]">
                  Y
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-semibold text-[#23392f]">Yabsra Shimels</p>
                </div>
                <ChevronRight size={16} className="text-[#486d5f]" />
              </div>
            </div>
          </header>

          <div className="grid gap-6 p-4 md:p-6 xl:grid-cols-[minmax(0,1.8fr)_360px]">
            <section className="space-y-6">
              <div className="rounded-[26px] border border-[#dfeee3] bg-[#dff2e5] p-5 shadow-sm">
                <div className="grid items-center gap-5 md:grid-cols-[1.3fr_1fr]">
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#f4faf6] text-[#1fa668] shadow-inner">
                      <House size={28} />
                    </div>
                    <div>
                      <h1 className="text-3xl font-bold tracking-tight text-[#1b3b2e]">Welcome back, Yabsra!</h1>
                      <p className="mt-2 text-[17px] text-[#3f6256]">Find your perfect home, it&apos;s just a click away.</p>
                    </div>
                  </div>

                  <div className="flex justify-center md:justify-end">
                    <img
                      src="https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=1200&q=80"
                      alt="Featured house"
                      className="h-36 w-full max-w-[360px] rounded-[20px] object-cover shadow-md md:h-40"
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {stats.map(({ label, value, icon: Icon }) => (
                  <div key={label} className="rounded-[20px] border border-[#dceae1] bg-white p-5 shadow-sm">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#ebf7f0] text-[#1fa668]">
                      <Icon size={22} />
                    </div>
                    <div className="text-4xl font-bold tracking-tight text-[#1c3d2f]">{value}</div>
                    <p className="mt-2 text-[15px] text-[#567067]">{label}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-[24px] border border-[#dfeae3] bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-[28px] font-bold tracking-tight text-[#16382c]">Recent Bookings</h2>
                  <button type="button" className="flex items-center gap-2 text-sm font-semibold text-[#1fa668]">
                    View All <ArrowRight size={16} />
                  </button>
                </div>

                <div className="space-y-4">
                  {recentBookings.map((booking) => (
                    <div key={booking.id} className="flex flex-col gap-4 rounded-[18px] border border-[#e5efe8] bg-[#fbfdfb] p-3 md:flex-row md:items-center md:justify-between">
                      <div className="flex items-center gap-4">
                        <img src={booking.image} alt={booking.title} className="h-24 w-24 rounded-[12px] object-cover" />
                        <div>
                          <h3 className="text-[22px] font-semibold text-[#1a3a2d]">{booking.title}</h3>
                          <div className="mt-1 flex items-center gap-2 text-sm text-[#5b736a]">
                            <MapPin size={15} />
                            {booking.location}
                          </div>
                          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-[#587168]">
                            <span className="flex items-center gap-1"><CalendarDays size={15} /> {booking.dates}</span>
                            <span className="flex items-center gap-1"><BedDouble size={15} /> {booking.beds} Beds</span>
                            <span className="flex items-center gap-1"><Bath size={15} /> {booking.baths} Bath</span>
                            <span className="flex items-center gap-1"><Ruler size={15} /> {booking.area}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-end md:self-center">
                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${booking.statusTone}`}>
                          {booking.status}
                        </span>
                        <button type="button" className="rounded-full border border-[#a6d5b8] bg-white px-4 py-2 text-sm font-semibold text-[#1f8d5d] hover:bg-[#f2fbf5]">
                          View Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-5 flex justify-start">
                  <button type="button" className="inline-flex items-center gap-2 text-sm font-semibold text-[#1fa668]">
                    View all bookings <ArrowRight size={16} />
                  </button>
                </div>
              </div>

              <div className="rounded-[24px] border border-[#dfeae3] bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-[28px] font-bold tracking-tight text-[#16382c]">Recently Viewed Houses</h2>
                  <button type="button" className="flex items-center gap-2 text-sm font-semibold text-[#1fa668]">
                    View All <ArrowRight size={16} />
                  </button>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {viewedHomes.map((home) => (
                    <div key={home.id} className="overflow-hidden rounded-[18px] border border-[#e1ebe4] bg-[#fbfdfb] shadow-sm">
                      <div className="relative">
                        <img src={home.image} alt={home.title} className="h-40 w-full object-cover" />
                        <button type="button" className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-[#1fa668] shadow-sm">
                          <Heart size={16} fill={home.liked ? 'currentColor' : 'none'} />
                        </button>
                        <div className="absolute left-3 top-3 rounded-full bg-[#1fa668] px-2 py-1 text-[11px] font-bold text-white shadow-sm">
                          {home.price}
                        </div>
                      </div>

                      <div className="p-3">
                        <h3 className="text-[18px] font-semibold text-[#1a3a2d]">{home.title}</h3>
                        <div className="mt-2 flex items-center gap-2 text-sm text-[#5d7069]">
                          <MapPin size={14} />
                          {home.city}
                        </div>
                        <div className="mt-3 flex items-center gap-3 text-sm text-[#567066]">
                          <span className="flex items-center gap-1"><BedDouble size={14} /> {home.beds} Beds</span>
                          <span className="flex items-center gap-1"><Bath size={14} /> {home.baths} Bath</span>
                          <span className="flex items-center gap-1"><Ruler size={14} /> {home.area}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <aside className="space-y-6">
              <div className="rounded-[24px] border border-[#dfeae3] bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#edf9f1] text-[#1fa668]">
                    <SlidersHorizontal size={18} />
                  </div>
                  <h2 className="text-[28px] font-bold tracking-tight text-[#173b2e]">Quick Actions</h2>
                </div>

                <div className="space-y-3">
                  {quickActions.map((action, index) => (
                    <button
                      key={action}
                      type="button"
                      className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-[18px] font-medium transition ${
                        index === 0 ? 'border-[#dfece3] bg-[#f7faf7] text-[#1e4036]' : 'border-[#eef3ef] bg-white text-[#1d3a2d] hover:bg-[#f5fbf7]'
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        {index === 0 && <Search size={18} className="text-[#1fa668]" />}
                        {index === 1 && <Heart size={18} className="text-[#1fa668]" />}
                        {index === 2 && <CalendarDays size={18} className="text-[#1fa668]" />}
                        {index === 3 && <CircleHelp size={18} className="text-[#1fa668]" />}
                        {action}
                      </span>
                      <ChevronRight size={18} className="text-[#536a60]" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-[24px] border border-[#d8efe0] bg-[#dff4e5] p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#edf9f1] text-[#1fa668]">
                    <Home size={22} />
                  </div>
                  <h3 className="text-[27px] font-bold leading-tight text-[#1d3e30]">Your next home<br />is waiting!</h3>
                </div>

                <p className="mb-5 text-[17px] leading-6 text-[#355849]">Find safe, comfortable and affordable houses near you.</p>
                <button type="button" className="w-full rounded-full bg-[#1fa668] px-4 py-3 text-lg font-semibold text-white shadow-sm hover:bg-[#179d5c]">
                  Browse Now
                </button>
                <img
                  src="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1000&q=80"
                  alt="Another featured house"
                  className="mt-5 h-40 w-full rounded-[18px] object-cover"
                />
              </div>

              <div className="rounded-[24px] border border-[#dfeae3] bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#edf9f1] text-[#1fa668]">
                    <Star size={18} fill="currentColor" />
                  </div>
                  <h2 className="text-[28px] font-bold tracking-tight text-[#173b2e]">Recent Activity</h2>
                </div>

                <div className="space-y-4">
                  {recentActivity.map((activity, index) => (
                    <div key={activity} className="flex items-start gap-3 rounded-2xl border border-[#edf1ee] bg-[#fbfcfb] p-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-[#e6f4eb] text-[#1fa668]">
                        <img
                          src={viewedHomes[index % viewedHomes.length].image}
                          alt="Activity thumbnail"
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <p className="text-[15px] leading-6 text-[#2d4a3f]">{activity}</p>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </main>
      </div>
    </div>
  )
}