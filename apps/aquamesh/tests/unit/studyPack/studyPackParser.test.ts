import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { detectMarkdownSource, parseStudyPack } from '../../../src/studyPack'

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

  it('keeps plain bullet lists and review prompts from messy default notes', () => {
    const pack = parseStudyPack(`history notes 10/?? industrial rev

started in Britain first. reasons: coal + iron nearby, rivers/canals, colonies = raw materials and markets, banks/investment, agricultural changes pushed ppl to cities. enclosure movement = small farmers lose land? ask teacher if that’s too simple.

factory system changed work:
- time clocks / shifts
- repetitive jobs
- women + kids working
- urbanization fast + gross housing
- pollution everywhere

textile machines: spinning jenny, water frame, power loom. steam engine improved by James Watt (not invented?? just made better). railroads big bc moving goods cheaper/faster.

effects weren’t all bad: more goods, cheaper stuff, some middle class growth. but workers had terrible conditions. unions later tried to fix wages/hours.

need memorize: laissez-faire = gov stays out of business mostly. Marx reaction to capitalism, class struggle, bourgeoisie vs proletariat. I keep spelling bourgeoisie wrong.`)

    expect(pack.objects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'list',
          title: 'factory system changed work',
          items: [
            'time clocks / shifts',
            'repetitive jobs',
            'women + kids working',
            'urbanization fast + gross housing',
            'pollution everywhere',
          ],
        }),
        expect.objectContaining({
          kind: 'reviewPrompt',
          prompt: 'ask teacher if that’s too simple.',
          reason: '',
        }),
        expect.objectContaining({
          kind: 'reviewPrompt',
          prompt:
            'need memorize: laissez-faire = gov stays out of business mostly. Marx reaction to capitalism, class struggle, bourgeoisie vs proletariat. I keep spelling bourgeoisie wrong.',
          reason: '',
        }),
      ]),
    )
  })

  it('detects pasted markdown without flagging ordinary notes', () => {
    expect(
      detectMarkdownSource(`# Biology

## Cell theory

- Cells are the basic unit of life
- Cells come from existing cells`),
    ).toBe(true)

    expect(detectMarkdownSource('random notes\nstill useful')).toBe(false)
  })

  it('keeps explicit markdown as one markdown object', () => {
    const pack = parseStudyPack(
      `# Biology

## Cell theory

Cells are the basic unit of life.

All organisms are made of cells.

- Cells carry DNA
- Cells use energy

## Diffusion

Movement from high to low concentration.

Q: What direction does diffusion move?
A: High to low concentration`,
      { sourceFormat: 'markdown' },
    )

    expect(pack.sourceFormat).toBe('markdown')
    expect(pack.objects.map((object) => object.kind)).toEqual(['markdown'])
    expect(pack.objects[0]).toMatchObject({
      kind: 'markdown',
      title: 'Biology',
      markdown: expect.stringContaining('## Cell theory'),
    })
  })

  it('preserves markdown tables and fenced code inside the markdown object', () => {
    const pack = parseStudyPack(
      `# Nginx

| Directive | Meaning |
|---|---|
| root | Static path |

\`\`\`nginx
location / {
  root /var/www/example.com;
}
\`\`\``,
      { sourceFormat: 'markdown' },
    )

    expect(pack.objects.map((object) => object.kind)).toEqual(['markdown'])
    expect(pack.objects[0]).toMatchObject({
      kind: 'markdown',
      title: 'Nginx',
      markdown: expect.stringContaining('| Directive | Meaning |'),
    })
  })

  it('extracts study-native blocks from quick syntax and natural note patterns', () => {
    const pack = parseStudyPack(
      `# Rundeck vs Ansible

| Ansible | Rundeck |
|---|---|
| Config management | Ops automation |

Flashcard:: What is toil? | Repetitive manual work
Quiz:: Which is config management? | Ansible | Rundeck | Grafana
Reveal:: Mitosis order | Prophase, metaphase, anaphase, telophase
osmosis = water moving across a membrane

# Process steps
1. Collect notes
2. Review weak areas

\`\`\`nginx
location / {
  root /var/www/example.com;
}
\`\`\`

review this because I always confuse diffusion and osmosis`,
    )

    expect(pack.objects.map((object) => object.kind)).toEqual([
      'comparison',
      'qa',
      'quiz',
      'reveal',
      'term',
      'sequence',
      'code',
      'reviewPrompt',
    ])
    expect(pack.objects[0]).toMatchObject({
      kind: 'comparison',
      title: 'Rundeck vs Ansible',
      columns: ['Ansible', 'Rundeck'],
    })
    expect(pack.objects[2]).toMatchObject({
      kind: 'quiz',
      quizMode: 'multipleChoice',
      question: 'Which is config management?',
      options: ['Ansible', 'Rundeck', 'Grafana'],
      correctIndex: 0,
    })
    expect(pack.objects[5]).toMatchObject({
      kind: 'sequence',
      steps: ['Collect notes', 'Review weak areas'],
    })
    expect(pack.objects[6]).toMatchObject({
      kind: 'code',
      language: 'nginx',
      code: 'location / {\n  root /var/www/example.com;\n}',
    })
  })

  it('preserves indentation for code-like config blocks without fences', () => {
    const pack = parseStudyPack(`# Nginx

location / {
	root /var/www/example.com;
	index index.html index.htm;
}
`)

    expect(pack.objects).toHaveLength(1)
    expect(pack.objects[0]).toMatchObject({
      kind: 'code',
      code: 'location / {\n\troot /var/www/example.com;\n\tindex index.html index.htm;\n}',
    })
  })

  it('detects universal study patterns in messy note examples', () => {
    const biology = parseStudyPack(
      readFileSync(
        '../../readme_docs/notes_examples/2-notes-biology.txt',
        'utf8',
      ),
    )
    const history = parseStudyPack(
      readFileSync(
        '../../readme_docs/notes_examples/3-notes-history.txt',
        'utf8',
      ),
    )
    const literature = parseStudyPack(
      readFileSync(
        '../../readme_docs/notes_examples/4-notes-literature.txt',
        'utf8',
      ),
    )
    const rundeck = parseStudyPack(
      readFileSync(
        '../../readme_docs/notes_examples/6-my-notes-rundeck.txt',
        'utf8',
      ),
    )
    const nginx = parseStudyPack(
      readFileSync(
        '../../readme_docs/notes_examples/5-my-notes-nginx.txt',
        'utf8',
      ),
    )

    expect(biology.title).toBe('bio — cell stuff')
    expect(biology.objects.map((object) => object.kind)).toEqual(
      expect.arrayContaining(['term', 'sequence', 'reviewPrompt', 'note']),
    )
    expect(history.objects.map((object) => object.kind)).toEqual(
      expect.arrayContaining(['term', 'list', 'reviewPrompt', 'note']),
    )
    expect(literature.objects.map((object) => object.kind)).toEqual(
      expect.arrayContaining(['term', 'list', 'reviewPrompt', 'note']),
    )
    expect(rundeck.objects.map((object) => object.kind)).toEqual(
      expect.arrayContaining(['list', 'code', 'note']),
    )
    expect(nginx.objects.map((object) => object.kind)).toEqual(
      expect.arrayContaining(['term', 'code', 'comparison', 'note']),
    )
  })
})
