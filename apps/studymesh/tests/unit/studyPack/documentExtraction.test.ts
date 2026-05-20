import { describe, expect, it } from 'vitest'
import JSZip from 'jszip'
import { extractTextFromPptx } from '../../../src/studyPack/documentExtraction'

describe('document extraction', () => {
  it('extracts PPTX slide text and speaker notes in slide order', async () => {
    const zip = new JSZip()
    zip.file(
      'ppt/slides/slide2.xml',
      '<p:sld xmlns:p="p" xmlns:a="a"><a:t>Second slide</a:t></p:sld>',
    )
    zip.file(
      'ppt/slides/slide1.xml',
      '<p:sld xmlns:p="p" xmlns:a="a"><a:t>First slide</a:t></p:sld>',
    )
    zip.file(
      'ppt/notesSlides/notesSlide1.xml',
      '<p:notes xmlns:p="p" xmlns:a="a"><a:t>Remember example</a:t></p:notes>',
    )
    const bytes = await zip.generateAsync({ type: 'arraybuffer' })
    const file = new File([bytes], 'lecture.pptx', {
      type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    })
    Object.defineProperty(file, 'arrayBuffer', {
      value: () => Promise.resolve(bytes),
    })

    const result = await extractTextFromPptx(file)

    expect(result.warnings).toEqual([])
    expect(result.text).toContain('# lecture')
    expect(result.text.indexOf('## Slide 1')).toBeLessThan(
      result.text.indexOf('## Slide 2'),
    )
    expect(result.text).toContain('First slide')
    expect(result.text).toContain('Speaker notes:\nRemember example')
    expect(result.text).toContain('Second slide')
  })
})
