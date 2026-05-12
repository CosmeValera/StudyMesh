import { describe, expect, it } from 'vitest'
import { formatOcrPageAsMarkdown } from '../../../src/studyPack/imageOcr'

const createLine = (
  text: string,
  height: number,
  confidence = 92,
): Tesseract.Line =>
  ({
    text,
    confidence,
    bbox: { x0: 0, y0: 0, x1: 600, y1: height },
    rowAttributes: {
      ascenders: 0,
      descenders: 0,
      rowHeight: height,
    },
    words: [],
    baseline: { x0: 0, y0: 0, x1: 600, y1: 0 },
  }) as Tesseract.Line

const createPage = (
  rawText: string,
  paragraphs: Tesseract.Line[][],
  confidence = 92,
): Tesseract.Page =>
  ({
    text: rawText,
    confidence,
    blocks: [
      {
        text: rawText,
        confidence,
        bbox: { x0: 0, y0: 0, x1: 800, y1: 800 },
        blocktype: 'text',
        paragraphs: paragraphs.map((lines) => ({
          text: lines.map((line) => line.text).join('\n'),
          confidence,
          bbox: { x0: 0, y0: 0, x1: 800, y1: 200 },
          is_ltr: true,
          lines,
        })),
      },
    ],
  }) as Tesseract.Page

describe('formatOcrPageAsMarkdown', () => {
  it('formats large section labels as markdown subheadings', () => {
    const page = createPage('Antigua India |editar]\nEl cirujano indio...', [
      [createLine('Antigua India |editar]', 24)],
      [
        createLine('El cirujano indio Sushruta escribio Susruta-samjita', 16),
        createLine('entre el siglo III y el siglo IV d. C.', 16),
      ],
      [createLine('Prehipocraticos [edit]', 24)],
      [createLine('En el Papiro de Ebers se dedica una seccion.', 16)],
    ])

    expect(formatOcrPageAsMarkdown(page)).toBe(
      '## Antigua India\n\nEl cirujano indio Sushruta escribio Susruta-samjita\nentre el siglo III y el siglo IV d. C.\n\n## Prehipocraticos\n\nEn el Papiro de Ebers se dedica una seccion.',
    )
  })

  it('formats only a distinct largest first line as a title', () => {
    const page = createPage('Historia de la oftalmologia\nAntigua India', [
      [createLine('Historia de la oftalmologia', 32)],
      [createLine('Antigua India', 23)],
      [
        createLine('El cirujano indio Sushruta escribio sobre cataratas', 16),
        createLine('Tambien describio instrumentos quirurgicos', 16),
        createLine('El texto conserva datos historicos para estudiar', 16),
      ],
    ])

    expect(formatOcrPageAsMarkdown(page)).toBe(
      '# Historia de la oftalmologia\n\n## Antigua India\n\nEl cirujano indio Sushruta escribio sobre cataratas\nTambien describio instrumentos quirurgicos\nEl texto conserva datos historicos para estudiar',
    )
  })

  it('falls back to raw text when layout data is missing', () => {
    const page = {
      text: 'plain OCR text',
      blocks: null,
    } as Tesseract.Page

    expect(formatOcrPageAsMarkdown(page)).toBe('plain OCR text')
  })

  it('falls back to raw text when layout confidence is unclear', () => {
    const page = createPage(
      'Possible Heading\nBody text stays plain',
      [
        [createLine('Possible Heading', 24, 30)],
        [createLine('Body text stays plain', 16, 30)],
        [createLine('More body text stays plain', 16, 30)],
      ],
      30,
    )

    expect(formatOcrPageAsMarkdown(page)).toBe(
      'Possible Heading\nBody text stays plain',
    )
  })

  it('does not promote large sentence-like prose ending in punctuation', () => {
    const page = createPage(
      'This line is large but it is still a sentence.\nMore notes follow.',
      [
        [createLine('This line is large but it is still a sentence.', 24)],
        [createLine('More notes follow.', 16)],
        [createLine('Another normal line follows.', 16)],
      ],
    )

    expect(formatOcrPageAsMarkdown(page)).toBe(
      'This line is large but it is still a sentence.\nMore notes follow.',
    )
  })

  it('does not promote a normal first prose line to a title', () => {
    const page = createPage(
      'Normal first prose line without punctuation\nAnother body line',
      [
        [createLine('Normal first prose line without punctuation', 16)],
        [createLine('Another body line', 16)],
        [createLine('Third body line', 16)],
      ],
    )

    expect(formatOcrPageAsMarkdown(page)).toBe(
      'Normal first prose line without punctuation\nAnother body line',
    )
  })

  it('never promotes bullet, numbered, checklist, or list-like lines', () => {
    const page = createPage(
      'Study points\n- Big bullet\n1. Big number\n[ ] Big task\na) Big outline',
      [
        [createLine('Study points', 24)],
        [createLine('- Big bullet', 24)],
        [createLine('1. Big number', 24)],
        [createLine('[ ] Big task', 24)],
        [createLine('a) Big outline', 24)],
        [
          createLine('Body line one for height baseline', 16),
          createLine('Body line two for height baseline', 16),
          createLine('Body line three for height baseline', 16),
          createLine('Body line four for height baseline', 16),
          createLine('Body line five for height baseline', 16),
        ],
      ],
    )

    expect(formatOcrPageAsMarkdown(page)).toBe(
      '## Study points\n\n- Big bullet\n\n1. Big number\n\n[ ] Big task\n\na) Big outline\n\nBody line one for height baseline\nBody line two for height baseline\nBody line three for height baseline\nBody line four for height baseline\nBody line five for height baseline',
    )
  })
})
