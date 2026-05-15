import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_STUDY_PACK_AI_MODEL,
  generateStudyPackWithAi,
  generateStudyPathWithAi,
  getStudyPathDashboardRoles,
  normalizeAiStudyPackDraft,
  readStudyPackAiSettings,
  resolveStudyPackAiCredentials,
  saveStudyPackAiSettings,
  STUDY_PACK_AI_SETTINGS_KEY,
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
    expect(draft.dashboards[0].objects).toEqual([
      expect.objectContaining({
        kind: 'list',
        items: ['Sparse source summary bullet 1.'],
      }),
    ])
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
    ).toEqual([9, 9, 9])
    expect(draft.dashboards[0].debugTrace?.droppedOrRepairedItems).toEqual(
      expect.arrayContaining([
        'AI provided sourceSummary only before repair.',
        'AI missing normal-dashboard practice/flashcards before repair.',
        'Repair retry used for incomplete normal dashboard.',
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
