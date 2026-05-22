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
