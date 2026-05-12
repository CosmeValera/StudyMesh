export interface StudyPackAiSettings {
  apiToken: string
  model: string
}

export const STUDY_PACK_AI_SETTINGS_KEY = 'aquamesh-study-pack-ai-settings-v1'

export const DEFAULT_STUDY_PACK_AI_MODEL = 'gemini-2.5-flash'

export const readStudyPackAiSettings = (): StudyPackAiSettings => {
  try {
    const stored = window.localStorage.getItem(STUDY_PACK_AI_SETTINGS_KEY)
    if (!stored) {
      return {
        apiToken: '',
        model: DEFAULT_STUDY_PACK_AI_MODEL,
      }
    }

    const parsed = JSON.parse(stored) as Partial<StudyPackAiSettings>

    return {
      apiToken: typeof parsed.apiToken === 'string' ? parsed.apiToken : '',
      model:
        typeof parsed.model === 'string' && parsed.model.trim()
          ? parsed.model.trim()
          : DEFAULT_STUDY_PACK_AI_MODEL,
    }
  } catch {
    return {
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
      apiToken: settings.apiToken.trim(),
      model: settings.model.trim() || DEFAULT_STUDY_PACK_AI_MODEL,
    }),
  )
}

export const clearStudyPackAiToken = (): void => {
  const current = readStudyPackAiSettings()
  saveStudyPackAiSettings({ ...current, apiToken: '' })
}

export const getEnvGeminiApiKey = (): string =>
  typeof process !== 'undefined'
    ? String(process.env.GEMINI_API_KEY || '').trim()
    : ''

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
