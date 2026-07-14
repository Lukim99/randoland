export const SPRITE_ICON_COUNT = 100

export function normalizeSpriteIndex(index: number) {
  if (!Number.isFinite(index)) return 0
  return Math.min(SPRITE_ICON_COUNT - 1, Math.max(0, Math.trunc(index)))
}
