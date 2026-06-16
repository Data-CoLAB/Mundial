import { useState } from 'react'

export default function PrizeImg({ src, fallback, size = 'lg' }) {
  const [err, setErr] = useState(false)
  const sizeClass = size === 'lg' ? 'h-20 w-full' : 'h-10 w-10'
  if (err || !src) return <span className={size === 'lg' ? 'text-3xl' : 'text-xl'}>{fallback}</span>
  return (
    <img
      src={src}
      alt=""
      onError={() => setErr(true)}
      className={`${sizeClass} object-contain`}
    />
  )
}
