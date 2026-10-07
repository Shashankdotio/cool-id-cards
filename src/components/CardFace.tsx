import { useLayoutEffect, useRef, type CSSProperties, type Ref } from 'react'
import type { CardTemplate, TemplateFace, TemplateField } from '../types'

export type CardValues = Record<string, string>

interface CardFaceProps {
  template: CardTemplate
  face: TemplateFace
  values: CardValues
  photo: string | null
  qrImage: string | null
  debug: boolean
  faceRef?: Ref<HTMLDivElement>
  label: string
}

function fieldStyle(field: TemplateField, values: CardValues): CSSProperties {
  return {
    left: `${field.x}%`,
    top: `${field.y}%`,
    width: `${field.width}%`,
    height: `${field.height}%`,
    fontFamily: field.fontValue ? values[field.fontValue] : field.font,
    fontSize: field.size ? `${field.size}px` : undefined,
    color: field.color,
    backgroundColor: field.backgroundColor,
    textAlign: field.alignment,
    justifyContent:
      field.alignment === 'left'
        ? 'flex-start'
        : field.alignment === 'right'
          ? 'flex-end'
          : 'center',
    transform: field.rotation ? `rotate(${field.rotation}deg)` : undefined,
    writingMode: field.writingMode,
  }
}

function formattedValue(field: TemplateField, value: string): string {
  if (field.dateFormat !== 'mm/dd/yyyy' || !value) return value
  const [year, month, day] = value.split('-')
  return year && month && day ? `${month}/${day}/${year}` : value
}

function AutoFitText({
  field,
  value,
  style,
  fontFamily,
}: {
  field: TemplateField
  value: string
  style: CSSProperties
  fontFamily?: string
}) {
  const fieldRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const element = fieldRef.current
    if (!element || !field.autoFit || !field.size) return

    let fontSize = field.size
    element.style.fontSize = `${fontSize}px`
    while (
      fontSize > 7 &&
      (element.scrollWidth > element.clientWidth + 1 ||
        element.scrollHeight > element.clientHeight + 1)
    ) {
      fontSize -= 0.5
      element.style.fontSize = `${fontSize}px`
    }
  }, [field.autoFit, field.size, fontFamily, value])

  return (
    <div ref={fieldRef} className="card-field card-field--text" style={style}>
      {value}
    </div>
  )
}

export function CardFace({
  template,
  face,
  values,
  photo,
  qrImage,
  debug,
  faceRef,
  label,
}: CardFaceProps) {
  const portrait = template.orientation === 'portrait'

  return (
    <div
      ref={faceRef}
      className={`card-face ${portrait ? 'card-face--portrait' : 'card-face--landscape'}${debug ? ' card-face--debug' : ''}`}
      style={{ backgroundImage: `url("${face.backgroundImage}")` }}
      aria-label={`${template.title} ${label}`}
    >
      {face.fields.map((field) => {
        if (
          field.visibleWhen &&
          values[field.visibleWhen.field] !== field.visibleWhen.value
        ) {
          return null
        }

        const style = fieldStyle(field, values)
        const fieldValue = values[field.id] ?? field.defaultValue ?? ''
        const value = `${field.valuePrefix ?? ''}${formattedValue(field, fieldValue)}`

        if (field.type === 'photo') {
          if (field.hideIfPhotoMissing && !photo) return null

          const filter = field.photoFilter
          const filterEnabled = filter && values[filter.valueId] === filter.enabledValue
          const filterIntensity = filter?.intensityId
            ? Math.min(100, Math.max(0, Number(values[filter.intensityId]) || 0)) / 100
            : 1
          const photoStyle: CSSProperties & { '--photo-filter-intensity'?: number } = {
            ...style,
            ...(filterEnabled && filter?.effect === 'tva'
              ? { '--photo-filter-intensity': filterIntensity }
              : {}),
          }

          return (
            <div
              className={`card-field card-field--photo${filterEnabled ? ` card-field--${filter.effect}` : ''}`}
              key={field.id}
              style={photoStyle}
            >
              {photo ? (
                <img src={photo} alt="" />
              ) : (
                <span>photo</span>
              )}
            </div>
          )
        }

        if (field.type === 'qr') {
          return (
            <div className="card-field card-field--qr" key={field.id} style={style}>
              {qrImage && values.backMode === 'qr' ? (
                <img
                  src={qrImage}
                  alt="custom QR code"
                  style={{
                    objectFit: field.imageFit ?? 'contain',
                    objectPosition: `${field.imageAlign ?? 'center'} center`,
                  }}
                />
              ) : null}
            </div>
          )
        }

        if (field.type === 'image') {
          if (!value) return null
          return (
            <div className="card-field card-field--image" key={field.id} style={style}>
              <img
                src={value}
                alt=""
                style={{
                  objectFit: field.imageFit ?? 'fill',
                  objectPosition: `${field.imageAlign ?? 'center'} center`,
                }}
              />
            </div>
          )
        }

        return field.autoFit ? (
          <AutoFitText
            field={field}
            key={field.id}
            style={style}
            value={value}
            fontFamily={style.fontFamily}
          />
        ) : (
          <div className="card-field card-field--text" key={field.id} style={style}>
            {value}
          </div>
        )
      })}
    </div>
  )
}
