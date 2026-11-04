// FeelingsWheel/wheelMath.ts — SVG arc path mathematics for the wheel
// PURPOSE
//   Generates SVG path data for emotion segments and arc paths for textPath labels.

const TWO_PI = Math.PI * 2

// polarToCartesian
// ─────────────────────────────────────────────────────────────────────────────
// PURPOSE
//   Converts polar coordinates to Cartesian. SVG uses 12-o'clock = 0, clockwise.
export function polarToCartesian(
  cx: number,
  cy: number,
  radius: number,
  angleRad: number
): { x: number; y: number } {
  return {
    x: cx + radius * Math.cos(angleRad - Math.PI / 2),
    y: cy + radius * Math.sin(angleRad - Math.PI / 2),
  }
}

// describeArc
// ─────────────────────────────────────────────────────────────────────────────
// PURPOSE
//   Returns an SVG path 'd' string for a filled donut segment.
// IMPORTANT
//   gap: angular gap (radians) to leave between adjacent segments so they don't
//   visually bleed into each other. Defaults to 0.004 (tight, suits small outer
//   ring segments). Core ring passes a larger gap (0.012) for breathing room.
export function describeArc(
  cx: number,
  cy: number,
  innerRadius: number,
  outerRadius: number,
  startAngle: number,
  endAngle: number,
  gap = 0.004
): string {
  const start = startAngle + gap
  const end   = endAngle - gap

  const innerStart = polarToCartesian(cx, cy, innerRadius, start)
  const innerEnd   = polarToCartesian(cx, cy, innerRadius, end)
  const outerStart = polarToCartesian(cx, cy, outerRadius, start)
  const outerEnd   = polarToCartesian(cx, cy, outerRadius, end)

  const largeArc = end - start > Math.PI ? 1 : 0

  if (innerRadius === 0) {
    // Pie slice (no inner hole) — just a triangle/wedge to centre
    return [
      `M ${cx} ${cy}`,
      `L ${outerStart.x} ${outerStart.y}`,
      `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
      'Z',
    ].join(' ')
  }

  return [
    `M ${innerStart.x} ${innerStart.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArc} 1 ${innerEnd.x} ${innerEnd.y}`,
    `L ${outerEnd.x} ${outerEnd.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArc} 0 ${outerStart.x} ${outerStart.y}`,
    'Z',
  ].join(' ')
}

// arcLabelPath
// ─────────────────────────────────────────────────────────────────────────────
// PURPOSE
//   Returns the SVG path 'd' for a circular arc at the midline radius of a
//   ring segment. Used as the geometry path for SVG <textPath> so label text
//   flows along the curve of the segment.
//
// DESIGN CONSTRAINTS
//   - For segments in the top half of the wheel (midAngle ≤ 90° or ≥ 270°)
//     the arc runs clockwise (sweep=1) so text reads left-to-right.
//   - For segments in the bottom half (90° < midAngle < 270°) the arc runs
//     counter-clockwise (sweep=0) so text still reads left-to-right from the
//     reader's perspective rather than upside-down.
//   - startOffset="50%" with textAnchor="middle" centres the label on the arc.
export function arcLabelPath(
  cx: number,
  cy: number,
  innerRadius: number,
  outerRadius: number,
  startAngle: number,
  endAngle: number
): string {
  // Label sits at 60% of ring depth — slightly outer of centre for readability
  const r        = innerRadius + (outerRadius - innerRadius) * 0.60
  const midAngle = (startAngle + endAngle) / 2
  const rawDeg   = (midAngle * 180) / Math.PI

  // Bottom half: draw the arc reversed so text is not upside-down
  const flip = rawDeg > 90 && rawDeg < 270

  const from = flip ? endAngle   : startAngle
  const to   = flip ? startAngle : endAngle

  const p1 = polarToCartesian(cx, cy, r, from)
  const p2 = polarToCartesian(cx, cy, r, to)

  const span      = Math.abs(endAngle - startAngle)
  const largeArc  = span > Math.PI ? 1 : 0
  const sweep     = flip ? 0 : 1

  return `M ${p1.x} ${p1.y} A ${r} ${r} 0 ${largeArc} ${sweep} ${p2.x} ${p2.y}`
}

// buildWheelLayout
// ─────────────────────────────────────────────────────────────────────────────
// PURPOSE
//   Computes angular spans for each core sector, sized proportionally to how
//   many mid-ring children each core emotion has.
export interface SectorLayout {
  coreKey: string
  startAngle: number
  endAngle: number
  midCount: number
}

export function buildWheelLayout(
  coreKeys: string[],
  midCountByCoreKey: Record<string, number>
): SectorLayout[] {
  const total = coreKeys.reduce((sum, k) => sum + (midCountByCoreKey[k] ?? 1), 0)
  let angle = 0
  return coreKeys.map((key) => {
    const count = midCountByCoreKey[key] ?? 1
    const span  = (count / total) * TWO_PI
    const layout: SectorLayout = {
      coreKey: key,
      startAngle: angle,
      endAngle: angle + span,
      midCount: count,
    }
    angle += span
    return layout
  })
}
