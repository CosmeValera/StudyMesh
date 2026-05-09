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
})
