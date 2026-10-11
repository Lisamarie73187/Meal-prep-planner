/** Longest side of an uploaded recipe photo, in pixels. Plenty for a card or the recipe page. */
export const MAX_EDGE = 1200

/** Scale to fit within `max` on the longest side; never enlarges. */
export function fitWithin(width: number, height: number, max = MAX_EDGE) {
  const scale = Math.min(1, max / Math.max(width, height))
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }
}

const toBlob = (canvas: HTMLCanvasElement, type: string, quality: number) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality))

/**
 * Shrinks a photo before it is uploaded: phone pictures are 3–8 MB, this makes them ~100–200 KB.
 * Honours the camera's rotation, saves as WebP (JPEG where the browser can't write WebP).
 */
export async function prepareImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) throw new Error('Choose an image file.')
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    throw new Error("Couldn't read that image. Try a JPG or PNG.")
  }
  const { width, height } = fitWithin(bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error("Couldn't process that image.")
  ctx.fillStyle = '#fff' // transparent PNGs would otherwise turn black if saved as JPEG
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()
  let blob = await toBlob(canvas, 'image/webp', 0.82)
  if (!blob || blob.type !== 'image/webp') blob = await toBlob(canvas, 'image/jpeg', 0.85)
  if (!blob) throw new Error("Couldn't process that image.")
  return new File([blob], blob.type === 'image/webp' ? 'photo.webp' : 'photo.jpg', { type: blob.type })
}
