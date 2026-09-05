export const ICON_IMAGE_MAX_DIMENSION = 256
export const DISCUSSION_IMAGE_MAX_DIMENSION = 1600

// Resize before upload so every viewer downloads the smaller image.
export async function optimizeImageUpload(file: File, maxDimension: number): Promise<File> {
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new Error('이미지를 읽을 수 없습니다. 다른 PNG, JPG, WEBP 파일을 선택해 주세요.')
  }

  try {
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('이미지를 처리할 수 없습니다. 다시 시도해 주세요.')
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.85))
    // Some browsers fall back to PNG. Keep the original if conversion does not save bytes.
    if (!blob || blob.type !== 'image/webp' || blob.size >= file.size) return file
    return new File([blob], `${file.name.replace(/\.[^.]+$/, '')}.webp`, {
      type: blob.type,
      lastModified: file.lastModified,
    })
  } finally {
    bitmap.close()
  }
}
