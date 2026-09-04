export const MAX_DISCUSSION_IMAGE_BYTES = 5 * 1024 * 1024

export const ALLOWED_DISCUSSION_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const

const discussionImageExtensionByType = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
} satisfies Record<(typeof ALLOWED_DISCUSSION_IMAGE_TYPES)[number], string>

export function validateDiscussionImageFile(file: File) {
  if (!ALLOWED_DISCUSSION_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_DISCUSSION_IMAGE_TYPES)[number])) {
    return 'PNG, JPG, WEBP 사진만 첨부할 수 있습니다.'
  }
  if (file.size <= 0) return '내용이 없는 파일은 첨부할 수 없습니다.'
  if (file.size > MAX_DISCUSSION_IMAGE_BYTES) return '첨부 사진은 5MB 이하여야 합니다.'
  return null
}

export function getDiscussionImageExtension(file: File) {
  return discussionImageExtensionByType[file.type as (typeof ALLOWED_DISCUSSION_IMAGE_TYPES)[number]]
}
