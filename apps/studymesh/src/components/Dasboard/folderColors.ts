export const DEFAULT_FOLDER_COLOR = '#007C66'

export const FOLDER_COLOR_PRESETS = [
  '#007C66',
  '#1976D2',
  '#7B1FA2',
  '#D81B60',
  '#EF6C00',
  '#2E7D32',
  '#455A64',
  '#5D4037',
]

export const normalizeFolderName = (folder?: string) => {
  const rawFolderName = folder?.trim() || 'Default'

  if (rawFolderName.toLowerCase() === 'mathematics') {
    return 'Mathematics'
  }

  if (rawFolderName.toLowerCase() === 'tutorial') {
    return 'Tutorial'
  }

  return rawFolderName
}

export const normalizeFolderColor = (color?: string) => {
  const trimmedColor = color?.trim()
  return trimmedColor && /^#[0-9a-f]{6}$/i.test(trimmedColor)
    ? trimmedColor
    : DEFAULT_FOLDER_COLOR
}
