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
            kind: 'unsupported',
            question: 'Skip me',
          },
        ],
      },
      'cell-biology',
    )

    expect(draft.objects).toHaveLength(2)
    expect(draft.objects[0]).toMatchObject({
      kind: 'qa',
      question: 'What do cells contain?',
      answer: 'DNA',
    })
    expect(draft.objects[1]).toMatchObject({
      kind: 'quiz',
      quizMode: 'shortAnswer',
      correctIndex: 1,
    })
    expect(draft.warnings).toEqual(['Skipped item 3: unsupported kind.'])
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
  })
})
