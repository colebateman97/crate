interface Props {
  value?: 1 | 2 | 3 | 4 | 5
  onChange?: (v: 1 | 2 | 3 | 4 | 5) => void
  readonly?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function StarRating({ value, onChange, readonly = false, size = 'md' }: Props) {
  const sizes = { sm: 'text-base', md: 'text-xl', lg: 'text-2xl' }

  return (
    <div className={`flex gap-0.5 ${sizes[size]}`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          disabled={readonly}
          onClick={() => onChange?.(n as 1 | 2 | 3 | 4 | 5)}
          className={`transition-all ${
            readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110 active:scale-95'
          } ${(value ?? 0) >= n ? 'opacity-100' : 'opacity-25'}`}
        >
          ★
        </button>
      ))}
    </div>
  )
}
