export const USER_PROFILE_AVATAR_CHANGED_EVENT =
  'studymesh-user-profile-avatar-changed'

export const getUserAvatarStorageKey = (userId: string) =>
  `studymesh-user-avatar-v1:${userId}`

export const readUserAvatar = (userId: string) => {
  try {
    return localStorage.getItem(getUserAvatarStorageKey(userId)) || ''
  } catch (error) {
    console.error('Failed to read user avatar', error)
    return ''
  }
}

export const saveUserAvatar = (userId: string, avatarDataUrl: string) => {
  try {
    localStorage.setItem(getUserAvatarStorageKey(userId), avatarDataUrl)
    window.dispatchEvent(
      new CustomEvent(USER_PROFILE_AVATAR_CHANGED_EVENT, {
        detail: { userId, avatarDataUrl },
      }),
    )
  } catch (error) {
    console.error('Failed to save user avatar', error)
  }
}

export const removeUserAvatar = (userId: string) => {
  try {
    localStorage.removeItem(getUserAvatarStorageKey(userId))
    window.dispatchEvent(
      new CustomEvent(USER_PROFILE_AVATAR_CHANGED_EVENT, {
        detail: { userId, avatarDataUrl: '' },
      }),
    )
  } catch (error) {
    console.error('Failed to remove user avatar', error)
  }
}

export const createSquareAvatarDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const image = new Image()

    image.onload = () => {
      const size = Math.min(image.naturalWidth, image.naturalHeight)
      const sourceX = (image.naturalWidth - size) / 2
      const sourceY = (image.naturalHeight - size) / 2
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')

      URL.revokeObjectURL(objectUrl)

      if (!context) {
        reject(new Error('Could not prepare profile picture.'))
        return
      }

      canvas.width = 256
      canvas.height = 256
      context.drawImage(image, sourceX, sourceY, size, size, 0, 0, 256, 256)
      resolve(canvas.toDataURL('image/png'))
    }
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Could not read profile picture.'))
    }
    image.src = objectUrl
  })
