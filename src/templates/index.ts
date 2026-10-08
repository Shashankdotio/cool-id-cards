import oscorp from './oscorp/config'
import lokiTva from './tva/config'
import tylerCallMeIfYouGetLost from './tyler-call-me-if-you-get-lost/config'
import dunderMifflin from './dundermifflin/config'

export const templates = [oscorp, lokiTva, tylerCallMeIfYouGetLost, dunderMifflin]

export function getTemplate(id: string) {
  return templates.find((template) => template.id === id)
}
