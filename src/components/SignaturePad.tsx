import { useRef, useState } from 'react'

const CANVAS_WIDTH = 1200
const CANVAS_HEIGHT = 320
const INK_COLOR = '#1a1a1a'
const CROP_PADDING = 18

type Point = { x: number; y: number }
type SignatureMode = 'draw' | 'type'

function croppedPng(canvas: HTMLCanvasElement): string {
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('Your browser could not read the signature canvas.')

  const { data } = context.getImageData(0, 0, canvas.width, canvas.height)
  let left = canvas.width
  let top = canvas.height
  let right = 0
  let bottom = 0

  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      if (data[(y * canvas.width + x) * 4 + 3] === 0) continue
      left = Math.min(left, x)
      top = Math.min(top, y)
      right = Math.max(right, x)
      bottom = Math.max(bottom, y)
    }
  }

  if (right < left || bottom < top) return ''

  const sourceX = Math.max(0, left - CROP_PADDING)
  const sourceY = Math.max(0, top - CROP_PADDING)
  const sourceRight = Math.min(canvas.width, right + CROP_PADDING + 1)
  const sourceBottom = Math.min(canvas.height, bottom + CROP_PADDING + 1)
  const output = document.createElement('canvas')
  output.width = sourceRight - sourceX
  output.height = sourceBottom - sourceY
  const outputContext = output.getContext('2d')
  if (!outputContext) throw new Error('Your browser could not export the signature.')
  outputContext.drawImage(
    canvas,
    sourceX,
    sourceY,
    output.width,
    output.height,
    0,
    0,
    output.width,
    output.height,
  )
  return output.toDataURL('image/png')
}

function pointFromEvent(event: React.PointerEvent<HTMLCanvasElement>): Point {
  const rect = event.currentTarget.getBoundingClientRect()
  return {
    x: ((event.clientX - rect.left) / rect.width) * CANVAS_WIDTH,
    y: ((event.clientY - rect.top) / rect.height) * CANVAS_HEIGHT,
  }
}

interface SignaturePadProps {
  label: string
  onChange: (dataUrl: string) => void
  onError: (message: string) => void
}

export function SignaturePad({ label, onChange, onError }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const previousPoint = useRef<Point | null>(null)
  const snapshots = useRef<ImageData[]>([])
  const typedVersion = useRef(0)
  const [mode, setMode] = useState<SignatureMode>('draw')
  const [thickness, setThickness] = useState(10)
  const [undoCount, setUndoCount] = useState(0)
  const [typedText, setTypedText] = useState('')

  const clearCanvas = () => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d', { willReadFrequently: true })
    if (!canvas || !context) return
    context.clearRect(0, 0, canvas.width, canvas.height)
    snapshots.current = []
    setUndoCount(0)
    onChange('')
  }

  const publishCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    try {
      onChange(croppedPng(canvas))
      onError('')
    } catch (cause) {
      onError(cause instanceof Error ? cause.message : 'Could not prepare the signature.')
    }
  }

  const beginStroke = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (event.button !== 0 && event.pointerType === 'mouse') return
    const canvas = event.currentTarget
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) return

    event.preventDefault()
    canvas.setPointerCapture(event.pointerId)
    snapshots.current.push(context.getImageData(0, 0, canvas.width, canvas.height))
    setUndoCount(snapshots.current.length)
    previousPoint.current = pointFromEvent(event)
    context.beginPath()
    context.arc(
      previousPoint.current.x,
      previousPoint.current.y,
      thickness / 2,
      0,
      Math.PI * 2,
    )
    context.fillStyle = INK_COLOR
    context.fill()
  }

  const continueStroke = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = event.currentTarget
    const context = canvas.getContext('2d', { willReadFrequently: true })
    const previous = previousPoint.current
    if (!context || !previous || !canvas.hasPointerCapture(event.pointerId)) return

    event.preventDefault()
    const current = pointFromEvent(event)
    const midpoint = {
      x: (previous.x + current.x) / 2,
      y: (previous.y + current.y) / 2,
    }
    context.beginPath()
    context.moveTo(previous.x, previous.y)
    context.quadraticCurveTo(previous.x, previous.y, midpoint.x, midpoint.y)
    context.strokeStyle = INK_COLOR
    context.lineWidth = thickness
    context.lineCap = 'round'
    context.lineJoin = 'round'
    context.stroke()
    previousPoint.current = current
  }

  const finishStroke = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    previousPoint.current = null
    publishCanvas()
  }

  const undo = () => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d', { willReadFrequently: true })
    const snapshot = snapshots.current.pop()
    if (!canvas || !context || !snapshot) return
    context.putImageData(snapshot, 0, 0)
    setUndoCount(snapshots.current.length)
    publishCanvas()
  }

  const updateTypedSignature = async (text: string) => {
    setTypedText(text)
    const version = typedVersion.current + 1
    typedVersion.current = version
    if (!text.trim()) {
      onChange('')
      return
    }

    try {
      await document.fonts.load('150px Caveat')
      if (typedVersion.current !== version) return
      const output = document.createElement('canvas')
      const context = output.getContext('2d', { willReadFrequently: true })
      if (!context) throw new Error('Your browser could not prepare typed text.')
      context.font = '150px Caveat'
      const textWidth = Math.ceil(context.measureText(text).width)
      output.width = Math.max(textWidth + CROP_PADDING * 2, 1)
      output.height = 220
      const outputContext = output.getContext('2d', { willReadFrequently: true })
      if (!outputContext) throw new Error('Your browser could not prepare typed text.')
      outputContext.font = '150px Caveat'
      outputContext.fillStyle = INK_COLOR
      outputContext.textBaseline = 'middle'
      outputContext.fillText(text, CROP_PADDING, output.height / 2)
      onChange(croppedPng(output))
      onError('')
    } catch (cause) {
      onError(cause instanceof Error ? cause.message : 'Could not render the signature.')
    }
  }

  const switchMode = (nextMode: SignatureMode) => {
    if (nextMode === mode) return
    setMode(nextMode)
    clearCanvas()
    if (nextMode === 'draw') {
      typedVersion.current += 1
      setTypedText('')
    } else if (typedText) {
      void updateTypedSignature(typedText)
    }
  }

  return (
    <fieldset className="signature-control">
      <legend className="control-label">{label}</legend>
      <div className="signature-tabs" role="tablist" aria-label="signature input mode">
        <button
          className={`toggle-choice${mode === 'draw' ? ' is-selected' : ''}`}
          type="button"
          role="tab"
          aria-selected={mode === 'draw'}
          onClick={() => switchMode('draw')}
        >
          draw
        </button>
        <button
          className={`toggle-choice${mode === 'type' ? ' is-selected' : ''}`}
          type="button"
          role="tab"
          aria-selected={mode === 'type'}
          onClick={() => switchMode('type')}
        >
          type it
        </button>
      </div>
      {mode === 'draw' ? (
        <>
          <canvas
            ref={canvasRef}
            className="signature-canvas"
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            aria-label="draw your signature"
            onPointerDown={beginStroke}
            onPointerMove={continueStroke}
            onPointerUp={finishStroke}
            onPointerCancel={finishStroke}
          />
          <div className="signature-tools">
            <label className="signature-thickness">
              thickness
              <input
                type="range"
                min="3"
                max="24"
                value={thickness}
                onChange={(event) => setThickness(Number(event.currentTarget.value))}
              />
            </label>
            <button className="bevel-button" type="button" disabled={!undoCount} onClick={undo}>
              undo
            </button>
            <button className="bevel-button" type="button" onClick={clearCanvas}>
              clear
            </button>
          </div>
        </>
      ) : (
        <label className="editor-control signature-type-control">
          <span className="control-label">signature text</span>
          <input
            type="text"
            value={typedText}
            maxLength={45}
            onChange={(event) => void updateTypedSignature(event.currentTarget.value)}
          />
        </label>
      )}
    </fieldset>
  )
}
