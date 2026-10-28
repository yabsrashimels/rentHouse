import React from 'react'
import { Link } from 'react-router-dom'

interface EmptyStateProps {
  title: string
  description?: string
  action?: { label: string; href: string }
  icon?: React.ComponentType<any>
}

export default function EmptyState({ title, description, action, icon: Icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {Icon && (
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-[#065F46]/10 mb-4">
          <Icon className="w-8 h-8 text-[#065F46]" />
        </div>
      )}
      <h3 className="text-lg font-semibold text-[#0F172A] mb-2">{title}</h3>
      {description && (
        <p className="text-[#64748B] text-sm max-w-sm mb-6">{description}</p>
      )}
      {action && (
        <Link
          to={action.href}
          className="inline-flex items-center px-5 py-2.5 bg-[#065F46] text-white text-sm font-medium rounded-lg hover:bg-[#047857] transition-colors"
        >
          {action.label}
        </Link>
      )}
    </div>
  )
}
