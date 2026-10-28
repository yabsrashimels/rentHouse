export default function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' }
  return (
    <div className="flex items-center justify-center p-8">
      <div
        className={`${sizes[size]} border-[3px] border-gray-200 border-t-[#065F46] rounded-full animate-spin`}
      />
    </div>
  )
}
