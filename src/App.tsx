import { useEffect, useMemo, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { zipSync } from 'fflate'
import type { Area } from 'react-easy-crop'
import { COFFEE_URL, CREATOR_HANDLE } from './config'
import { CardFace, type CardValues } from './components/CardFace'
import { CropDialog } from './components/CropDialog'
import { SignaturePad } from './components/SignaturePad'
import { getTemplate, templates } from './templates'
import { createBarcode } from './utils/barcode'
import { cropPhoto, processPhoto } from './utils/photo'
import type {
  CardTemplate,
  PhotoOption,
  TemplateFace,
  TemplateField,
  TemplateOption,
  VisibilityCondition,
} from './types'

type Screen = 'landing' | 'gallery' | 'editor'

const DISCLAIMER =
  'Made by a fan, not the rights holders. For cosplay & personal use only. Not a real ID. Your bouncer will probably notice.'

function defaultsFor(template: CardTemplate): CardValues {
  return Object.fromEntries(
    template.options.flatMap((option) =>
      'defaultValue' in option ? [[option.id, option.defaultValue]] : [],
    ),
  )
}

function getPhotoField(template: CardTemplate) {
  return template.front.fields.find((field) => field.type === 'photo')
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error(`Could not load card artwork: ${source}`))
    image.src = source
  })
}

function drawImageFit(
  context: CanvasRenderingContext2D,
  image: CanvasImageSource & { width: number; height: number },
  x: number,
  y: number,
  width: number,
  height: number,
  fit: TemplateField['imageFit'] = 'fill',
  align: TemplateField['imageAlign'] = 'center',
) {
  if (fit === 'fill') {
    context.drawImage(image, x, y, width, height)
    return
  }

  const scale = fit === 'cover'
    ? Math.max(width / image.width, height / image.height)
    : Math.min(width / image.width, height / image.height)
  const drawWidth = image.width * scale
  const drawHeight = image.height * scale
  const drawX = align === 'left'
    ? x
    : align === 'right'
      ? x + width - drawWidth
      : x + (width - drawWidth) / 2
  context.save()
  context.beginPath()
  context.rect(x, y, width, height)
  context.clip()
  context.drawImage(image, drawX, y + (height - drawHeight) / 2, drawWidth, drawHeight)
  context.restore()
}

function fieldValue(field: TemplateField, values: CardValues): string {
  const value = values[field.id] ?? field.defaultValue ?? ''
  if (field.dateFormat !== 'mm/dd/yyyy' || !value) {
    return `${field.valuePrefix ?? ''}${value}`
  }
  const [year, month, day] = value.split('-')
  const formatted = year && month && day ? `${month}/${day}/${year}` : value
  return `${field.valuePrefix ?? ''}${formatted}`
}

function matchesCondition(condition: VisibilityCondition, values: CardValues): boolean {
  const value = values[condition.field]
  return 'value' in condition ? value === condition.value : condition.values.includes(value ?? '')
}

async function renderFace(
  face: TemplateFace,
  template: CardTemplate,
  values: CardValues,
  photo: string | null,
  qrImage: string | null,
  previewWidth: number,
): Promise<Uint8Array> {
  const portrait = template.orientation === 'portrait'
  const widthMm = portrait ? template.sizeMm.height : template.sizeMm.width
  const heightMm = portrait ? template.sizeMm.width : template.sizeMm.height
  const canvas = document.createElement('canvas')
  canvas.width = Math.round((widthMm / 25.4) * 300)
  canvas.height = Math.round((heightMm / 25.4) * 300)
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Your browser could not prepare the card image.')

  const exportScale = canvas.width / previewWidth
  const background = await loadImage(face.backgroundImage)
  context.drawImage(background, 0, 0, canvas.width, canvas.height)

  for (const field of face.fields) {
    if (
      field.visibleWhen &&
      !matchesCondition(field.visibleWhen, values)
    ) continue
    if (field.type === 'photo' && field.hideIfPhotoMissing && !photo) continue

    const x = (field.x / 100) * canvas.width
    const y = (field.y / 100) * canvas.height
    const width = (field.width / 100) * canvas.width
    const height = (field.height / 100) * canvas.height
    const value = fieldValue(field, values)

    if (field.backgroundColor) {
      context.fillStyle = field.backgroundColor
      context.fillRect(x, y, width, height)
    }

    if (field.type === 'photo') {
      if (photo) {
        const image = await loadImage(photo)
        drawImageFit(context, image, x, y, width, height, 'cover')
        const filter = field.photoFilter
        const filterEnabled = filter && values[filter.valueId] === filter.enabledValue
        if (!filterEnabled || filter?.effect !== 'tva') {
          context.strokeStyle = '#666'
          context.lineWidth = Math.max(1, exportScale)
          context.strokeRect(x, y, width, height)
        }
      } else {
        context.fillStyle = '#e8e8e8'
        context.fillRect(x, y, width, height)
        context.fillStyle = '#777'
        context.font = `${Math.max(8, canvas.width * 0.03)}px sans-serif`
        context.textAlign = 'center'
        context.textBaseline = 'middle'
        context.fillText('photo', x + width / 2, y + height / 2)
        context.strokeStyle = '#666'
        context.lineWidth = Math.max(1, exportScale)
        context.strokeRect(x, y, width, height)
      }
      continue
    }

    if (field.type === 'barcode') {
      if (value) {
        const image = await loadImage(createBarcode(value))
        drawImageFit(context, image, x, y, width, height, 'contain')
      }
      continue
    }

    if (field.type === 'qr') {
      if (qrImage) {
        const image = await loadImage(qrImage)
        drawImageFit(context, image, x, y, width, height, field.imageFit, field.imageAlign)
      }
      continue
    }

    if (field.type === 'image') {
      if (value) {
        const image = await loadImage(value)
        drawImageFit(context, image, x, y, width, height, field.imageFit, field.imageAlign)
      }
      continue
    }

    if (!value) continue
    context.save()
    context.beginPath()
    context.rect(x, y, width, height)
    context.clip()
    context.translate(x + width / 2, y + height / 2)
    if (field.rotation) context.rotate((field.rotation * Math.PI) / 180)
    const fontFamily = field.fontValue ? values[field.fontValue] : field.font ?? 'sans-serif'
    let fontSize = (field.size ?? 16) * exportScale
    context.font = `700 ${fontSize}px ${fontFamily}`
    if (
      field.textLayout === 'assistantToRegionalManager' &&
      value === 'Assistant to the Regional Manager'
    ) {
      const assistantLines = ['Assistant', 'to the', 'Regional Manager']
      while (
        field.autoFit &&
        fontSize > 7 * exportScale &&
        (Math.max(
          context.measureText(assistantLines[0]).width,
          context.measureText(assistantLines[2]).width,
        ) > width ||
          fontSize * 2.7 > height)
      ) {
        fontSize -= 0.5 * exportScale
        context.font = `700 ${fontSize}px ${fontFamily}`
      }
      context.fillStyle = field.color ?? '#000'
      context.textAlign = 'center'
      context.textBaseline = 'middle'
      context.fillText(assistantLines[0], 0, -fontSize * 0.9)
      context.font = `700 ${fontSize * 0.62}px ${fontFamily}`
      context.fillText(assistantLines[1], 0, 0)
      context.font = `700 ${fontSize}px ${fontFamily}`
      context.fillText(assistantLines[2], 0, fontSize * 0.9)
      context.restore()
      continue
    }
    if (field.autoFit) {
      while (
        fontSize > 7 * exportScale &&
        (context.measureText(value).width > width ||
          fontSize > height)
      ) {
        fontSize -= 0.5 * exportScale
        context.font = `700 ${fontSize}px ${fontFamily}`
      }
    }
    context.fillStyle = field.color ?? '#000'
    context.textAlign = field.alignment ?? 'center'
    context.textBaseline = 'middle'
    const textX = field.alignment === 'left'
      ? -width / 2
      : field.alignment === 'right'
        ? width / 2
        : 0
    if (field.writingMode) {
      context.rotate(Math.PI / 2)
      context.textAlign = 'center'
    }
    context.fillText(value, field.writingMode ? 0 : textX, 0)
    context.restore()
  }

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob || blob.size === 0) throw new Error('Could not create the card PNG.')
  return new Uint8Array(await blob.arrayBuffer())
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function PixelDecorations() {
  return (
    <div className="pixel-decorations" aria-hidden="true">
      <svg className="pixel-icon pixel-icon--sparkle" viewBox="0 0 32 32">
        <path d="M16 1 19 12 31 16 19 19 16 31 12 19 1 16 12 12z" fill="#1a1adb" />
      </svg>
      <svg className="pixel-icon pixel-icon--coffee" viewBox="0 0 32 32">
        <path d="M7 9h17v15H7zM24 12h4v8h-4M11 5v3m6-4v4m5-3v3" fill="none" stroke="#f08b36" strokeWidth="3" />
        <path d="M10 13h11v8H10z" fill="#ffd9ad" />
      </svg>
      <svg className="pixel-icon pixel-icon--warning" viewBox="0 0 32 32">
        <path d="M16 3 30 28H2z" fill="#e8b13c" stroke="#171717" strokeWidth="2" />
        <path d="M16 11v8m0 4v1" stroke="#171717" strokeWidth="3" />
      </svg>
      <svg className="pixel-icon pixel-icon--cd" viewBox="0 0 32 32">
        <circle cx="16" cy="16" r="13" fill="#d6d6e9" stroke="#1a1adb" strokeWidth="2" />
        <circle cx="16" cy="16" r="4" fill="#fafafa" stroke="#1a1adb" strokeWidth="2" />
        <path d="m7 8 6 5m12 8-5-3" stroke="#fff" strokeWidth="2" />
      </svg>
    </div>
  )
}

function Footer() {
  return <footer className="site-footer">{DISCLAIMER}</footer>
}

function ButtonIcon({ children }: { children: React.ReactNode }) {
  return <span className="button-icon" aria-hidden="true">{children}</span>
}

function Landing({ onBrowse }: { onBrowse: () => void }) {
  return (
    <main className="landing screen">
      <PixelDecorations />
      <div className="landing-content">
        <h1>create your own<br /> (custom id)</h1>
        <p className="creator-credit">made by {CREATOR_HANDLE}</p>
        <div className="landing-actions">
          <button className="bevel-button landing-button" type="button" onClick={onBrowse}>
            <ButtonIcon>▦</ButtonIcon> browse templates
          </button>
          <a
            className="bevel-button landing-button"
            href={COFFEE_URL}
            target="_blank"
            rel="noreferrer"
          >
            <ButtonIcon>☕</ButtonIcon> buy me a coffee
          </a>
          <p className="donation-note">consider donating!</p>
        </div>
      </div>
    </main>
  )
}

function Gallery({
  onBack,
  onSelect,
}: {
  onBack: () => void
  onSelect: (template: CardTemplate) => void
}) {
  const legacyThumbnails: Record<string, { front: string; back?: string }> = {
    'dunder-mifflin': {
      front: '/thumbnails/dundermifflin/dundermifflin_thumbnail_front.jpg',
      back: '/thumbnails/dundermifflin/dundermifflin_thumbnail_back.png',
    },
    oscorp: {
      front: '/thumbnails/oscorp/oscorp_thumbnail_front.jpg',
      back: '/thumbnails/oscorp/oscorp_thumbnail_back.png',
    },
    'loki-tva': {
      front: '/thumbnails/tva/tva_thumbnail_front.png',
      back: '/thumbnails/tva/tva_thumbnail_back.png',
    },
    'tyler-call-me-if-you-get-lost': {
      front: '/thumbnails/tylerthecreator/tyler_thumbnail_front.jpg',
      back: '/thumbnails/tylerthecreator/tyler_thumbnail_back.png',
    },
  }
  const thumbnailCandidates = (template: CardTemplate, side: 'front' | 'back') => {
    const names = ['webp', 'png', 'jpg'].map(
      (extension) => `${template.id}-${side}.${extension}`,
    )
    const candidates = [
      ...['/thumbnails', '/previews'].flatMap((directory) =>
        names.map((name) => `${directory}/${name}`),
      ),
    ]
    const legacy = legacyThumbnails[template.id]?.[side]
    if (legacy) candidates.push(legacy)
    if (side === 'front') candidates.push(template.front.backgroundImage)
    return [...new Set(candidates)]
  }

  return (
    <main className="screen gallery-screen">
      <button className="text-link" type="button" onClick={onBack}>← back</button>
      <h1 className="screen-title">templates</h1>
      <div className="template-grid">
        {templates.map((template) => (
          <button
            className="template-tile"
            key={template.id}
            type="button"
            onClick={() => onSelect(template)}
            aria-label={`open ${template.caption}`}
          >
            <span
              className={`template-preview template-preview--${template.orientation}`}
              style={{
                aspectRatio: template.orientation === 'portrait' ? '54 / 85.6' : '85.6 / 54',
              }}
            >
              <GalleryThumbnailImage
                className="template-thumbnail template-thumbnail--back"
                sources={thumbnailCandidates(template, 'back')}
                alt=""
              />
              <GalleryThumbnailImage
                className="template-thumbnail template-thumbnail--front"
                sources={thumbnailCandidates(template, 'front')}
                alt=""
              />
            </span>
            <span className="template-caption">{template.caption}</span>
          </button>
        ))}
      </div>
    </main>
  )
}

function GalleryThumbnailImage({
  sources,
  className,
  alt,
}: {
  sources: string[]
  className: string
  alt: string
}) {
  const [sourceIndex, setSourceIndex] = useState(0)
  const source = sources[sourceIndex]
  if (!source) return null

  return (
    <img
      className={className}
      src={source}
      alt={alt}
      loading="lazy"
      onError={() => setSourceIndex((index) => index + 1)}
    />
  )
}

function OptionControl({
  option,
  value,
  onChange,
  onPhotoSelect,
  onPhotoDrop,
  hasPhoto,
  photoInputRef,
  onSignatureChange,
  onSignatureError,
  onRandomize,
}: {
  option: TemplateOption
  value: string
  onChange: (value: string) => void
  onPhotoSelect: (file: File) => void
  onPhotoDrop: (file: File) => void
  hasPhoto: boolean
  photoInputRef?: React.Ref<HTMLInputElement>
  onSignatureChange: (value: string) => void
  onSignatureError: (message: string) => void
  onRandomize: () => void
}) {
  if (option.type === 'photo') {
    const handleFile = (file?: File) => {
      if (file?.type.startsWith('image/')) onPhotoSelect(file)
    }

    return (
      <label
        className="photo-upload"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault()
          const file = event.dataTransfer.files[0]
          if (file?.type.startsWith('image/')) onPhotoDrop(file)
        }}
      >
        <span className="control-label">{option.label}</span>
        <span className="upload-target">
          {hasPhoto ? 'photo added — click to replace' : 'click or drop a photo here'}
        </span>
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          onChange={(event) => handleFile(event.currentTarget.files?.[0])}
        />
      </label>
    )
  }

  if (option.type === 'toggle') {
    return (
      <fieldset className="editor-control toggle-control">
        <legend className="control-label">{option.label}</legend>
        <div className="toggle-options">
          {option.choices.map((choice) => (
            <button
              className={`toggle-choice${value === choice.value ? ' is-selected' : ''}`}
              type="button"
              key={choice.value}
              aria-pressed={value === choice.value}
              onClick={() => onChange(choice.value)}
            >
              {choice.label}
            </button>
          ))}
        </div>
      </fieldset>
    )
  }

  if (option.type === 'date') {
    return (
      <label className="editor-control">
        <span className="control-label">{option.label}</span>
        <input
          type="date"
          lang="en-US"
          value={value}
          onChange={(event) => onChange(event.currentTarget.value)}
        />
      </label>
    )
  }

  if (option.type === 'signature') {
    return (
      <SignaturePad
        label={option.label}
        onChange={onSignatureChange}
        onError={onSignatureError}
      />
    )
  }

  if (option.type === 'randomizeText') {
    return (
      <label className="editor-control">
        <span className="control-label">{option.label}</span>
        <span className="randomize-input">
          <input
            type="text"
            value={value}
            maxLength={option.maxLength}
            onChange={(event) => onChange(event.currentTarget.value)}
          />
          <button className="bevel-button" type="button" onClick={onRandomize}>
            randomize
          </button>
        </span>
      </label>
    )
  }

  if (option.type === 'select') {
    return (
      <label className="editor-control">
        <span className="control-label">{option.label}</span>
        <select value={value} onChange={(event) => onChange(event.currentTarget.value)}>
          {option.choices.map((choice) => <option key={choice}>{choice}</option>)}
        </select>
      </label>
    )
  }

  if (option.type === 'range') {
    return (
      <label className="editor-control range-control">
        <span className="range-control-heading">
          <span className="control-label">{option.label}</span>
          <output>{value}%</output>
        </span>
        <input
          type="range"
          min={option.min}
          max={option.max}
          step={option.step}
          value={value}
          onChange={(event) => onChange(event.currentTarget.value)}
        />
      </label>
    )
  }

  return (
    <label className="editor-control">
      <span className="control-label">{option.label}</span>
      <input
        type={option.inputType ?? 'text'}
        value={value}
        maxLength={option.maxLength}
        placeholder={option.placeholder}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
    </label>
  )
}

function Editor({ template, onBack }: { template: CardTemplate; onBack: () => void }) {
  const [values, setValues] = useState(() => defaultsFor(template))
  const [resetVersion, setResetVersion] = useState(0)
  const [croppedPhoto, setCroppedPhoto] = useState<string | null>(null)
  const [processedPhoto, setProcessedPhoto] = useState<{
    source: string
    settings: string
    dataUrl: string
  } | null>(null)
  const [pendingPhoto, setPendingPhoto] = useState<string | null>(null)
  const [qrResult, setQrResult] = useState<{ url: string; image: string } | null>(null)
  const [debug, setDebug] = useState(false)
  const [error, setError] = useState('')
  const [exporting, setExporting] = useState(false)
  const frontRef = useRef<HTMLDivElement>(null)
  const backRef = useRef<HTMLDivElement>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const photoField = getPhotoField(template)
  const photoFilter = photoField?.photoFilter
  const photoFilterEnabled = Boolean(
    photoFilter && values[photoFilter.valueId] === photoFilter.enabledValue,
  )
  const photoFilterIntensity = photoFilter?.intensityId
    ? Number(values[photoFilter.intensityId]) || 0
    : 100
  const photoFilterSettings = `${photoFilterEnabled ? photoFilter?.effect ?? 'on' : 'off'}:${photoFilterIntensity}`
  const photo =
    processedPhoto?.source === croppedPhoto &&
    processedPhoto.settings === photoFilterSettings
      ? processedPhoto.dataUrl
      : null
  const photoProcessing = Boolean(croppedPhoto && !photo)
  const hasBackMode = template.options.some((option) => option.id === 'backMode')
  const isCustomQr = hasBackMode
    ? values.backMode === 'qr'
    : template.back.fields.some((field) => field.type === 'qr')
  const qrImage =
    isCustomQr && qrResult?.url === values.qrUrl ? qrResult.image : null
  const photoOption = template.options.find(
    (option): option is PhotoOption => option.type === 'photo',
  )
  const requiresName = template.id === 'dunder-mifflin'
  const missingRequiredName = requiresName && !values.name?.trim()

  useEffect(() => {
    let active = true
    if (!isCustomQr || !values.qrUrl.trim()) return

    QRCode.toDataURL(values.qrUrl, { errorCorrectionLevel: 'M', margin: 1, width: 512 })
      .then((dataUrl) => {
        if (active) {
          setQrResult({ url: values.qrUrl, image: dataUrl })
          setError('')
        }
      })
      .catch((cause: unknown) => {
        if (active) {
          setQrResult(null)
          setError(cause instanceof Error ? cause.message : 'Could not create the QR code.')
        }
      })
    return () => { active = false }
  }, [isCustomQr, values.qrUrl])

  useEffect(() => {
    let active = true
    if (!croppedPhoto) return
    const filter = photoFilter && photoFilterEnabled
      ? { effect: photoFilter.effect, intensity: photoFilterIntensity }
      : undefined
    processPhoto(croppedPhoto, filter)
      .then((processedPhoto) => {
        if (active) {
          setProcessedPhoto({
            source: croppedPhoto,
            settings: photoFilterSettings,
            dataUrl: processedPhoto,
          })
          setError('')
        }
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(cause instanceof Error ? cause.message : 'Could not process the photo filter.')
        }
      })

    return () => { active = false }
  }, [croppedPhoto, photoFilter, photoFilterEnabled, photoFilterIntensity, photoFilterSettings])

  const updateValue = (id: string, value: string) => {
    if (id === 'employeeId' && !/^[\x20-\x7e]*$/.test(value)) {
      setError('Employee IDs must use printable characters for the Code 128 barcode.')
      return
    }
    setValues((current) => ({ ...current, [id]: value }))
    setError('')
  }

  const selectPhoto = (file: File) => {
    if (pendingPhoto) URL.revokeObjectURL(pendingPhoto)
    setPendingPhoto(URL.createObjectURL(file))
    setError('')
  }

  const cancelCrop = () => {
    if (pendingPhoto) URL.revokeObjectURL(pendingPhoto)
    setPendingPhoto(null)
  }

  const applyCrop = async (area: Area) => {
    if (!pendingPhoto) return
    try {
      const cropped = await cropPhoto(pendingPhoto, area)
      setCroppedPhoto(cropped)
      setProcessedPhoto(null)
      URL.revokeObjectURL(pendingPhoto)
      setPendingPhoto(null)
      setError('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not crop the photo.')
    }
  }

  const reset = () => {
    if (!window.confirm('reset the card and remove your photo?')) return
    setValues(defaultsFor(template))
    setResetVersion((version) => version + 1)
    setCroppedPhoto(null)
    setProcessedPhoto(null)
    setError('')
  }

  const downloadCard = async () => {
    if (exporting) return
    setExporting(true)
    setError('')
    try {
      if (photoProcessing) {
        throw new Error('The photo filter is still being applied. Please try again.')
      }
      await document.fonts.ready
      await document.fonts.load('150px Caveat')
      await document.fonts.load('150px "Archivo Black"')
      if (isCustomQr && values.qrUrl.trim() && !qrImage) {
        throw new Error('The QR code is still being prepared. Please try again.')
      }
      const frontWidth = frontRef.current?.getBoundingClientRect().width
      const backWidth = backRef.current?.getBoundingClientRect().width
      if (!frontWidth || !backWidth) {
        throw new Error('The card previews are not ready to export.')
      }
      const frontPng = await renderFace(
        template.front,
        template,
        values,
        photo,
        qrImage,
        frontWidth,
      )
      const backPng = await renderFace(
        template.back,
        template,
        values,
        photo,
        qrImage,
        backWidth,
      )
      const archive = zipSync({
        [`cardverse-${template.id}-front.png`]: frontPng,
        [`cardverse-${template.id}-back.png`]: backPng,
      }, { level: 0 })
      downloadBlob(
        new Blob([archive], { type: 'application/zip' }),
        `cardverse-${template.id}.zip`,
      )
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not create the card ZIP.')
    } finally {
      setExporting(false)
    }
  }

  const qrControl = template.options.find(
    (option) => option.type === 'text' && option.id === 'qrUrl',
  )

  return (
    <main className="screen editor-screen">
      <button className="text-link" type="button" onClick={onBack}>← templates</button>
      <h1 className="screen-title">{template.title}</h1>
      <div className="face-preview-row">
        <section className="face-preview">
          <h2>front</h2>
          <CardFace
            faceRef={frontRef}
            template={template}
            face={template.front}
            values={values}
            photo={photo}
            qrImage={qrImage}
            debug={debug}
            label="front"
            onPhotoPlaceholderClick={
              template.id === 'dunder-mifflin'
                ? () => photoInputRef.current?.click()
                : undefined
            }
            onPhotoPlaceholderDrop={
              template.id === 'dunder-mifflin' ? selectPhoto : undefined
            }
          />
        </section>
        <section className="face-preview">
          <h2>back</h2>
          <CardFace
            faceRef={backRef}
            template={template}
            face={template.back}
            values={values}
            photo={photo}
            qrImage={qrImage}
            debug={debug}
            label="back"
          />
        </section>
      </div>

      {import.meta.env.DEV && (
        <label className="debug-control">
          <input
            type="checkbox"
            checked={debug}
            onChange={(event) => setDebug(event.currentTarget.checked)}
          />
          outline field boxes
        </label>
      )}

      <section className="editor-controls" aria-label="card controls">
        <div className="control-grid">
          {template.options.map((option) => {
            if (
              'visibleWhen' in option &&
              option.visibleWhen &&
              !matchesCondition(option.visibleWhen, values)
            ) return null
            if (option.id === 'qrUrl' && !isCustomQr) return null
            if (option.id === 'phoneNumber' && values.backMode !== 'phone') return null
            return (
              <OptionControl
                key={option.type === 'signature' ? `${option.id}-${resetVersion}` : option.id}
                option={option}
                value={values[option.id] ?? ''}
                onChange={(value) => updateValue(option.id, value)}
                onPhotoSelect={selectPhoto}
                onPhotoDrop={selectPhoto}
                hasPhoto={Boolean(photo)}
                photoInputRef={option.type === 'photo' ? photoInputRef : undefined}
                onSignatureChange={(value) => updateValue(option.id, value)}
                onSignatureError={setError}
                onRandomize={() => {
                  const randomValue = new Uint32Array(1)
                  crypto.getRandomValues(randomValue)
                  updateValue(
                    option.id,
                    `${(option.type === 'randomizeText' ? option.prefix : undefined) ?? 'TTC'}${String(randomValue[0] % 10_000_000).padStart(7, '0')}`,
                  )
                }}
              />
            )
          })}
        </div>
        {error && <p className="editor-error" role="alert">{error}</p>}
        <div className="editor-actions">
          <button className="bevel-button" type="button" onClick={reset}>
            go back to default
          </button>
          <button
            className="bevel-button primary-button"
            type="button"
            onClick={() => void downloadCard()}
            disabled={exporting || photoProcessing || missingRequiredName}
          >
            {exporting
              ? 'preparing zip…'
              : photoProcessing
                ? 'processing photo…'
                : 'download both sides (.zip)'}
          </button>
        </div>
        {missingRequiredName && (
          <p className="privacy-note">add your name first</p>
        )}
        {photoOption && photoField && (
          <p className="privacy-note">your photo stays on this device.</p>
        )}
        {isCustomQr && qrControl && !values.qrUrl.trim() && (
          <p className="privacy-note">enter a URL to add a QR code to the back.</p>
        )}
      </section>

      {pendingPhoto && photoField && (
        <CropDialog
          image={pendingPhoto}
          aspect={
            template.id === 'dunder-mifflin'
              ? (photoField.width / photoField.height) *
                (template.orientation === 'portrait'
                  ? template.sizeMm.height / template.sizeMm.width
                  : template.sizeMm.width / template.sizeMm.height)
              : photoField.width / photoField.height
          }
          onCancel={cancelCrop}
          onApply={(area) => void applyCrop(area)}
        />
      )}
    </main>
  )
}

function App() {
  const [screen, setScreen] = useState<Screen>('landing')
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const selectedTemplate = useMemo(
    () => (selectedTemplateId ? getTemplate(selectedTemplateId) : undefined),
    [selectedTemplateId],
  )

  const openEditor = (template: CardTemplate) => {
    setSelectedTemplateId(template.id)
    setScreen('editor')
  }

  return (
    <div className="app-shell">
      {screen === 'landing' && <Landing onBrowse={() => setScreen('gallery')} />}
      {screen === 'gallery' && (
        <Gallery onBack={() => setScreen('landing')} onSelect={openEditor} />
      )}
      {screen === 'editor' && selectedTemplate && (
        <Editor template={selectedTemplate} onBack={() => setScreen('gallery')} />
      )}
      <Footer />
    </div>
  )
}

export default App
