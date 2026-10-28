import { BedDouble, Bath, MapPin, Ruler, Star } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Property } from '../types'

type PropertyCardProps = {
  property: Property
}

export default function PropertyCard({ property }: PropertyCardProps) {
  return (
    <article className="group overflow-hidden border border-slate-200 bg-white transition-shadow hover:shadow-md">
      <Link to={`/houses/${property.slug}`} className="relative block aspect-[4/3] overflow-hidden bg-slate-100">
        {property.coverImage ? <img src={property.coverImage} alt={property.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" /> : <div className="grid h-full place-items-center text-sm text-slate-400">No property photo</div>}
        {property.isFeatured && <span className="absolute left-3 top-3 inline-flex items-center gap-1 bg-amber-400 px-2 py-1 text-xs font-bold text-slate-950"><Star size={12} fill="currentColor" />Featured</span>}
      </Link>
      <div className="p-4">
        <Link to={`/houses/${property.slug}`} className="line-clamp-1 text-sm font-semibold text-slate-900 hover:text-emerald-800">{property.title}</Link>
        <p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><MapPin size={13} />{[property.neighborhood, property.city].filter(Boolean).join(', ')}</p>
        <div className="mt-3 flex items-center gap-3 text-xs text-slate-600"><span className="inline-flex items-center gap-1"><BedDouble size={14} />{property.bedrooms}</span><span className="inline-flex items-center gap-1"><Bath size={14} />{property.bathrooms}</span>{property.sizeSquareMeters && <span className="inline-flex items-center gap-1"><Ruler size={14} />{Number(property.sizeSquareMeters)} m²</span>}</div>
        <p className="mt-4 border-t border-slate-100 pt-3 font-bold text-emerald-800">ETB {Number(property.monthlyRent).toLocaleString()} <span className="text-xs font-normal text-slate-500">/ month</span></p>
      </div>
    </article>
  )
}
