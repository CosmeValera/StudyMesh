export type StudyPackAiProvider = 'basic' | 'local' | 'gemini' | 'hosted'

export interface StudyPackAiSettings {
  provider?: StudyPackAiProvider
  apiToken: string
  model: string
}

export const STUDY_PACK_AI_SETTINGS_KEY = 'aquamesh-study-pack-ai-settings-v1'
export const STUDY_PACK_AI_SETTINGS_CHANGED_EVENT =
  'aquamesh-study-pack-ai-settings-changed'

export const DEFAULT_STUDY_PACK_AI_MODEL = 'gemini-2.5-flash'

export const getEnvGeminiApiKey = (): string =>
  typeof process !== 'undefined'
    ? String(process.env.GEMINI_API_KEY || '').trim()
    : ''

const isStudyPackAiProvider = (value: unknown): value is StudyPackAiProvider =>
  value === 'basic' ||
  value === 'local' ||
  value === 'gemini' ||
  value === 'hosted'

const defaultProviderForToken = (apiToken: string): StudyPackAiProvider =>
  apiToken.trim() || getEnvGeminiApiKey() ? 'gemini' : 'basic'

export const readStudyPackAiSettings = (): StudyPackAiSettings => {
  try {
    const stored = window.localStorage.getItem(STUDY_PACK_AI_SETTINGS_KEY)
    if (!stored) {
      const envToken = getEnvGeminiApiKey()
      return {
        provider: defaultProviderForToken(envToken),
        apiToken: '',
        model: DEFAULT_STUDY_PACK_AI_MODEL,
      }
    }

    const parsed = JSON.parse(stored) as Partial<StudyPackAiSettings>

    const apiToken = typeof parsed.apiToken === 'string' ? parsed.apiToken : ''

    return {
      provider: isStudyPackAiProvider(parsed.provider)
        ? parsed.provider
        : defaultProviderForToken(apiToken),
      apiToken,
      model:
        typeof parsed.model === 'string' && parsed.model.trim()
          ? parsed.model.trim()
          : DEFAULT_STUDY_PACK_AI_MODEL,
    }
  } catch {
    const envToken = getEnvGeminiApiKey()
    return {
      provider: defaultProviderForToken(envToken),
      apiToken: '',
      model: DEFAULT_STUDY_PACK_AI_MODEL,
    }
  }
}

export const saveStudyPackAiSettings = (
  settings: StudyPackAiSettings,
): void => {
  window.localStorage.setItem(
    STUDY_PACK_AI_SETTINGS_KEY,
    JSON.stringify({
      provider: settings.provider || defaultProviderForToken(settings.apiToken),
      apiToken: settings.apiToken.trim(),
      model: settings.model.trim() || DEFAULT_STUDY_PACK_AI_MODEL,
    }),
  )
  window.dispatchEvent(new CustomEvent(STUDY_PACK_AI_SETTINGS_CHANGED_EVENT))
}

export const clearStudyPackAiToken = (): void => {
  const current = readStudyPackAiSettings()
  saveStudyPackAiSettings({ ...current, apiToken: '' })
}

export const resolveStudyPackAiCredentials = (): StudyPackAiSettings & {
  tokenSource: 'settings' | 'env' | 'none'
} => {
  const settings = readStudyPackAiSettings()
  if (settings.apiToken.trim()) {
    return {
      ...settings,
      apiToken: settings.apiToken.trim(),
      tokenSource: 'settings',
    }
  }

  const envToken = getEnvGeminiApiKey()
  if (envToken) {
    return {
      ...settings,
      apiToken: envToken,
      tokenSource: 'env',
    }
  }

  return {
    ...settings,
    apiToken: '',
    tokenSource: 'none',
  }
}
