import type { Area } from 'react-easy-crop'
import type { TemplateField } from '../types'

type PhotoFilter = NonNullable<TemplateField['photoFilter']>

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('The selected photo could not be loaded.'))
    image.src = source
  })
}

export function cropPhoto(imageUrl: string, crop: Area): Promise<string> {
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

function sepia(r: number, g: number, b: number, amount: number): [number, number, number] {
  const sepiaR = Math.min(255, 0.393 * r + 0.769 * g + 0.189 * b)
  const sepiaG = Math.min(255, 0.349 * r + 0.686 * g + 0.168 * b)
  const sepiaB = Math.min(255, 0.272 * r + 0.534 * g + 0.131 * b)
  return [
    r + (sepiaR - r) * amount,
    g + (sepiaG - g) * amount,
    b + (sepiaB - b) * amount,
  ]
}

function nextNoise(seed: number): number {
  return (seed * 16807) % 2147483647
}

export async function processPhoto(
  imageUrl: string,
  filter?: Pick<PhotoFilter, 'effect'> & { intensity: number },
): Promise<string> {
  if (!filter || filter.intensity <= 0) return imageUrl

  const image = await loadImage(imageUrl)
  const canvas = document.createElement('canvas')
  canvas.width = image.naturalWidth
  canvas.height = image.naturalHeight
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('Your browser could not process the photo filter.')

  context.drawImage(image, 0, 0)
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
  const pixels = imageData.data
  const intensity = Math.min(100, Math.max(0, filter.intensity)) / 100
  let seed = 17

  for (let i = 0; i < pixels.length; i += 4) {
    const originalR = pixels[i]
    const originalG = pixels[i + 1]
    const originalB = pixels[i + 2]
    const sepiaAmount = filter.effect === 'vintage' ? 0.62 * intensity : intensity
    let [r, g, b] = sepia(originalR, originalG, originalB, sepiaAmount)

    if (filter.effect === 'vintage') {
      const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
      r = luminance + (r - luminance) * 0.78
      g = luminance + (g - luminance) * 0.78
      b = luminance + (b - luminance) * 0.78
      r = (r - 128) * 1.08 + 128
      g = (g - 128) * 1.08 + 128
      b = (b - 128) * 1.08 + 128

      seed = nextNoise(seed)
      const grain = ((seed % 255) / 255 - 0.5) * 18 * intensity
      r += grain
      g += grain
      b += grain
    }

    pixels[i] = Math.max(0, Math.min(255, Math.round(r)))
    pixels[i + 1] = Math.max(0, Math.min(255, Math.round(g)))
    pixels[i + 2] = Math.max(0, Math.min(255, Math.round(b)))
  }

  context.putImageData(imageData, 0, 0)
  return canvas.toDataURL('image/png')
}
