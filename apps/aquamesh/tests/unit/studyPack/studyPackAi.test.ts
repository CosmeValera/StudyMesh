import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  callLocalLanguageModel,
  DEFAULT_STUDY_PACK_AI_MODEL,
  extractNotesFromImageWithLocalLanguageModel,
  generateStudyPathWithLocalAi,
  generateStudyPackWithAi as generateStudyPackWithProvider,
  generateStudyPackWithGemini as generateStudyPackWithAi,
  generateStudyPathWithGemini as generateStudyPathWithAi,
  getStudyPathDashboardRoles,
  isLocalAiGenerationError,
  normalizeAiStudyPackDraft,
  normalizeLocalAiStudyPackDraft,
  parseLocalAiJson,
  readStudyPackAiSettings,
  resetLocalLanguageModelCooldownForTests,
  resolveStudyPackAiCredentials,
  saveStudyPackAiSettings,
  smokeTestLocalLanguageModel,
  STUDY_PACK_AI_SETTINGS_KEY,
  testLocalLanguageModel,
} from '../../../src/studyPack/ai'

describe('study pack AI settings', () => {
  let storage: Record<string, string>

  beforeEach(() => {
    storage = {}
    vi.mocked(localStorage.getItem).mockImplementation(
      (key: string) => storage[key] ?? null,
    )
    vi.mocked(localStorage.setItem).mockImplementation(
      (key: string, value: string) => {
        storage[key] = value
      },
    )
    vi.mocked(localStorage.removeItem).mockImplementation((key: string) => {
      delete storage[key]
    })
    vi.mocked(localStorage.clear).mockImplementation(() => {
      storage = {}
    })
    localStorage.clear()
    delete process.env.GEMINI_API_KEY
  })

  it('uses default model and no token when settings are empty', () => {
    expect(readStudyPackAiSettings()).toEqual({
      provider: 'basic',
      apiToken: '',
      model: DEFAULT_STUDY_PACK_AI_MODEL,
    })
    expect(resolveStudyPackAiCredentials()).toMatchObject({
      tokenSource: 'none',
    })
  })

  it('prefers settings token over env token', () => {
    process.env.GEMINI_API_KEY = 'env-token'
    saveStudyPackAiSettings({
      apiToken: 'settings-token',
      model: 'gemini-test',
    })

    expect(storage[STUDY_PACK_AI_SETTINGS_KEY]).toContain('settings-token')
    expect(resolveStudyPackAiCredentials()).toEqual({
      provider: 'gemini',
      apiToken: 'settings-token',
      model: 'gemini-test',
      tokenSource: 'settings',
    })
  })

  it('falls back to env token when settings token is empty', () => {
    process.env.GEMINI_API_KEY = 'env-token'
    saveStudyPackAiSettings({
      apiToken: '',
      model: 'gemini-test',
    })

    expect(resolveStudyPackAiCredentials()).toEqual({
      provider: 'gemini',
      apiToken: 'env-token',
      model: 'gemini-test',
      tokenSource: 'env',
    })
  })
})

describe('study pack AI normalizer', () => {
  const strictContract = {
    title: 'French Subjunctive',
    sourceSummary: {
      title: 'Subjunctive summary',
      bullets: ['Use the subjunctive after triggers like il faut que.'],
    },
    conceptRecap: {
      title: 'Concept recap',
      sections: [
        {
          title: 'Subjunctive trigger: il faut que',
          bullets: ['Il faut que introduces a required action.'],
          example: 'Il faut que nous partions.',
        },
      ],
    },
    practice: {
      shortAnswer: [
        {
          question: 'Complete: Il faut que nous ___ tôt.',
          expectedAnswer: 'partions',
          explanation: 'Il faut que triggers the subjunctive.',
        },
      ],
      multipleChoice: [
        {
          question:
            'Which conjunction normally requires the subjunctive in French?',
          options: ['bien que', 'parce que', 'puisque'],
          correctOptionIndex: 0,
          explanation: 'Bien que introduces concession and uses subjunctive.',
        },
      ],
    },
    flashcards: [
      {
        front: 'What mood follows il faut que?',
        back: 'The subjunctive.',
      },
    ],
  }

  it('maps a strict AI contract and drops invalid nested items', () => {
    const draft = normalizeAiStudyPackDraft(
      {
        title: 'Cell Biology',
        sourceSummary: {
          title: 'Cell summary',
          bullets: ['Cells carry DNA', 'Cells carry DNA'],
        },
        conceptRecap: {
          title: 'Concept recap',
          sections: [
            {
              title: 'Cell structure',
              bullets: ['Cells store genetic information in DNA.'],
              example: 'A skin cell contains DNA.',
            },
          ],
        },
        practice: {
          shortAnswer: [
            {
              question:
                'How would you identify the molecule that stores inherited traits?',
              expectedAnswer: 'Look for DNA.',
              explanation: 'DNA carries genetic information.',
            },
          ],
          multipleChoice: [
            {
              question:
                'Which structure stores inherited information in a cell?',
              options: ['DNA', 'Glucose', 'Water', 'DNA'],
              correctOptionIndex: 0,
              explanation: 'DNA carries genetic information.',
            },
            {
              question: 'What does DNA help you understand?',
              options: ['DNA', 'Glucose', 'Water'],
              correctOptionIndex: 0,
              explanation: 'Generic prompt should be dropped.',
            },
          ],
        },
        flashcards: [{ front: 'What stores inherited traits?', back: 'DNA' }],
      },
      'cell-biology',
    )

    expect(draft.sourceSummary).toEqual({
      title: 'Cell summary',
      bullets: ['Cells carry DNA'],
    })
    expect(draft.objects).toHaveLength(4)
    expect(draft.objects[0]).toMatchObject({
      kind: 'list',
      title: 'Cell structure',
    })
    expect(draft.objects[1]).toMatchObject({
      kind: 'quiz',
      quizMode: 'shortAnswer',
    })
    expect(draft.objects[2]).toMatchObject({
      kind: 'quiz',
      quizMode: 'multipleChoice',
      answer: 'DNA',
      options: ['DNA', 'Glucose', 'Water'],
    })
    expect(draft.objects[3]).toMatchObject({
      kind: 'qa',
      question: 'What stores inherited traits?',
      answer: 'DNA',
    })
    expect(draft.debugTrace?.droppedOrRepairedItems).toEqual(
      expect.arrayContaining([
        expect.stringContaining('removed duplicate options'),
        expect.stringContaining('Dropped multipleChoice 2'),
      ]),
    )
  })

  it('rejects loose AI objects instead of guessing kinds', () => {
    const draft = normalizeAiStudyPackDraft(
      {
        title: 'Loose',
        objects: [{ kind: 'flashcard', front: 'A', back: 'B' }],
      },
      'loose',
    )

    expect(draft.objects).toEqual([])
    expect(draft.warnings).toEqual([
      'AI response did not match the strict Study Pack schema.',
    ])
    expect(draft.debugTrace?.validatedContract).toBeNull()
  })

  it('enforces summary dashboards as recap-only', () => {
    const draft = normalizeAiStudyPackDraft(strictContract, 'summary-pack', {
      dashboardRole: 'summary',
    })

    expect(draft.dashboardRole).toBe('summary')
    expect(draft.objects.map((object) => object.kind)).toEqual(['list'])
    expect(JSON.stringify(draft.objects)).not.toContain('QuizBlock')
    expect(draft.debugTrace?.droppedOrRepairedItems).toEqual(
      expect.arrayContaining([
        'Dropped practice: summary dashboards are recap-only.',
        'Dropped flashcards: summary dashboards are recap-only.',
      ]),
    )
  })

  it('enforces exercises dashboards as practice-only', () => {
    const draft = normalizeAiStudyPackDraft(strictContract, 'exercise-pack', {
      dashboardRole: 'exercises',
    })

    expect(draft.dashboardRole).toBe('exercises')
    expect(draft.objects.map((object) => object.kind)).toEqual([
      'quiz',
      'quiz',
      'qa',
    ])
    expect(draft.objects).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: 'list' })]),
    )
    expect(draft.debugTrace?.droppedOrRepairedItems).toContain(
      'Dropped conceptRecap: exercises dashboards are practice-only.',
    )
  })
})

describe('local AI helpers', () => {
  afterEach(() => {
    resetLocalLanguageModelCooldownForTests()
    vi.useRealTimers()
  })

  it('repairs loose local AI objects without changing Gemini strict behavior', () => {
    const parsed = parseLocalAiJson(`\`\`\`json
{"title":"Local","objects":[
  {"kind":"markdown","title":"Intro","content":"# Intro"},
  {"kind":"list","title":"Steps","content":"First\\nSecond"},
  {"kind":"reviewPrompt","title":"Review this later"},
  {"kind":"term","title":"Mitosis","answer":"Cell division"},
  {"kind":"qa","question":"What divides?","answer":"Cells"},
  {"kind":"quiz","question":"Which is correct?","quizMode":"multipleChoice","options":["A","B","C"],"correctIndex":1,"explanation":"B works"}
]}
\`\`\``)

    const draft = normalizeLocalAiStudyPackDraft(parsed, 'local')

    expect(draft.objects.map((object) => object.kind)).toEqual([
      'markdown',
      'list',
      'reviewPrompt',
      'term',
      'qa',
      'quiz',
    ])
    expect(draft.debugTrace?.droppedOrRepairedItems).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Repaired markdown'),
        expect.stringContaining('Repaired list'),
        expect.stringContaining('Repaired reviewPrompt'),
      ]),
    )
    expect(draft.debugTrace?.validatedContract).not.toBeNull()
  })

  it('repairs local concept contracts and drops weak generated practice', () => {
    const draft = normalizeLocalAiStudyPackDraft(
      {
        title: 'Atomic theories',
        summary: { content: 'Atomic theory changed through evidence.' },
        sourceSummary: [
          'Dalton proposed atoms as tiny indivisible particles.',
          'Rutherford used gold foil evidence for the nucleus.',
        ],
        concepts: [
          {
            concept: 'Dalton atomic theory',
            definition: 'Dalton proposed that matter is made of atoms.',
            keyFact: 'Atoms combine in fixed ratios.',
            sourcePhrase: 'Dalton proposed atoms.',
          },
          {
            concept: 'target rule formation rule',
            definition: 'Bad generated label.',
          },
        ],
        quizzes: [
          {
            question: 'What rule does Proposed that matter describe?',
            options: ['Dalton', 'Dalton', 'Rutherford'],
            correctOptionIndex: 0,
            explanation: 'Weak generated template.',
          },
          {
            question: 'Which scientist proposed that matter is made of atoms?',
            options: ['Dalton', 'Thomson', 'Rutherford', 'Dalton'],
            correctOptionIndex: 0,
            explanation: 'Dalton proposed atomic theory.',
          },
        ],
        flashcards: [
          {
            front: 'What did Dalton propose about atoms?',
            back: 'Matter is made of atoms that combine in fixed ratios.',
          },
        ],
      },
      'atomic-theories',
    )

    expect(draft.rawNotes).toContain('Atomic theory changed')
    expect(draft.debugTrace?.validatedContract).not.toBeNull()
    expect(JSON.stringify(draft.objects)).not.toContain('target rule')
    expect(JSON.stringify(draft.objects)).not.toContain('What rule does')
    expect(draft.objects.filter((object) => object.kind === 'quiz')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          question: 'Which scientist proposed that matter is made of atoms?',
          options: ['Dalton', 'Thomson', 'Rutherford'],
          correctIndex: 0,
        }),
      ]),
    )
    expect(draft.debugTrace?.droppedOrRepairedItems).toEqual(
      expect.arrayContaining([
        expect.stringContaining('converted object to text'),
        expect.stringContaining('Dropped concept 2'),
        expect.stringContaining('Dropped quiz 1'),
        expect.stringContaining('removed duplicate options'),
      ]),
    )
  })

  it('keeps local Study Path dashboards useful when fields drift', async () => {
    const destroy = vi.fn()
    const prompt = vi
      .fn()
      .mockResolvedValueOnce('{"ok":true}')
      .mockResolvedValueOnce(
        JSON.stringify({
          title: '01 - Past tense contrast',
          summary: { body: 'Contrast preterite and imperfect.' },
          sourceSummary: [
            'Use preterite for completed events.',
            'Use imperfect for background and habits.',
          ],
          concepts: [
            {
              concept: 'Preterite vs imperfect',
              definition:
                'Choose preterite for completed events and imperfect for background or habitual actions.',
              keyFact: 'The tense choice changes the meaning of a past action.',
              example: 'Ayer fui al mercado mientras llovia.',
            },
          ],
          quizzes: [
            {
              question:
                'Which tense fits a completed action in Spanish B1 narration?',
              options: ['preterite', 'imperfect', 'present'],
              correctOptionIndex: 0,
              explanation: 'Completed events use preterite.',
            },
          ],
          flashcards: [
            {
              front: 'When do you use the imperfect?',
              back: 'Use it for background, habits, and ongoing states.',
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        JSON.stringify({
          title: '02 - Opinions with connectors',
          rawNotes:
            '## Goal\nGive opinions with connectors.\n\n## Explanation\nB1 Spanish uses connectors such as aunque, sin embargo, and por eso to join ideas and justify opinions.\n\n## Examples\nCreo que es util, aunque cuesta practicar.',
          concepts: [
            {
              concept: 'Opinion connectors',
              definition:
                'Connectors join an opinion with a contrast, cause, or result.',
              keyFact: 'Aunque introduces contrast.',
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        JSON.stringify({
          title: '03 - Travel situations',
          rawNotes:
            '## Goal\nHandle travel and work situations.\n\n## Explanation\nB1 speakers explain plans, problems, preferences, and solutions with connected sentences.\n\n## Practice\nAsk for alternatives and explain a preference.',
          concepts: [
            {
              concept: 'Travel problem solving',
              definition:
                'Explain a travel problem and request a clear alternative.',
              keyFact: 'Use polite requests and reasons.',
            },
          ],
        }),
      )
    const create = vi.fn().mockResolvedValue({ prompt, destroy })
    vi.stubGlobal('LanguageModel', {
      availability: vi.fn().mockResolvedValue('available'),
      create,
    })

    const draft = await generateStudyPathWithLocalAi({
      apiToken: '',
      model: '',
      title: 'Spanish B1',
      prompt: 'I want to learn Spanish level B1',
      folderName: '',
      generationAmount: 'compact',
    })

    expect(draft.folderName).toBe('Spanish B1')
    expect(draft.dashboards).toHaveLength(3)
    expect(
      draft.dashboards.every(
        (dashboard) =>
          dashboard.rawNotes.trim() &&
          dashboard.objects[0]?.kind === 'markdown' &&
          dashboard.objects.length >= 4,
      ),
    ).toBe(true)
    expect(JSON.stringify(draft.dashboards)).not.toMatch(
      /how do you say hello/i,
    )
    expect(draft.dashboards[0].debugTrace?.validatedContract).not.toBeNull()
    expect(prompt).toHaveBeenNthCalledWith(1, 'Return JSON: {"ok":true}')
  })

  it('emits estimated prompt progress without reporting 100 before completion', async () => {
    vi.useFakeTimers({ now: 0 })
    const events: Array<{ phase: string; percent: number }> = []
    const destroy = vi.fn()
    const prompt = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          window.setTimeout(() => resolve('done'), 500)
        }),
    )
    vi.stubGlobal('LanguageModel', {
      availability: vi.fn().mockResolvedValue('available'),
      create: vi.fn().mockResolvedValue({ prompt, destroy }),
    })

    const request = callLocalLanguageModel('Return done', {
      timeoutMs: 1000,
      onProgress: (event) => events.push(event),
    })

    await vi.advanceTimersByTimeAsync(500)
    await expect(request).resolves.toBe('done')
    const pending = events.filter((event) => event.phase === 'generation')
    expect(pending.length).toBeGreaterThan(0)
    expect(pending.every((event) => event.percent < 100)).toBe(true)
    expect(events.at(-1)).toMatchObject({ phase: 'complete', percent: 100 })
    expect(destroy).toHaveBeenCalled()
  })

  it('emits 100 timeout progress when a prompt times out', async () => {
    vi.useFakeTimers({ now: 0 })
    const events: Array<{ phase: string; percent: number; label: string }> = []
    const destroy = vi.fn()
    vi.stubGlobal('LanguageModel', {
      availability: vi.fn().mockResolvedValue('available'),
      create: vi.fn().mockResolvedValue({
        prompt: vi.fn(() => new Promise(() => {})),
        destroy,
      }),
    })

    const request = callLocalLanguageModel('Return done', {
      timeoutMs: 1000,
      onProgress: (event) => events.push(event),
    })
    const rejection = expect(request).rejects.toThrow(/choose a smaller path/i)

    await vi.advanceTimersByTimeAsync(1000)
    await rejection
    expect(events.at(-1)).toMatchObject({
      phase: 'timeout',
      percent: 100,
    })
    expect(events.at(-1)?.label).not.toMatch(/Basic fallback/i)
    expect(destroy).toHaveBeenCalled()
  })

  it('uses 4 minutes for Local Study Pack prompting progress', async () => {
    vi.useFakeTimers({ now: 0 })
    const events: Array<{
      phase: string
      percent: number
      timeoutMs?: number
    }> = []
    vi.stubGlobal('LanguageModel', {
      availability: vi.fn().mockResolvedValue('available'),
      create: vi.fn().mockResolvedValue({
        prompt: vi
          .fn()
          .mockResolvedValueOnce('{"ok":true}')
          .mockImplementation(() => new Promise(() => {})),
        destroy: vi.fn(),
      }),
    })

    const request = generateStudyPackWithProvider({
      provider: 'local',
      apiToken: '',
      model: '',
      title: 'Atomic theories',
      rawNotes: 'Dalton proposed that matter is made of atoms.',
      packId: 'atomic-theories',
      onProgress: (event) => events.push(event),
    })
    const rejection = expect(request).rejects.toThrow(/choose a smaller path/i)

    await vi.advanceTimersByTimeAsync(4 * 60 * 1000)
    await rejection
    expect(events.find((event) => event.phase === 'generation')).toMatchObject({
      timeoutMs: 4 * 60 * 1000,
    })
    expect(events.at(-1)).toMatchObject({ phase: 'timeout', percent: 100 })
  })

  it('uses 150 second per-dashboard progress and five dashboards for Local Average', async () => {
    const events: Array<{
      phase: string
      dashboardIndex?: number
      dashboardCount?: number
      timeoutMs?: number
    }> = []
    const dashboardJson = (index: number) =>
      JSON.stringify({
        title: `${String(index).padStart(2, '0')} - Lesson ${index}`,
        summary: `Lesson ${index}`,
        rawNotes: `Lesson ${index} notes explain one useful concept with examples.`,
        concepts: [
          {
            concept: `Concept ${index}`,
            definition: `Concept ${index} definition with enough detail.`,
            keyFact: `Concept ${index} key fact.`,
          },
        ],
        quizzes: [
          {
            question: `Quiz ${index}?`,
            options: ['A', 'B', 'C'],
            correctIndex: 0,
            answer: 'A',
          },
        ],
      })
    const prompt = vi
      .fn()
      .mockResolvedValueOnce('{"ok":true}')
      .mockResolvedValueOnce(dashboardJson(1))
      .mockResolvedValueOnce(dashboardJson(2))
      .mockResolvedValueOnce(dashboardJson(3))
      .mockResolvedValueOnce(dashboardJson(4))
      .mockResolvedValueOnce(dashboardJson(5))
    vi.stubGlobal('LanguageModel', {
      availability: vi.fn().mockResolvedValue('available'),
      create: vi.fn().mockResolvedValue({ prompt, destroy: vi.fn() }),
    })

    const draft = await generateStudyPathWithLocalAi(
      {
        apiToken: '',
        model: '',
        title: 'Spanish B1',
        prompt: 'I want to learn Spanish level B1',
        folderName: '',
        generationAmount: 'average',
      },
      { onProgress: (event) => events.push(event) },
    )

    expect(draft.dashboards).toHaveLength(5)
    expect(prompt).toHaveBeenCalledTimes(6)
    expect(events.filter((event) => event.phase === 'generation')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          dashboardIndex: 1,
          dashboardCount: 5,
          timeoutMs: 150 * 1000,
        }),
        expect.objectContaining({
          dashboardIndex: 5,
          dashboardCount: 5,
          timeoutMs: 150 * 1000,
        }),
      ]),
    )
  })

  it('rejects Local Deep before creating a LanguageModel session', async () => {
    const create = vi.fn()
    vi.stubGlobal('LanguageModel', {
      availability: vi.fn().mockResolvedValue('available'),
      create,
    })

    await expect(
      generateStudyPathWithLocalAi({
        apiToken: '',
        model: '',
        title: 'Spanish B1',
        prompt: 'I want to learn Spanish level B1',
        folderName: '',
        generationAmount: 'deep',
      }),
    ).rejects.toThrow(/Deep Study Path is not available with Local AI/i)
    expect(create).not.toHaveBeenCalled()
  })

  it('tests local AI with a tiny hello prompt and destroys the session', async () => {
    const destroy = vi.fn()
    const prompt = vi.fn().mockResolvedValue('hello')
    const create = vi.fn().mockResolvedValue({ prompt, destroy })
    vi.stubGlobal('LanguageModel', {
      availability: vi.fn().mockResolvedValue('available'),
      create,
    })

    await expect(testLocalLanguageModel()).resolves.toMatchObject({
      supported: true,
      availability: 'available',
      result: 'hello',
    })
    expect(prompt).toHaveBeenCalledWith('Return exactly one word: hello')
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        outputLanguage: 'en',
        expectedInputs: [{ type: 'text', languages: ['en'] }],
        monitor: expect.any(Function),
      }),
    )
    expect(destroy).toHaveBeenCalled()
  })

  it('returns not supported when LanguageModel is absent', async () => {
    vi.stubGlobal('LanguageModel', undefined)

    await expect(testLocalLanguageModel()).resolves.toMatchObject({
      supported: false,
      availability: 'unavailable',
    })
  })

  it('passes image modality when extracting image notes locally', async () => {
    const destroy = vi.fn()
    const prompt = vi.fn().mockResolvedValue('clean notes')
    const availability = vi.fn().mockResolvedValue('available')
    const create = vi.fn().mockResolvedValue({ prompt, destroy })
    const image = new Blob(['image'], { type: 'image/png' })
    vi.stubGlobal('LanguageModel', { availability, create })

    await expect(
      extractNotesFromImageWithLocalLanguageModel(image),
    ).resolves.toBe('clean notes')
    expect(availability).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedInputs: [
          { type: 'text', languages: ['en'] },
          { type: 'image' },
        ],
      }),
    )
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedInputs: [
          { type: 'text', languages: ['en'] },
          { type: 'image' },
        ],
        monitor: expect.any(Function),
      }),
    )
    expect(prompt).toHaveBeenCalledWith([
      {
        role: 'user',
        content: [
          expect.objectContaining({ type: 'text' }),
          { type: 'image', value: image },
        ],
      },
    ])
    expect(destroy).toHaveBeenCalled()
  })

  it('times out local AI session creation, cools down, and destroys late sessions', async () => {
    vi.useFakeTimers({ now: 0 })
    const lateDestroy = vi.fn()
    let resolveCreate:
      | ((session: {
          prompt: () => Promise<string>
          destroy: () => void
        }) => void)
      | undefined
    const create = vi.fn(
      () =>
        new Promise<{ prompt: () => Promise<string>; destroy: () => void }>(
          (resolve) => {
            resolveCreate = resolve
          },
        ),
    )
    vi.stubGlobal('LanguageModel', {
      availability: vi.fn().mockResolvedValue('available'),
      create,
    })

    const request = callLocalLanguageModel('Return exactly one word: hello')
    const rejection = expect(request).rejects.toThrow(
      /timed out while creating a session/i,
    )

    await vi.advanceTimersByTimeAsync(60 * 1000)
    await rejection
    await expect(
      callLocalLanguageModel('Return exactly one word: hello'),
    ).rejects.toThrow(/cooling down after a timeout/i)
    expect(create).toHaveBeenCalledTimes(1)

    resolveCreate?.({
      prompt: vi.fn().mockResolvedValue('late'),
      destroy: lateDestroy,
    })
    await vi.runAllTicks()
    expect(lateDestroy).toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(8000)
    vi.useRealTimers()
  })

  it('destroys the session and rejects immediate retries during prompt cooldown', async () => {
    vi.useFakeTimers({ now: 0 })
    const destroy = vi.fn()
    const create = vi.fn().mockResolvedValue({
      prompt: vi.fn(() => new Promise(() => {})),
      destroy,
    })
    vi.stubGlobal('LanguageModel', {
      availability: vi.fn().mockResolvedValue('available'),
      create,
    })

    const request = callLocalLanguageModel('Return exactly one word: hello', {
      timeoutMs: 1000,
    })
    const rejection = expect(request).rejects.toThrow(
      /Local AI timed out. Try again, choose a smaller path, or use Own Gemini token/i,
    )

    await vi.advanceTimersByTimeAsync(1000)
    await rejection
    expect(destroy).toHaveBeenCalled()
    await expect(
      callLocalLanguageModel('Return exactly one word: hello'),
    ).rejects.toThrow(/cooling down after a timeout/i)
    expect(create).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(8000)
    vi.useRealTimers()
  })

  it('smoke tests local AI with the exact JSON prompt', async () => {
    const destroy = vi.fn()
    const prompt = vi.fn().mockResolvedValue('{"ok":true}')
    const create = vi.fn().mockResolvedValue({ prompt, destroy })
    vi.stubGlobal('LanguageModel', {
      availability: vi.fn().mockResolvedValue('available'),
      create,
    })

    await expect(smokeTestLocalLanguageModel()).resolves.toBeUndefined()
    expect(prompt).toHaveBeenCalledWith('Return JSON: {"ok":true}')
    expect(destroy).toHaveBeenCalled()
  })

  it('does not auto-use Basic fallback when Local Study Pack prompting times out', async () => {
    vi.useFakeTimers({ now: 0 })
    const destroy = vi.fn()
    const prompt = vi
      .fn()
      .mockResolvedValueOnce('{"ok":true}')
      .mockImplementation(() => new Promise(() => {}))
    vi.stubGlobal('LanguageModel', {
      availability: vi.fn().mockResolvedValue('available'),
      create: vi.fn().mockResolvedValue({
        prompt,
        destroy,
      }),
    })

    const request = generateStudyPackWithProvider({
      provider: 'local',
      apiToken: '',
      model: '',
      title: 'Atomic theories',
      rawNotes: 'Dalton proposed that matter is made of atoms.',
      packId: 'atomic-theories',
    })
    const rejection = expect(request).rejects.toThrow(
      /Local AI timed out. Try again, choose a smaller path, or use Own Gemini token/i,
    )

    await vi.advanceTimersByTimeAsync(4 * 60 * 1000)
    await rejection
    expect(destroy).toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(8000)
    vi.useRealTimers()
  })

  it('does not auto-use Basic fallback when Local Study Path dashboard prompting times out', async () => {
    vi.useFakeTimers({ now: 0 })
    const destroy = vi.fn()
    const prompt = vi
      .fn()
      .mockResolvedValueOnce('{"ok":true}')
      .mockImplementation(() => new Promise(() => {}))
    vi.stubGlobal('LanguageModel', {
      availability: vi.fn().mockResolvedValue('available'),
      create: vi.fn().mockResolvedValue({
        prompt,
        destroy,
      }),
    })

    const request = generateStudyPathWithLocalAi({
      apiToken: '',
      model: '',
      title: 'Spanish B1',
      prompt: 'I want to learn Spanish level B1',
      folderName: '',
      generationAmount: 'superSmall',
    })
    const rejection = expect(request).rejects.toThrow(
      /Try again, choose a smaller path, or use Own Gemini token/i,
    )

    await vi.advanceTimersByTimeAsync(150 * 1000)
    await rejection
    expect(destroy).toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(8000)
    vi.useRealTimers()
  })

  it('smoke timeout prevents Local Study Pack generation with the busy message', async () => {
    vi.useFakeTimers({ now: 0 })
    const prompt = vi.fn(() => new Promise(() => {}))
    vi.stubGlobal('LanguageModel', {
      availability: vi.fn().mockResolvedValue('available'),
      create: vi.fn().mockResolvedValue({
        prompt,
        destroy: vi.fn(),
      }),
    })

    const request = generateStudyPackWithProvider({
      provider: 'local',
      apiToken: '',
      model: '',
      title: 'Atomic theories',
      rawNotes: 'Dalton proposed that matter is made of atoms.',
      packId: 'atomic-theories',
    })
    const rejection = expect(request).rejects.toThrow(
      /Chrome Local AI is busy or unstable/i,
    )

    await vi.advanceTimersByTimeAsync(25 * 1000)
    await rejection
    expect(prompt).toHaveBeenCalledTimes(1)
    expect(prompt).toHaveBeenCalledWith('Return JSON: {"ok":true}')
    await vi.advanceTimersByTimeAsync(8000)
    vi.useRealTimers()
  })

  it('smoke timeout prevents Local Study Path generation with the busy message', async () => {
    vi.useFakeTimers({ now: 0 })
    const prompt = vi.fn(() => new Promise(() => {}))
    vi.stubGlobal('LanguageModel', {
      availability: vi.fn().mockResolvedValue('available'),
      create: vi.fn().mockResolvedValue({
        prompt,
        destroy: vi.fn(),
      }),
    })

    const request = generateStudyPathWithLocalAi({
      apiToken: '',
      model: '',
      title: 'Spanish B1',
      prompt: 'I want to learn Spanish level B1',
      folderName: '',
      generationAmount: 'superSmall',
    })
    const rejection = expect(request).rejects.toThrow(
      /Chrome Local AI is busy or unstable/i,
    )

    await vi.advanceTimersByTimeAsync(25 * 1000)
    await rejection
    expect(prompt).toHaveBeenCalledTimes(1)
    expect(prompt).toHaveBeenCalledWith('Return JSON: {"ok":true}')
    await vi.advanceTimersByTimeAsync(8000)
    vi.useRealTimers()
  })

  it('reports malformed Local Study Path JSON with raw failure debug', async () => {
    const prompt = vi
      .fn()
      .mockResolvedValueOnce('{"ok":true}')
      .mockResolvedValueOnce('not json at all')
    vi.stubGlobal('LanguageModel', {
      availability: vi.fn().mockResolvedValue('available'),
      create: vi.fn().mockResolvedValue({ prompt, destroy: vi.fn() }),
    })

    try {
      await generateStudyPathWithLocalAi({
        apiToken: '',
        model: '',
        title: 'Italian B1',
        prompt: 'Teach Italian B1 modal verbs',
        folderName: '',
        generationAmount: 'superSmall',
      })
      throw new Error('Expected Local AI generation to fail.')
    } catch (error) {
      expect(error).toBeInstanceOf(Error)
      expect((error as Error).message).toMatch(/malformed JSON/i)
      expect(isLocalAiGenerationError(error)).toBe(true)
      if (isLocalAiGenerationError(error)) {
        expect(error.code).toBe('invalidJson')
        expect(error.debug).toMatchObject({
          dashboardIndex: 1,
          dashboardCount: 2,
          rawResponse: 'not json at all',
        })
        expect(error.debug?.parseError).toMatch(/invalid JSON|Unexpected/i)
      }
    }
  })

  it('repairs invalid Local AI JSON backslash escapes before parsing', () => {
    expect(parseLocalAiJson('{"phrase":"Watashi wa \\[name] desu"}')).toEqual({
      phrase: 'Watashi wa [name] desu',
    })
    expect(
      parseLocalAiJson('{"quote":"say \\"hello\\"","path":"a\\\\b"}'),
    ).toEqual({
      quote: 'say "hello"',
      path: 'a\\b',
    })
  })

  it('repairs incomplete Local AI JSON with missing closing delimiters', () => {
    expect(
      parseLocalAiJson('{"title":"Lesson","listItems":["a","b","c"]'),
    ).toEqual({
      title: 'Lesson',
      listItems: ['a', 'b', 'c'],
    })
    expect(
      parseLocalAiJson('{"title":"Lesson","listItems":["a","b","c"'),
    ).toEqual({
      title: 'Lesson',
      listItems: ['a', 'b', 'c'],
    })
    expect(
      parseLocalAiJson('```json\n{"title":"Lesson","listItems":["a","b"]\n```'),
    ).toEqual({
      title: 'Lesson',
      listItems: ['a', 'b'],
    })
    expect(
      parseLocalAiJson(
        '{"phrase":"Watashi wa \\[name] desu","listItems":["a"]',
      ),
    ).toEqual({
      phrase: 'Watashi wa [name] desu',
      listItems: ['a'],
    })
  })

  it('maps valid loose Local Study Path objects without treating record debug as a contract', async () => {
    const prompt = vi
      .fn()
      .mockResolvedValueOnce('{"ok":true}')
      .mockResolvedValueOnce(
        JSON.stringify({
          title: '01 - Japanese introductions',
          summary: 'Practice a useful Japanese self-introduction pattern.',
          rawNotes:
            'Use Watashi wa [name] desu for simple introductions and replace the bracketed name.',
          objects: [
            {
              kind: 'markdown',
              title: 'Explanation',
              markdown:
                'Watashi wa [name] desu means I am [name]. Use it for simple introductions.',
            },
            {
              kind: 'qa',
              question: 'How do you introduce your name with this pattern?',
              answer: 'Watashi wa [name] desu.',
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        JSON.stringify({
          title: '02 - Practice',
          summary: 'Practice changing the name in the sentence.',
          rawNotes:
            'Swap the placeholder for a real name and say the full sentence aloud.',
          objects: [
            {
              kind: 'quiz',
              question: 'Which sentence introduces Hana?',
              options: [
                'Watashi wa Hana desu',
                'Watashi wa desu Hana',
                'Hana wa watashi desu',
              ],
              correctIndex: 0,
              answer: 'Watashi wa Hana desu',
              explanation: 'The name comes before desu.',
            },
          ],
        }),
      )
    vi.stubGlobal('LanguageModel', {
      availability: vi.fn().mockResolvedValue('available'),
      create: vi.fn().mockResolvedValue({ prompt, destroy: vi.fn() }),
    })

    const draft = await generateStudyPathWithLocalAi({
      apiToken: '',
      model: '',
      title: 'Japanese A1',
      prompt: 'Teach Japanese A1 introductions',
      folderName: '',
      generationAmount: 'superSmall',
    })

    expect(draft.dashboards).toHaveLength(2)
    expect(draft.dashboards[0].objects.length).toBeGreaterThan(0)
    expect(draft.dashboards[0].debugTrace?.droppedOrRepairedItems).toEqual(
      expect.any(Array),
    )
  })

  it('prefers flat Local Study Path dashboard JSON and maps it into four widgets', async () => {
    const prompt = vi
      .fn()
      .mockResolvedValueOnce('{"ok":true}')
      .mockResolvedValueOnce(
        JSON.stringify({
          title: '01 - Italian modal verbs',
          summary: 'Practice modal verbs in everyday Italian requests.',
          notes:
            'Italian B1 modal verbs help express what someone can, must, or wants to do.',
          qaQ: 'Which modal verb expresses obligation?',
          qaA: 'Dovere expresses obligation.',
          quizQ: 'Which sentence means I must study?',
          quizOptions: ['Devo studiare', 'Posso studiare', 'Voglio studiare'],
          quizCorrectIndex: 0,
          listItems: ['potere = can', 'dovere = must', 'volere = want'],
        }),
      )
      .mockResolvedValueOnce(
        JSON.stringify({
          title: '02 - Practice',
          summary: 'Apply the modal verbs in short practice prompts.',
          notes:
            'Choose the right modal verb for ability, obligation, or desire.',
          qaQ: 'Which modal verb expresses desire?',
          qaA: 'Volere expresses desire.',
          quizQ: 'Which sentence means I want to leave?',
          quizOptions: ['Voglio partire', 'Devo partire', 'Posso partire'],
          quizCorrectIndex: 0,
          listItems: ['ability uses potere', 'obligation uses dovere'],
        }),
      )
    vi.stubGlobal('LanguageModel', {
      availability: vi.fn().mockResolvedValue('available'),
      create: vi.fn().mockResolvedValue({ prompt, destroy: vi.fn() }),
    })

    const draft = await generateStudyPathWithLocalAi({
      apiToken: '',
      model: '',
      title: 'Italian B1',
      prompt: 'Teach Italian B1 modal verbs',
      folderName: '',
      generationAmount: 'superSmall',
    })

    expect(draft.dashboards[0].objects.map((object) => object.kind)).toEqual([
      'markdown',
      'qa',
      'quiz',
      'list',
    ])
    expect(draft.dashboards[0].debugTrace?.droppedOrRepairedItems).toContain(
      'Mapped Local AI flat dashboard shape into study objects.',
    )
  })

  it('reports mapped Local Study Path JSON without usable widgets', async () => {
    const prompt = vi
      .fn()
      .mockResolvedValueOnce('{"ok":true}')
      .mockResolvedValueOnce(
        JSON.stringify({
          title: '',
          summary: '',
          rawNotes: '',
          concepts: [
            {
              concept: 'it',
              definition: '',
            },
          ],
          objects: [
            {
              kind: 'qa',
              question: 'What do the notes say?',
              answer: '',
            },
          ],
        }),
      )
    vi.stubGlobal('LanguageModel', {
      availability: vi.fn().mockResolvedValue('available'),
      create: vi.fn().mockResolvedValue({ prompt, destroy: vi.fn() }),
    })

    try {
      await generateStudyPathWithLocalAi({
        apiToken: '',
        model: '',
        title: 'French B2',
        prompt: 'Teach French B2 argument connectors',
        folderName: '',
        generationAmount: 'superSmall',
      })
      throw new Error('Expected Local AI generation to fail.')
    } catch (error) {
      expect((error as Error).message).toMatch(/could not map it into widgets/i)
      expect(isLocalAiGenerationError(error)).toBe(true)
      if (isLocalAiGenerationError(error)) {
        expect(error.code).toBe('noUsableObjects')
        expect(error.debug?.parsedJson).toBeTruthy()
        expect(error.debug?.droppedOrRepairedItems).toEqual(
          expect.arrayContaining([expect.stringContaining('No usable')]),
        )
      }
    }
  })

  it('preserves unsupported Local AI setup errors for Study Path generation', async () => {
    vi.stubGlobal('LanguageModel', undefined)

    try {
      await generateStudyPathWithLocalAi({
        apiToken: '',
        model: '',
        title: 'German B1',
        prompt: 'Teach German B1 word order',
        folderName: '',
        generationAmount: 'superSmall',
      })
      throw new Error('Expected unsupported Local AI generation to fail.')
    } catch (error) {
      expect((error as Error).message).toMatch(/not supported in this browser/i)
    }
  })

  it('keeps unknown Local Study Path failures distinct with the original cause', async () => {
    const failure = new Error('Model exploded')
    const prompt = vi
      .fn()
      .mockResolvedValueOnce('{"ok":true}')
      .mockRejectedValueOnce(failure)
    vi.stubGlobal('LanguageModel', {
      availability: vi.fn().mockResolvedValue('available'),
      create: vi.fn().mockResolvedValue({ prompt, destroy: vi.fn() }),
    })

    try {
      await generateStudyPathWithLocalAi({
        apiToken: '',
        model: '',
        title: 'German B1',
        prompt: 'Teach German B1 word order',
        folderName: '',
        generationAmount: 'superSmall',
      })
      throw new Error('Expected unknown Local AI generation to fail.')
    } catch (error) {
      expect((error as Error).message).toBe('Model exploded')
      expect(isLocalAiGenerationError(error)).toBe(true)
      if (isLocalAiGenerationError(error)) {
        expect(error.code).toBe('unknown')
        expect(error.cause).toBe(failure)
        expect(error.debug).toMatchObject({
          dashboardIndex: 1,
          dashboardCount: 2,
        })
      }
    }
  })

  it('uses generic language-learning guidance for Local Study Path prompts', async () => {
    const dashboardJson = (index: number) =>
      JSON.stringify({
        title: `${String(index).padStart(2, '0')} - Lesson ${index}`,
        summary: `Lesson ${index}`,
        rawNotes: `Lesson ${index} notes explain one useful language-learning concept with examples.`,
        concepts: [
          {
            concept: `Grammar concept ${index}`,
            definition: `Grammar concept ${index} definition with enough detail.`,
            keyFact: `Grammar concept ${index} key fact.`,
          },
        ],
      })
    const prompt = vi
      .fn()
      .mockResolvedValueOnce('{"ok":true}')
      .mockResolvedValueOnce(dashboardJson(1))
      .mockResolvedValueOnce(dashboardJson(2))
    vi.stubGlobal('LanguageModel', {
      availability: vi.fn().mockResolvedValue('available'),
      create: vi.fn().mockResolvedValue({ prompt, destroy: vi.fn() }),
    })

    await generateStudyPathWithLocalAi({
      apiToken: '',
      model: '',
      title: 'Italian B2',
      prompt: 'Teach Italian B2 conversation',
      folderName: '',
      generationAmount: 'superSmall',
    })

    const dashboardPrompt = String(prompt.mock.calls[1][0])
    expect(dashboardPrompt).toContain(
      'For language learning, generate useful grammar/vocabulary/practice topics appropriate to the requested language and level.',
    )
    expect(dashboardPrompt).toContain(
      'Introductions are appropriate only when no level is given or the request is beginner-level.',
    )
    expect(dashboardPrompt).not.toMatch(
      /Spanish B1|For B1, avoid A1 greetings/i,
    )
  })
})

describe('Study Path dashboard roles', () => {
  it('uses fixed role sequences for compact, balanced, and extended paths', () => {
    expect(getStudyPathDashboardRoles('few')).toEqual([
      'normal',
      'normal',
      'exercises',
    ])
    expect(getStudyPathDashboardRoles('medium')).toEqual([
      'normal',
      'normal',
      'normal',
      'summary',
      'exercises',
    ])
    expect(getStudyPathDashboardRoles('many')).toEqual([
      'normal',
      'normal',
      'normal',
      'normal',
      'normal',
      'summary',
      'exercises',
    ])
  })
})

describe('Gemini study pack client', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  const makeStrictPathDashboard = (index: number, label: string) => ({
    title: `${String(index).padStart(2, '0')} - ${label}`,
    summary: `${label} preview`,
    rawNotes: `${label} lesson notes explain the topic with examples and common mistakes for this Study Path section.`,
    sourceSummary: {
      title: `${label} source summary`,
      bullets: [`${label} connects the Study Path ideas.`],
    },
    conceptRecap: {
      title: `${label} concept recap`,
      sections: [
        {
          title: `${label} rule`,
          bullets: [`Apply ${label.toLowerCase()} in a new example.`],
          example: `${label} example`,
        },
      ],
    },
    practice: {
      shortAnswer: [
        {
          question: `How would you apply ${label.toLowerCase()} to a new example?`,
          expectedAnswer: `Use the ${label.toLowerCase()} rule.`,
          explanation: `${label} practice checks transfer.`,
        },
      ],
      multipleChoice: [
        {
          question: `Which option best applies ${label.toLowerCase()} in context?`,
          options: [
            `${label} application`,
            'A copied heading',
            'An unrelated fact',
          ],
          correctOptionIndex: 0,
          explanation: `${label} application is the transfer choice.`,
        },
      ],
    },
    flashcards: [
      {
        front: `When should you use ${label.toLowerCase()}?`,
        back: `Use ${label.toLowerCase()} for the relevant rule.`,
      },
    ],
  })

  const mockStudyPathResponse = (dashboardCount: number) => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    title: 'French Subjunctive Path',
                    folderName: 'French Subjunctive Path',
                    dashboards: Array.from(
                      { length: dashboardCount },
                      (_value, index) =>
                        makeStrictPathDashboard(
                          index + 1,
                          `Lesson ${index + 1}`,
                        ),
                    ),
                  }),
                },
              ],
            },
          },
        ],
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    return fetchMock
  }

  const mockSparseStudyPathResponse = (dashboardCount: number) => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    title: 'Sparse Study Path',
                    folderName: 'Sparse Study Path',
                    dashboards: Array.from(
                      { length: dashboardCount },
                      (_value, index) => ({
                        title: `${String(index + 1).padStart(2, '0')} - Sparse ${index + 1}`,
                        summary: `Sparse dashboard ${index + 1}`,
                        rawNotes: `Sparse notes ${index + 1} explain one usable idea with enough context for a Study Path dashboard.`,
                        sourceSummary: {
                          title: `Sparse summary ${index + 1}`,
                          bullets: [
                            `Sparse source summary bullet ${index + 1}.`,
                          ],
                        },
                      }),
                    ),
                  }),
                },
              ],
            },
          },
        ],
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    return fetchMock
  }

  const makeRichPathDashboard = (index: number, label: string) => ({
    title: `${String(index).padStart(2, '0')} - ${label}`,
    summary: `${label} preview`,
    rawNotes: `${label} teaches a specific rule with clear examples, contrasts, and common mistakes. Students should apply the rule in new contexts and explain why the answer works.`,
    sourceSummary: {
      title: `${label} source summary`,
      bullets: [
        `${label} introduces a concrete learning rule.`,
        `${label} shows how the rule changes in context.`,
        `${label} highlights a common mistake to avoid.`,
      ],
    },
    conceptRecap: {
      title: `${label} concept recap`,
      sections: [
        {
          title: `${label} rule`,
          bullets: [`Use ${label.toLowerCase()} when the context requires it.`],
          example: `${label} example one.`,
        },
        {
          title: `${label} contrast`,
          bullets: [`Compare ${label.toLowerCase()} with a near miss.`],
          example: `${label} example two.`,
        },
      ],
    },
    practice: {
      shortAnswer: [
        {
          question: `How would you apply ${label.toLowerCase()} in a new context?`,
          expectedAnswer: `Use the ${label.toLowerCase()} rule and explain the trigger.`,
          explanation: `${label} short-answer practice checks transfer.`,
        },
        {
          question: `What common mistake should you avoid with ${label.toLowerCase()}?`,
          expectedAnswer: `Do not apply the rule when the trigger is absent.`,
          explanation: `${label} mistake practice checks contrast.`,
        },
      ],
      multipleChoice: [
        {
          question: `Which option correctly applies ${label.toLowerCase()}?`,
          options: [
            `${label} correct application`,
            `${label} copied heading`,
            `${label} unrelated fact`,
          ],
          correctOptionIndex: 0,
          explanation: `${label} correct application uses the rule.`,
        },
        {
          question: `Which option avoids the common ${label.toLowerCase()} mistake?`,
          options: [
            `${label} overgeneralized answer`,
            `${label} careful contrast`,
            `${label} unrelated answer`,
          ],
          correctOptionIndex: 1,
          explanation: `${label} careful contrast avoids the mistake.`,
        },
      ],
    },
    flashcards: [
      {
        front: `What is the main ${label.toLowerCase()} rule?`,
        back: `Apply ${label.toLowerCase()} only when the trigger is present.`,
      },
      {
        front: `What contrast matters for ${label.toLowerCase()}?`,
        back: `Check whether the similar case lacks the trigger.`,
      },
      {
        front: `What mistake should ${label.toLowerCase()} practice prevent?`,
        back: `Avoid copying headings instead of applying the rule.`,
      },
    ],
  })

  it('requests structured JSON and normalizes generated study objects', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    title: 'Derivatives',
                    sourceFormat: 'text',
                    sourceSummary: {
                      title: 'Derivative summary',
                      bullets: [
                        'A derivative measures instantaneous rate of change.',
                      ],
                    },
                    conceptRecap: {
                      title: 'Concept recap',
                      sections: [
                        {
                          title: 'Derivative',
                          bullets: [
                            'Use derivatives to reason about instantaneous rates of change.',
                          ],
                          example: 'Velocity is the derivative of position.',
                        },
                      ],
                    },
                    practice: {
                      shortAnswer: [
                        {
                          question:
                            'How would you use a derivative to compare two changing quantities?',
                          expectedAnswer:
                            'Compare their instantaneous rates of change.',
                          explanation:
                            'A derivative describes instantaneous rate of change.',
                        },
                      ],
                      multipleChoice: [
                        {
                          question:
                            'Which situation is best modeled by a derivative?',
                          options: [
                            'Instantaneous speed',
                            'A fixed label',
                            'A category name',
                          ],
                          correctOptionIndex: 0,
                          explanation:
                            'Instantaneous speed is a rate of change.',
                        },
                      ],
                    },
                    flashcards: [
                      {
                        front: 'What does a derivative measure?',
                        back: 'Instantaneous rate of change.',
                      },
                    ],
                  }),
                },
              ],
            },
          },
        ],
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const draft = await generateStudyPackWithAi({
      apiToken: 'test-token',
      model: 'gemini-test',
      title: 'Derivatives',
      rawNotes: 'Derivative = instantaneous rate of change',
      packId: 'derivatives',
    })

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/gemini-test:generateContent'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'x-goog-api-key': 'test-token',
        }),
      }),
    )
    expect(
      JSON.parse(fetchMock.mock.calls[0][1].body).generationConfig,
    ).toMatchObject({
      responseMimeType: 'application/json',
    })
    expect(draft.sourceSummary?.bullets).toEqual([
      'A derivative measures instantaneous rate of change.',
    ])
    expect(draft.objects[0]).toMatchObject({
      kind: 'list',
      title: 'Derivative',
    })
    expect(draft.objects.filter((object) => object.kind === 'quiz')).toEqual([
      expect.objectContaining({ quizMode: 'shortAnswer' }),
      expect.objectContaining({ quizMode: 'multipleChoice' }),
    ])
    expect(draft.objects.filter((object) => object.kind === 'qa')).toHaveLength(
      1,
    )
    expect(
      draft.objects
        .filter((object) => object.kind === 'quiz')
        .map((object) => object.question)
        .join(' '),
    ).not.toContain('Which statement best explains')
    expect(fetchMock.mock.calls[0][1].body).toContain(
      'Quizzes should be 50-60% of the pack',
    )
    expect(fetchMock.mock.calls[0][1].body).toContain(
      'do not always put the correct answer first',
    )
    expect(fetchMock.mock.calls[0][1].body).toContain('"sourceSummary"')
    expect(fetchMock.mock.calls[0][1].body).toContain('strict valid JSON')
    expect(fetchMock.mock.calls[0][1].body).toContain(
      'Which statement best explains X?',
    )
    expect(fetchMock.mock.calls[0][1].body).toContain(
      'Do not output \\"objects\\"',
    )
    expect(draft.debugTrace?.rawAiResponse).toContain('Derivative summary')
    expect(fetchMock.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal)
  })

  it('retries Study Path generation when Gemini returns malformed JSON with strict dashboards', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: '{"dashboards": [' }] } }],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      title: 'French Past Tense',
                      folderName: 'French Past Tense',
                      dashboards: [
                        {
                          title: '01 - Content 1',
                          summary: 'Past tense basics',
                          rawNotes:
                            'The passe compose is a French past tense used for completed actions. It is formed with avoir or etre plus a past participle.',
                          sourceSummary: {
                            title: 'Past tense basics',
                            bullets: [
                              'The passe compose is used for completed actions.',
                            ],
                          },
                          conceptRecap: {
                            title: 'Passe compose recap',
                            sections: [
                              {
                                title: 'Passe compose formation',
                                bullets: [
                                  'Form it with avoir or etre plus a past participle.',
                                ],
                                example: 'J ai parle.',
                              },
                            ],
                          },
                          practice: {
                            shortAnswer: [
                              {
                                question:
                                  'How would you form a completed-action sentence with passe compose?',
                                expectedAnswer:
                                  'Use avoir or etre plus the past participle.',
                                explanation:
                                  'The auxiliary plus past participle forms the tense.',
                              },
                            ],
                            multipleChoice: [],
                          },
                          flashcards: [
                            {
                              front: 'What does passe compose express?',
                              back: 'Completed past actions.',
                            },
                          ],
                          objects: [
                            {
                              kind: 'markdown',
                              title: 'Passé composé',
                              markdown:
                                'The passe compose is a French past tense used for completed actions.',
                            },
                          ],
                        },
                        {
                          title: '02 - Content 2',
                          summary: 'Auxiliary choice',
                          rawNotes:
                            'Use etre with movement verbs and reflexive verbs. A common mistake is choosing avoir for those verbs.',
                          sourceSummary: {
                            title: 'Auxiliary choice',
                            bullets: [
                              'Use etre with movement and reflexive verbs.',
                            ],
                          },
                          conceptRecap: {
                            title: 'Auxiliary recap',
                            sections: [
                              {
                                title: 'Etre verbs',
                                bullets: [
                                  'Movement and reflexive verbs use etre.',
                                ],
                                example: 'Elle est allee.',
                              },
                            ],
                          },
                          practice: {
                            shortAnswer: [],
                            multipleChoice: [
                              {
                                question:
                                  'Which auxiliary should you choose for a reflexive verb?',
                                options: ['etre', 'avoir', 'faire'],
                                correctOptionIndex: 0,
                                explanation:
                                  'Reflexive verbs use etre in passe compose.',
                              },
                            ],
                          },
                          flashcards: [],
                          concepts: [
                            {
                              concept: 'Auxiliary choice',
                              definition:
                                'French compound tenses choose an auxiliary based on verb type.',
                              usageRule:
                                'Use etre with movement verbs and reflexive verbs.',
                            },
                          ],
                          objects: [
                            {
                              kind: 'markdown',
                              title: 'Auxiliary choice',
                              markdown:
                                'Use etre with movement verbs and reflexive verbs.',
                            },
                          ],
                        },
                        {
                          title: '03 - Exercises',
                          summary: 'Mixed practice',
                          rawNotes:
                            'Use this dashboard to answer mixed exercises from the Study Path.',
                          sourceSummary: {
                            title: 'Mixed practice',
                            bullets: ['Practice passe compose choices.'],
                          },
                          conceptRecap: {
                            title: 'Mixed recap',
                            sections: [
                              {
                                title: 'Auxiliary and participle',
                                bullets: [
                                  'Choose the auxiliary before applying the participle.',
                                ],
                                example: 'Nous sommes partis.',
                              },
                            ],
                          },
                          practice: {
                            shortAnswer: [
                              {
                                question:
                                  'Correct the sentence by choosing the right auxiliary: Je me ___ leve.',
                                expectedAnswer: 'suis',
                                explanation:
                                  'Reflexive verbs use etre, so je me suis leve.',
                              },
                            ],
                            multipleChoice: [],
                          },
                          flashcards: [],
                          concepts: [],
                          objects: [
                            {
                              kind: 'quiz',
                              question:
                                'What do the notes say about exercises?',
                              quizMode: 'shortAnswer',
                              answer: 'Practice',
                            },
                          ],
                        },
                      ],
                    }),
                  },
                ],
              },
            },
          ],
        }),
      })
    vi.stubGlobal('fetch', fetchMock)

    const draft = await generateStudyPathWithAi({
      apiToken: 'test-token',
      model: 'gemini-test',
      title: 'French Past Tense',
      prompt: 'Teach me passe compose',
      folderName: '',
      generationAmount: 'few',
    })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[1][1].body).toContain(
      'Return syntactically valid JSON',
    )
    expect(fetchMock.mock.calls[0][1].body).toContain(
      '1: normal, 2: normal, 3: exercises',
    )
    expect(
      draft.dashboards.map((dashboard) => dashboard.dashboardRole),
    ).toEqual(['normal', 'normal', 'exercises'])
    expect(draft.dashboards[2].rawNotes).toContain('Mixed practice source')
    expect(JSON.stringify(draft.dashboards[2].objects)).not.toContain(
      'What do the notes say about exercises?',
    )
    expect(draft.dashboards[2].objects).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: 'list' })]),
    )
  })

  it('keeps a Study Path dashboard with only rawNotes and sourceSummary', async () => {
    mockSparseStudyPathResponse(3)

    const draft = await generateStudyPathWithAi({
      apiToken: 'test-token',
      model: 'gemini-test',
      title: 'Sparse Study Path',
      prompt: 'Teach sparse material',
      folderName: '',
      generationAmount: 'few',
    })

    expect(draft.dashboards).toHaveLength(3)
    expect(draft.dashboards[0]).toMatchObject({
      title: '01 - Sparse 1',
      dashboardRole: 'normal',
    })
    expect(draft.dashboards[0].objects).toHaveLength(7)
    expect(
      draft.dashboards[0].objects.every(
        (object) => object.kind === 'quiz' || object.kind === 'qa',
      ),
    ).toBe(true)
    expect(draft.dashboards[0].debugTrace?.finalObjects).toEqual(
      draft.dashboards[0].objects,
    )
  })

  it('repairs source-summary-only normal Study Path dashboards before fallback', async () => {
    const sparseDashboards = Array.from({ length: 5 }, (_value, index) => ({
      title: `${String(index + 1).padStart(2, '0')} - Sparse ${index + 1}`,
      summary: `Sparse dashboard ${index + 1}`,
      rawNotes: `Sparse notes ${index + 1} explain a rich rule with examples and mistakes that can support practice and flashcards.`,
      sourceSummary: {
        title: `Sparse summary ${index + 1}`,
        bullets: [`Sparse source summary bullet ${index + 1}.`],
      },
    }))
    const repairedDashboards = Array.from({ length: 5 }, (_value, index) =>
      makeRichPathDashboard(index + 1, `Lesson ${index + 1}`),
    )
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      title: 'Repaired Path',
                      folderName: 'Repaired Path',
                      dashboards: sparseDashboards,
                    }),
                  },
                ],
              },
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      title: 'Repaired Path',
                      folderName: 'Repaired Path',
                      dashboards: repairedDashboards,
                    }),
                  },
                ],
              },
            },
          ],
        }),
      })
    vi.stubGlobal('fetch', fetchMock)

    const draft = await generateStudyPathWithAi({
      apiToken: 'test-token',
      model: 'gemini-test',
      title: 'Sparse Study Path',
      prompt: 'Teach sparse material',
      folderName: '',
      generationAmount: 'medium',
    })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[0][1].body).toContain(
      'sourceSummary, conceptRecap, practice, and flashcards are mandatory',
    )
    expect(fetchMock.mock.calls[1][1].body).toContain('Original JSON')
    expect(fetchMock.mock.calls[1][1].body).toContain(
      'Preserve the exact dashboard count, order, titles, summaries, and rawNotes',
    )
    expect(draft.dashboards).toHaveLength(5)
    expect(
      draft.dashboards.slice(0, 3).map((dashboard) => dashboard.objects.length),
    ).toEqual([7, 7, 7])
    expect(
      draft.dashboards
        .slice(0, 3)
        .flatMap((dashboard) => dashboard.objects)
        .every((object) => object.kind === 'quiz' || object.kind === 'qa'),
    ).toBe(true)
    expect(draft.dashboards[0].debugTrace?.droppedOrRepairedItems).toEqual(
      expect.arrayContaining([
        'AI provided sourceSummary only before repair.',
        'AI missing normal-dashboard practice/flashcards before repair.',
        'Repair retry used for incomplete normal dashboard.',
        expect.stringContaining(
          'Intentionally suppressed 2 conceptRecap/list-style normal-dashboard objects',
        ),
      ]),
    )
    expect(draft.dashboards[0].debugTrace?.droppedOrRepairedItems).not.toEqual(
      expect.arrayContaining([expect.stringContaining('Fallback used')]),
    )
  })

  it.each([
    ['few' as const, 3],
    ['medium' as const, 5],
    ['many' as const, 7],
  ])(
    'preserves %s Study Path dashboard count with sparse usable dashboards',
    async (generationAmount, expectedCount) => {
      mockSparseStudyPathResponse(expectedCount)

      const draft = await generateStudyPathWithAi({
        apiToken: 'test-token',
        model: 'gemini-test',
        title: 'Sparse Study Path',
        prompt: 'Teach sparse material',
        folderName: '',
        generationAmount,
      })

      expect(draft.dashboards).toHaveLength(expectedCount)
      expect(draft.dashboards.map((dashboard) => dashboard.title)).toEqual(
        Array.from(
          { length: expectedCount },
          (_value, index) =>
            `${String(index + 1).padStart(2, '0')} - Sparse ${index + 1}`,
        ),
      )
      expect(
        draft.dashboards.every((dashboard) => dashboard.objects.length > 0),
      ).toBe(true)
    },
  )

  it('drops only completely unusable Study Path dashboard entries', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    title: 'Sparse Study Path',
                    folderName: 'Sparse Study Path',
                    dashboards: [
                      {},
                      {
                        title: '02 - Usable',
                        summary: 'Usable sparse dashboard',
                        rawNotes:
                          'Usable notes explain one idea well enough to preserve the dashboard.',
                        sourceSummary: {
                          title: 'Usable summary',
                          bullets: ['Keep this dashboard.'],
                        },
                      },
                      {},
                    ],
                  }),
                },
              ],
            },
          },
        ],
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const draft = await generateStudyPathWithAi({
      apiToken: 'test-token',
      model: 'gemini-test',
      title: 'Sparse Study Path',
      prompt: 'Teach sparse material',
      folderName: '',
      generationAmount: 'few',
    })

    expect(draft.dashboards).toHaveLength(1)
    expect(draft.dashboards[0].title).toBe('02 - Usable')
  })

  it('filters balanced Study Path final mappings by dashboard role', async () => {
    mockStudyPathResponse(5)

    const draft = await generateStudyPathWithAi({
      apiToken: 'test-token',
      model: 'gemini-test',
      title: 'French Subjunctive',
      prompt: 'Teach French subjunctive',
      folderName: '',
      generationAmount: 'medium',
    })
    const summary = draft.dashboards[3]
    const exercises = draft.dashboards[4]

    expect(
      draft.dashboards
        .slice(0, 3)
        .flatMap((dashboard) => dashboard.objects)
        .every((object) => object.kind === 'quiz' || object.kind === 'qa'),
    ).toBe(true)
    expect(draft.dashboards[0].debugTrace?.droppedOrRepairedItems).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          'Intentionally suppressed 1 conceptRecap/list-style normal-dashboard object',
        ),
      ]),
    )
    expect(draft.dashboards[0].debugTrace?.finalObjects).toEqual(
      draft.dashboards[0].objects,
    )

    expect(summary.dashboardRole).toBe('summary')
    expect(
      summary.objects.filter((object) => object.kind === 'quiz'),
    ).toHaveLength(0)
    expect(
      summary.objects.filter((object) => object.kind === 'qa'),
    ).toHaveLength(0)
    expect(summary.debugTrace?.finalObjects).toEqual(summary.objects)
    expect(JSON.stringify(summary.debugTrace?.rawDashboardInput)).toContain(
      'Use the lesson 4 rule.',
    )
    expect(
      JSON.stringify(summary.debugTrace?.roleSanitizedInput),
    ).not.toContain('Use the lesson 4 rule.')
    expect(
      summary.debugTrace?.validatedContract?.practice.shortAnswer,
    ).toHaveLength(0)
    expect(
      summary.debugTrace?.roleFilteredContract?.practice.shortAnswer,
    ).toHaveLength(0)

    expect(exercises.dashboardRole).toBe('exercises')
    expect(
      exercises.objects.filter(
        (object) => object.kind === 'list' || object.kind === 'markdown',
      ),
    ).toHaveLength(0)
    expect(exercises.debugTrace?.finalObjects).toEqual(exercises.objects)
    expect(JSON.stringify(exercises.debugTrace?.rawDashboardInput)).toContain(
      'conceptRecap',
    )
    expect(
      JSON.stringify(exercises.debugTrace?.roleSanitizedInput),
    ).not.toContain('concept recap')
    expect(
      exercises.debugTrace?.validatedContract?.conceptRecap.sections,
    ).toHaveLength(0)
    expect(
      exercises.debugTrace?.roleFilteredContract?.conceptRecap.sections,
    ).toHaveLength(0)
  })

  it('filters extended Study Path summary and exercises final mappings', async () => {
    mockStudyPathResponse(7)

    const draft = await generateStudyPathWithAi({
      apiToken: 'test-token',
      model: 'gemini-test',
      title: 'French Subjunctive',
      prompt: 'Teach French subjunctive',
      folderName: '',
      generationAmount: 'many',
    })
    const summary = draft.dashboards[5]
    const exercises = draft.dashboards[6]

    expect(summary.dashboardRole).toBe('summary')
    expect(summary.objects.every((object) => object.kind === 'list')).toBe(true)
    expect(summary.objects).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'quiz' }),
        expect.objectContaining({ kind: 'qa' }),
      ]),
    )

    expect(exercises.dashboardRole).toBe('exercises')
    expect(
      exercises.objects.every(
        (object) => object.kind === 'quiz' || object.kind === 'qa',
      ),
    ).toBe(true)
  })

  it('filters compact Study Path final exercises mapping', async () => {
    mockStudyPathResponse(3)

    const draft = await generateStudyPathWithAi({
      apiToken: 'test-token',
      model: 'gemini-test',
      title: 'French Subjunctive',
      prompt: 'Teach French subjunctive',
      folderName: '',
      generationAmount: 'few',
    })
    const exercises = draft.dashboards[2]

    expect(exercises.dashboardRole).toBe('exercises')
    expect(
      exercises.objects.every(
        (object) => object.kind === 'quiz' || object.kind === 'qa',
      ),
    ).toBe(true)
    expect(exercises.objects).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'list' }),
        expect.objectContaining({ kind: 'markdown' }),
      ]),
    )
  })

  it('stops Gemini requests after the hard timeout', async () => {
    vi.useFakeTimers()
    const fetchMock = vi.fn(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => {
            reject(new DOMException('Request aborted', 'AbortError'))
          })
        }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const request = generateStudyPackWithAi({
      apiToken: 'test-token',
      model: 'gemini-test',
      title: 'Derivatives',
      rawNotes: 'Derivative = instantaneous rate of change',
      packId: 'derivatives',
    })
    const rejection = expect(request).rejects.toThrow(/longer than 5 minutes/i)

    await vi.advanceTimersByTimeAsync(5 * 60 * 1000)
    await rejection
    expect(fetchMock.mock.calls[0][1].signal?.aborted).toBe(true)
    vi.useRealTimers()
  })

  it('returns a useful message when Gemini rate limits the request', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({
        error: {
          status: 'RESOURCE_EXHAUSTED',
          message:
            'You reached your peak requests per day to gemini, revise the usage here https://ai.google.dev/gemini-api/docs/rate-limits',
        },
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      generateStudyPackWithAi({
        apiToken: 'test-token',
        model: 'gemini-test',
        title: 'Derivatives',
        rawNotes: 'Derivative = instantaneous rate of change',
        packId: 'derivatives',
      }),
    ).rejects.toThrow(/Gemini rate limit reached for today/i)
  })
})
