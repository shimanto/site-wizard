function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '').trim()
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const n = parseInt(full, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function mix(a: [number, number, number], b: [number, number, number], r: number): [number, number, number] {
  return [
    Math.round(a[0] + (b[0] - a[0]) * r),
    Math.round(a[1] + (b[1] - a[1]) * r),
    Math.round(a[2] + (b[2] - a[2]) * r),
  ]
}

export function applyBrandTheme(primaryHex: string) {
  const base = hexToRgb(primaryHex)
  const white: [number, number, number] = [255, 255, 255]
  const black: [number, number, number] = [0, 0, 0]
  const shades: Record<string, [number, number, number]> = {
    '50': mix(base, white, 0.95),
    '100': mix(base, white, 0.88),
    '200': mix(base, white, 0.75),
    '500': base,
    '600': mix(base, black, 0.12),
    '700': mix(base, black, 0.26),
    '800': mix(base, black, 0.4),
    '900': mix(base, black, 0.55),
  }
  const root = document.documentElement
  for (const [k, [r, g, b]] of Object.entries(shades)) {
    root.style.setProperty(`--brand-${k}`, `${r} ${g} ${b}`)
  }
}
