type LocalLanguage = 'en' | 'es' | 'ja'

type LocalLanguageModelAvailability =
  | 'available'
  | 'downloadable'
  | 'downloading'
  | 'unavailable'

interface LocalLanguageModelSession {
  prompt: (prompt: string | LocalLanguageModelPromptMessage[]) => Promise<string>
  destroy?: () => void
}

type LocalLanguageModelExpectedInput =
  | { type: 'text'; languages: LocalLanguage[] }
  | { type: 'image' }

interface LocalLanguageModelPromptMessage {
  role: 'user'
  content: Array<
    | { type: 'text'; value: string }
    | {
        type: 'image'
        value: Blob | HTMLCanvasElement | ImageBitmap | ImageData
      }
  >
}

interface LocalLanguageModelMonitor extends EventTarget {
  addEventListener(
    type: 'downloadprogress',
    listener: (event: Event & { loaded?: number; total?: number }) => void,
  ): void
}

interface LocalLanguageModelFactory {
  availability: (options?: {
    languages?: LocalLanguage[]
    expectedInputs?: LocalLanguageModelExpectedInput[]
  }) => Promise<LocalLanguageModelAvailability>
  create: (
    options?: {
      outputLanguage?: LocalLanguage
      expectedInputs?: LocalLanguageModelExpectedInput[]
    },
    downloadOptions?: {
      monitor?: (monitor: LocalLanguageModelMonitor) => void
    },
  ) => Promise<LocalLanguageModelSession>
}

declare global {
  interface Window {
    LanguageModel?: LocalLanguageModelFactory
  }

  // Chrome exposes this on globalThis/window in current Prompt API builds.
  // Keeping both declarations avoids unsafe global indexing in app code.
  // eslint-disable-next-line no-var
  var LanguageModel: LocalLanguageModelFactory | undefined
}

export interface TestLocalLanguageModelResult {
  supported: boolean
  availability?: LocalLanguageModelAvailability
  result?: string
  progress?: number
}

const LOCAL_AI_TIMEOUT_MS = 5 * 60 * 1000

const getLanguageModel = (): LocalLanguageModelFactory | undefined => {
  if (typeof window !== 'undefined' && window.LanguageModel) {
    return window.LanguageModel
  }

  if (typeof globalThis !== 'undefined' && globalThis.LanguageModel) {
    return globalThis.LanguageModel
  }

  return undefined
}

export const isLocalLanguageModelSupported = (): boolean =>
  Boolean(getLanguageModel())

export const getLocalLanguageModelAvailability = async (
  language: LocalLanguage = 'en',
  expectedInputs?: LocalLanguageModelExpectedInput[],
): Promise<LocalLanguageModelAvailability> => {
  const languageModel = getLanguageModel()
  if (!languageModel) {
    return 'unavailable'
  }

  try {
    return await languageModel.availability({
      languages: [language],
      ...(expectedInputs ? { expectedInputs } : {}),
    })
  } catch {
    return 'unavailable'
  }
}

const withTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number,
): Promise<T> => {
  let timeoutId = 0
  const timeout = new Promise<T>((_resolve, reject) => {
    timeoutId = window.setTimeout(() => {
      reject(
        new Error(
          'Local AI prompt timed out after several minutes. Try Super small or Compact, shorten the notes, or use Own Gemini API token.',
        ),
      )
    }, timeoutMs)
  })

  try {
    return await Promise.race([promise, timeout])
  } finally {
    window.clearTimeout(timeoutId)
  }
}

export const callLocalLanguageModel = async (
  prompt: string | LocalLanguageModelPromptMessage[],
  options: {
    outputLanguage?: LocalLanguage
    timeoutMs?: number
    onProgress?: (percent: number) => void
    expectedInputs?: LocalLanguageModelExpectedInput[]
  } = {},
): Promise<string> => {
  const languageModel = getLanguageModel()
  if (!languageModel) {
    throw new Error(
      'Google Local AI is not supported in this browser. Use Google Chrome with the built-in AI model downloaded, or choose another provider.',
    )
  }

  const outputLanguage = options.outputLanguage || 'en'
  const expectedInputs = options.expectedInputs || [
    { type: 'text' as const, languages: [outputLanguage] },
  ]
  const availability = await getLocalLanguageModelAvailability(
    outputLanguage,
    expectedInputs,
  )
  if (availability === 'unavailable') {
    throw new Error(
      'Google Local AI is unavailable in this browser. Use Google Chrome with the local model enabled and downloaded.',
    )
  }

  let session: LocalLanguageModelSession | null = null
  try {
    session = await languageModel.create(
      {
        outputLanguage,
        expectedInputs,
      },
      {
        monitor: (monitor) => {
          monitor.addEventListener('downloadprogress', (event) => {
            const total = Number(event.total || 0)
            const loaded = Number(event.loaded || 0)
            if (total > 0) {
              options.onProgress?.(Math.round((loaded / total) * 100))
            }
          })
        },
      },
    )

    const result = await withTimeout(
      session.prompt(prompt),
      options.timeoutMs || LOCAL_AI_TIMEOUT_MS,
    )
    return String(result || '').trim()
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }

    throw new Error('Google Local AI failed before returning a response.')
  } finally {
    session?.destroy?.()
  }
}

export const getLocalLanguageModelImageAvailability = async (
  language: LocalLanguage = 'en',
): Promise<LocalLanguageModelAvailability> =>
  getLocalLanguageModelAvailability(language, [
    { type: 'text', languages: [language] },
    { type: 'image' },
  ])

export const extractNotesFromImageWithLocalLanguageModel = async (
  image: Blob,
  options: {
    outputLanguage?: LocalLanguage
    timeoutMs?: number
    onProgress?: (percent: number) => void
  } = {},
): Promise<string> => {
  const outputLanguage = options.outputLanguage || 'en'
  const availability = await getLocalLanguageModelImageAvailability(outputLanguage)
  if (availability === 'unavailable') {
    throw new Error(
      'Google Local AI image input is unavailable in this browser or model.',
    )
  }

  return callLocalLanguageModel(
    [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            value:
              'Extract clean study notes from this image. Return concise Markdown only.',
          },
          {
            type: 'image',
            value: image,
          },
        ],
      },
    ],
    {
      outputLanguage,
      timeoutMs: options.timeoutMs || LOCAL_AI_TIMEOUT_MS,
      onProgress: options.onProgress,
      expectedInputs: [
        { type: 'text', languages: [outputLanguage] },
        { type: 'image' },
      ],
    },
  )
}

export const testLocalLanguageModel = async (
  onProgress?: (percent: number) => void,
): Promise<TestLocalLanguageModelResult> => {
  if (!isLocalLanguageModelSupported()) {
    return {
      supported: false,
      availability: 'unavailable',
    }
  }

  const availability = await getLocalLanguageModelAvailability('en')
  if (availability === 'unavailable') {
    return {
      supported: true,
      availability,
    }
  }

  let latestProgress: number | undefined
  const result = await callLocalLanguageModel(
    'Return exactly one word: hello',
    {
      outputLanguage: 'en',
      timeoutMs: 3 * 60 * 1000,
      onProgress: (percent) => {
        latestProgress = percent
        onProgress?.(percent)
      },
    },
  )

  return {
    supported: true,
    availability,
    result,
    progress: latestProgress,
  }
}
