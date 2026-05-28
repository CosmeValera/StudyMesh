import JSZip from 'jszip'
import * as pdfjsLib from 'pdfjs-dist'

export interface ExtractedDocumentNotes {
  text: string
  warnings: string[]
}

const getFileTitle = (file: File) =>
  file.name.replace(/\.[^.]+$/, '') || 'Notes'

const normalizeText = (value: string) =>
  value
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

const configurePdfWorker = () => {
  if (typeof window === 'undefined') {
    return
  }

  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js'
}

export const extractTextFromPdf = async (
  file: File,
): Promise<ExtractedDocumentNotes> => {
  configurePdfWorker()

  const data = new Uint8Array(await file.arrayBuffer())
  const pdf = await pdfjsLib.getDocument({ data }).promise
  const pages: string[] = []
  const warnings: string[] = []

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber)
    const content = await page.getTextContent()
    const pageText = normalizeText(
      content.items
        .map((item) =>
          'str' in item && typeof item.str === 'string' ? item.str : '',
        )
        .filter(Boolean)
        .join(' '),
    )

    if (pageText) {
      pages.push(`## Page ${pageNumber}\n\n${pageText}`)
    } else {
      warnings.push(
        `${file.name} page ${pageNumber} has no selectable text. Scanned pages need OCR in a later iteration.`,
      )
    }
  }

  if (pdf.destroy) {
    await pdf.destroy()
  }

  return {
    text: pages.length > 0 ? `# ${getFileTitle(file)}\n\n${pages.join('\n\n')}` : '',
    warnings,
  }
}

const getXmlText = (xml: string): string => {
  const document = new DOMParser().parseFromString(xml, 'application/xml')
  const textNodes = Array.from(document.getElementsByTagName('a:t'))

  return normalizeText(
    textNodes
      .map((node) => node.textContent || '')
      .filter(Boolean)
      .join('\n'),
  )
}

const getOrderedXmlPaths = (
  zip: JSZip,
  pattern: RegExp,
): Array<{ path: string; number: number }> =>
  Object.keys(zip.files)
    .map((path) => {
      const match = path.match(pattern)
      return match ? { path, number: Number(match[1]) } : null
    })
    .filter((item): item is { path: string; number: number } => Boolean(item))
    .sort((first, second) => first.number - second.number)

export const extractTextFromPptx = async (
  file: File,
): Promise<ExtractedDocumentNotes> => {
  const zip = await JSZip.loadAsync(await file.arrayBuffer())
  const slides = getOrderedXmlPaths(zip, /^ppt\/slides\/slide(\d+)\.xml$/)
  const notesBySlide = new Map(
    getOrderedXmlPaths(zip, /^ppt\/notesSlides\/notesSlide(\d+)\.xml$/).map(
      (note) => [note.number, note.path],
    ),
  )
  const sections: string[] = []

  for (const slide of slides) {
    const slideXml = await zip.file(slide.path)?.async('string')
    const slideText = slideXml ? getXmlText(slideXml) : ''
    const notesPath = notesBySlide.get(slide.number)
    const notesXml = notesPath ? await zip.file(notesPath)?.async('string') : ''
    const notesText = notesXml ? getXmlText(notesXml) : ''
    const parts = [slideText, notesText ? `Speaker notes:\n${notesText}` : '']
      .filter(Boolean)
      .join('\n\n')

    if (parts) {
      sections.push(`## Slide ${slide.number}\n\n${parts}`)
    }
  }

  return {
    text:
      sections.length > 0
        ? `# ${getFileTitle(file)}\n\n${sections.join('\n\n')}`
        : '',
    warnings:
      sections.length > 0
        ? []
        : [`${file.name} did not contain extractable slide text.`],
  }
}

