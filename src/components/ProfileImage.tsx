import defaultProfileImage from '../assets/default-profile.png'

type ProfileImageSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

interface ProfileImageProps {
  src?: string | null
  size?: ProfileImageSize
  label?: string
  className?: string
}

export function ProfileImage({ src, size = 'md', label, className }: ProfileImageProps) {
  const classes = ['profile-image', `profile-image--${size}`, className]
    .filter(Boolean)
    .join(' ')

  return (
    <img
      className={classes}
      src={src?.trim() || defaultProfileImage}
      alt={label ?? ''}
      aria-hidden={label ? undefined : true}
    />
  )
}
