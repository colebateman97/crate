import { useEffect, useRef } from 'react'

interface Props {
  colors?: [string, string, string] | null
}

const DARK_DEFAULTS: [string, string, string] = ['#18181b', '#1c1c20', '#141418']
const LIGHT_DEFAULTS: [string, string, string] = ['#fafaf9', '#f5f5f4', '#f7f7f6']

function isDark() {
  return document.documentElement.classList.contains('dark')
}

export function AnimatedBackground({ colors }: Props) {
  const dark = isDark()
  const defaults = dark ? DARK_DEFAULTS : LIGHT_DEFAULTS
  const [c1, c2, c3] = colors ?? defaults

  const t = useRef(0)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    function resize() {
      if (!canvas) return
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    function hexToRgb(hex: string): [number, number, number] {
      const clean = hex.startsWith('#') ? hex : '#' + hex
      const r = parseInt(clean.slice(1, 3), 16) || 0
      const g = parseInt(clean.slice(3, 5), 16) || 0
      const b = parseInt(clean.slice(5, 7), 16) || 0
      return [r, g, b]
    }

    function lerp(a: number, b: number, tt: number) {
      return a + (b - a) * tt
    }

    function animate() {
      if (!canvas || !ctx) return
      t.current += 0.002
      const tc = t.current

      const [r1, g1, b1] = hexToRgb(c1)
      const [r2, g2, b2] = hexToRgb(c2)
      const [r3, g3, b3] = hexToRgb(c3)

      const w = canvas.width
      const h = canvas.height

      const x1 = w * (0.5 + 0.4 * Math.sin(tc * 0.7))
      const y1 = h * (0.3 + 0.3 * Math.cos(tc * 0.5))
      const x2 = w * (0.2 + 0.5 * Math.cos(tc * 0.6 + 1))
      const y2 = h * (0.7 + 0.2 * Math.sin(tc * 0.8 + 2))
      const x3 = w * (0.8 + 0.2 * Math.sin(tc * 0.4 + 3))
      const y3 = h * (0.5 + 0.4 * Math.cos(tc * 0.9 + 1))

      ctx.clearRect(0, 0, w, h)

      const bg = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h))
      bg.addColorStop(0, `rgb(${r1},${g1},${b1})`)
      bg.addColorStop(1, `rgb(${r1},${g1},${b1})`)
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, w, h)

      const g1g = ctx.createRadialGradient(x1, y1, 0, x1, y1, w * 0.8)
      g1g.addColorStop(0, `rgba(${lerp(r1, r2, 0.7)},${lerp(g1, g2, 0.7)},${lerp(b1, b2, 0.7)},0.7)`)
      g1g.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = g1g
      ctx.fillRect(0, 0, w, h)

      const g2g = ctx.createRadialGradient(x2, y2, 0, x2, y2, w * 0.6)
      g2g.addColorStop(0, `rgba(${r2},${g2},${b2},0.5)`)
      g2g.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = g2g
      ctx.fillRect(0, 0, w, h)

      const g3g = ctx.createRadialGradient(x3, y3, 0, x3, y3, w * 0.5)
      g3g.addColorStop(0, `rgba(${r3},${g3},${b3},0.4)`)
      g3g.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = g3g
      ctx.fillRect(0, 0, w, h)

      animRef.current = requestAnimationFrame(animate)
    }

    animate()
    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animRef.current)
    }
  }, [c1, c2, c3])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full -z-10"
      style={{ pointerEvents: 'none' }}
    />
  )
}
