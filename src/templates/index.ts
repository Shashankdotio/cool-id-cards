import oscorp from './oscorp/config'
import tylerCallMeIfYouGetLost from './tyler-call-me-if-you-get-lost/config'

export const templates = [oscorp, tylerCallMeIfYouGetLost]

export function getTemplate(id: string) {
  return templates.find((template) => template.id === id)
}
