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
import { useState, useRef, useEffect, useCallback } from 'react'
import rough from 'roughjs'
import type { Emotion, Level } from '../../types'
import { describeArc, arcLabelPath, buildWheelLayout } from './wheelMath'

interface Props {
  emotions: Emotion[]
  level: Level
  size?: number   // rendered px size of the SVG — defaults to 1750
  // dimensionItemIds: ticked emotion detail bullet ids
  // freeText: { about, [dimKey]: otherText } — optional free-form entries per section
  onEmotionSelect: (
    emotion: Emotion,
    intensity: number,
    dimensionItemIds: string[],
    freeText: Record<string, string>
  ) => void
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
const FONT_CORE     = 18
const FONT_CORE_MIN = 10   // smallest acceptable core label font
const FONT_MID      = 13
const FONT_SPEC     = 8

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

// bestLabelForArc
// ─────────────────────────────────────────────────────────────────────────────
// PURPOSE
//   Returns the best label string that fits the arc, or null if nothing fits.
//   Tries: full label → first word of label → null.
//   This lets narrow segments show at least the first word rather than nothing.
function bestLabelForArc(
  text: string,
  fontSize: number,
  arcSpanRad: number,
  radius: number,
  gap: number,
  ringDepth: number
): string | null {
  if (spokeLabelFitsArc(text, fontSize, arcSpanRad, radius, gap, ringDepth)) return text
  const firstWord = text.split(' ')[0]
  if (firstWord !== text && spokeLabelFitsArc(firstWord, fontSize, arcSpanRad, radius, gap, ringDepth)) return firstWord
  return null
}

// fitLabelForArc
// ─────────────────────────────────────────────────────────────────────────────
// PURPOSE
//   Always returns a label and font size for the arc — never suppresses the label.
//   Tries the full label at the given fontSize, then scales the font down in 0.5px
//   steps to FONT_SPEC_MIN. If it still doesn't fit, tries just the first word
//   with the same scaling. Always returns at least the first word at FONT_SPEC_MIN.
const FONT_SPEC_MIN = 6
function fitLabelForArc(
  text: string,
  fontSize: number,
  arcSpanRad: number,
  radius: number,
  gap: number,
  ringDepth: number
): { text: string; fontSize: number } {
  // Try full label, stepping font down
  for (let f = fontSize; f >= FONT_SPEC_MIN; f -= 0.5) {
    if (spokeLabelFitsArc(text, f, arcSpanRad, radius, gap, ringDepth)) return { text, fontSize: f }
  }
  // Try first word only, stepping font down
  const firstWord = text.split(' ')[0]
  for (let f = fontSize; f >= FONT_SPEC_MIN; f -= 0.5) {
    if (spokeLabelFitsArc(firstWord, f, arcSpanRad, radius, gap, ringDepth)) return { text: firstWord, fontSize: f }
  }
  // Last resort: show first word at minimum size
  return { text: firstWord, fontSize: FONT_SPEC_MIN }
}

// ────────────────────────────────────────────────────────────────────────────

export default function FeelingsWheel({ emotions, level, size = 1750, onEmotionSelect, onEmotionHover }: Props) {
  const svgRef  = useRef<SVGSVGElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [selectedCoreKey, setSelectedCoreKey] = useState<string | null>(null)
  const [selectedMidKey,  setSelectedMidKey]  = useState<string | null>(null)
  const [pendingEmotion,  setPendingEmotion]  = useState<Emotion | null>(null)
  const [pendingPos,      setPendingPos]      = useState({ x: 0, y: 0 })
  const [intensity,       setIntensity]       = useState(5)
  // Dimension items the user ticks in the Emotion Regulation panel
  const [selectedDimItems, setSelectedDimItems] = useState<Set<string>>(new Set())
  // Which accordion sections are open — key = dimension string
  const [openSections, setOpenSections] = useState<Set<string>>(new Set())
  // Free-text per section: 'about' = top-level field, dim keys = "Other" inputs
  const [freeTexts,    setFreeTexts]    = useState<Record<string, string>>({})
  // Which side-panel is open: 'regulation' | null (placeholders added later)
  const [activePanel,  setActivePanel]  = useState<'regulation' | null>(null)

  // ── Tooltip state ─────────────────────────────────────────────────────────
  // tooltipEmotion: the emotion currently hovered (null = hidden)
  // tooltipPos: viewport-relative position (clientX/Y) so the tooltip tracks
  // correctly when the page is scrolled and the wheel overflows the viewport.
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
  function openIntensity(emotion: Emotion, clickX = 0, clickY = 0) {
    if (level === 'child') { onEmotionSelect(emotion, 5, [], {}); return }
    setIntensity(5)
    setSelectedDimItems(new Set())
    setOpenSections(new Set())
    setFreeTexts({})
    setActivePanel(null)
    setPendingEmotion(emotion)
    setPendingPos({ x: clickX, y: clickY })
    onEmotionHover(emotion)
  }

  function confirmSelection() {
    if (!pendingEmotion) return
    const trimmed = Object.fromEntries(
      Object.entries(freeTexts).filter(([, v]) => v.trim() !== '')
    )
    onEmotionSelect(pendingEmotion, intensity, Array.from(selectedDimItems), trimmed)
    setPendingEmotion(null)
    setSelectedDimItems(new Set())
    setOpenSections(new Set())
    setFreeTexts({})
    setActivePanel(null)
  }

  function cancelPending() {
    setPendingEmotion(null)
    setSelectedDimItems(new Set())
    setOpenSections(new Set())
    setFreeTexts({})
    setActivePanel(null)
    onEmotionHover(null)
  }

  function toggleDimItem(id: string) {
    setSelectedDimItems((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  function toggleSection(dim: string) {
    setOpenSections((prev) => {
      const next = new Set(prev)
      if (next.has(dim)) next.delete(dim); else next.add(dim)
      return next
    })
  }

  // handleCoreClick: every click opens the intensity overlay so the user can
  // select and save the feeling at whatever depth they choose.
  // selectedCoreKey drives the faded-sectors visual effect only.
  function handleCoreClick(emotion: Emotion, e: React.MouseEvent) {
    setSelectedCoreKey((prev) => (prev === emotion.key ? null : emotion.key))
    setSelectedMidKey(null)
    openIntensity(emotion, e.clientX, e.clientY)
  }

  function handleMidClick(emotion: Emotion, e: React.MouseEvent) {
    setSelectedMidKey((prev) => (prev === emotion.key ? null : emotion.key))
    openIntensity(emotion, e.clientX, e.clientY)
  }

  function handleSpecClick(emotion: Emotion, e: React.MouseEvent) { openIntensity(emotion, e.clientX, e.clientY) }

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

  // handleSvgMouseMove: tracks viewport-relative cursor position so the tooltip
  // stays pinned to the cursor even when the page is scrolled.
  function handleSvgMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    setTooltipPos({ x: e.clientX, y: e.clientY })
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

  // ────────────────────────────────────────────────────────────────────────
  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      {/* Intensity card — anchored near the click point, clamped inside viewport.
          onWheel stopPropagation prevents the page/wheel from scrolling when the
          user scrolls inside the card — the card scroll is self-contained. */}
      {pendingEmotion && (() => {
        const CARD_W   = 340
        const PAD      = 12
        const HEADER_H = 116  // matches the fixed sticky header height
        const PANEL_W  = 380  // width of the regulation side panel
        const vw       = window.innerWidth
        const vh       = window.innerHeight

        // Horizontal: offset from click, clamped so card (+ possible panel) never leaves screen.
        // If the regulation panel is open we need extra room to the right; prefer left side instead.
        const spaceRight = vw - pendingPos.x - 16
        const fitsRight  = spaceRight >= CARD_W + (activePanel === 'regulation' ? PANEL_W + 8 : 0) + PAD
        const left = fitsRight
          ? Math.min(pendingPos.x + 16, vw - CARD_W - PAD)
          : Math.max(pendingPos.x - CARD_W - 16, PAD)

        // Vertical: prefer just below the click, clamped so card stays on screen.
        const rawTop = pendingPos.y + 16
        const maxTop = vh - vh * 0.80 - PAD
        const top    = Math.min(Math.max(rawTop, HEADER_H + PAD), maxTop)

        // Dimension data definitions
        const DIM_SECTIONS: { key: string; label: string }[] = [
          { key: 'prompting_event',   label: 'What triggered it?' },
          { key: 'biological_change', label: 'How does your body feel?' },
          { key: 'expression_action', label: 'How are you acting?' },
          { key: 'aftereffect',       label: 'What happens after?' },
          { key: 'interpretation',    label: 'What are you telling yourself?' },
        ]
        const hasDbtData = DIM_SECTIONS.some(
          ({ key }) => pendingEmotion.dimensions.some((d) => d.dimension === key)
        )

        // Count total ticked items + non-empty "Other" fields across all sections
        const totalRegulationSelections = Array.from(selectedDimItems).length
          + DIM_SECTIONS.filter(({ key }) => (freeTexts[key] ?? '').trim() !== '').length

        const inputStyle: React.CSSProperties = {
          width: '100%', marginTop: 8,
          padding: '7px 10px',
          border: '1px solid #e5e7eb', borderRadius: 8,
          fontSize: 12, fontFamily: 'inherit',
          boxSizing: 'border-box', resize: 'none',
          color: '#1f2328',
        }

        // Shared pill button style factory
        const pillBtn = (active: boolean, disabled: boolean, colour: string): React.CSSProperties => ({
          flex: 1,
          padding: '8px 6px',
          fontSize: 11, fontWeight: 600,
          fontFamily: 'inherit',
          border: active ? `1.5px solid ${colour}` : '1.5px solid #e5e7eb',
          borderRadius: 20,
          background: active ? colour + '18' : disabled ? '#f7f8fa' : '#fff',
          color: disabled ? '#bbb' : active ? colour : '#57606a',
          cursor: disabled ? 'default' : 'pointer',
          textAlign: 'center' as const,
          lineHeight: 1.3,
          position: 'relative' as const,
        })

        return (
          <>
            {/* ── Main intensity card ─────────────────────────────────────────── */}
            <div
              style={{
                position: 'fixed', left, top, zIndex: 30,
                width: CARD_W, background: '#fff', borderRadius: 14,
                boxShadow: '0 6px 32px rgba(0,0,0,0.18)',
                maxHeight: '80vh', overflowY: 'auto',
                overscrollBehavior: 'contain',
              }}
              onWheel={(e) => e.stopPropagation()}
              onTouchMove={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div style={{ padding: '20px 20px 0', textAlign: 'center' }}>
                <div style={{ display: 'inline-block', width: 14, height: 14, borderRadius: '50%', background: pendingEmotion.sectorColour, marginRight: 8, verticalAlign: 'middle' }} />
                <strong style={{ fontSize: 20, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{pendingEmotion.label}</strong>
              </div>

              {/* Intensity slider */}
              <div style={{ padding: '16px 20px 0' }}>
                <p style={{ margin: '0 0 6px', fontSize: 13, color: '#57606a', textAlign: 'center' }}>How intense is this feeling right now?</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#57606a', marginBottom: 4 }}>
                  <span>Mild</span><span>Moderate</span><span>Intense</span>
                </div>
                <input
                  type="range" min={1} max={10} step={1} value={intensity}
                  onChange={(e) => setIntensity(Number(e.target.value))}
                  style={{ width: '100%', accentColor: pendingEmotion.sectorColour, cursor: 'pointer' }}
                  aria-label="Intensity slider 1 to 10"
                />
                <div style={{ fontSize: 26, fontWeight: 700, textAlign: 'center', margin: '6px 0 12px', color: pendingEmotion.sectorColour }}>
                  {intensity} <span style={{ fontSize: 13, fontWeight: 400, color: '#57606a' }}>/ 10</span>
                </div>
              </div>

              {/* ── "What is this about?" — always shown ────────────────────────── */}
              <div style={{ borderTop: '1px solid #f0f0f0', padding: '12px 20px' }}>
                <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 600, color: '#1f2328' }}>
                  What is this about? <span style={{ fontWeight: 400, color: '#57606a' }}>(optional)</span>
                </p>
                <textarea
                  rows={2}
                  placeholder="e.g. The argument this morning, feeling overlooked at work…"
                  value={freeTexts['about'] ?? ''}
                  onChange={(e) => setFreeTexts((prev) => ({ ...prev, about: e.target.value }))}
                  style={inputStyle}
                />
              </div>

              {/* ── No detail data — simple free-text for cause ─────────────────── */}
              {!hasDbtData && (
                <div style={{ borderTop: '1px solid #f0f0f0', padding: '12px 20px' }}>
                  <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 600, color: '#1f2328' }}>
                    What caused it? <span style={{ fontWeight: 400, color: '#57606a' }}>(optional)</span>
                  </p>
                  <textarea
                    rows={2}
                    placeholder="What happened, or what were you thinking about…"
                    value={freeTexts['cause'] ?? ''}
                    onChange={(e) => setFreeTexts((prev) => ({ ...prev, cause: e.target.value }))}
                    style={inputStyle}
                  />
                </div>
              )}

              {/* ── Tool button row ─────────────────────────────────────────────── */}
              {/* Emotion Regulation opens the accordion side panel.               */}
              {/* Paradigm Shift, Body Sensations, Patterns are coming soon.       */}
              <div style={{ borderTop: '1px solid #f0f0f0', padding: '12px 16px' }}>
                <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 600, color: '#57606a', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Tools
                </p>
                <div style={{ display: 'flex', gap: 6 }}>
                  {/* Emotion Regulation — active */}
                  <button
                    onClick={() => setActivePanel((p) => p === 'regulation' ? null : 'regulation')}
                    style={pillBtn(activePanel === 'regulation', false, pendingEmotion.sectorColour)}
                  >
                    {totalRegulationSelections > 0 && (
                      <span style={{
                        position: 'absolute', top: -5, right: -5,
                        width: 16, height: 16, borderRadius: '50%',
                        background: pendingEmotion.sectorColour,
                        color: '#fff', fontSize: 9, fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>{totalRegulationSelections}</span>
                    )}
                    Emotion<br />Regulation
                  </button>

                  {/* Paradigm Shift — coming soon */}
                  <button disabled style={pillBtn(false, true, '#999')}>
                    Paradigm<br />Shift
                    <br /><span style={{ fontSize: 9, color: '#bbb' }}>coming soon</span>
                  </button>

                  {/* Body Sensations — coming soon */}
                  <button disabled style={pillBtn(false, true, '#999')}>
                    Body<br />Sensations
                    <br /><span style={{ fontSize: 9, color: '#bbb' }}>coming soon</span>
                  </button>

                  {/* Patterns — coming soon */}
                  <button disabled style={pillBtn(false, true, '#999')}>
                    Patterns
                    <br /><span style={{ fontSize: 9, color: '#bbb' }}>coming soon</span>
                  </button>
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 10, padding: '14px 20px 20px', borderTop: '1px solid #f0f0f0' }}>
                <button onClick={confirmSelection} style={{ flex: 1, padding: '12px', background: '#1f2328', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Select this feeling
                </button>
                <button onClick={cancelPending} style={{ padding: '12px 14px', background: 'none', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, color: '#57606a', cursor: 'pointer', fontFamily: 'inherit' }}>
                  Back
                </button>
              </div>
            </div>

            {/* ── Emotion Regulation side panel ───────────────────────────────── */}
            {/* Slides in to the right of the main card (or left if near right edge). */}
            {activePanel === 'regulation' && (
              <div
                style={{
                  position: 'fixed',
                  left: left + CARD_W + 8,
                  top,
                  zIndex: 30,
                  width: PANEL_W,
                  background: '#fff',
                  borderRadius: 14,
                  boxShadow: '0 6px 32px rgba(0,0,0,0.18)',
                  maxHeight: '80vh',
                  overflowY: 'auto',
                  overscrollBehavior: 'contain',
                }}
                onWheel={(e) => e.stopPropagation()}
                onTouchMove={(e) => e.stopPropagation()}
              >
                {/* Panel header */}
                <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#1f2328' }}>Emotion Regulation</p>
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: '#57606a' }}>What does {pendingEmotion.label.toLowerCase()} look like for you?</p>
                  </div>
                  <button
                    onClick={() => setActivePanel(null)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#aaa', lineHeight: 1, padding: 4 }}
                    aria-label="Close panel"
                  >✕</button>
                </div>

                {/* Accordion sections */}
                {hasDbtData
                  ? DIM_SECTIONS.map(({ key: dimKey, label: dimLabel }) => {
                    const items = pendingEmotion.dimensions.filter((d) => d.dimension === dimKey)
                    if (items.length === 0) return null
                    const isOpen = openSections.has(dimKey)
                    const selectedCount = items.filter((d) => selectedDimItems.has(d.id)).length
                    const hasOther = (freeTexts[dimKey] ?? '').trim() !== ''
                    return (
                      <div key={dimKey} style={{ borderBottom: '1px solid #f0f0f0' }}>
                        <button
                          onClick={() => toggleSection(dimKey)}
                          style={{
                            width: '100%', padding: '11px 20px',
                            background: 'none', border: 'none', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            fontFamily: 'inherit',
                          }}
                        >
                          <span style={{ fontSize: 13, fontWeight: 600, color: '#1f2328', textAlign: 'left' }}>
                            {dimLabel}
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {(selectedCount > 0 || hasOther) && (
                              <span style={{
                                fontSize: 11, fontWeight: 700,
                                background: pendingEmotion.sectorColour,
                                color: '#fff', borderRadius: 10, padding: '1px 7px',
                              }}>{selectedCount + (hasOther ? 1 : 0)}</span>
                            )}
                            <span style={{ fontSize: 12, color: '#57606a' }}>{isOpen ? '▲' : '▼'}</span>
                          </span>
                        </button>
                        {isOpen && (
                          <div style={{ padding: '4px 20px 14px' }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                              {items.map((d) => {
                                const ticked = selectedDimItems.has(d.id)
                                return (
                                  <button
                                    key={d.id}
                                    onClick={() => toggleDimItem(d.id)}
                                    style={{
                                      padding: '5px 10px',
                                      background: ticked ? pendingEmotion.sectorColour + '22' : '#f7f8fa',
                                      border: ticked
                                        ? `1.5px solid ${pendingEmotion.sectorColour}`
                                        : '1.5px solid #e5e7eb',
                                      borderRadius: 16,
                                      fontSize: 12, cursor: 'pointer',
                                      color: '#1f2328', textAlign: 'left',
                                      fontFamily: 'inherit', lineHeight: 1.4,
                                    }}
                                  >
                                    {d.content}
                                  </button>
                                )
                              })}
                            </div>
                            <input
                              type="text"
                              placeholder="Other…"
                              value={freeTexts[dimKey] ?? ''}
                              onChange={(e) => setFreeTexts((prev) => ({ ...prev, [dimKey]: e.target.value }))}
                              style={{ ...inputStyle, marginTop: 0 }}
                            />
                          </div>
                        )}
                      </div>
                    )
                  })
                  : (
                    <div style={{ padding: '20px', color: '#57606a', fontSize: 13 }}>
                      No detailed regulation data is available for this emotion yet.
                    </div>
                  )
                }
              </div>
            )}
          </>
        )
      })()}

      {/* ── Hover tooltip ──────────────────────────────────────────────────── */}
      {/* Follows the mouse cursor; shows emotion name + truncated definition. */}
      {/* zIndex 20 keeps it above the intensity overlay backdrop.             */}
      {tooltipEmotion && !pendingEmotion && (
        <div
          style={{
            position: 'fixed',
            left: tooltipPos.x + 14,
            top: tooltipPos.y - 10,
            transform: 'translateY(-50%)',
            pointerEvents: 'none',
            zIndex: 9999,
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

      <svg
        ref={svgRef}
        viewBox="0 0 800 800"
        width={size}
        height={size}
        style={{ display: 'block', fontFamily: "'Caveat', cursive" }}
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
                onClick={(e) => handleCoreClick(coreEmotion, e)}
                onMouseEnter={() => handleMouseEnter(coreEmotion)}
                onMouseLeave={handleMouseLeave}
                role="button"
                aria-label={coreEmotion.label}
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleCoreClick(coreEmotion, e as unknown as React.MouseEvent)}
              />
              {/* Core label — arcs along the segment midline.
                  For narrow sectors the arc is shorter than the label at FONT_CORE.
                  We compute the available arc length and scale the font down so the
                  text always fits, with FONT_CORE_MIN as the floor. */}
              {(() => {
                const r        = R_CORE_IN + (R_CORE_OUT - R_CORE_IN) * 0.60
                const arcLen   = r * (sector.endAngle - sector.startAngle)
                // Approximate char width at fontSize f for bold Caveat ≈ f * 0.62
                const charW    = (f: number) => f * 0.62
                const labelLen = (f: number) => coreEmotion.label.length * charW(f)
                // Find the largest font that fits, stepping down from FONT_CORE
                let fs = FONT_CORE
                while (fs > FONT_CORE_MIN && labelLen(fs) > arcLen * 0.92) fs -= 0.5
                return (
                  <text
                    fontSize={fs}
                    fontWeight="700"
                    fill="#1f2328"
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    <textPath href={`#lp-core-${sector.coreKey}`} startOffset="50%" textAnchor="middle">
                      {coreEmotion.label}
                    </textPath>
                  </text>
                )
              })()}

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
                      onClick={(e) => handleMidClick(mid, e)}
                      onMouseEnter={() => handleMouseEnter(mid)}
                      onMouseLeave={handleMouseLeave}
                      role="button"
                      aria-label={mid.label}
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && handleMidClick(mid, e as unknown as React.MouseEvent)}
                    />
                    {/* Mid label — radial spoke orientation.
                        Suppressed when the arc is too narrow to fit the text tangentially
                        without overlapping the adjacent segment. Tooltip always carries
                        the name regardless of whether the label is shown. */}
                    {(() => {
                      const midMidAng  = midStart + midSpan / 2
                      const midLblR    = R_MID_IN + (R_MID_OUT - R_MID_IN) * 0.55
                      const midDepth   = R_MID_OUT - R_MID_IN
                      const midLblText = bestLabelForArc(mid.label, FONT_MID, midSpan, midLblR, GAP_MID, midDepth)
                      if (!midLblText) return null
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
                          {midLblText}
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
                        const emptyFit  = fitLabelForArc(mid.label, FONT_SPEC, midSpan, specLblR, GAP_SPEC, specDepth)
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
                            <text
                              transform={radialLabelTransform(emptyAng, specLblR)}
                              fontSize={emptyFit.fontSize}
                              fill="#1f2328"
                              textAnchor="middle"
                              dominantBaseline="middle"
                              style={{ pointerEvents: 'none', userSelect: 'none' }}
                            >
                              {emptyFit.text}
                            </text>
                          </g>
                        )
                      }
                      return specs.map((spec, sIdx) => {
                        const specStart  = midStart + sIdx * specSpan
                        const specEnd    = specStart + specSpan
                        const specPath   = describeArc(CX, CY, R_SPEC_IN, R_SPEC_OUT, specStart, specEnd, GAP_SPEC)
                        const specMidAng = (specStart + specEnd) / 2
                        const specLblTfm = radialLabelTransform(specMidAng, specLblR)
                        // fitLabelForArc: always returns a label + scaled font, never hides.
                        const specFit    = fitLabelForArc(spec.label, FONT_SPEC, specSpan, specLblR, GAP_SPEC, specDepth)

                        return (
                          <g key={spec.key} className="ring-enter">
                            <path
                              d={specPath}
                              fill="transparent"
                              stroke="none"
                              className="wheel-segment"
                              onClick={(e) => handleSpecClick(spec, e)}
                              onMouseEnter={() => handleMouseEnter(spec)}
                              onMouseLeave={handleMouseLeave}
                              role="button"
                              aria-label={spec.label}
                              tabIndex={0}
                              onKeyDown={(e) => e.key === 'Enter' && handleSpecClick(spec, e as unknown as React.MouseEvent)}
                            />
                            {/* Spec label — always shown, font scaled to fit the arc */}
                            <text
                              transform={specLblTfm}
                              fontSize={specFit.fontSize}
                              fill="#1f2328"
                              textAnchor="middle"
                              dominantBaseline="middle"
                              style={{ pointerEvents: 'none', userSelect: 'none' }}
                            >
                              {specFit.text}
                            </text>
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
