import type { ButtonHTMLAttributes } from 'react'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary'
  fullWidth?: boolean
}

const variants = {
  primary: 'bg-brand text-brand-ink hover:brightness-110',
  secondary: 'border border-line bg-white text-ink hover:bg-page',
}

export function Button({ variant = 'primary', fullWidth = false, className = '', type = 'button', ...rest }: Props) {
  return (
    <button
      type={type}
      className={`rounded-lg px-5 py-2.5 font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
        variants[variant]
      } ${fullWidth ? 'w-full' : ''} ${className}`}
      {...rest}
    />
  )
}
