import { describe, expect, it } from 'vitest'
import { parseStudyPack } from '../../../src/studyPack'

describe('parseStudyPack', () => {
  it('extracts headings, quick syntax, Q/A pairs, checklists, and tables', () => {
    const pack = parseStudyPack(
      `# Derivatives

Definition:: A derivative measures instantaneous rate of change.

Q: What is the power rule?
A: d/dx x^n = nx^(n-1)

- [ ] Explain derivative meaning
- [ ] Use the power rule

| Rule | Formula |
|---|---|
| Power | nx^(n-1) |`,
    )

    expect(pack.title).toBe('Derivatives')
    expect(pack.objects.map((object) => object.kind)).toEqual([
      'table',
      'term',
      'qa',
      'list',
    ])
    expect(pack.objects[0]).toMatchObject({
      kind: 'table',
      headers: ['Rule', 'Formula'],
      rows: [['Power', 'nx^(n-1)']],
    })
    expect(pack.objects[1]).toMatchObject({
      kind: 'term',
      term: 'Derivatives',
      definition: 'A derivative measures instantaneous rate of change.',
    })
    expect(pack.objects[2]).toMatchObject({
      kind: 'qa',
      question: 'What is the power rule?',
      answer: 'd/dx x^n = nx^(n-1)',
    })
    expect(pack.objects[3]).toMatchObject({
      kind: 'list',
      checklist: true,
      items: ['Explain derivative meaning', 'Use the power rule'],
    })
  })

  it('parses CSV into a table when headers are generic', () => {
    const pack = parseStudyPack('Rule,Formula\nPower,nx^(n-1)', {
      sourceFormat: 'csv',
      title: 'Rules',
    })

    expect(pack.objects).toEqual([
      expect.objectContaining({
        kind: 'table',
        headers: ['Rule', 'Formula'],
        rows: [['Power', 'nx^(n-1)']],
      }),
    ])
  })

  it('falls messy notes back to long text objects', () => {
    const pack = parseStudyPack('random notes\nstill useful')

    expect(pack.objects).toHaveLength(1)
    expect(pack.objects[0]).toMatchObject({
      kind: 'note',
      body: 'random notes\nstill useful',
    })
  })
})
