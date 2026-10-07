import * as React from 'react'
import { cn } from '../../lib/utils'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

const variantClasses: Record<string, string> = {
  default: 'bg-indigo-600/90 backdrop-blur text-white shadow-md hover:bg-indigo-500 hover:shadow-indigo-500/25 hover:shadow-lg active:bg-indigo-700 border border-indigo-500/50',
  secondary: 'bg-white/50 backdrop-blur-sm border border-white/40 text-gray-800 shadow-sm hover:bg-white/70 hover:border-white/60 active:bg-white/40',
  outline: 'border border-gray-300/50 bg-white/20 backdrop-blur-sm text-gray-700 hover:bg-white/40 active:bg-white/20 hover:border-gray-300/80',
  ghost: 'text-gray-700 hover:bg-white/40 hover:backdrop-blur-sm active:bg-white/20',
  destructive: 'bg-red-500/90 backdrop-blur text-white shadow hover:bg-red-500 hover:shadow-red-500/25 hover:shadow-lg active:bg-red-600 border border-red-500/50',
  link: 'text-indigo-600 underline-offset-4 hover:underline p-0 h-auto'
}

const sizeClasses = {
  default: 'h-9 px-4 py-2 text-sm',
  sm: 'h-7 px-3 text-xs rounded-md',
  lg: 'h-11 px-6 text-base rounded-lg',
  icon: 'h-9 w-9 p-0'
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer select-none',
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'
