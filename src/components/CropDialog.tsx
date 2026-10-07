import { useState } from 'react'
import Cropper, { type Area } from 'react-easy-crop'

interface CropDialogProps {
  image: string
  aspect: number
  onCancel: () => void
  onApply: (crop: Area) => void
}

export function CropDialog({ image, aspect, onCancel, onApply }: CropDialogProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedArea, setCroppedArea] = useState<Area | null>(null)

  return (
    <div className="crop-overlay" role="presentation">
      <section
        className="crop-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="crop-title"
      >
        <h2 id="crop-title">crop your photo</h2>
        <div className="crop-stage">
          <Cropper
            image={image}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={(_, pixels) => setCroppedArea(pixels)}
          />
        </div>
        <label className="zoom-control">
          zoom
          <input
            type="range"
            min="1"
            max="3"
            step="0.01"
            value={zoom}
            onChange={(event) => setZoom(Number(event.currentTarget.value))}
          />
        </label>
        <div className="crop-actions">
          <button className="bevel-button" type="button" onClick={onCancel}>
            cancel
          </button>
          <button
            className="bevel-button"
            type="button"
            disabled={!croppedArea}
            onClick={() => croppedArea && onApply(croppedArea)}
          >
            use photo
          </button>
        </div>
      </section>
    </div>
  )
}
