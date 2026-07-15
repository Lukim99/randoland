export const MAX_PROFILE_IMAGE_BYTES = 1024 * 1024
export const ALLOWED_PROFILE_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

const profileImageExtensionByType: Record<(typeof ALLOWED_PROFILE_IMAGE_TYPES)[number], string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

export function validateProfileImageFile(file: File) {
  if (!ALLOWED_PROFILE_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_PROFILE_IMAGE_TYPES)[number])) {
    return 'PNG, JPG, WEBP 파일만 업로드할 수 있습니다.'
  }
  if (file.size <= 0) return '내용이 없는 파일은 업로드할 수 없습니다.'
  if (file.size > MAX_PROFILE_IMAGE_BYTES) return '프로필 이미지는 1MB 이하여야 합니다.'
  return null
}

export function getProfileImageExtension(file: File) {
  return profileImageExtensionByType[file.type as (typeof ALLOWED_PROFILE_IMAGE_TYPES)[number]]
}
