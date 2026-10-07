import { useEffect, useMemo, useRef, useState } from 'react'
import { toPng } from 'html-to-image'
import QRCode from 'qrcode'
import type { Area } from 'react-easy-crop'
import { COFFEE_URL, CREATOR_HANDLE } from './config'
import { CardFace, type CardValues } from './components/CardFace'
import { CropDialog } from './components/CropDialog'
import { SignaturePad } from './components/SignaturePad'
import { getTemplate, templates } from './templates'
import type { CardTemplate, PhotoOption, TemplateOption } from './types'

type Screen = 'landing' | 'gallery' | 'editor'

const DISCLAIMER =
  'Fan-made project. Not affiliated with or endorsed by any rights holders. For cosplay, props and personal use only. Not a real ID.'

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

function createCroppedPhoto(imageUrl: string, crop: Area): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(crop.width)
      canvas.height = Math.round(crop.height)
      const context = canvas.getContext('2d')
      if (!context) {
        reject(new Error('Your browser could not prepare the cropped photo.'))
        return
      }
      context.drawImage(
        image,
        crop.x,
        crop.y,
        crop.width,
        crop.height,
        0,
        0,
        canvas.width,
        canvas.height,
      )
      resolve(canvas.toDataURL('image/png'))
    }
    image.onerror = () => reject(new Error('The selected photo could not be loaded.'))
    image.src = imageUrl
  })
}

async function waitForImages(element: HTMLElement): Promise<void> {
  const imageElements = Array.from(element.querySelectorAll('img'))
  await Promise.all(
    imageElements.map(async (image) => {
      await image.decode()
      if (!image.naturalWidth || !image.naturalHeight) {
        throw new Error(`Could not decode card image: ${image.currentSrc || image.src}`)
      }
    }),
  )

  const backgroundUrls = Array.from(
    getComputedStyle(element).backgroundImage.matchAll(/url\(["']?(.*?)["']?\)/g),
    (match) => match[1],
  )
  await Promise.all(
    backgroundUrls.map(async (url) => {
      if (!url) return
      const image = new Image()
      image.src = url
      await image.decode()
      if (!image.naturalWidth || !image.naturalHeight) {
        throw new Error(`Could not decode card background: ${url}`)
      }
    }),
  )
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
            <span className="template-preview">
              <CardFace
                template={template}
                face={template.front}
                values={defaultsFor(template)}
                photo={null}
                qrImage={null}
                debug={false}
                label="front"
              />
            </span>
            <span className="template-caption">{template.caption}</span>
          </button>
        ))}
      </div>
    </main>
  )
}

function OptionControl({
  option,
  value,
  onChange,
  onPhotoSelect,
  onPhotoDrop,
  hasPhoto,
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
  const [photo, setPhoto] = useState<string | null>(null)
  const [pendingPhoto, setPendingPhoto] = useState<string | null>(null)
  const [qrResult, setQrResult] = useState<{ url: string; image: string } | null>(null)
  const [debug, setDebug] = useState(false)
  const [error, setError] = useState('')
  const frontRef = useRef<HTMLDivElement>(null)
  const backRef = useRef<HTMLDivElement>(null)
  const photoField = getPhotoField(template)
  const isCustomQr = values.backMode === 'qr'
  const qrImage =
    isCustomQr && qrResult?.url === values.qrUrl ? qrResult.image : null
  const photoOption = template.options.find(
    (option): option is PhotoOption => option.type === 'photo',
  )

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

  const updateValue = (id: string, value: string) => {
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
      const cropped = await createCroppedPhoto(pendingPhoto, area)
      setPhoto(cropped)
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
    setPhoto(null)
    setError('')
  }

  const downloadFace = async (element: HTMLDivElement | null, side: 'front' | 'back') => {
    if (!element) return
    try {
      await document.fonts.ready
      await document.fonts.load('150px Caveat')
      if (!element) return
      await waitForImages(element)
      const bounds = element.getBoundingClientRect()
      const physicalWidthMm =
        template.orientation === 'portrait' ? template.sizeMm.height : template.sizeMm.width
      const outputWidth = Math.round((physicalWidthMm / 25.4) * 300)
      const dataUrl = await toPng(element, {
        cacheBust: true,
        pixelRatio: outputWidth / bounds.width,
      })
      const link = document.createElement('a')
      link.download = `cardverse-${template.id}-${side}.png`
      link.href = dataUrl
      link.click()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : `Could not export the ${side} PNG.`)
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
                onSignatureChange={(value) => updateValue(option.id, value)}
                onSignatureError={setError}
                onRandomize={() => {
                  const randomValue = new Uint32Array(1)
                  crypto.getRandomValues(randomValue)
                  updateValue(
                    option.id,
                    `TTC${String(randomValue[0] % 10_000_000).padStart(7, '0')}`,
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
            onClick={() => void Promise.all([
              downloadFace(frontRef.current, 'front'),
              downloadFace(backRef.current, 'back'),
            ])}
          >
            download png
          </button>
        </div>
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
          aspect={photoField.width / photoField.height}
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
