import {
  InputHTMLAttributes,
  TextareaHTMLAttributes,
  SelectHTMLAttributes,
  forwardRef,
  ReactNode
} from 'react'
import { clsx } from 'clsx'

interface BaseInputProps {
  error?: string
  as?: 'input' | 'select' | 'textarea'
  children?: ReactNode
  rows?: number
  type?: string
}

type InputProps = BaseInputProps &
  (InputHTMLAttributes<HTMLInputElement> |
   SelectHTMLAttributes<HTMLSelectElement> |
   TextareaHTMLAttributes<HTMLTextAreaElement>)

const Input = forwardRef<any, InputProps>(
  ({ className, type, error, as = 'input', children, rows, ...props }, ref) => {
    const baseClasses = clsx(
      'flex w-full rounded-md border border-input bg-input px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
      error && 'border-destructive focus-visible:ring-destructive',
      className
    )

    const renderElement = () => {
      if (as === 'select') {
        return (
          <select
            className={clsx(baseClasses, 'h-10')}
            ref={ref}
            {...(props as SelectHTMLAttributes<HTMLSelectElement>)}
          >
            {children}
          </select>
        )
      }

      if (as === 'textarea') {
        return (
          <textarea
            className={clsx(baseClasses, 'min-h-[80px] resize-y')}
            rows={rows || 3}
            ref={ref}
            {...(props as TextareaHTMLAttributes<HTMLTextAreaElement>)}
          />
        )
      }

      return (
        <input
          type={type || 'text'}
          className={clsx(baseClasses, 'h-10 file:border-0 file:bg-transparent file:text-sm file:font-medium')}
          ref={ref}
          {...(props as InputHTMLAttributes<HTMLInputElement>)}
        />
      )
    }

    return (
      <div className="w-full">
        {renderElement()}
        {error && (
          <p className="mt-1 text-sm text-destructive">{error}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export default Input
