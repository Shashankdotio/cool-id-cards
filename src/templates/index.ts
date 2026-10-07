import oscorp from './oscorp/config'

export const templates = [oscorp]

export function getTemplate(id: string) {
  return templates.find((template) => template.id === id)
}
