import type { CSSProperties, Ref } from 'react'
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

function fieldStyle(field: TemplateField): CSSProperties {
  return {
    left: `${field.x}%`,
    top: `${field.y}%`,
    width: `${field.width}%`,
    height: `${field.height}%`,
    fontFamily: field.font,
    fontSize: field.size ? `${field.size}px` : undefined,
    color: field.color,
    backgroundColor: field.backgroundColor,
    textAlign: field.alignment,
    transform: field.rotation ? `rotate(${field.rotation}deg)` : undefined,
    writingMode: field.writingMode,
  }
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

        const style = fieldStyle(field)
        const value = values[field.id] ?? field.defaultValue ?? ''

        if (field.type === 'photo') {
          return (
            <div className="card-field card-field--photo" key={field.id} style={style}>
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

        return (
          <div className="card-field card-field--text" key={field.id} style={style}>
            {values[field.id] ?? field.defaultValue ?? ''}
          </div>
        )
      })}
    </div>
  )
}
