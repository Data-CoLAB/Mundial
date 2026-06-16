import { useState, useEffect } from 'react'

export default function CountdownTimer({ closesAt }) {
  const [timeLeft, setTimeLeft] = useState('')
  const [urgent, setUrgent] = useState(false)

  useEffect(() => {
    const tick = () => {
      const now = Date.now()
      const end = closesAt?.toDate?.()?.getTime() ?? 0
      const diff = end - now

      if (diff <= 0) {
        setTimeLeft('Encerrado')
        setUrgent(false)
        return
      }

      setUrgent(diff < 60 * 60 * 1000) // < 1 hour

      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      if (days > 0) setTimeLeft(`${days}d ${hours}h`)
      else if (hours > 0) setTimeLeft(`${hours}h ${minutes}m`)
      else setTimeLeft(`${minutes}m ${seconds}s`)
    }

    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [closesAt])

  return (
    <span className={`text-xs font-mono font-semibold ${urgent ? 'text-red-600' : 'text-slate-500'}`}>
      {timeLeft}
    </span>
  )
}
