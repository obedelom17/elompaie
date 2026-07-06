import { useEffect, useRef, useState } from 'react'

export function CountUp({ value, duration = 800 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0)
  const start = useRef<number | null>(null)
  const raf = useRef<number>()

  useEffect(() => {
    start.current = null
    const animate = (ts: number) => {
      if (!start.current) start.current = ts
      const prog = Math.min((ts - start.current) / duration, 1)
      const ease = 1 - Math.pow(1 - prog, 3)
      setDisplay(Math.round(ease * value))
      if (prog < 1) raf.current = requestAnimationFrame(animate)
    }
    raf.current = requestAnimationFrame(animate)
    return () => { if (raf.current) cancelAnimationFrame(raf.current) }
  }, [value, duration])

  return <>{new Intl.NumberFormat('fr-FR').format(display)}</>
}
