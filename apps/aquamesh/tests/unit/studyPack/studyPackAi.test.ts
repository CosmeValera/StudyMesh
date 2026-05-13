import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_STUDY_PACK_AI_MODEL,
  generateStudyPackWithAi,
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
  it('keeps grounded supported study objects and drops invalid objects', () => {
    const draft = normalizeAiStudyPackDraft(
      {
        title: 'Cell Biology',
        objects: [
          {
            kind: 'qa',
            title: 'Cell theory',
            question: 'What do cells contain?',
            answer: 'DNA',
          },
          {
            kind: 'quiz',
            question: 'Where does photosynthesis happen?',
            answer: 'Chloroplasts',
            options: ['Mitochondria', 'Chloroplasts', 'Nucleus'],
            correctIndex: 1,
          },
          {
            kind: 'quiz',
            question: 'Which molecule carries genetic information?',
            options: ['DNA', 'Glucose', 'Water'],
            correctIndex: 0,
          },
          {
            kind: 'unsupported',
            question: 'Skip me',
          },
        ],
      },
      'cell-biology',
    )

    expect(draft.objects).toHaveLength(3)
    expect(draft.objects[0]).toMatchObject({
      kind: 'qa',
      question: 'What do cells contain?',
      answer: 'DNA',
    })
    expect(draft.objects[1]).toMatchObject({
      kind: 'quiz',
      quizMode: 'multipleChoice',
      correctIndex: 1,
    })
    expect(draft.objects[2]).toMatchObject({
      kind: 'quiz',
      answer: 'DNA',
    })
    expect(draft.warnings).toEqual(['Skipped item 4: unsupported kind.'])
  })
})

describe('Gemini study pack client', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
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
                    objects: [
                      {
                        kind: 'term',
                        term: 'Derivative',
                        definition: 'Instantaneous rate of change',
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
    expect(draft.objects[0]).toMatchObject({
      kind: 'term',
      term: 'Derivative',
    })
    expect(
      draft.objects.filter((object) => object.kind === 'quiz'),
    ).toHaveLength(6)
    expect(draft.objects.filter((object) => object.kind === 'qa')).toHaveLength(
      3,
    )
    expect(draft.objects.length).toBeGreaterThanOrEqual(8)
    expect(fetchMock.mock.calls[0][1].body).toContain(
      'Quizzes should be 50-60% of the pack',
    )
    expect(fetchMock.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal)
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
