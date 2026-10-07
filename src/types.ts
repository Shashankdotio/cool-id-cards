export type CardOrientation = 'portrait' | 'landscape'
export type FieldType = 'photo' | 'text' | 'qr' | 'image'
export type TextAlignment = 'left' | 'center' | 'right'

export interface TemplateField {
  id: string
  type: FieldType
  x: number
  y: number
  width: number
  height: number
  font?: string
  size?: number
  color?: string
  alignment?: TextAlignment
  rotation?: number
  writingMode?: 'vertical-rl' | 'vertical-lr'
  maxLength?: number
  defaultValue?: string
  placeholder?: string
  visibleWhen?: { field: string; value: string }
}

export interface TemplateFace {
  backgroundImage: string
  fields: TemplateField[]
}

export interface TextOption {
  type: 'text'
  id: string
  label: string
  defaultValue: string
  maxLength: number
  placeholder?: string
}

export interface SelectOption {
  type: 'select'
  id: string
  label: string
  defaultValue: string
  choices: string[]
}

export interface ToggleOption {
  type: 'toggle'
  id: string
  label: string
  choices: { label: string; value: string }[]
  defaultValue: string
}

export interface PhotoOption {
  type: 'photo'
  id: string
  label: string
}

export type TemplateOption = TextOption | SelectOption | ToggleOption | PhotoOption

export interface CardTemplate {
  id: string
  title: string
  caption: string
  orientation: CardOrientation
  sizeMm: { width: 85.6; height: 54 }
  previewImage: string
  front: TemplateFace
  back: TemplateFace
  options: TemplateOption[]
}
