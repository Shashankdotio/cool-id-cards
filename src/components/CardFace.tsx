import { useLayoutEffect, useRef, type CSSProperties, type Ref } from 'react'
import type { CardTemplate, TemplateFace, TemplateField } from '../types'
import { createBarcode } from '../utils/barcode'

export type CardValues = Record<string, string>

function matchesCondition(
  condition: NonNullable<TemplateField['visibleWhen']>,
  values: CardValues,
): boolean {
  const value = values[condition.field]
  return 'value' in condition ? value === condition.value : condition.values.includes(value ?? '')
}

interface CardFaceProps {
  template: CardTemplate
  face: TemplateFace
  values: CardValues
  photo: string | null
  qrImage: string | null
  debug: boolean
  faceRef?: Ref<HTMLDivElement>
  label: string
  onPhotoPlaceholderClick?: () => void
  onPhotoPlaceholderDrop?: (file: File) => void
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
  children,
}: {
  field: TemplateField
  value: string
  style: CSSProperties
  fontFamily?: string
  children?: React.ReactNode
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
    <div
      ref={fieldRef}
      className={`card-field card-field--text${field.textLayout ? ` card-field--${field.textLayout}` : ''}`}
      style={style}
    >
      {children ?? value}
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
  onPhotoPlaceholderClick,
  onPhotoPlaceholderDrop,
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
          !matchesCondition(field.visibleWhen, values)
        ) {
          return null
        }

        const style = fieldStyle(field, values)
        const fieldValue = values[field.id] ?? field.defaultValue ?? ''
        const value = `${field.valuePrefix ?? ''}${formattedValue(field, fieldValue)}`

        if (field.type === 'photo') {
          if (
            field.hideIfPhotoMissing &&
            !photo &&
            (!field.placeholder || !onPhotoPlaceholderClick)
          ) return null

          return (
            <div
              className="card-field card-field--photo"
              key={field.id}
              style={style}
            >
              {photo ? (
                <img src={photo} alt="" />
              ) : field.placeholder ? (
                <button
                  className="card-field--photo-placeholder"
                  type="button"
                  data-preview-placeholder="true"
                  aria-label={field.placeholder}
                  onClick={onPhotoPlaceholderClick}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault()
                    const file = event.dataTransfer.files[0]
                    if (file?.type.startsWith('image/')) onPhotoPlaceholderDrop?.(file)
                  }}
                >
                  {field.placeholder}
                </button>
              ) : (
                <span>photo</span>
              )}
            </div>
          )
        }

        if (field.type === 'qr') {
          return (
            <div className="card-field card-field--qr" key={field.id} style={style}>
              {qrImage ? (
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

        if (field.type === 'barcode') {
          return value ? (
            <div className="card-field card-field--barcode" key={field.id} style={style}>
              <img src={createBarcode(value)} alt={`barcode for ${value}`} />
            </div>
          ) : null
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

        if (
          field.textLayout === 'assistantToRegionalManager' &&
          value === 'Assistant to the Regional Manager'
        ) {
          return (
            <AutoFitText
              field={field}
              key={field.id}
              style={style}
              value={value}
              fontFamily={style.fontFamily}
            >
              <span>Assistant</span>
              <small>to the</small>
              <span>Regional Manager</span>
            </AutoFitText>
          )
        }

        if (template.id === 'dunder-mifflin' && !value && field.placeholder) {
          return (
            <div
              className="card-field card-field--text card-field--preview-placeholder"
              key={field.id}
              style={{
                ...style,
                fontFamily: '"Dunder Arimo Regular", sans-serif',
                color: '#999',
                fontStyle: 'italic',
                fontWeight: 400,
                textAlign: 'center',
              }}
              data-preview-placeholder="true"
              aria-hidden="true"
            >
              {field.placeholder}
            </div>
          )
        }

        if (!value) return null

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
