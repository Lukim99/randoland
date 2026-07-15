export const MAX_STOCK_LOGO_BYTES = 1024 * 1024
export const ALLOWED_STOCK_LOGO_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

const stockLogoExtensionByType: Record<(typeof ALLOWED_STOCK_LOGO_TYPES)[number], string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

export function validateStockLogoFile(file: File) {
  if (!ALLOWED_STOCK_LOGO_TYPES.includes(file.type as (typeof ALLOWED_STOCK_LOGO_TYPES)[number])) {
    return 'PNG, JPG, WEBP 파일만 업로드할 수 있습니다.'
  }
  if (file.size <= 0) return '내용이 없는 파일은 업로드할 수 없습니다.'
  if (file.size > MAX_STOCK_LOGO_BYTES) return '종목 로고는 1MB 이하여야 합니다.'
  return null
}

export function getStockLogoExtension(file: File) {
  return stockLogoExtensionByType[file.type as (typeof ALLOWED_STOCK_LOGO_TYPES)[number]]
}
