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
  backgroundColor?: string
  imageFit?: 'contain' | 'cover' | 'fill'
  imageAlign?: 'left' | 'center' | 'right'
  alignment?: TextAlignment
  fontValue?: string
  autoFit?: boolean
  dateFormat?: 'mm/dd/yyyy'
  valuePrefix?: string
  rotation?: number
  writingMode?: 'vertical-rl' | 'vertical-lr'
  maxLength?: number
  defaultValue?: string
  placeholder?: string
  visibleWhen?: { field: string; value: string }
  hideIfPhotoMissing?: boolean
  photoFilter?: {
    valueId: string
    enabledValue: string
    intensityId?: string
    effect: 'vintage' | 'tva'
  }
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
  inputType?: 'text' | 'tel' | 'url'
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

export interface RangeOption {
  type: 'range'
  id: string
  label: string
  defaultValue: string
  min: number
  max: number
  step: number
}

export interface DateOption {
  type: 'date'
  id: string
  label: string
}

export interface RandomizeTextOption {
  type: 'randomizeText'
  id: string
  label: string
  defaultValue: string
  maxLength: number
}

export interface SignatureOption {
  type: 'signature'
  id: string
  label: string
}

export type TemplateOption =
  | TextOption
  | SelectOption
  | ToggleOption
  | PhotoOption
  | RangeOption
  | DateOption
  | RandomizeTextOption
  | SignatureOption

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
