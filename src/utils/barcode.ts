import JsBarcode from 'jsbarcode'

export function createBarcode(value: string): string {
  const canvas = document.createElement('canvas')
  JsBarcode(canvas, value, {
    format: 'CODE128',
    width: 2,
    height: 88,
    displayValue: false,
    margin: 0,
    background: '#fff',
    lineColor: '#111',
  })
  return canvas.toDataURL('image/png')
}
