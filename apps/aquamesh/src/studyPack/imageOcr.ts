import Tesseract from 'tesseract.js/dist/tesseract.min.js'

export interface ImageOcrProgress {
  status: string
  progress: number
}

const MAX_OCR_DIMENSION = 3200
const MIN_OCR_DIMENSION = 1400

const clampChannel = (value: number) => Math.max(0, Math.min(255, value))

const loadImageBitmap = async (image: File): Promise<ImageBitmap | null> => {
  if (!('createImageBitmap' in window)) {
    return null
  }

  return window.createImageBitmap(image)
}

const loadImageElement = async (image: File): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const imageUrl = URL.createObjectURL(image)
    const element = new Image()

    element.onload = () => {
      URL.revokeObjectURL(imageUrl)
      resolve(element)
    }
    element.onerror = () => {
      URL.revokeObjectURL(imageUrl)
      reject(new Error('Could not load image for OCR.'))
    }
    element.src = imageUrl
  })

const getSourceDimensions = (
  source: ImageBitmap | HTMLImageElement,
): { width: number; height: number } => ({
  width:
    source instanceof HTMLImageElement
      ? source.naturalWidth || source.width
      : source.width,
  height:
    source instanceof HTMLImageElement
      ? source.naturalHeight || source.height
      : source.height,
})

const createPreprocessedCanvas = async (image: File) => {
  const bitmap = await loadImageBitmap(image)
  const source = bitmap || (await loadImageElement(image))
  const { width, height } = getSourceDimensions(source)
  const largestDimension = Math.max(width, height)
  const smallestDimension = Math.min(width, height)
  const upscale =
    smallestDimension < MIN_OCR_DIMENSION
      ? Math.min(MIN_OCR_DIMENSION / Math.max(1, smallestDimension), 3)
      : 1
  const downscale =
    largestDimension * upscale > MAX_OCR_DIMENSION
      ? MAX_OCR_DIMENSION / largestDimension
      : 1
  const scale = Math.max(1, upscale * downscale)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(width * scale)
  canvas.height = Math.round(height * scale)

  const context = canvas.getContext('2d', {
    willReadFrequently: true,
  })
  if (!context) {
    bitmap?.close()
    return image
  }

  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.drawImage(source, 0, 0, canvas.width, canvas.height)

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
  const { data } = imageData
  for (let index = 0; index < data.length; index += 4) {
    const gray =
      data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114
    const contrasted = clampChannel((gray - 128) * 1.45 + 128)
    data[index] = contrasted
    data[index + 1] = contrasted
    data[index + 2] = contrasted
    data[index + 3] = 255
  }
  context.putImageData(imageData, 0, 0)
  bitmap?.close()

  return canvas
}

export const extractRawNotesFromImage = async (
  image: File,
  onProgress?: (progress: ImageOcrProgress) => void,
): Promise<string> => {
  const preprocessedImage = await createPreprocessedCanvas(image)
  const worker = await Tesseract.createWorker('eng', Tesseract.OEM.LSTM_ONLY, {
    logger: (message) => {
      onProgress?.({
        status: message.status,
        progress: message.progress,
      })
    },
  })

  try {
    await worker.setParameters({
      preserve_interword_spaces: '1',
      tessedit_pageseg_mode: Tesseract.PSM.AUTO,
      user_defined_dpi: '300',
    })
    const result = await worker.recognize(preprocessedImage)
    return result.data.text.trim()
  } finally {
    await worker.terminate()
  }
}
