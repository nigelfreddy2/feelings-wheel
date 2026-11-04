// FeelingsWheel/FeelingsWheel.tsx — interactive SVG feelings wheel, hand-drawn style
// PURPOSE
//   Renders the three-ring feelings wheel as an interactive SVG with a hand-drawn
//   aesthetic. Each sector is filled with a roughjs sketchy path. Labels follow
//   the arc curve of their segment (core ring) or radiate outward like spokes
//   (mid and spec rings, where arc-following text is too narrow to fit without overlap).
//
// DESIGN CONSTRAINTS
//   - Arc label paths in <defs> are used for the core ring only.
//   - Mid and spec ring labels use radialLabelTransform: the text baseline runs along
//     the spoke so it always reads inward→outward regardless of wheel position.
//   - Labels are suppressed entirely when the segment arc is narrower than the text —
//     the hover tooltip always carries the name so no information is lost.
//   - Roughjs fills the core and mid rings with a sketchy texture; spec ring uses
//     plain SVG paths (roughjs cannot reliably fill segments this narrow).
//   - Gap constants: core=0.012, mid=0.008, spec=0.001 — spec uses a hair-line gap
//     so the outer ring reads as visually continuous.
//   - Tooltips are rendered as a positioned HTML div inside the wheel wrapper,
//     following mouse position. They show the emotion name + truncated definition.
//   - Level prop controls which rings are shown.
//   - All arc math lives in wheelMath.ts.
import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import rough from 'roughjs'
import type { Emotion, Level } from '../../types'
import { describeArc, arcLabelPath, buildWheelLayout } from './wheelMath'

interface Props {
  emotions: Emotion[]
  level: Level
  onEmotionSelect: (emotion: Emotion, intensity: number) => void
  onEmotionHover: (emotion: Emotion | null) => void
}

// ── Geometry constants ───────────────────────────────────────────────────────
// viewBox is 800×800; wheel fills it edge to edge.
const CX = 400
const CY = 400
const R_CORE_IN  = 0
const R_CORE_OUT = 145
const R_MID_IN   = 145
const R_MID_OUT  = 265
const R_SPEC_IN  = 265
const R_SPEC_OUT = 390

// ── Arc gap constants per ring ───────────────────────────────────────────────
// Core segments are wide, so a larger gap gives visual breathing room.
// Spec segments are very narrow — a hair-line gap (0.001 rad ≈ 0.39px at R=390)
// keeps the ring visually complete while still showing distinct segment boundaries.
const GAP_CORE = 0.012
const GAP_MID  = 0.008
const GAP_SPEC = 0.001

// ── Font sizes ───────────────────────────────────────────────────────────────
const FONT_CORE = 18
const FONT_MID  = 13
const FONT_SPEC = 8

// ── Roughjs sketch options ───────────────────────────────────────────────────
const ROUGH_OPTS_BASE = { roughness: 1.2, bowing: 0.8, fillStyle: 'solid' as const, strokeWidth: 1.2 }

// ── Colour helpers ───────────────────────────────────────────────────────────
function lighten(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = Math.min(255, (num >> 16) + amount)
  const g = Math.min(255, ((num >> 8) & 0xff) + amount)
  const b = Math.min(255, (num & 0xff) + amount)
  return `rgb(${r},${g},${b})`
}

// truncateDefinition
// ─────────────────────────────────────────────────────────────────────────────
// PURPOSE
//   Clips a definition string to at most maxWords words, appending '…' if cut.
//   Used so tooltips stay compact without wrapping awkwardly.
function truncateDefinition(text: string, maxWords = 12): string {
  const words = text.trim().split(/\s+/)
  if (words.length <= maxWords) return text
  return words.slice(0, maxWords).join(' ') + '…'
}

// spokeLabelFitsArc
// ─────────────────────────────────────────────────────────────────────────────
// PURPOSE
//   Returns true when the arc segment is wide enough (tangentially) to display
//   a label rendered in spoke orientation (text baseline runs along the radius).
//
// DESIGN CONSTRAINTS
//   - In spoke orientation the RADIAL extent = text length; what spills into
//     neighbouring segments is the TANGENTIAL extent, which equals the font height.
//   - We therefore compare fontSize (+ safety margin) against the available
//     tangential arc width at the given radius: arcSpan × radius.
//   - A 5 % margin is used — just enough breathing room to avoid touching the
//     adjacent segment boundary. Segments that are genuinely too narrow (arc
//     width below 1× font size) are still correctly suppressed.
//   - Also checks that the label text length fits within the ring depth (radial
//     space) so very long labels do not spill outside the ring boundary.
function spokeLabelFitsArc(
  text: string,
  fontSize: number,
  arcSpanRad: number,
  radius: number,
  gap: number,
  ringDepth: number
): boolean {
  const effectiveSpan = arcSpanRad - gap * 2
  if (effectiveSpan <= 0) return false
  const arcWidth      = effectiveSpan * radius                // tangential pixels
  const radialNeeded  = text.length * fontSize * 0.60        // radial pixels needed
  return (fontSize * 1.05 <= arcWidth) && (radialNeeded <= ringDepth * 0.92)
}

// ────────────────────────────────────────────────────────────────────────────

// ZOOM_FACTOR: how much the viewBox crops when a sector is selected.
// 2.6 fills the view with the mid + spec rings of the selected sector while
// keeping the core ring partially visible for context.
const ZOOM_FACTOR = 2.6
const ZOOM_VB_SIZE = 800 / ZOOM_FACTOR // ≈ 307px of SVG space shown

// computeZoomViewBox
// ─────────────────────────────────────────────────────────────────────────────
// PURPOSE
//   Returns the SVG viewBox string to zoom into a core sector.
//   Centres the viewBox on the mid-ring centroid of the sector, shifted
//   inward from the edge so the core labels remain visible at the top.
function computeZoomViewBox(startAngle: number, endAngle: number): string {
  const midAngle = (startAngle + endAngle) / 2
  // Aim viewBox centre at the outer-mid-ring radius (R=310 from wheel centre)
  const targetR  = (R_MID_IN + R_MID_OUT) / 2 + 80
  const tx = CX + targetR * Math.sin(midAngle)
  const ty = CY - targetR * Math.cos(midAngle)
  // Blend between wheel centre and sector centroid — keeps the core ring in view
  const cx = CX + (tx - CX) * 0.55
  const cy = CY + (ty - CY) * 0.55
  const half = ZOOM_VB_SIZE / 2
  return `${(cx - half).toFixed(1)} ${(cy - half).toFixed(1)} ${ZOOM_VB_SIZE.toFixed(1)} ${ZOOM_VB_SIZE.toFixed(1)}`
}

export default function FeelingsWheel({ emotions, level, onEmotionSelect, onEmotionHover }: Props) {
  const svgRef  = useRef<SVGSVGElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [selectedCoreKey, setSelectedCoreKey] = useState<string | null>(null)
  const [selectedMidKey,  setSelectedMidKey]  = useState<string | null>(null)
  const [pendingEmotion,  setPendingEmotion]  = useState<Emotion | null>(null)
  const [intensity,       setIntensity]       = useState(5)

  // ── Tooltip state ─────────────────────────────────────────────────────────
  // tooltipEmotion: the emotion currently hovered (null = hidden)
  // tooltipPos: pixel position of tooltip relative to the wrapper div
  const [tooltipEmotion, setTooltipEmotion] = useState<Emotion | null>(null)
  const [tooltipPos,     setTooltipPos]     = useState({ x: 0, y: 0 })

  const hoverStartRef = useRef<Record<string, number>>({})

  const coreEmotions = emotions.filter((e) => e.ring === 'core')
  const midEmotions  = emotions.filter((e) => e.ring === 'mid')
  const specEmotions = emotions.filter((e) => e.ring === 'specific')

  // midCountByCoreKey: how many mid-ring children each core emotion has.
  // Cores with no mid children (e.g. shame, guilt, love — data pending) get a
  // minimum of 4 so their sector takes a proportional slice of the wheel rather
  // than collapsing to 1/total of the circle.
  const MIN_MID_SLOTS = 4
  const midCountByCoreKey = Object.fromEntries(
    coreEmotions.map((c) => [
      c.key,
      Math.max(midEmotions.filter((m) => m.parentKey === c.key).length, MIN_MID_SLOTS),
    ])
  )
  const sectors = buildWheelLayout(
    coreEmotions.map((e) => e.key),
    midCountByCoreKey
  )

  // ── Roughjs sketch layer ─────────────────────────────────────────────────
  // Roughjs draws the core and mid rings with a hand-drawn pencil texture.
  // The spec (outer) ring is too narrow for roughjs solid fill to render
  // reliably — it produces empty or half-filled shapes at that scale. Spec
  // segments are drawn as plain SVG <path> elements in the same group instead.
  const sketchGroupRef = useRef<SVGGElement>(null)

  const drawSketchy = useCallback(() => {
    const g = sketchGroupRef.current
    if (!g || !svgRef.current) return
    while (g.firstChild) g.removeChild(g.firstChild)

    const rc = rough.svg(svgRef.current)

    sectors.forEach((sector) => {
      const coreEmotion = coreEmotions.find((e) => e.key === sector.coreKey)
      if (!coreEmotion) return

      // Core segment — roughjs fill, wider gap for breathing room between sectors
      const corePath = describeArc(CX, CY, R_CORE_IN, R_CORE_OUT, sector.startAngle, sector.endAngle, GAP_CORE)
      const coreNode = rc.path(corePath, {
        ...ROUGH_OPTS_BASE,
        fill: coreEmotion.sectorColour,
        stroke: '#ffffff',
        strokeWidth: 2,
      })
      coreNode.setAttribute('data-sketch', 'core')
      coreNode.setAttribute('data-key', coreEmotion.key)
      coreNode.style.pointerEvents = 'none'
      g.appendChild(coreNode)

      if (level === 'child') return

      const mids     = midEmotions.filter((m) => m.parentKey === sector.coreKey)
      // Use MIN_MID_SLOTS as the divisor when there are fewer real mids — keeps
      // midSpan consistent with the hit-path layer above.
      const midSlots = Math.max(mids.length, MIN_MID_SLOTS)
      const midSpan  = (sector.endAngle - sector.startAngle) / midSlots

      // Draw mid ring fill for each real mid child
      mids.forEach((mid, idx) => {
        const midStart = sector.startAngle + idx * midSpan
        const midEnd   = midStart + midSpan
        const midPath  = describeArc(CX, CY, R_MID_IN, R_MID_OUT, midStart, midEnd, GAP_MID)
        const midNode  = rc.path(midPath, {
          ...ROUGH_OPTS_BASE,
          fill: lighten(mid.sectorColour, 30),
          stroke: '#ffffff',
          strokeWidth: 1.5,
        })
        midNode.setAttribute('data-sketch', 'mid')
        midNode.setAttribute('data-key', mid.key)
        midNode.style.pointerEvents = 'none'
        g.appendChild(midNode)

        if (level !== 'advanced') return

        // Draw spec (outer) ring fill for all mids, always.
        // If a mid has no spec children, fill its entire outer-ring arc as one segment.
        const specs     = specEmotions.filter((s) => s.parentKey === mid.key)
        const specCount = specs.length > 0 ? specs.length : 1
        const specSpan  = midSpan / specCount

        if (specs.length === 0) {
          // Single outer segment spanning the whole mid arc
          const specPath = describeArc(CX, CY, R_SPEC_IN, R_SPEC_OUT, midStart, midStart + midSpan, GAP_SPEC)
          const specNode = document.createElementNS('http://www.w3.org/2000/svg', 'path')
          specNode.setAttribute('d', specPath)
          specNode.setAttribute('fill', lighten(mid.sectorColour, 38))
          specNode.setAttribute('stroke', '#fff')
          specNode.setAttribute('stroke-width', '1.2')
          specNode.setAttribute('data-sketch', 'spec-empty')
          specNode.setAttribute('data-key', mid.key)
          specNode.style.pointerEvents = 'none'
          g.appendChild(specNode)
        } else {
          specs.forEach((spec, sIdx) => {
            const specStart = midStart + sIdx * specSpan
            const specEnd   = specStart + specSpan
            // Spec ring: plain SVG path — roughjs cannot reliably fill segments this narrow
            const specPath = describeArc(CX, CY, R_SPEC_IN, R_SPEC_OUT, specStart, specEnd, GAP_SPEC)
            const specNode = document.createElementNS('http://www.w3.org/2000/svg', 'path')
            specNode.setAttribute('d', specPath)
            specNode.setAttribute('fill', lighten(spec.sectorColour, 38))
            specNode.setAttribute('stroke', '#fff')
            specNode.setAttribute('stroke-width', '1.2')
            specNode.setAttribute('data-sketch', 'spec')
            specNode.setAttribute('data-key', spec.key)
            specNode.style.pointerEvents = 'none'
            g.appendChild(specNode)
          })
        }
      })

      // Cores with no mid children (shame/guilt/love): fill the outer ring arc
      // as a single segment using the core emotion's colour so the ring stays complete.
      if (level === 'advanced' && mids.length === 0) {
        const specPath = describeArc(CX, CY, R_SPEC_IN, R_SPEC_OUT, sector.startAngle, sector.endAngle, GAP_SPEC)
        const specNode = document.createElementNS('http://www.w3.org/2000/svg', 'path')
        specNode.setAttribute('d', specPath)
        specNode.setAttribute('fill', lighten(coreEmotion.sectorColour, 38))
        specNode.setAttribute('stroke', '#ffffff')
        specNode.setAttribute('stroke-width', '1')
        specNode.setAttribute('data-sketch', 'spec-core-empty')
        specNode.setAttribute('data-key', coreEmotion.key)
        specNode.style.pointerEvents = 'none'
        g.appendChild(specNode)

        // Also fill the mid ring for the placeholder slots
        for (let i = 0; i < MIN_MID_SLOTS; i++) {
          const mStart = sector.startAngle + i * midSpan
          const mPath  = describeArc(CX, CY, R_MID_IN, R_MID_OUT, mStart, mStart + midSpan, GAP_MID)
          const mNode  = rc.path(mPath, {
            ...ROUGH_OPTS_BASE,
            fill: lighten(coreEmotion.sectorColour, 30),
            stroke: '#ffffff',
            strokeWidth: 1.5,
          })
          mNode.setAttribute('data-sketch', 'mid-placeholder')
          mNode.setAttribute('data-key', coreEmotion.key)
          mNode.style.pointerEvents = 'none'
          g.appendChild(mNode)
        }
      }
    })
  }, [sectors, coreEmotions, midEmotions, specEmotions, level])

  useEffect(() => { drawSketchy() }, [drawSketchy])

  // ── Interaction handlers ─────────────────────────────────────────────────
  function openIntensity(emotion: Emotion) {
    if (level === 'child') { onEmotionSelect(emotion, 5); return }
    setIntensity(5)
    setPendingEmotion(emotion)
    onEmotionHover(emotion)
  }

  function confirmSelection() {
    if (!pendingEmotion) return
    onEmotionSelect(pendingEmotion, intensity)
    setPendingEmotion(null)
  }

  function cancelPending() {
    setPendingEmotion(null)
    onEmotionHover(null)
  }

  // handleCoreClick: first click zooms into the sector; second click on the
  // same core (i.e. toggle) zooms back out. The intensity overlay is not
  // opened on the zoom-in click — the user can still select the core emotion
  // directly from any ring after zooming in.
  function handleCoreClick(emotion: Emotion) {
    if (selectedCoreKey === emotion.key) {
      // Second click on same core — zoom out, open intensity
      setSelectedCoreKey(null)
      setSelectedMidKey(null)
      openIntensity(emotion)
    } else {
      // First click — zoom in, no intensity overlay yet
      setSelectedCoreKey(emotion.key)
      setSelectedMidKey(null)
    }
  }

  function handleMidClick(emotion: Emotion) {
    setSelectedMidKey((prev) => (prev === emotion.key ? null : emotion.key))
    openIntensity(emotion)
  }

  function handleSpecClick(emotion: Emotion) { openIntensity(emotion) }

  // handleMouseEnter: fires on segment hover — updates external hover state and
  // shows the tooltip. Position is set in handleSvgMouseMove.
  function handleMouseEnter(emotion: Emotion) {
    hoverStartRef.current[emotion.key] = Date.now()
    onEmotionHover(emotion)
    setTooltipEmotion(emotion)
  }

  function handleMouseLeave() {
    onEmotionHover(null)
    setTooltipEmotion(null)
  }

  // handleSvgMouseMove: tracks mouse position relative to the wrapper div so
  // the tooltip can follow the cursor without needing to know SVG coordinates.
  function handleSvgMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    if (!wrapRef.current) return
    const rect = wrapRef.current.getBoundingClientRect()
    setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
  }

  // ── Build arc label paths for <defs> (core ring only) ───────────────────
  // Mid and spec rings use radial transforms — arc-following text overflows
  // when segments are narrow. Core segments are always wide enough for arcs.
  const labelPaths: { id: string; d: string }[] = []

  sectors.forEach((sector) => {
    labelPaths.push({
      id: `lp-core-${sector.coreKey}`,
      d: arcLabelPath(CX, CY, R_CORE_IN, R_CORE_OUT, sector.startAngle, sector.endAngle),
    })
  })

  // ── radialLabelTransform ─────────────────────────────────────────────────
  // PURPOSE
  //   Returns an SVG transform string placing text at polar coordinate (A, r)
  //   on the wheel, rotated so the text baseline runs along the radius (spoke).
  //
  // DESIGN CONSTRAINTS
  //   Our angle convention: 0 = 12-o'clock, clockwise positive (same as
  //   polarToCartesian). Cartesian: x = cx + r·sin(A), y = cy - r·cos(A).
  //   We then rotate the text by A (in degrees) so it aligns with the spoke.
  //   Bottom-half spokes (A in π–2π) get an extra 180° so text reads from
  //   inner→outer rather than outer→inner.
  function radialLabelTransform(midAngleRad: number, radius: number): string {
    // Position the text at the midpoint of the spec segment on the wheel
    const px = CX + radius * Math.sin(midAngleRad)
    const py = CY - radius * Math.cos(midAngleRad)
    // Rotation angle: text baseline runs along the spoke (radius).
    // rotate(aDeg - 90) for top/right half: 12 o'clock→vertical, 3 o'clock→horizontal.
    // rotate(aDeg + 90) for bottom/left half: avoids upside-down text past 6 o'clock.
    const aDeg      = midAngleRad * 180 / Math.PI
    const bottomHalf = midAngleRad > Math.PI
    const rotateDeg = bottomHalf ? aDeg + 90 : aDeg - 90
    return `translate(${px.toFixed(2)},${py.toFixed(2)}) rotate(${rotateDeg.toFixed(2)})`
  }

  // ── Zoom viewBox ─────────────────────────────────────────────────────────
  // Animates the SVG viewBox between the full-wheel view and a cropped sector
  // view using requestAnimationFrame. CSS transitions cannot interpolate the
  // viewBox string attribute, so we track the four numbers as state and lerp
  // them each frame over ZOOM_DURATION ms.
  const ZOOM_DURATION = 200 // ms

  const TARGET_VB_FULL   = useMemo(() => [0, 0, 800, 800] as [number,number,number,number], [])
  const targetVbForSector = useCallback((coreKey: string | null): [number,number,number,number] => {
    if (!coreKey) return TARGET_VB_FULL
    const sector = sectors.find((s) => s.coreKey === coreKey)
    if (!sector) return TARGET_VB_FULL
    const vbStr = computeZoomViewBox(sector.startAngle, sector.endAngle)
    const [x, y, w, h] = vbStr.split(' ').map(Number)
    return [x, y, w, h]
  }, [sectors, TARGET_VB_FULL])

  const [vb, setVb] = useState<[number,number,number,number]>([0, 0, 800, 800])
  const animRef      = useRef<number | null>(null)
  const vbRef        = useRef<[number,number,number,number]>([0, 0, 800, 800])

  useEffect(() => {
    const target = targetVbForSector(selectedCoreKey)
    const start  = vbRef.current
    const t0     = performance.now()
    if (animRef.current !== null) cancelAnimationFrame(animRef.current)

    function lerp(a: number, b: number, t: number) { return a + (b - a) * t }
    function easeInOut(t: number) { return t < 0.5 ? 2*t*t : -1+(4-2*t)*t }

    function frame(now: number) {
      const elapsed = now - t0
      const rawT    = Math.min(elapsed / ZOOM_DURATION, 1)
      const t       = easeInOut(rawT)
      const next: [number,number,number,number] = [
        lerp(start[0], target[0], t),
        lerp(start[1], target[1], t),
        lerp(start[2], target[2], t),
        lerp(start[3], target[3], t),
      ]
      vbRef.current = next
      setVb(next)
      if (rawT < 1) animRef.current = requestAnimationFrame(frame)
    }
    animRef.current = requestAnimationFrame(frame)
    return () => { if (animRef.current !== null) cancelAnimationFrame(animRef.current) }
  }, [selectedCoreKey, targetVbForSector])

  const currentViewBox = `${vb[0].toFixed(1)} ${vb[1].toFixed(1)} ${vb[2].toFixed(1)} ${vb[3].toFixed(1)}`

  const zoomedCore = selectedCoreKey
    ? coreEmotions.find((e) => e.key === selectedCoreKey) ?? null
    : null

  // ────────────────────────────────────────────────────────────────────────
  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      {/* Intensity overlay */}
      {pendingEmotion && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(255,255,255,0.92)', zIndex: 10, borderRadius: 12,
        }}>
          <div style={{ width: '100%', maxWidth: 320, padding: '28px 24px', background: '#fff', borderRadius: 14, boxShadow: '0 6px 24px rgba(0,0,0,0.12)', textAlign: 'center' }}>
            <div style={{ display: 'inline-block', width: 14, height: 14, borderRadius: '50%', background: pendingEmotion.sectorColour, marginRight: 8, verticalAlign: 'middle' }} />
            <strong style={{ fontSize: 20, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{pendingEmotion.label}</strong>
            <p style={{ margin: '16px 0 6px', fontSize: 14, color: '#57606a' }}>How intense is this feeling right now?</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#57606a', marginBottom: 4, padding: '0 2px' }}>
              <span>Mild</span><span>Moderate</span><span>Intense</span>
            </div>
            <input
              type="range" min={1} max={10} step={1} value={intensity}
              onChange={(e) => setIntensity(Number(e.target.value))}
              style={{ width: '100%', accentColor: pendingEmotion.sectorColour, cursor: 'pointer' }}
              aria-label="Intensity slider 1 to 10"
            />
            <div style={{ fontSize: 28, fontWeight: 700, margin: '8px 0 20px', color: pendingEmotion.sectorColour }}>
              {intensity} <span style={{ fontSize: 14, fontWeight: 400, color: '#57606a' }}>/ 10</span>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={confirmSelection} style={{ flex: 1, padding: '12px', background: '#1f2328', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                Select this feeling
              </button>
              <button onClick={cancelPending} style={{ padding: '12px 14px', background: 'none', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, color: '#57606a', cursor: 'pointer' }}>
                Back
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Hover tooltip ──────────────────────────────────────────────────── */}
      {/* Follows the mouse cursor; shows emotion name + truncated definition. */}
      {/* zIndex 20 keeps it above the intensity overlay backdrop.             */}
      {tooltipEmotion && !pendingEmotion && (
        <div
          style={{
            position: 'absolute',
            left: tooltipPos.x + 14,
            top: tooltipPos.y - 10,
            transform: 'translateY(-50%)',
            pointerEvents: 'none',
            zIndex: 20,
            background: 'rgba(255,255,255,0.97)',
            border: '1px solid #e5e7eb',
            borderRadius: 10,
            boxShadow: '0 4px 18px rgba(45,45,45,0.13)',
            padding: '8px 12px',
            maxWidth: 210,
            minWidth: 120,
          }}
        >
          {/* Colour pip + emotion name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span style={{
              display: 'inline-block',
              width: 10, height: 10,
              borderRadius: '50%',
              background: tooltipEmotion.sectorColour,
              flexShrink: 0,
            }} />
            <strong style={{ fontSize: 13, color: '#1f2328', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {tooltipEmotion.label}
            </strong>
          </div>
          {/* Brief definition — capped at 12 words */}
          {tooltipEmotion.definition && (
            <p style={{ fontSize: 11, color: '#57606a', margin: 0, lineHeight: 1.5 }}>
              {truncateDefinition(tooltipEmotion.definition, 12)}
            </p>
          )}
        </div>
      )}

      {/* Zoom-out button — visible when a sector is selected */}
      {selectedCoreKey && !pendingEmotion && (
        <button
          onClick={() => { setSelectedCoreKey(null); setSelectedMidKey(null) }}
          style={{
            position: 'absolute', top: 10, left: 10, zIndex: 15,
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 12px', background: '#fff',
            border: `2px solid ${zoomedCore?.sectorColour ?? '#e5e7eb'}`,
            borderRadius: 20, cursor: 'pointer', fontSize: 13,
            fontFamily: "'Caveat', cursive", fontWeight: 600,
            color: '#1f2328', boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
          }}
          aria-label="Zoom out to full wheel"
        >
          ← All emotions
        </button>
      )}

      <svg
        ref={svgRef}
        viewBox={currentViewBox}
        style={{
          width: '100%', display: 'block', margin: '0 auto',
          fontFamily: "'Caveat', cursive",
        }}
        aria-label="Feelings Wheel"
        role="img"
        onMouseMove={handleSvgMouseMove}
      >
        {/* Arc label paths — invisible geometry used only by <textPath> for core/mid */}
        <defs>
          {labelPaths.map(({ id, d }) => (
            <path key={id} id={id} d={d} fill="none" stroke="none" />
          ))}
        </defs>

        {/* Sketchy fill layer — drawn by roughjs, pointer-events off */}
        <g ref={sketchGroupRef} />

        {/* Transparent hit-test paths — invisible but clickable, drawn on top */}
        {sectors.map((sector) => {
          const coreEmotion    = coreEmotions.find((e) => e.key === sector.coreKey)!
          const isCoreSelected = selectedCoreKey === sector.coreKey
          const anySelected    = selectedCoreKey !== null
          const isFaded        = anySelected && !isCoreSelected

          const corePath = describeArc(CX, CY, R_CORE_IN, R_CORE_OUT, sector.startAngle, sector.endAngle, GAP_CORE)
          const mids     = midEmotions.filter((m) => m.parentKey === sector.coreKey)
          // midSpan: divide the core sector equally among actual mid children.
          // If there are no mid children (shame/guilt/love), use MIN_MID_SLOTS
          // virtual slots so the arc geometry still works correctly.
          const midSlots = Math.max(mids.length, MIN_MID_SLOTS)
          const midSpan  = (sector.endAngle - sector.startAngle) / midSlots
          // Spec ring is always shown in advanced mode — user can hover/tooltip any
          // segment without needing to drill into a specific mid first.
          const showSpec = level === 'advanced'

          return (
            <g key={sector.coreKey}>
              {/* Faded overlay when another sector is selected */}
              {isFaded && (
                <path d={corePath} fill="rgba(255,255,255,0.45)" style={{ pointerEvents: 'none' }} />
              )}
              {/* Core hit area */}
              <path
                d={corePath}
                fill="transparent"
                stroke="none"
                className={`wheel-segment${isCoreSelected ? ' selected' : ''}`}
                onClick={() => handleCoreClick(coreEmotion)}
                onMouseEnter={() => handleMouseEnter(coreEmotion)}
                onMouseLeave={handleMouseLeave}
                role="button"
                aria-label={coreEmotion.label}
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleCoreClick(coreEmotion)}
              />
              {/* Core label — arcs along the segment midline */}
              <text
                fontSize={FONT_CORE}
                fontWeight="700"
                fill="#1f2328"
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >
                <textPath href={`#lp-core-${sector.coreKey}`} startOffset="50%" textAnchor="middle">
                  {coreEmotion.label}
                </textPath>
              </text>

              {/* Mid ring */}
              {level !== 'child' && mids.map((mid, idx) => {
                const midStart    = sector.startAngle + idx * midSpan
                const midEnd      = midStart + midSpan
                const midPath     = describeArc(CX, CY, R_MID_IN, R_MID_OUT, midStart, midEnd, GAP_MID)
                const isMidSel    = selectedMidKey === mid.key
                const midFaded    = isFaded || (isCoreSelected && selectedMidKey !== null && !isMidSel)

                // specs: children of this mid. If none, treat the whole mid arc as
                // a single outer-ring segment so the outer ring stays complete.
                const specs     = specEmotions.filter((s) => s.parentKey === mid.key)
                const specCount = specs.length > 0 ? specs.length : 1
                const specSpan  = midSpan / specCount

                return (
                  <g key={mid.key}>
                    {midFaded && <path d={midPath} fill="rgba(255,255,255,0.45)" style={{ pointerEvents: 'none' }} />}
                    <path
                      d={midPath}
                      fill="transparent"
                      stroke="none"
                      className={`wheel-segment${isMidSel ? ' selected' : ''}`}
                      onClick={() => handleMidClick(mid)}
                      onMouseEnter={() => handleMouseEnter(mid)}
                      onMouseLeave={handleMouseLeave}
                      role="button"
                      aria-label={mid.label}
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && handleMidClick(mid)}
                    />
                    {/* Mid label — radial spoke orientation.
                        Suppressed when the arc is too narrow to fit the text tangentially
                        without overlapping the adjacent segment. Tooltip always carries
                        the name regardless of whether the label is shown. */}
                    {(() => {
                      const midMidAng = midStart + midSpan / 2
                      const midLblR   = R_MID_IN + (R_MID_OUT - R_MID_IN) * 0.55
                      const midDepth  = R_MID_OUT - R_MID_IN
                      if (!spokeLabelFitsArc(mid.label, FONT_MID, midSpan, midLblR, GAP_MID, midDepth)) return null
                      return (
                        <text
                          transform={radialLabelTransform(midMidAng, midLblR)}
                          fontSize={FONT_MID}
                          fontWeight="600"
                          fill="#1f2328"
                          textAnchor="middle"
                          dominantBaseline="middle"
                          style={{ pointerEvents: 'none', userSelect: 'none' }}
                        >
                          {mid.label}
                        </text>
                      )
                    })()}

                    {/* Specific ring — always visible in advanced mode so users can
                        hover/tooltip any spec without needing to drill into a mid first.
                        When a mid has no spec children, its full arc becomes one segment
                        that selects the mid emotion itself on click.                    */}
                    {showSpec && (() => {
                      const specLblR    = R_SPEC_IN + (R_SPEC_OUT - R_SPEC_IN) * 0.55
                      const specDepth   = R_SPEC_OUT - R_SPEC_IN
                      if (specs.length === 0) {
                        // No spec children: render the mid's outer arc as one segment.
                        // The arc spans the full midSpan so the label check uses midSpan.
                        const emptyPath = describeArc(CX, CY, R_SPEC_IN, R_SPEC_OUT, midStart, midStart + midSpan, GAP_SPEC)
                        const emptyAng  = midStart + midSpan / 2
                        const showLbl   = spokeLabelFitsArc(mid.label, FONT_SPEC, midSpan, specLblR, GAP_SPEC, specDepth)
                        return (
                          <g key={`spec-empty-${mid.key}`}>
                            <path
                              d={emptyPath}
                              fill="transparent"
                              stroke="none"
                              className="wheel-segment"
                              onClick={() => openIntensity(mid)}
                              onMouseEnter={() => handleMouseEnter(mid)}
                              onMouseLeave={handleMouseLeave}
                              role="button"
                              aria-label={mid.label}
                              tabIndex={0}
                            />
                            {showLbl && (
                              <text
                                transform={radialLabelTransform(emptyAng, specLblR)}
                                fontSize={FONT_SPEC}
                                fill="#1f2328"
                                textAnchor="middle"
                                dominantBaseline="middle"
                                style={{ pointerEvents: 'none', userSelect: 'none' }}
                              >
                                {mid.label}
                              </text>
                            )}
                          </g>
                        )
                      }
                      return specs.map((spec, sIdx) => {
                        const specStart  = midStart + sIdx * specSpan
                        const specEnd    = specStart + specSpan
                        const specPath   = describeArc(CX, CY, R_SPEC_IN, R_SPEC_OUT, specStart, specEnd, GAP_SPEC)
                        const specMidAng = (specStart + specEnd) / 2
                        const specLblTfm = radialLabelTransform(specMidAng, specLblR)
                        // Only render the label if the arc has enough tangential width
                        // to show the text without spilling into the neighbouring segment.
                        const showLbl    = spokeLabelFitsArc(spec.label, FONT_SPEC, specSpan, specLblR, GAP_SPEC, specDepth)

                        return (
                          <g key={spec.key} className="ring-enter">
                            <path
                              d={specPath}
                              fill="transparent"
                              stroke="none"
                              className="wheel-segment"
                              onClick={() => handleSpecClick(spec)}
                              onMouseEnter={() => handleMouseEnter(spec)}
                              onMouseLeave={handleMouseLeave}
                              role="button"
                              aria-label={spec.label}
                              tabIndex={0}
                              onKeyDown={(e) => e.key === 'Enter' && handleSpecClick(spec)}
                            />
                            {/* Spec label — spoke orientation, suppressed if too narrow */}
                            {showLbl && (
                              <text
                                transform={specLblTfm}
                                fontSize={FONT_SPEC}
                                fill="#1f2328"
                                textAnchor="middle"
                                dominantBaseline="middle"
                                style={{ pointerEvents: 'none', userSelect: 'none' }}
                              >
                                {spec.label}
                              </text>
                            )}
                          </g>
                        )
                      })
                    })()}
                  </g>
                )
              })}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
