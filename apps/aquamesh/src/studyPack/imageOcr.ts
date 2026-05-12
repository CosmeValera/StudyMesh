import Tesseract from 'tesseract.js/dist/tesseract.min.js'

export interface ImageOcrProgress {
  status: string
  progress: number
}

interface OcrLineRecord {
  text: string
  confidence: number
  height: number
}

interface OcrParagraphRecord {
  lines: OcrLineRecord[]
}

const MAX_OCR_DIMENSION = 3200
const MIN_OCR_DIMENSION = 1400
const MIN_LAYOUT_CONFIDENCE = 45
const HEADING_HEIGHT_RATIO = 1.18
const TITLE_HEIGHT_RATIO = 1.32

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

const median = (values: number[]): number => {
  if (values.length === 0) {
    return 0
  }

  const sorted = [...values].sort((left, right) => left - right)
  const midpoint = Math.floor(sorted.length / 2)

  return sorted.length % 2 === 0
    ? (sorted[midpoint - 1] + sorted[midpoint]) / 2
    : sorted[midpoint]
}

const cleanHeadingText = (value: string): string =>
  value
    .replace(
      /\s*(?:[\[|]\s*(?:edit|editar|cditar)\s*[\]\|]?|\[\s*(?:edit|editar|cditar)\s*$|\|\s*(?:edit|editar|cditar)\s*]?)\s*$/i,
      '',
    )
    .trim()

const isListLikeLine = (value: string): boolean =>
  /^([-*]\s+|\d+[.)]\s+|[a-z][.)]\s+|[-*]\s+\[[ xX]\]\s+|\[[ xX]\]\s+)/i.test(
    value,
  )

const isHeadingShape = (value: string): boolean => {
  const text = cleanHeadingText(value)

  return (
    text.length > 0 &&
    text.length <= 80 &&
    text.split(/\s+/).length <= 10 &&
    !/[.!?,;:]$/.test(text) &&
    !isListLikeLine(text) &&
    !/^https?:\/\//i.test(text) &&
    !/[|{};]/.test(text)
  )
}

const getLineHeight = (line: Tesseract.Line): number =>
  line.rowAttributes?.rowHeight || line.bbox.y1 - line.bbox.y0

const getOcrParagraphs = (page: Tesseract.Page): OcrParagraphRecord[] => {
  if (!page.blocks) {
    return []
  }

  return page.blocks.flatMap((block) =>
    block.paragraphs.map((paragraph) => ({
      lines: paragraph.lines
        .map((line) => ({
          text: line.text.trim(),
          confidence: line.confidence,
          height: getLineHeight(line),
        }))
        .filter((line) => line.text.length > 0),
    })),
  )
}

export const formatOcrPageAsMarkdown = (page: Tesseract.Page): string => {
  const rawText = page.text.trim()
  const paragraphs = getOcrParagraphs(page).filter(
    (paragraph) => paragraph.lines.length > 0,
  )
  const lines = paragraphs.flatMap((paragraph) => paragraph.lines)
  const usableLines = lines.filter(
    (line) =>
      Number.isFinite(line.height) &&
      line.height > 0 &&
      Number.isFinite(line.confidence),
  )

  if (usableLines.length < 3) {
    return rawText
  }

  const averageConfidence =
    usableLines.reduce((sum, line) => sum + line.confidence, 0) /
    usableLines.length
  if (averageConfidence < MIN_LAYOUT_CONFIDENCE) {
    return rawText
  }

  const bodyHeight = median(usableLines.map((line) => line.height))
  if (!Number.isFinite(bodyHeight) || bodyHeight <= 0) {
    return rawText
  }

  const heightsDescending = [...usableLines]
    .map((line) => line.height)
    .sort((left, right) => right - left)
  const largestHeight = heightsDescending[0]
  const secondLargestHeight = heightsDescending[1] || largestHeight
  const firstLine = usableLines[0]
  const headingLines = new Map<OcrLineRecord, string>()

  for (const line of usableLines) {
    if (
      line.confidence < MIN_LAYOUT_CONFIDENCE ||
      line.height < bodyHeight * HEADING_HEIGHT_RATIO ||
      line.height - bodyHeight < 2 ||
      !isHeadingShape(line.text)
    ) {
      continue
    }

    const isTitle =
      line === firstLine &&
      line.height >= bodyHeight * TITLE_HEIGHT_RATIO &&
      line.height >= largestHeight * 0.95 &&
      line.height >= secondLargestHeight * 1.15
    headingLines.set(
      line,
      `${isTitle ? '#' : '##'} ${cleanHeadingText(line.text)}`,
    )
  }

  if (headingLines.size === 0) {
    return rawText
  }

  return paragraphs
    .map((paragraph) =>
      paragraph.lines
        .map((line) => headingLines.get(line) || line.text)
        .join('\n'),
    )
    .join('\n\n')
    .trim()
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
    const result = await worker.recognize(
      preprocessedImage,
      {},
      {
        text: true,
        blocks: true,
      },
    )
    return formatOcrPageAsMarkdown(result.data)
  } finally {
    await worker.terminate()
  }
}
