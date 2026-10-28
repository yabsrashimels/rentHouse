export default function PropertySkeleton() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 animate-pulse">
      {/* Image placeholder */}
      <div className="w-full h-52 bg-gray-200" />

      <div className="p-4 space-y-3">
        {/* Title */}
        <div className="h-4 bg-gray-200 rounded-md w-3/4" />

        {/* Location */}
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 bg-gray-200 rounded-full" />
          <div className="h-3 bg-gray-200 rounded-md w-1/2" />
        </div>

        {/* Price */}
        <div className="h-5 bg-gray-200 rounded-md w-2/5" />

        {/* Stats row */}
        <div className="flex gap-4 pt-1">
          <div className="h-3 bg-gray-200 rounded-md w-12" />
          <div className="h-3 bg-gray-200 rounded-md w-12" />
          <div className="h-3 bg-gray-200 rounded-md w-14" />
        </div>

        {/* Divider */}
        <div className="h-px bg-gray-100 my-1" />

        {/* Button */}
        <div className="h-9 bg-gray-200 rounded-lg w-full" />
      </div>
    </div>
  )
}
